import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@usemotif/ui',
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // The native components run under `vitest.native.config.ts`.
    exclude: ['src/**/*.native.test.tsx', '**/node_modules/**'],
  },
});
