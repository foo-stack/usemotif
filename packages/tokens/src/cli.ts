#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Theme } from '@usemotif/core';
import { exportTheme, type TokenExportFormat } from './export.js';
import { darkTheme, highContrastDarkTheme, highContrastLightTheme, lightTheme } from './themes.js';

const USAGE = `usemotif-tokens export <theme> --format <css|json|w3c|swift|kotlin> [--out file] [--name TypeName] [--export name]

<theme> is a preset (light, dark, high-contrast-light, high-contrast-dark), a .json theme file,
or a JavaScript module exporting a theme as its default export or as --export.`;

const FORMATS: readonly TokenExportFormat[] = ['css', 'json', 'w3c', 'swift', 'kotlin'];
const PRESETS: Readonly<Record<string, Theme>> = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast-light': highContrastLightTheme,
  'high-contrast-dark': highContrastDarkTheme,
};

const isTheme = (value: unknown): value is Theme =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Theme).name === 'string' &&
  typeof (value as Theme).tokens === 'object';

async function loadTheme(source: string, exportName: string | undefined): Promise<Theme> {
  const preset = PRESETS[source];
  if (preset !== undefined) return preset;
  const path = resolve(source);
  const loaded: unknown = path.endsWith('.json')
    ? JSON.parse(await readFile(path, 'utf8'))
    : await import(pathToFileURL(path).href).then(
        (mod: Record<string, unknown>) => mod[exportName ?? 'default'],
      );
  if (!isTheme(loaded)) {
    throw new Error(`${source} does not export a theme${exportName ? ` named ${exportName}` : ''}`);
  }
  return loaded;
}

/** Run the CLI; resolves to the exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  const [command, source, ...rest] = argv;
  const flag = (name: string): string | undefined => {
    const at = rest.indexOf(`--${name}`);
    return at === -1 ? undefined : rest[at + 1];
  };
  const format = flag('format') as TokenExportFormat | undefined;
  if (
    command !== 'export' ||
    source === undefined ||
    format === undefined ||
    !FORMATS.includes(format)
  ) {
    console.error(USAGE);
    return 1;
  }
  try {
    const theme = await loadTheme(source, flag('export'));
    const name = flag('name');
    const output = exportTheme(theme, format, name === undefined ? {} : { name });
    const out = flag('out');
    if (out === undefined) process.stdout.write(output);
    else await writeFile(out, output);
    return 0;
  } catch (error) {
    console.error(`usemotif-tokens: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

// Run when executed, not when imported by a test.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
