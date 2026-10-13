#!/usr/bin/env node
/**
 * On-device startup-cost regression gate.
 *
 *   node scripts/check-device-bench.mjs --results <path> [--budgets <path>]
 *
 * Consumes a startup-results JSON emitted by the on-device lane (the schema is
 * documented in benchmarks/rn-startup/README.md) and fails if motif adds more
 * than the budgeted startup cost over the plain-React-Native baseline, summed
 * across the two phases the styling library actually affects:
 *
 *   - bundleParseMs - runtimeInit → bundleLoaded (engine bootstrap + bundle parse)
 *   - moduleEvalMs  - bundleLoaded → first JS execution complete (module-graph eval)
 *
 * Scope: the on-device MEASUREMENT needs a built native app and a simulator /
 * device / device-cloud and is NOT performed here (see the device-bench lane in
 * .github/workflows/bench.yml). This script is the regression CHECK over
 * whatever that lane emits. It is self-tested in CI against
 * benchmarks/rn-startup/results/example.json - a clearly-labelled fixture, NOT a
 * real measurement - so the gate logic is exercised on every push without
 * hardware. The day the lane runs on real hardware, it emits the same schema and
 * this gate runs unchanged.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const resultsArg = argValue('--results');
if (resultsArg === undefined) {
  console.error('usage: node scripts/check-device-bench.mjs --results <path> [--budgets <path>]');
  process.exit(2);
}
const budgetsPath = argValue('--budgets') ?? `${ROOT}/benchmarks/rn-startup/.device-budgets.json`;

let results;
let budgets;
try {
  results = JSON.parse(readFileSync(resolve(resultsArg), 'utf8'));
} catch (e) {
  fail(`could not read results JSON at ${resultsArg}: ${e.message}`);
}
try {
  budgets = JSON.parse(readFileSync(resolve(budgetsPath), 'utf8'));
} catch (e) {
  fail(`could not read budgets JSON at ${budgetsPath}: ${e.message}`);
}

// ─── Phases the styling library affects, in startup order ──────────
const PHASES = [
  { key: 'bundleParseMs', label: 'bundle parse (runtimeInit→bundleLoaded)' },
  { key: 'moduleEvalMs', label: 'module eval (bundleLoaded→firstExec)' },
];

// ─── Validate the emitted shape loudly - a malformed device emission
//     must FAIL the gate, never silently pass ────────────────────────
const variants = results.variants;
if (typeof variants !== 'object' || variants === null) {
  fail('results JSON is missing a `variants` object.');
}
for (const name of ['motif', 'baseline']) {
  const v = variants[name];
  if (typeof v !== 'object' || v === null) {
    fail(`results JSON is missing the \`variants.${name}\` object.`);
  }
  for (const { key } of PHASES) {
    if (typeof v[key] !== 'number' || !Number.isFinite(v[key])) {
      fail(`\`variants.${name}.${key}\` must be a finite number (ms).`);
    }
  }
}

const maxAddedMs = budgets.maxAddedMs;
if (typeof maxAddedMs !== 'number' || !Number.isFinite(maxAddedMs)) {
  fail('budgets JSON must define a finite `maxAddedMs`.');
}

// ─── Compute motif's added cost per phase + total ──────────────────
const rows = PHASES.map(({ key, label }) => {
  const motif = variants.motif[key];
  const base = variants.baseline[key];
  return { label, motif, base, delta: motif - base };
});
const addedMs = rows.reduce((sum, r) => sum + r.delta, 0);

// ─── Report ────────────────────────────────────────────────────────
const device = typeof results.device === 'string' ? results.device : 'unknown device';
const samples = typeof results.samples === 'number' ? results.samples : undefined;
console.log(`On-device startup gate - ${device}${samples ? ` (median of ${samples})` : ''}`);
if (results.fixture === true) {
  console.log('NOTE: results are a labelled FIXTURE (illustrative, not a real measurement).');
}
console.log('');

function ms(n) {
  return `${n.toFixed(1)}ms`;
}
const W = Math.max(...rows.map((r) => r.label.length)) + 2;
console.log(`${'phase'.padEnd(W)}${'motif'.padEnd(11)}${'baseline'.padEnd(11)}added`);
console.log('-'.repeat(W + 28));
for (const r of rows) {
  console.log(
    `${r.label.padEnd(W)}${ms(r.motif).padEnd(11)}${ms(r.base).padEnd(11)}${r.delta >= 0 ? '+' : ''}${ms(r.delta)}`,
  );
}
console.log('-'.repeat(W + 28));
console.log(
  `${'motif added over baseline'.padEnd(W)}${''.padEnd(22)}${addedMs >= 0 ? '+' : ''}${ms(addedMs)}  (budget ≤ ${ms(maxAddedMs)})`,
);

if (addedMs > maxAddedMs) {
  console.error(
    `\nBREACH: motif adds ${ms(addedMs)} to startup, over the ${ms(maxAddedMs)} budget.`,
  );
  console.error('Either motif regressed on startup cost, or the budget genuinely moved.');
  console.error('investigate the cause, or adjust benchmarks/rn-startup/.device-budgets.json');
  console.error('deliberately with an explanation in the diff.');
  process.exit(1);
}
console.log(`\nOK: motif's added startup cost is within budget.`);
