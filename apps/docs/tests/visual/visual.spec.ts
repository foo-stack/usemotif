import { type Page, expect, test } from '@playwright/test';

// A curated sample, not every page - one or two per section, plus one of
// each page template (per-component, headless, reference, recipe, ADR) so a
// template regression is caught without snapshotting all 168 routes.
const ROUTES = [
  '/',
  '/404',
  '/changelog',
  '/styled-with-motif',
  '/getting-started/introduction',
  '/getting-started/installation',
  '/getting-started/your-first-style',
  '/getting-started/cross-platform',
  '/getting-started/with-an-example',
  '/concepts/composition',
  '/concepts/responsive',
  '/concepts/theming',
  '/concepts/tokens',
  '/concepts/variants',
  '/concepts/compiler',
  '/concepts/mental-model',
  '/concepts/style-props',
  '/concepts/ssr-and-hydration',
  '/components',
  '/components/layout/box',
  '/components/interactive/button',
  '/components/forms/input',
  '/components/typography/heading',
  '/headless',
  '/headless/overlay/dialog',
  '/headless/menu/menu',
  '/headless/disclosure/tabs',
  '/guides/performance',
  '/guides/server-rendering',
  '/guides/testing',
  '/guides/contributing',
  // Both were rewritten while correcting claims they made that the repository
  // did not support, and neither had a baseline at the time. A page nothing
  // watches is how that drift survived.
  '/guides/desktop',
  '/bundlers/webpack-swc',
  '/reference/create-theme',
  '/reference/styled',
  '/reference/breakpoints',
  '/reference/test-utils',
  '/reference/icons',
  '/reference/compiler-core',
  '/recipes/dark-mode-toggle',
  '/recipes/design-system-from-scratch',
  '/recipes/from-styled-components',
  '/recipes/animation-patterns',
  '/bundlers/vite',
  '/bundlers/next',
  '/migrating/v1-to-v2',
  '/migrating/v2-to-v3',
  '/migrating/from-other-libraries',
  '/adr',
  '/adr/0001-renderer-model',
  '/adr/0008-versioning-policy',
] as const;

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // "Updated N months ago" is measured against the current date, so its text
  // and width drift as time passes. Pin it so the snapshot only changes when
  // the page does.
  await page.getByText(/^Updated /).evaluateAll((els) => {
    for (const el of els) el.textContent = 'Updated 1 month ago';
  });
  await page.addStyleTag({
    content: `
      .marquee__track { animation: none !important; transform: none !important; }
      *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
    `,
  });
}

for (const route of ROUTES) {
  test(`visual ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });
    await settle(page);
    const slug = route === '/' ? 'home' : route.slice(1).replace(/\//g, '_');
    await expect(page).toHaveScreenshot(`${slug}.png`, { fullPage: true });
  });
}
