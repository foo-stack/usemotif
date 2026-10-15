#!/usr/bin/env node
/**
 * Docs coverage check.
 *
 *   node scripts/check-docs-coverage.mjs           # exits non-zero on a gap
 *   node scripts/check-docs-coverage.mjs --record  # rewrite the gaps file from today's state
 *
 * Every public export of a published package has to appear in some docs page's
 * `covers:` frontmatter, and every `covers:` entry has to still be exported.
 *
 * Exports are read from each package's built type declarations, through the
 * entry points its exports map advertises (`react-native` conditions aside), so
 * this checks what ships rather than what the source happens to contain. Run it
 * after `yarn build`.
 *
 * A `covers:` entry is a bare export name, which covers that name in every
 * package; a package name, which covers that package's default export (the
 * compiler plugins); or `<package>:*`, which covers a whole package (the icon
 * set's glyphs, which no page lists one by one).
 *
 * The exports that were undocumented when the check arrived are recorded in
 * `scripts/docs-coverage-gaps.json`. A gap listed there passes. The list only
 * shrinks: an entry that has since been documented, or is no longer exported,
 * fails too, so the record never outlives the gap it excuses.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const CONTENT = join(ROOT, 'apps', 'docs', 'content');
const GAPS_FILE = join(ROOT, 'scripts', 'docs-coverage-gaps.json');
const RECORD = process.argv.includes('--record');

/** Every `types` target an exports map reaches, outside `react-native` conditions. */
function typeTargets(node, out) {
  if (typeof node === 'string') return;
  if (node === null || typeof node !== 'object') return;
  for (const [condition, child] of Object.entries(node)) {
    if (condition === 'react-native') continue;
    if (condition === 'types' && typeof child === 'string') out.add(child);
    else typeTargets(child, out);
  }
}

/** Published packages and the declaration files of their entry points. */
function publishedPackages() {
  const out = [];
  for (const dir of readdirSync(join(ROOT, 'packages'))) {
    const manifestPath = join(ROOT, 'packages', dir, 'package.json');
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      continue;
    }
    if (manifest.private === true) continue;
    const targets = new Set();
    typeTargets(manifest.exports ?? {}, targets);
    out.push({
      name: manifest.name,
      entries: [...targets].map((t) => join(ROOT, 'packages', dir, t)),
    });
  }
  return out;
}

/** The names each package exports, values and types alike. */
function exportedNames(packages) {
  const files = packages.flatMap((p) => p.entries);
  for (const file of files) {
    try {
      statSync(file);
    } catch {
      console.error(`Missing ${relative(ROOT, file)}. Run \`yarn build\` before this check.`);
      process.exit(1);
    }
  }
  const program = ts.createProgram(files, {
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  });
  const checker = program.getTypeChecker();
  const byPackage = new Map();
  for (const pkg of packages) {
    const names = new Set();
    for (const file of pkg.entries) {
      const source = program.getSourceFile(file);
      const symbol = source && checker.getSymbolAtLocation(source);
      if (!symbol) continue;
      for (const exported of checker.getExportsOfModule(symbol)) names.add(exported.name);
    }
    byPackage.set(pkg.name, names);
  }
  return byPackage;
}

function mdxFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) mdxFiles(path, out);
    else if (name.endsWith('.mdx')) out.push(path);
  }
  return out;
}

/** Each page's `covers:` entries, read from its frontmatter. */
function coversByPage() {
  const out = new Map();
  for (const file of mdxFiles(CONTENT)) {
    const source = readFileSync(file, 'utf8');
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
    const list = /^covers:\s*\[([\s\S]*?)\]/m.exec(frontmatter)?.[1];
    if (list === undefined) continue;
    const entries = [...list.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    out.set(relative(ROOT, file), entries);
  }
  return out;
}

const packages = publishedPackages();
const exportsByPackage = exportedNames(packages);
const pages = coversByPage();

const coveredNames = new Set();
const coveredPackages = new Set();
const coveredDefaults = new Set();
const problems = [];

for (const [page, entries] of pages) {
  for (const entry of entries) {
    const wildcard = /^(.+):\*$/.exec(entry);
    if (wildcard !== null) {
      if (exportsByPackage.has(wildcard[1])) coveredPackages.add(wildcard[1]);
      else
        problems.push(
          `${page}: covers "${entry}", but no published package is called ${wildcard[1]}.`,
        );
      continue;
    }
    if (exportsByPackage.has(entry)) {
      coveredDefaults.add(entry);
      continue;
    }
    coveredNames.add(entry);
    const exported = [...exportsByPackage.values()].some((names) => names.has(entry));
    if (!exported) problems.push(`${page}: covers "${entry}", which no published package exports.`);
  }
}

/** Undocumented exports, by package. */
const gaps = {};
for (const [pkg, names] of exportsByPackage) {
  if (coveredPackages.has(pkg)) continue;
  const missing = [...names]
    .filter((n) => !coveredNames.has(n) && !(n === 'default' && coveredDefaults.has(pkg)))
    .sort();
  if (missing.length > 0) gaps[pkg] = missing;
}

if (RECORD) {
  writeFileSync(GAPS_FILE, `${JSON.stringify(gaps, null, 2)}\n`);
  const count = Object.values(gaps).reduce((n, list) => n + list.length, 0);
  console.log(`Recorded ${count} undocumented exports in ${relative(ROOT, GAPS_FILE)}.`);
  process.exit(0);
}

const known = JSON.parse(readFileSync(GAPS_FILE, 'utf8'));
for (const [pkg, missing] of Object.entries(gaps)) {
  const allowed = new Set(known[pkg] ?? []);
  for (const name of missing) {
    if (!allowed.has(name)) {
      problems.push(
        `${pkg} exports ${name}, which no docs page covers. Add it to a page's \`covers:\`.`,
      );
    }
  }
}
for (const [pkg, names] of Object.entries(known)) {
  const stillMissing = new Set(gaps[pkg] ?? []);
  for (const name of names) {
    if (!stillMissing.has(name)) {
      problems.push(
        `${relative(ROOT, GAPS_FILE)} lists ${pkg} ${name}, which is now documented or no longer exported. Remove it from the list.`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`Docs coverage: ${problems.length} problem(s).\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
const exported = [...exportsByPackage.values()].reduce((n, s) => n + s.size, 0);
const recorded = Object.values(known).reduce((n, list) => n + list.length, 0);
console.log(
  `Docs coverage: ${exported} exports across ${packages.length} packages; ${recorded} recorded gaps, no new ones.`,
);
