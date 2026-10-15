#!/usr/bin/env node
/**
 * Record the benchmark ratios the docs publish.
 *
 *   node scripts/bench-report.mjs                  # writes benchmarks/results.json
 *   node scripts/bench-report.mjs --out <path>     # writes elsewhere (CI uploads it)
 *
 * Each ratio is motif's throughput divided by a library's on the same workload in the same run,
 * so it holds across machines where absolute ops/sec does not. The docs benchmark page renders the
 * committed file, and every ratio it shows is recorded in .claims.json against this file, so
 * regenerating it fails `yarn claims:check` until the ledger is updated to match. That is the point:
 * a published number changes only on purpose.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { arch, cpus, platform } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { benchHz, runBenchSuite } from './_bench-run.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const at = process.argv.indexOf('--out');
const OUT = at === -1 ? `${ROOT}/benchmarks/results.json` : resolve(process.argv[at + 1]);

/**
 * Each workload: motif's benches (the runtime, and the compiler's output where the suite has it),
 * and the libraries they are compared with.
 */
const WORKLOADS = [
  {
    id: 'data-table',
    label: 'Data table: 100 rows of 12 styled cells',
    file: 'data-table.bench',
    motif: { runtime: 'motif runtime', compiled: 'motif compiled-stripped' },
    against: { Tamagui: 'Tamagui', Emotion: 'Emotion', StyleX: 'StyleX', Panda: 'Panda' },
  },
  {
    id: 'deep-tree',
    label: 'Deep tree: 150 nested styled boxes',
    file: 'deep-tree.bench',
    motif: { runtime: 'motif runtime', compiled: 'motif compiled-stripped' },
    against: { Tamagui: 'Tamagui' },
  },
  {
    id: 'theme-switch',
    label: 'Theme switch across 300 styled boxes',
    file: 'theme-switch.bench',
    motif: { runtime: 'motif - ' },
    against: { Tamagui: 'Tamagui' },
  },
];

const byFile = runBenchSuite();
// Two decimals, so a ratio below 1 can be read back as "N times slower" without losing precision.
const round = (n) => Math.round(n * 100) / 100;
const ratios = {};
const workloads = [];
for (const w of WORKLOADS) {
  ratios[w.id] = {};
  for (const [variant, motifFragment] of Object.entries(w.motif)) {
    const motifHz = benchHz(byFile, w.file, motifFragment);
    if (motifHz === undefined) throw new Error(`No "${motifFragment}" bench in ${w.file}.`);
    ratios[w.id][variant] = {};
    for (const [library, fragment] of Object.entries(w.against)) {
      const hz = benchHz(byFile, w.file, fragment);
      if (hz === undefined || hz === 0) throw new Error(`No "${fragment}" bench in ${w.file}.`);
      ratios[w.id][variant][library] = round(motifHz / hz);
    }
  }
  workloads.push({ id: w.id, label: w.label, variants: Object.keys(w.motif) });
}

const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: ROOT })
  .toString()
  .trim();
const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  commit,
  environment: `Node ${process.versions.node}, ${platform()} ${arch()}, ${cpus()[0]?.model ?? 'unknown CPU'}`,
  note: "Each ratio is motif's ops/sec over the library's, measured in one run with Vitest bench in jsdom. Above 1 means motif is faster.",
  workloads,
  ratios,
};
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
for (const [id, byVariant] of Object.entries(ratios)) {
  for (const [variant, byLib] of Object.entries(byVariant)) {
    console.log(
      `  ${id} ${variant}: ${Object.entries(byLib)
        .map(([l, r]) => `${l} ${r}x`)
        .join(', ')}`,
    );
  }
}
