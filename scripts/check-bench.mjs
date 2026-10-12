#!/usr/bin/env node
/**
 * Benchmark regression gate.
 *
 *   node scripts/check-bench.mjs            # exits non-zero on a ratio breach
 *   node scripts/check-bench.mjs --update   # rewrites budgets to 60% of the
 *                                           # freshly observed ratios (use
 *                                           # after a considered change)
 *
 * Runs the cross-library `data-table` bench suite and checks each
 * motif-vs-baseline throughput ratio against the floor in
 * `benchmarks/.bench-budgets.json`.
 *
 * Why ratios, not absolute hz: absolute throughput depends on the machine, so
 * a hz budget either flakes on slow CI runners or never catches a regression
 * on fast ones. The ratio of two benches measured WITHIN the same run is
 * machine-independent - it encodes the actual claim ("motif stays an order of
 * magnitude ahead on the table workload"), and it breaches only when motif
 * regresses or the baseline closes the gap. Either is worth a human look.
 *
 * This is the web-shared style-resolution guardrail (jsdom SSR). On-device
 * frame timing is a separate, manual methodology - see
 * `benchmarks/rn-startup/README.md`.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const BUDGETS_PATH = `${ROOT}/benchmarks/.bench-budgets.json`;
const UPDATE_MODE = process.argv.includes('--update');

const budgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8'));

// ─── Run the bench suite, capturing per-bench hz as JSON ───────────
const outPath = `${mkdtempSync(`${tmpdir()}/motif-bench-`)}/results.json`;
console.log('Running data-table bench suite (this takes ~15s)...\n');
execFileSync(
  'yarn',
  ['workspace', '@usemotif-bench/data-table', 'bench', `--outputJson=${outPath}`],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
);
const report = JSON.parse(readFileSync(outPath, 'utf8'));

// ─── Index every bench's hz by (file basename, name) ───────────────
// The same label ("motif runtime") appears in several bench files, so checks
// are scoped by file.
const byFile = new Map();
for (const file of report.files ?? []) {
  const key = basename(file.filepath ?? '');
  const benches = [];
  for (const group of file.groups ?? []) {
    for (const b of group.benchmarks ?? []) benches.push(b);
  }
  byFile.set(key, benches);
}

function findHz(fileFragment, nameFragment) {
  for (const [fileKey, benches] of byFile) {
    if (!fileKey.includes(fileFragment)) continue;
    const match = benches.find((b) => b.name.includes(nameFragment));
    if (match) return match.hz;
  }
  return undefined;
}

// ─── Evaluate each check ───────────────────────────────────────────
const results = [];
let breaches = 0;
let missing = 0;

for (const check of budgets.checks) {
  const motifHz = findHz(check.file, check.bench);
  const baseHz = findHz(check.file, check.baseline);
  if (motifHz === undefined || baseHz === undefined || baseHz === 0) {
    results.push({ check, status: 'missing' });
    missing += 1;
    continue;
  }
  const ratio = motifHz / baseHz;
  const status = ratio >= check.minRatio ? 'ok' : 'breach';
  if (status === 'breach') breaches += 1;
  results.push({ check, status, ratio });
}

const W = Math.max(...results.map((r) => r.check.label.length)) + 2;
console.log('check'.padEnd(W) + 'status   observed   floor');
console.log('-'.repeat(W + 26));
for (const r of results) {
  if (r.status === 'missing') {
    console.log(
      `${r.check.label.padEnd(W)}MISSING  (bench "${r.check.bench}"/"${r.check.baseline}" not found)`,
    );
    continue;
  }
  const tag = r.status === 'ok' ? 'OK    ' : 'BREACH';
  console.log(
    `${r.check.label.padEnd(W)}${tag}   ${`${r.ratio.toFixed(1)}×`.padEnd(10)}≥ ${r.check.minRatio}×`,
  );
}

if (UPDATE_MODE) {
  // Write back 60% of the freshly observed ratios as the new floors - leaves
  // 40% headroom for runner variance. Use deliberately after a considered
  // change; never run blindly to silence a breach.
  for (const r of results) {
    if (r.status === 'ok' || r.status === 'breach') {
      r.check.minRatio = Math.max(1, Math.floor(r.ratio * 0.6));
    }
  }
  writeFileSync(BUDGETS_PATH, JSON.stringify(budgets, null, 2) + '\n');
  console.log('\nUpdated benchmarks/.bench-budgets.json to 60% of observed ratios (40% headroom).');
}

if (missing > 0) {
  console.error(`\n${missing} check(s) could not find their benches - did a bench get renamed?`);
  process.exit(1);
}
if (breaches > 0 && !UPDATE_MODE) {
  console.error(`\n${breaches} ratio(s) below floor.`);
  console.error('Either:');
  console.error('  - motif regressed on this workload - find and fix the cause, OR');
  console.error('  - the gap genuinely shifted; explain it in the diff and run');
  console.error('    `node scripts/check-bench.mjs --update` to rebaseline.');
  process.exit(1);
}
console.log(`\n${results.length} ratio(s) within budget.`);
