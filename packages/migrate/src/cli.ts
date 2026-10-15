#!/usr/bin/env node
/**
 * `usemotif-migrate` CLI.
 *
 * Usage:
 *   usemotif-migrate rename-v3 [path] [--dry-run]
 *   usemotif-migrate rename-v2 [path] [--dry-run]
 *   usemotif-migrate from-styled-components [path] [--dry-run]
 *   usemotif-migrate from-tamagui [path] [--dry-run]
 *   usemotif-migrate import-tokens <tokens.json> [--out theme.ts] [--name brand]
 *   usemotif-migrate --help
 *
 * Default path is the current working directory. The transform walks
 * matching files via fast-glob, applies the transform, and writes
 * back any file whose content changed.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve } from 'node:path';
import { exit, stderr, stdout } from 'node:process';
import fg from 'fast-glob';
import { MARKER } from './_ast.js';
import { designTokensToTheme, printThemeModule } from './design-tokens.js';
import { applyWithinMarkdownCode, isMarkdownPath } from './markdown.js';
import {
  applyFromStyledComponents,
  needsFromStyledComponents,
} from './transforms/from-styled-components.js';
import { applyFromTamagui, needsFromTamagui } from './transforms/from-tamagui.js';
import { applyRenameV2, needsRenameV2 } from './transforms/rename-v2.js';
import { applyRenameV3, needsRenameV3 } from './transforms/rename-v3.js';

interface ParsedArgs {
  readonly command: string | null;
  readonly path: string;
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly out: string | null;
  readonly name: string | null;
}

const DEFAULT_GLOBS: string[] = [
  '**/*.{ts,tsx,js,jsx,mjs,cjs,md,mdx,json}',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/.next/**',
  '!**/.vorge/**',
  '!**/.turbo/**',
  '!**/.cache/**',
  '!**/build/**',
  '!**/out/**',
  '!**/coverage/**',
  '!**/__visual__/**',
];

const HELP = `usemotif-migrate - codemod toolkit for motif-js

Usage:
  usemotif-migrate rename-v3 [path]   Rewrite v1 or v2 motif-js import
                                      specifiers to their v3 (@usemotif/*)
                                      names in every file under [path]
                                      (default: cwd).

  usemotif-migrate rename-v2 [path]   Rewrite v1 motif-js import specifiers
                                      to their v2 names. Use this before
                                      rename-v3 if you're still on v1
                                      cross-platform code (see below).

  usemotif-migrate from-styled-components [path]
                                      Rewrite styled-components templates to
                                      motif's styled() where they map directly.

  usemotif-migrate from-tamagui [path]
                                      Rewrite Tamagui imports, state props and
                                      styled() configs to motif.

  usemotif-migrate import-tokens <tokens.json> [--out theme.ts] [--name brand]
                                      Turn a W3C Design Tokens file into a
                                      typed createTheme module, printed or
                                      written to --out.

  usemotif-migrate --help             Show this message.

Flags:
  --dry-run     Print the files that would change without writing them.

The from-* commands read .js, .jsx, .ts and .tsx files only. What they
can't convert stays as it was, under a line starting
"// usemotif-migrate:" that says why; each changed file reports how many
it left. Search for that comment to finish the migration.

rename-v3 rename map:
  @motif-js/react-web      →  @usemotif/react
  @motif-js/react          →  @usemotif/react  ⚠ (see note)
  @motif-js/react-native   →  @usemotif/react-native
  @motif-js/<other>        →  @usemotif/<other>

  Subpath imports (e.g. @motif-js/react/server) survive - the
  renamed DOM bindings still own those exports under
  @usemotif/react.

⚠ The @motif-js/react ambiguity:
  In v1 this was the cross-platform aggregator; in v2 it was the
  DOM bindings. rename-v3 always maps it to @usemotif/react (the v3
  DOM bindings). For v1 cross-platform code that should instead
  become the unscoped 'usemotif' meta package, run rename-v2 FIRST
  to disambiguate, then rename-v3:

    usemotif-migrate rename-v2 .
    usemotif-migrate rename-v3 .

rename-v2 rename map (v1 → v2, kept for back-compat):
  @motif-js/react-web      →  @motif-js/react
  @motif-js/react          →  usemotif
  @motif-js/react-native   →  (unchanged)
`;

function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: string | null = null;
  let path = '.';
  let dryRun = false;
  let help = false;
  let out: string | null = null;
  let name: string | null = null;
  let positionalIndex = 0;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if ((arg === '--out' || arg === '--name') && i + 1 < argv.length) {
      if (arg === '--out') out = argv[++i]!;
      else name = argv[++i]!;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--')) {
      stderr.write(`unknown flag: ${arg}\n`);
      exit(2);
    } else if (positionalIndex === 0) {
      command = arg;
      positionalIndex++;
    } else if (positionalIndex === 1) {
      path = arg;
      positionalIndex++;
    } else {
      stderr.write(`unexpected positional argument: ${arg}\n`);
      exit(2);
    }
  }
  return { command, path, dryRun, help, out, name };
}

