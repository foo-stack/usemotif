#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svgToGlyph } from './build.js';

const USAGE = 'usemotif-icons build <folder of .svg files> --out <folder>';

/** Run the CLI; resolves to the exit code, 1 when any icon was rejected. */
export async function main(argv: readonly string[]): Promise<number> {
  const [command, source, ...rest] = argv;
  const at = rest.indexOf('--out');
  const out = at === -1 ? undefined : rest[at + 1];
  if (command !== 'build' || source === undefined || out === undefined) {
    console.error(USAGE);
    return 1;
  }
  const files = (await readdir(resolve(source)))
    .filter((f) => f.toLowerCase().endsWith('.svg'))
    .sort();
  await mkdir(resolve(out), { recursive: true });
  const built: string[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    const result = svgToGlyph(file, await readFile(join(resolve(source), file), 'utf8'));
    if ('error' in result) {
      rejected.push(`${file}: ${result.error}`);
      continue;
    }
    if (built.includes(result.name)) {
      rejected.push(`${file}: another file already became ${result.name}`);
      continue;
    }
    await writeFile(join(resolve(out), `${result.name}.tsx`), result.source);
    built.push(result.name);
  }
  // One module per icon, re-exported by name, so an app bundles only the icons it imports.
  const index = built.map((name) => `export { ${name} } from './${name}.js';\n`).join('');
  await writeFile(join(resolve(out), 'index.ts'), index);
  console.log(
    `usemotif-icons: wrote ${built.length} icon${built.length === 1 ? '' : 's'} to ${out}`,
  );
  for (const line of rejected) console.error(`usemotif-icons: skipped ${line}`);
  return rejected.length > 0 ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
