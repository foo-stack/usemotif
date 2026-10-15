import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import motifTurbopackLoader from './turbopack.js';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'motif-turbopack-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function load(source: string, resourcePath = join(root, 'app', 'page.tsx')): Promise<string> {
  return new Promise((resolve, reject) => {
    motifTurbopackLoader.call(
      {
        resourcePath,
        rootContext: root,
        async: () => (error, code) => (error ? reject(error) : resolve(code!)),
        getOptions: () => ({}),
      },
      source,
    );
  });
}

const CACHE = (): string => join(root, 'node_modules', '.cache', 'usemotif', 'css');

describe('@usemotif/compiler-web/turbopack', () => {
  it("extracts a module's styles to a hashed sheet the module imports, after its directives", async () => {
    const code = await load(
      `'use client';\nimport { Box } from '@usemotif/react';\nexport const X = () => <Box _hover={{ opacity: 0.5 }} />;\n`,
    );
    const [sheet] = readdirSync(CACHE());
    expect(sheet).toMatch(/^[0-9a-f]{16}\.css$/);
    expect(
      code.startsWith(`'use client';\n\nimport "../node_modules/.cache/usemotif/css/${sheet}";`),
    ).toBe(true);
    expect(readFileSync(join(CACHE(), sheet!), 'utf8')).toMatch(
      /^\.m-\w+:hover \{ opacity: 0\.5; \}/,
    );
    expect(code).not.toContain('_hover');
  });

  it('writes one sheet for two modules with the same styles', async () => {
    const src = `import { Box } from '@usemotif/react';\nexport const X = () => <Box _hover={{ m: 2 }} />;\n`;
    await load(src, join(root, 'a.tsx'));
    await load(src, join(root, 'b.tsx'));
    expect(readdirSync(CACHE())).toHaveLength(1);
  });

  it('leaves a module with nothing to extract, and node_modules, untouched', async () => {
    const plain = `export const n = 1;\n`;
    expect(await load(plain)).not.toContain('import');
    const vendored = `import { Box } from '@usemotif/react';\nexport const X = () => <Box p={4} />;\n`;
    expect(await load(vendored, join(root, 'node_modules', 'lib', 'x.tsx'))).toBe(vendored);
  });
});
