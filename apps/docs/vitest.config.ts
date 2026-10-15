import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@usemotif/docs',
    include: ['plugins/**/*.test.ts', 'components/**/*.test.ts'],
  },
});
