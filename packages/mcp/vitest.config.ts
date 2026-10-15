import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@usemotif/mcp',
    include: ['src/**/*.test.ts'],
  },
});
