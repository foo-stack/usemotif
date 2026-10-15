#!/usr/bin/env node
/**
 * Publish smoke gate: pack every publishable package exactly as a release
 * would, then read the manifest back *out of the tarball* and assert no
 * `workspace:` range survived.
 *
 *   node scripts/check-publish-manifests.mjs
 *   node scripts/check-publish-manifests.mjs --no-pack   # manifest-only, no tarballs
 *
 * Why inspect the tarball rather than the tree: the tree is always correct -
 * `workspace:*` is the right thing to commit. The bug that shipped 1.2.2 and
 * 1.2.3 lived entirely in the gap between the tree and what npm packed from it,
 * so only the packed artifact can prove the conversion happened. Asserting on
 * the committed manifests under `packages/` would have passed while the
 * registry was broken.
 *
 * Runs the same convert → restore cycle as `scripts/release.mjs`, so drift
 * between the gate and the real publish path is not possible.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import {
  assertNoWorkspaceRanges,
  buildVersionMap,
  convertManifestsInPlace,
  findPublishablePackages,
  findWorkspaceRanges,
  restoreManifests,
} from './workspace-protocol.mjs';

const NO_PACK = process.argv.includes('--no-pack');

const COLORS = { green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' };

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

/**
 * Read one member out of a packed tarball. `tar -xzO` streams a single member
 * to stdout without unpacking the rest, which matters - some of these tarballs
 * carry a whole dist tree. Returns `null` when the member is absent so callers
 * can tell "not built" apart from "read failed".
 */
