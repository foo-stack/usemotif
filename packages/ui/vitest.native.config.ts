import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The kit's React Native entry, rendered through the repo's React Native mock.
// Resolving with the `react-native` condition picks the native builds of
// `usemotif`, `@usemotif/headless` and the icon glyphs' SVG primitives.
const conditions = ['react-native', 'import', 'module', 'default'];

export default defineConfig({
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
