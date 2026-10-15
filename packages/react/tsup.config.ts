import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

const DIRECTIVE = "'use client';\n";

/**
 * Prepend `'use client'` to the bundled output. Marks the whole bundle
 * as a client reference so Next App Router treats every export
 * accordingly - they still SSR (client components render server-side as
 * part of the SSR pass), just no longer count as pure RSC. Practical
 * norm for runtime CSS-in-JS (Tamagui / Mantine / Chakra all do this);
 * future per-entry splitting could relax this for the hookless
 * primitives (Box / Stack / Text / Container).
 *
 * tsup's `banner` option is stripped by esbuild's treeshake when the
 * banner is a free string expression, so we prepend post-build.
 */
async function prependUseClient(): Promise<void> {
  // The server entry runs on Node and must NOT be marked a client
  // reference; every other entry gets the directive. The `svg` entry
  // (Icon / Svg) carries it to stay consistent with the barrel - leaf
  // glyphs were already client components when imported from there.
  // The tanstack-virtual sub-export is a client component (uses
  // useVirtualizer + refs) so it gets the directive too.
  for (const file of [
    'dist/index.js',
    'dist/index.cjs',
    'dist/svg.js',
    'dist/svg.cjs',
    'dist/virtualizers/tanstack.js',
    'dist/virtualizers/tanstack.cjs',
  ]) {
    const content = await readFile(file, 'utf8');
    if (!content.startsWith(DIRECTIVE)) {
      await writeFile(file, DIRECTIVE + content);
    }
  }
}

export default defineConfig({
  // Object form so the `svg` entry's output is `dist/svg.js` even
  // though its source is `svg-entry.ts` - the source can't be named
  // `svg.ts` because it would collide with `Svg.tsx` on a
  // case-insensitive filesystem.
  entry: {
    index: 'src/index.ts',
    svg: 'src/svg-entry.ts',
    // Native twin of the `svg` entry - resolved via the `react-native`
    // export condition so `@usemotif/icons` glyphs render through
    // `react-native-svg` instead of an inline `<svg>` host.
    'svg.native': 'src/svg-entry.native.ts',
    server: 'src/server.ts',
    // Test tooling for consumers: `renderStyles`. Runs under Node in a test
    // runner, so it carries no `'use client'`.
    testing: 'src/testing.ts',
    // Server Component primitives. No directive: they render on the server, and reach the
    // client primitives only through the rewritten `_client-entry` below.
    rsc: 'src/rsc.tsx',
    'virtualizers/tanstack': 'src/virtualizers/tanstack.tsx',
  },
  format: ['esm', 'cjs'],
  // tsup's dts pipeline trips TS 6's deprecated-`baseUrl` warning. Scope the
  // ignoreDeprecations escape hatch to dts-only so the project's tsconfig
  // stays strict for IDE / typecheck.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist',
  onSuccess: prependUseClient,
  esbuildPlugins: [
    {
      // The RSC entry's client fallbacks import the package's own `'use client'` entry, so a
      // Server Component gets client references. Bundling `./index.js` in instead would put
      // client code, and its module-level `createContext`, in the server graph.
      name: 'client-entry-self-reference',
      setup(build) {
        build.onResolve({ filter: /\/_client-entry\.js$/ }, () => ({
          path: '@usemotif/react',
          external: true,
        }));
      },
    },
  ],
});
