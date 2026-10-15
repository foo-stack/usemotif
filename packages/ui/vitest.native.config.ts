import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The kit's React Native entry, rendered through the repo's React Native mock.
// Resolving with the `react-native` condition picks the native builds of
// `usemotif`, `@usemotif/headless` and the icon glyphs' SVG primitives.
const conditions = ['react-native', 'import', 'module', 'default'];

// Resolve `./x.js` to a `x.native.tsx` / `x.native.ts` sibling when one exists,
// as the native build does.
const preferNative = {
  name: 'prefer-native-modules',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined) {
    if (importer === undefined || !/^\.\.?\//.test(source)) return null;
    const base = resolve(dirname(importer), source.replace(/\.js$/, ''));
    for (const ext of ['.native.tsx', '.native.ts']) {
      if (existsSync(base + ext)) return base + ext;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [preferNative],
  resolve: {
    conditions,
    alias: {
      'react-native': fileURLToPath(
        new URL('../react-native/src/__test-setup__/react-native-mock.tsx', import.meta.url),
      ),
    },
  },
  ssr: { resolve: { conditions } },
  test: {
    name: '@usemotif/ui (native)',
    environment: 'jsdom',
    include: ['src/**/*.native.test.tsx'],
  },
});
