import { defineConfig } from 'tsup';

const shared = {
  // tsup's dts pipeline trips TS 6's deprecated-`baseUrl` warning. Scope the
  // ignoreDeprecations escape hatch to dts-only so the project's tsconfig
  // stays strict for IDE / typecheck.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist',
} as const;

export default defineConfig([
  { ...shared, entry: ['src/index.ts', 'src/export.ts'], format: ['esm', 'cjs'], clean: true },
  // The CLI runs under Node as ESM only.
  { ...shared, entry: ['src/cli.ts'], format: ['esm'], dts: false },
]);
