import { defineConfig } from '@vorge/core/config';
import pagefind from '@vorge/plugin-pagefind';
import sitemap from '@vorge/plugin-sitemap';
import { fonts } from './plugins/fonts.js';
import { headExtras } from './plugins/head-extras.js';
import { llmsFull } from './plugins/llms-full.js';
import { motifThemes } from './plugins/motif-themes.js';

export default defineConfig({
  title: 'Motif',
  description: 'Cross-platform React styling for web, native, and desktop.',
  theme: './theme',
  server: { port: 4321 },
  markdown: {
    shiki: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    },
  },
  plugins: [
    motifThemes(),
    fonts(),
    headExtras(),
    pagefind(),
    sitemap({
      siteUrl: 'https://usemotif.dev',
      exclude: (route) => route.url === '/404',
    }),
    llmsFull({
      siteUrl: 'https://usemotif.dev',
      exclude: (route) => route.url === '/404',
    }),
  ],
});
