import type { MetaFile } from '@vorge/core';

const meta: MetaFile = {
  'getting-started': 'Getting started',
  concepts: 'Concepts',
  components: 'Components',
  headless: 'Headless',
  kit: 'UI kit',
  guides: 'Guides',
  reference: 'API reference',
  recipes: 'Recipes',
  bundlers: 'Bundler setup',
  migrating: 'Migrating',
  adr: 'Architecture decisions',
  // Root-level pages that are reachable on their own routes but do not
  // belong in the docs sidebar - the landing page, the 404, the changelog
  // (linked from the footer), and the dogfood page.
  index: { hidden: true },
  changelog: { hidden: true },
  '404': { hidden: true },
  'styled-with-motif': { hidden: true },
};

export default meta;
