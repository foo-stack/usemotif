import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TokenMap } from '@usemotif/core';

interface ThemeLike {
  readonly name: string;
  readonly tokens: TokenMap;
}

const isTheme = (value: unknown): value is ThemeLike =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ThemeLike).name === 'string' &&
  typeof (value as ThemeLike).tokens === 'object';

/**
 * The themes a module exports, by name: every export shaped like a theme (`{ name, tokens }`),
 * default included. The module can be JavaScript or JSON, or TypeScript on a Node that runs it.
 */
export async function loadThemes(
  path: string,
  cwd = process.cwd(),
): Promise<Record<string, TokenMap>> {
  const url = pathToFileURL(resolve(cwd, path)).href;
  const module = (await (path.endsWith('.json')
    ? import(url, { with: { type: 'json' } })
    : import(url))) as Record<string, unknown>;
  const themes: Record<string, TokenMap> = {};
  for (const value of Object.values(module)) {
    if (isTheme(value)) themes[value.name] = value.tokens;
  }
  if (Object.keys(themes).length === 0) {
    throw new Error(`${path} exports no theme (an object with a name and tokens).`);
  }
  return themes;
}
