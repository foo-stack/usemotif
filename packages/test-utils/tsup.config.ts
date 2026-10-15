import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/visual.ts'],
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
});
