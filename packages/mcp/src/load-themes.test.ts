import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadThemes } from './load-themes.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'usemotif-mcp-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('loadThemes', () => {
  it('collects every theme a module exports, by name', async () => {
    writeFileSync(
      join(dir, 'theme.mjs'),
      `export const a = { name: 'brand-light', tokens: { colors: { x: '#fff' } } };
       export default { name: 'brand-dark', tokens: { colors: { x: '#000' } } };
       export const helper = 1;`,
    );
    const themes = await loadThemes('theme.mjs', dir);
    expect(Object.keys(themes).sort()).toEqual(['brand-dark', 'brand-light']);
  });

  it('fails clearly on a module with no theme', async () => {
    writeFileSync(join(dir, 'none.mjs'), 'export const n = 1;');
    await expect(loadThemes('none.mjs', dir)).rejects.toThrow('exports no theme');
  });
});
