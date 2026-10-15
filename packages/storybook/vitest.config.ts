import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@usemotif/storybook',
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
});
