import { defineConfig } from 'tsup';

/**
 * ESM only, deliberately.
 *
 * `unplugin` publishes a single `"."` export pointing at an `.mjs` file and no
 * `require` condition, so there is no CommonJS build of it to link against.
 * This package used to emit CJS and advertise a `require` condition anyway,
 * which meant `require('@usemotif/compiler-web')` threw ERR_REQUIRE_ESM from
 * inside a dependency: a promise the manifest could not keep.
 *
 * Bundling the dependency instead was tried and is worse. It takes the output
 * from 4.7 KB to 139 KB, and still fails at load, because unplugin reads
 * `import.meta` which has no meaning in a CommonJS bundle.
 */
export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    // tsup's dts pipeline trips TS 6's deprecated-`baseUrl` warning. Scope the
    // ignoreDeprecations escape hatch to dts-only so the project's tsconfig
    // stays strict for IDE / typecheck.
    dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
    clean: true,
    treeshake: true,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
  },
  // The Turbopack loader needs none of unplugin, so it also ships as CommonJS for loader
  // runners that `require` their loaders.
  {
    entry: ['src/turbopack.ts'],
    format: ['esm', 'cjs'],
    dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
  },
]);