interface Transform {
  readonly apply: (source: string) => string;
  readonly needs: (source: string) => boolean;
  /** Paths the transform reads, when not every matched file. */
  readonly only?: RegExp;
}

const CODE_FILES = /\.(m|c)?(j|t)sx?$/;

const countMarkers = (text: string): number => text.split(`// ${MARKER}`).length - 1;

async function runTransform(
  rootArg: string,
  dryRun: boolean,
  transform: Transform,
): Promise<number> {
  const root = resolve(rootArg);
  // `followSymbolicLinks: false` - fast-glob defaults this to `true`, which
  // would let a symlink inside the tree pointing outside `root` be read and
  // (below) written back, mutating files outside the target directory.
  const files = await fg(DEFAULT_GLOBS, {
    cwd: root,
    absolute: true,
    dot: false,
    followSymbolicLinks: false,
  });
  let changed = 0;
  let failed = 0;
  for (const absPath of files) {
    const rel = relative(root, absPath);
    // Defense in depth alongside `followSymbolicLinks: false`: never touch a
    // path that resolves outside `root` (a `..` segment or an absolute path).
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
      stderr.write(`skipped (outside target): ${absPath}\n`);
      continue;
    }
    // Guard each file independently: one unreadable/unwritable file (EACCES,
    // EISDIR, a transform throw) must not abort the run and strand the files
    // already rewritten with a raw stack trace. Collect failures and report.
    try {
      if (transform.only !== undefined && !transform.only.test(absPath)) continue;
      const src = await readFile(absPath, 'utf8');
      if (!transform.needs(src)) continue;
      // In Markdown/MDX, only rewrite code regions (fenced blocks + inline
      // code) so prose mentions of old specifiers - changelog entries,
      // migration notes - aren't silently corrupted.
      const out = isMarkdownPath(absPath)
        ? applyWithinMarkdownCode(src, transform.apply)
        : transform.apply(src);
      if (out === src) continue;
      const marked = countMarkers(out) - countMarkers(src);
      const note = marked > 0 ? ` (${marked} left to finish by hand)` : '';
      if (dryRun) {
        stdout.write(`would change: ${rel}${note}\n`);
      } else {
        await writeFile(absPath, out, 'utf8');
        stdout.write(`changed: ${rel}${note}\n`);
      }
      changed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      stderr.write(`failed: ${rel}: ${message}\n`);
    }
  }
  stdout.write(
    `${dryRun ? 'would change' : 'changed'} ${changed} file${changed === 1 ? '' : 's'}` +
      `${failed > 0 ? `, failed on ${failed}` : ''}.\n`,
  );
  // Non-zero exit on any failure so CI / scripted callers notice.
  return failed > 0 ? 1 : 0;
}

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.help || args.command === null) {
    stdout.write(HELP);
    return 0;
  }
  if (args.command === 'rename-v3') {
    return runTransform(args.path, args.dryRun, {
      apply: applyRenameV3,
      needs: needsRenameV3,
    });
  }
  if (args.command === 'rename-v2') {
    return runTransform(args.path, args.dryRun, {
      apply: applyRenameV2,
      needs: needsRenameV2,
    });
  }
  if (args.command === 'from-styled-components') {
    return runTransform(args.path, args.dryRun, {
      apply: applyFromStyledComponents,
      needs: needsFromStyledComponents,
      only: CODE_FILES,
    });
  }
  if (args.command === 'from-tamagui') {
    return runTransform(args.path, args.dryRun, {
      apply: applyFromTamagui,
      needs: needsFromTamagui,
      only: CODE_FILES,
    });
  }
  if (args.command === 'import-tokens') return importTokens(args);
  stderr.write(`unknown command: ${args.command}\n`);
  stderr.write(HELP);
  return 2;
}

async function importTokens(args: ParsedArgs): Promise<number> {
  if (args.path === '.') {
    stderr.write(
      'import-tokens needs a tokens file: usemotif-migrate import-tokens <tokens.json>\n',
    );
    return 2;
  }
  let file: unknown;
  try {
    file = JSON.parse(await readFile(args.path, 'utf8'));
  } catch (err) {
    stderr.write(`failed: ${args.path}: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
  const { tokens, warnings } = designTokensToTheme(file);
  for (const warning of warnings) stderr.write(`${warning}\n`);
  const name = args.name ?? basename(args.path, extname(args.path)).replace(/\.tokens$/, '');
  const module = printThemeModule(name, tokens, basename(args.path));
  if (args.out === null) {
    stdout.write(module);
  } else {
    await writeFile(args.out, module, 'utf8');
    const count = Object.values(tokens).length;
    stdout.write(`wrote ${args.out} (${count} scale${count === 1 ? '' : 's'}).\n`);
  }
  return 0;
}