function readFromTarball(destDir, tarball, member) {
  const extracted = spawnSync('tar', ['-xzOf', join(destDir, tarball), member], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (extracted.status !== 0) return null;
  return extracted.stdout;
}

/** Every member path inside a packed tarball. */
function listTarballMembers(destDir, tarball) {
  const listed = spawnSync('tar', ['-tzf', join(destDir, tarball)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (listed.status !== 0) return [];
  return listed.stdout.split('\n').filter(Boolean);
}

/**
 * Pack one package and return its tarball name plus the manifest as npm
 * actually wrote it into that tarball. Packing is the slow part, so it happens
 * once and every later read reuses the same artifact.
 */
function packPackage(pkg, destDir) {
  const packed = spawnSync('npm', ['pack', '--silent', '--pack-destination', destDir], {
    cwd: pkg.dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (packed.status !== 0) {
    throw new Error(
      `npm pack failed for ${pkg.name}:\n${(packed.stderr || packed.stdout || '').trim()}`,
    );
  }
  // `npm pack` prints the tarball name last; anything before it is notice
  // output that `--silent` did not suppress.
  const lines = packed.stdout.trim().split('\n');
  const tarball = lines[lines.length - 1]?.trim();
  if (!tarball) throw new Error(`npm pack produced no tarball name for ${pkg.name}`);

  const raw = readFromTarball(destDir, tarball, 'package/package.json');
  if (raw === null) throw new Error(`could not read package.json from ${tarball}`);
  return { tarball, manifest: JSON.parse(raw) };
}

const DIRECTIVE = "'use client'";

/**
 * Which published entries must carry `'use client'`, and which must not.
 *
 * Declared rather than derived, because source is not a reliable signal in
 * either direction: `usemotif` has no `'use client'` in its own source but
 * re-exports a client package and needs the directive, while
 * `@usemotif/react-native` has one and must never carry it (Metro has no
 * server components to protect).
 *
 * `must` entries are client references; a Server Component importing one has
 * to hit a boundary or the build fails. `mustNot` entries run on the server or
 * on native, where the directive would be wrong rather than merely redundant.
 *
 * A package listed here has to classify every JS target in its exports map.
 * An unclassified entry is a hard failure, so adding a subpath export forces a
 * deliberate decision instead of silently shipping an unmarked one.
 *
 * `mustInternal` covers a file that has to carry the directive but is not an
 * exports-map key, so the two checks above can never see it. That is not a
 * corner case: `@usemotif/headless` ships a directive-free barrel precisely so
 * a Server Component can import it, and holds every component in an internal
 * chunk the barrel imports by relative path. Classify only by exports map and
 * the package would pass this check with its client chunk unmarked, which
 * breaks every consumer while the gate stays green. Paths are checked inside
 * the tarball and must exist: a renamed chunk fails loudly rather than
 * silently stopping being verified.
 *
 * `mustInternalAllExcept` says the same thing for a package that emits too many
 * chunks to name, and names the exceptions instead. It is the stronger form: a
 * new chunk is covered the moment it is emitted, rather than the moment somebody
 * remembers to list it.
 */
const CLIENT_ENTRY_POLICY = {
  usemotif: { must: ['.'], mustNot: [] },
  '@usemotif/react': {
    must: ['.', './svg', './tanstack-virtual', './devtools'],
    mustNot: ['./server', './testing', './rsc'],
  },
  '@usemotif/headless': {
    must: [],
    mustNot: ['.'],
    mustInternal: ['./dist/client.js', './dist/client.cjs'],
  },
  '@usemotif/ui': {
    must: [],
    mustNot: ['.'],
    // Over two hundred emitted chunks, most of them hashed. Naming them would
    // go stale on the first content change, so the rule is stated as the
    // inverse. The exemptions are the server graph: the barrel, and the
    // namespace assembly it re-exports.
    // `index.native.js` is React Native's entry, where the directive means nothing.
    mustInternalAllExcept: [
      './dist/index.js',
      './dist/index.cjs',
      './dist/index.native.*',
      './dist/*.namespace.*',
    ],
    // The directive-free barrel may only re-export. A component that is not
    // its own tsup entry gets inlined here instead, and its module-level
    // `styled()` call then runs in the server graph, where `styled` is a client
    // reference, so importing the kit from a Server Component throws.
    reexportOnly: ['./dist/index.js'],
  },
  '@usemotif/react-native': { must: [], mustNot: ['.', './flash-list', './reanimated'] },
  // A build tool: neither entry runs in a React tree. Its source mentions the directive only
  // because the Turbopack loader's tests feed it client modules.
  '@usemotif/compiler-web': { must: [], mustNot: ['.', './turbopack'] },
};

/**
 * Walk an exports map and yield every JS file it can resolve to, tagged with
 * the entry key that owns it. Targets reached through a `react-native`
 * condition are flagged: they are consumed by Metro, never by an RSC bundler,
 * so the directive does not apply to them even under a `must` entry.
 */
function collectJsTargets(node, key, underReactNative, out) {
  if (typeof node === 'string') {
    if (/\.(js|cjs|mjs)$/.test(node)) out.push({ key, path: node, underReactNative });
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [condition, child] of Object.entries(node)) {
    // `types` points at a .d.ts and never carries runtime semantics.
    if (condition === 'types') continue;
    collectJsTargets(child, key, underReactNative || condition === 'react-native', out);
  }
}

/**
 * Assert the packed artifact carries `'use client'` exactly where the policy
 * says it should. Inspecting the tarball rather than the tree is the same
 * reasoning the workspace-range check uses: the tree is not what ships.
 */
function checkUseClientEntries(pkg, manifest, destDir, tarball, offenders) {
  const policy = CLIENT_ENTRY_POLICY[pkg.name];
  if (!policy) return;

  const must = new Set(policy.must);
  const mustNot = new Set(policy.mustNot);

  for (const [key, node] of Object.entries(manifest.exports ?? {})) {
    const targets = [];
    collectJsTargets(node, key, false, targets);
    if (targets.length === 0) continue;

    if (!must.has(key) && !mustNot.has(key)) {
      offenders.push(
        `${pkg.name} → exports "${key}" is not classified in CLIENT_ENTRY_POLICY. ` +
          `Decide whether it is a client reference and list it under must or mustNot.`,
      );
      continue;
    }

    for (const target of targets) {
      const member = `package/${target.path.replace(/^\.\//, '')}`;
      const content = readFromTarball(destDir, tarball, member);
      if (content === null) {
        offenders.push(
          `${pkg.name} → exports "${key}" points at ${target.path}, which is missing from the ` +
            `tarball. Run \`yarn build\` before this check.`,
        );
        continue;
      }
      const has = content.trimStart().startsWith(DIRECTIVE);
      // Native targets ship to Metro, which has no server components, so the
      // directive is neither required nor meaningful there.
      const wanted = must.has(key) && !target.underReactNative;
      if (wanted && !has) {
        offenders.push(
          `${pkg.name} → ${target.path} is missing the ${DIRECTIVE} directive. ` +
            `Importing "${key}" from a Server Component would fail.`,
        );
      } else if (!wanted && has) {
        offenders.push(
          `${pkg.name} → ${target.path} carries ${DIRECTIVE} but must not. ` +
            `Marking a server or native entry as a client reference breaks it.`,
        );
      }
    }
  }
}

/**
 * Entries whose `require` condition is not expected to load under plain Node,
 * with the reason. Declared rather than inferred, for the same reason the client
 * policy above is: a silent skip is how a gate stops gating.
 *
 * Every entry here is still loaded, and an entry that loads anyway is reported
 * as an offender. Otherwise the list only ever grows, and the first repair that
 * makes one of these work would silently stop it being checked again.
 */
const CJS_LOAD_SKIP = {
  '@usemotif/react-native#.':
    'Metro only. Requires react-native, which ships untranspiled source that ' +
    'plain Node cannot parse. Nothing consumes this through require().',
  '@usemotif/react-native#./flash-list': 'Metro only, for the same reason as the main entry.',
};

/** Does this Node accept the flag that turns require(esm) back off? */
function supportsRequireEsmOptOut() {
  return spawnSync(process.execPath, ['--no-experimental-require-module', '-e', '0']).status === 0;
}

/** Every `require`-condition JS target in an exports map, as [key, path] pairs. */
function collectRequireTargets(node, key, conditions, out) {
  if (typeof node === 'string') {
    if (conditions.includes('require') && !conditions.includes('react-native')) {
      if (/\.(js|cjs|mjs)$/.test(node)) out.push({ key, path: node });
    }
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [condition, child] of Object.entries(node)) {
    if (condition === 'types') continue;
    collectRequireTargets(child, key, [...conditions, condition], out);
  }
}

/**
 * Actually load every entry the package advertises to CommonJS consumers.
 *
 * Reading a file and executing it are different checks, and only the second one
 * catches a `require` that resolves to ESM. That failure is invisible to
 * everything else here: the manifest is well formed, the file exists, and the
 * directive is right. It is also invisible on a modern Node, which supports
 * require(esm), so the flag below pins the check to the oldest Node this project
 * supports rather than to whichever one CI happens to run.
 *
 * Loaded from the workspace rather than the tarball, because a require() needs
 * its peer dependencies resolvable and an unpacked tarball has no node_modules.
 * `files` ships `dist` verbatim, so the bytes are the same ones that publish.
 */
function checkCjsEntriesLoad(pkg, manifest, offenders, useFlag) {
  const targets = [];
  for (const [key, node] of Object.entries(manifest.exports ?? {})) {
    collectRequireTargets(node, key, [], targets);
  }
  for (const target of targets) {
    const skipped = CJS_LOAD_SKIP[`${pkg.name}#${target.key}`] !== undefined;
    const abs = join(pkg.dir, target.path);
    const args = useFlag ? ['--no-experimental-require-module'] : [];
    const run = spawnSync(process.execPath, [...args, '-e', `require(${JSON.stringify(abs)})`], {
      cwd: pkg.dir,
      encoding: 'utf8',
    });

    // A skipped entry is still loaded, so a skip that has stopped being needed
    // is reported rather than left to rot. The sibling policy above fails on an
    // exports key it has not been told about; a list consulted in one direction
    // only is the weaker half of the same idea, and this is where a repair
    // elsewhere would quietly stop being verified.
    if (skipped) {
      if (run.status === 0) {
        offenders.push(
          `${pkg.name} \u2192 exports "${target.key}" is listed in CJS_LOAD_SKIP but loads ` +
            `fine. Delete the entry; a skip nobody needs hides the next real failure.`,
        );
      }
      continue;
    }

    if (run.status !== 0) {
      const reason = (/^[A-Za-z]*Error[^\n]*/m.exec(run.stderr ?? '') ?? ['load failed'])[0];
      offenders.push(
        `${pkg.name} \u2192 exports "${target.key}" advertises require() but ${target.path} ` +
          `does not load: ${reason.trim()}`,
      );
    }
  }
}

/**
 * Assert that what a `react-native` export condition serves is native code: it
 * must not import `react-dom` or the web `@usemotif/react` barrel. A package
 * whose React Native target reaches the web build bundles fine and fails only
 * on a device, which is how headless shipped its web components to native.
 */
const WEB_ONLY_IMPORTS = /from\s*['"](react-dom(\/[^'"]*)?|@usemotif\/react)['"]/;

function checkNativeTargets(pkg, manifest, destDir, tarball, offenders) {
  for (const [key, node] of Object.entries(manifest.exports ?? {})) {
    const targets = [];
    collectJsTargets(node, key, false, targets);
    for (const target of targets) {
      if (!target.underReactNative) continue;
      // Follow relative imports too: a barrel can stay clean while a chunk it
      // loads pulls in the web build.
      const queue = [target.path.replace(/^\.\//, '')];
      const seen = new Set();
      while (queue.length > 0) {
        const file = queue.shift();
        if (seen.has(file)) continue;
        seen.add(file);
        const content = readFromTarball(destDir, tarball, `package/${file}`);
        if (content === null) {
          offenders.push(`${pkg.name} \u2192 ${file} (react-native) is missing from the tarball.`);
          continue;
        }
        const hit = WEB_ONLY_IMPORTS.exec(content);
        if (hit !== null) {
          offenders.push(
            `${pkg.name} \u2192 ${target.path} is served to React Native but reaches "${hit[1]}" (in ${file}), which is web only.`,
          );
          break;
        }
        for (const m of content.matchAll(/(?:from|import)\s*['"](\.\.?\/[^'"]+)['"]/g)) {
          queue.push(posix.normalize(posix.join(posix.dirname(file), m[1])));
        }
      }
    }
  }
}

/**
 * Assert a server-graph barrel holds nothing but `export ... from` lines and bare
 * chunk imports, so no client code can be inlined into it and run on the server.
 */
function checkReexportOnly(pkg, destDir, tarball, offenders) {
  for (const path of CLIENT_ENTRY_POLICY[pkg.name]?.reexportOnly ?? []) {
    const content = readFromTarball(destDir, tarball, `package/${path.replace(/^\.\//, '')}`);
    if (content === null) {
      offenders.push(`${pkg.name} \u2192 ${path} is missing from the tarball.`);
      continue;
    }
    const stray = content
      .split('\n')
      .map((line) => line.trim())
      .find(
        (line) =>
          line !== '' &&
          !line.startsWith('//# sourceMappingURL=') &&
          // Code splitting adds bare imports of the (client) chunks it shares.
          !/^import '[^']+';$/.test(line) &&
          !/^export (\{[^}]*\}|\*) from '[^']+';$/.test(line),
      );
    if (stray !== undefined) {
      offenders.push(
        `${pkg.name} \u2192 ${path} must only re-export, but has: ${stray.slice(0, 80)}. ` +
          `Give the component its own tsup entry so it lands in a client chunk.`,
      );
    }
  }
}

/**
 * Assert the internal client chunks a split package relies on are present in
 * the tarball and carry the directive. These are unreachable from the exports
 * map by design, so nothing else in this file would look at them.
 */
function checkInternalClientChunks(pkg, destDir, tarball, offenders) {
  const policy = CLIENT_ENTRY_POLICY[pkg.name] ?? {};
  let paths = policy.mustInternal ?? [];

  if (policy.mustInternalAllExcept) {
    // A `*` matches any run of characters within one path segment, so the server
    // graph can be described by shape rather than by a list that goes stale the
    // first time somebody adds a module to it.
    const exempt = policy.mustInternalAllExcept.map(
      (path) =>
        new RegExp(
          `^package/${path
            .replace(/^\.\//, '')
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '[^/]*')}$`,
        ),
    );
    const chunks = listTarballMembers(destDir, tarball).filter(
      (member) =>
        /^package\/dist\/.+\.(js|cjs)$/.test(member) &&
        !exempt.some((pattern) => pattern.test(member)),
    );
    if (chunks.length === 0) {
      offenders.push(
        `${pkg.name} \u2192 mustInternalAllExcept matched no emitted chunk. Either the build ` +
          `layout changed or the exemption list now covers everything, and nothing is checked.`,
      );
    }
    paths = [...paths, ...chunks.map((member) => `./${member.replace(/^package\//, '')}`)];
  }

  for (const path of paths) {
    const member = `package/${path.replace(/^\.\//, '')}`;
    const content = readFromTarball(destDir, tarball, member);
    if (content === null) {
      offenders.push(
        `${pkg.name} → ${path} is declared an internal client chunk but is missing from the ` +
          `tarball. Either the build layout changed, or \`files\` stopped shipping it. ` +
          `Update mustInternal deliberately rather than dropping the check.`,
      );
      continue;
    }
    if (!content.trimStart().startsWith(DIRECTIVE)) {
      offenders.push(
        `${pkg.name} → ${path} is missing the ${DIRECTIVE} directive. The barrel re-exports it, ` +
          `so every component in this package would render in the server graph.`,
      );
    }
  }
}

/**
 * Catch the symmetric hole: a package that ships client components but was
 * never given a policy entry would otherwise be skipped entirely, which is the
 * same class of bug one level up.
 */
function assertClientPackageIsClassified(pkg, offenders) {
  if (CLIENT_ENTRY_POLICY[pkg.name]) return;
  const found = spawnSync('grep', ['-rl', 'use client', join(pkg.dir, 'src')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (found.status !== 0 || found.stdout.trim() === '') return;
  offenders.push(
    `${pkg.name} → source contains ${DIRECTIVE} but the package has no CLIENT_ENTRY_POLICY ` +
      `entry, so its published entries are unchecked. Classify it.`,
  );
}

function main() {
  const packages = findPublishablePackages();
  if (packages.length === 0) {
    throw new Error('No publishable usemotif / @usemotif/* packages found under packages/');
  }

  const requireEsmOptOut = supportsRequireEsmOptOut();
  const versionMap = buildVersionMap();
  const undo = convertManifestsInPlace(packages, versionMap);
  const destDir = NO_PACK ? null : mkdtempSync(join(tmpdir(), 'usemotif-pack-'));
  const offenders = [];

  try {
    // Cheap check first: if conversion itself left something behind, every
    // tarball is broken and packing 17 packages to prove it is wasted work.
    assertNoWorkspaceRanges(packages);

    if (NO_PACK) {
      log(`${COLORS.dim}--no-pack: verified converted manifests only.${COLORS.reset}`);
    } else {
      for (const pkg of packages) {
        const before = offenders.length;
        const { tarball, manifest } = packPackage(pkg, destDir);
        const hits = findWorkspaceRanges(manifest);
        for (const hit of hits) {
          offenders.push(`${pkg.name} → ${hit.block}.${hit.name} = "${hit.range}"`);
        }
        assertClientPackageIsClassified(pkg, offenders);
        checkUseClientEntries(pkg, manifest, destDir, tarball, offenders);
        checkReexportOnly(pkg, destDir, tarball, offenders);
        checkNativeTargets(pkg, manifest, destDir, tarball, offenders);
        checkInternalClientChunks(pkg, destDir, tarball, offenders);
        checkCjsEntriesLoad(pkg, manifest, offenders, requireEsmOptOut);
        const clean = offenders.length === before;
        const mark = clean ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
        log(`  ${mark} ${pkg.name}@${manifest.version}`);
      }
    }
  } finally {
    restoreManifests(undo);
    if (destDir) rmSync(destDir, { recursive: true, force: true });
  }

  if (offenders.length > 0) {
    log('');
    log(`${COLORS.red}✗ ${offenders.length} problem(s) would reach the registry:${COLORS.reset}`);
    for (const o of offenders) log(`    ${o}`);
    log('');
    log('A surviving workspace range bricks every install; publish must go through');
    log("scripts/release.mjs. A missing 'use client' crashes every Server Component import.");
    process.exit(1);
  }

  log('');
  log(
    `${COLORS.green}✓${COLORS.reset} ${packages.length} package(s) pack clean - no workspace protocol reaches npm, client entries are marked.`,
  );
}

try {
  main();
} catch (err) {
  log(`${COLORS.red}✗ ${err.message ?? String(err)}${COLORS.reset}`);
  process.exit(1);
}
