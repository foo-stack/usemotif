#!/usr/bin/env node
/**
 * Bundle-size budget check.
 *
 *   node scripts/check-sizes.mjs              # exits non-zero on overrun
 *   node scripts/check-sizes.mjs --update     # rewrites .size-limits.json
 *                                             # to current sizes (use after a
 *                                             # legitimate growth event)
 *
 * Measures what importing a package's main entry actually costs: it starts at
 * `dist/index.js`, follows every relative specifier the entry reaches, gzips
 * the whole set together, and compares that against `.size-limits.json`.
 * Output mirrors the size-limit CLI format for readability.
 *
 * **Following the graph is the point, not a nicety.** Most packages bundle to a
 * single file, so their number is the entry alone and nothing changes. But a
 * package that splits its output - `@usemotif/headless` ships a directive-free
 * barrel that re-exports a client chunk, so a Server Component can import it -
 * leaves an entry of a few dozen bytes. Measured alone that entry is
 * permanently, silently under budget: the check keeps printing OK while the
 * code it was meant to watch grows unobserved. A split must not be a way to
 * stop being measured.
 *
 * This is the per-package size guardrail. The CI release workflow runs it after
 * `yarn build` so the auto-version PR surfaces any package that has outgrown
 * its budget before it ships to npm. Bump a budget intentionally when a real
 * feature lands; don't let drift accumulate silently.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const BUDGETS_PATH = `${ROOT}/.size-limits.json`;
const UPDATE_MODE = process.argv.includes('--update');

const budgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8'));
const targets = Object.entries(budgets.packages);

function localPackagePath(pkgName) {
  // @usemotif/core → packages/core
  return `${ROOT}/packages/${pkgName.replace('@usemotif/', '')}/dist/index.js`;
}

// Relative specifiers in the emitted bundles, across every form tsup emits:
// `from './x.js'`, `import('./x.js')`, and the CJS `require('./x.js')`. Bare
// specifiers are peer or external deps and are deliberately not counted.
const RELATIVE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"](\.[^'"]*)['"]/g;

/**
 * Collect the entry plus every local file it transitively reaches, in stable
 * order. Returns `{ missing }` when a followed specifier does not resolve,
 * naming the file, because "no dist, run a build" is the wrong instruction when
 * the entry is present and correct and one chunk it imports is not.
 *
 * Regex, not a parser, because the input is our own emitted output rather than
 * arbitrary source. It over-matches a relative path inside a string literal,
 * which would only ever count a file that already ships in the same `dist`.
 */
function collectEntryGraph(entry) {
  const seen = new Set();
  const files = [];
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) return { missing: file, isEntry: file === entry };
    const source = readFileSync(file, 'utf8');
    files.push(file);
    for (const match of source.matchAll(RELATIVE_SPECIFIER)) {
      queue.push(resolve(dirname(file), match[1]));
    }
  }
  return { files };
}

function fmt(n) {
  if (n < 1000) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const results = [];
let overruns = 0;
let missing = 0;

for (const [pkg, budget] of targets) {
  const graph = collectEntryGraph(localPackagePath(pkg));
  if (graph.missing !== undefined) {
    results.push({
      pkg,
      status: 'missing',
      budget,
      missing: relative(ROOT, graph.missing),
      isEntry: graph.isEntry,
    });
    missing += 1;
    continue;
  }
  const raw = Buffer.concat(graph.files.map((file) => readFileSync(file)));
  const gzipped = gzipSync(raw, { level: 9 }).length;
  const status = gzipped <= budget ? 'ok' : 'over';
  if (status === 'over') overruns += 1;
  results.push({ pkg, status, gzipped, budget, raw: raw.length });
}

if (results.length === 0) {
  console.log('No size budgets configured (.size-limits.json has no packages). Nothing to check.');
  process.exit(0);
}

// Guard the spread: Math.max() with no args is -Infinity, which would make
// every padEnd() width NaN and garble the table.
const W_PKG = Math.max(...results.map((r) => r.pkg.length)) + 2;

console.log('package'.padEnd(W_PKG) + 'status   raw      gzip     budget');
console.log('-'.repeat(W_PKG + 38));
for (const r of results) {
  if (r.status === 'missing') {
    const why = r.isEntry ? 'no dist - run yarn build first' : `missing ${r.missing}`;
    console.log(`${r.pkg.padEnd(W_PKG)}MISSING                         ${fmt(r.budget)} (${why})`);
    continue;
  }
  const tag = r.status === 'ok' ? 'OK   ' : 'OVER ';
  console.log(
    `${r.pkg.padEnd(W_PKG)}${tag}    ${fmt(r.raw).padEnd(9)}${fmt(r.gzipped).padEnd(9)}${fmt(r.budget)}`,
  );
}

if (UPDATE_MODE) {
  // Write back the current gzipped sizes (rounded up by 5%) as the new
  // budgets. Use after a legitimate growth event; never run blindly to
  // silence overruns.
  for (const r of results) {
    if (r.status === 'ok' || r.status === 'over') {
      budgets.packages[r.pkg] = Math.ceil(r.gzipped * 1.05);
    }
  }
  writeFileSync(BUDGETS_PATH, JSON.stringify(budgets, null, 2) + '\n');
  console.log('\nUpdated .size-limits.json to current sizes (+5% headroom).');
}

if (missing > 0) {
  const chunks = results.filter((r) => r.status === 'missing' && !r.isEntry);
  if (chunks.length > 0) {
    console.error(
      `\n${chunks.length} package(s) have an entry that imports a file which is not there. ` +
        `That is a broken build layout, not a missing build:`,
    );
    for (const r of chunks) console.error(`  ${r.pkg} → ${r.missing}`);
  }
  const entries = missing - chunks.length;
  if (entries > 0)
    console.error(`\n${entries} package(s) missing dist/. Run \`yarn build\` first.`);
  process.exit(1);
}
if (overruns > 0 && !UPDATE_MODE) {
  console.error(`\n${overruns} package(s) over budget.`);
  console.error('Either:');
  console.error('  - explain the growth in the diff and run');
  console.error('    `node scripts/check-sizes.mjs --update` to rebaseline, OR');
  console.error('  - identify the culprit and shrink the bundle.');
  process.exit(1);
}
