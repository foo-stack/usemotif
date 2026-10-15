import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@usemotif/icons',
    environment: 'jsdom',
    include: ['src/icons.test.tsx', 'src/icons.test.ts', 'src/build.test.ts'],
  },
});
