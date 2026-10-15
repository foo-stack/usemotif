import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

/**
 * Run the data-table bench suite and return each file's benches (name and hz), keyed by the
 * bench file's name. The same label ("motif runtime") appears in several files, so lookups are
 * scoped by file.
 */
export function runBenchSuite() {
  const outPath = `${mkdtempSync(`${tmpdir()}/motif-bench-`)}/results.json`;
  console.log('Running data-table bench suite (this takes ~15s)...\n');
  execFileSync(
    'yarn',
    ['workspace', '@usemotif-bench/data-table', 'bench', `--outputJson=${outPath}`],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const report = JSON.parse(readFileSync(outPath, 'utf8'));
  const byFile = new Map();
  for (const file of report.files ?? []) {
    const benches = [];
    for (const group of file.groups ?? []) {
      for (const b of group.benchmarks ?? []) benches.push(b);
    }
    byFile.set(basename(file.filepath ?? ''), benches);
  }
  return byFile;
}

/** The hz of the first bench whose name contains `nameFragment`, in a file matching `fileFragment`. */
export function benchHz(byFile, fileFragment, nameFragment) {
  for (const [fileKey, benches] of byFile) {
    if (!fileKey.includes(fileFragment)) continue;
    const match = benches.find((b) => b.name.includes(nameFragment));
    if (match) return match.hz;
  }
  return undefined;
}
