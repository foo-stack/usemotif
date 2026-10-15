import { getBreakpoints } from '@usemotif/core';
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The screenshot comparison settings motif's own docs are gated with: a small per-pixel colour
 * threshold, a few hundred differing pixels allowed for anti-aliasing, animations frozen and the
 * caret hidden.
 */
export const VISUAL_SETTINGS = {
  threshold: 0.02,
  maxDiffPixels: 200,
  animations: 'disabled',
  caret: 'hide',
} as const;

/**
 * Wait for the page to settle the way motif's docs do before a screenshot: network idle, fonts
 * loaded, and every animation and transition cut to zero so nothing is caught mid-flight.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
}

/**
 * Switch the page's active theme by renaming the outermost `data-theme` boundary, which is what
 * `ThemeProvider` renders. Every theme passed to the provider already has its variables in the
 * page, so the switch is a pure attribute change.
 */
export async function setTheme(page: Page, theme: string): Promise<void> {
  const found = await page.evaluate((name) => {
    const root = document.querySelector('[data-theme]');
    root?.setAttribute('data-theme', name);
    return root !== null;
  }, theme);
  if (!found) throw new Error('No [data-theme] element to switch; render under a ThemeProvider.');
}

export interface SnapshotAcrossOptions {
  /** The base snapshot name; each shot is `<name>-<theme>-<breakpoint>.png`. */
  readonly name: string;
  /** The theme names to shoot. */
  readonly themes: readonly string[];
  /**
   * Viewport widths by name. Default: `base` at 375 plus motif's configured breakpoints, each shot
   * at its breakpoint's minimum width.
   */
  readonly widths?: Readonly<Record<string, number>>;
  /** Viewport height. Default 800. */
  readonly height?: number;
  /** What to shoot. Default: the whole page. */
  readonly target?: Locator;
  /** How to switch themes, when the app doesn't use a plain `ThemeProvider` boundary. */
  readonly switchTheme?: (page: Page, theme: string) => Promise<void>;
}

/** The default widths: a phone, then each configured breakpoint. */
export function defaultWidths(): Record<string, number> {
  return { base: 375, ...getBreakpoints() };
}

/**
 * Snapshot a page or element in every theme at every breakpoint, with motif's settle and
 * tolerance. Call it from a Playwright test after navigating to the component.
 *
 * @example
 * ```ts
 * import { test } from '@playwright/test';
 * import { snapshotAcross } from '@usemotif/test-utils/visual';
 *
 * test('pricing card', async ({ page }) => {
 *   await page.goto('/pricing');
 *   await snapshotAcross(page, {
 *     name: 'pricing-card',
 *     themes: ['light', 'dark'],
 *     target: page.getByTestId('pricing-card'),
 *   });
 * });
 * ```
 */
export async function snapshotAcross(page: Page, options: SnapshotAcrossOptions): Promise<void> {
  const widths = options.widths ?? defaultWidths();
  const switchTheme = options.switchTheme ?? setTheme;
  for (const [breakpoint, width] of Object.entries(widths)) {
    await page.setViewportSize({ width, height: options.height ?? 800 });
    for (const theme of options.themes) {
      await switchTheme(page, theme);
      await settle(page);
      const shot = `${options.name}-${theme}-${breakpoint}.png`;
      await expect(options.target ?? page).toHaveScreenshot(shot, VISUAL_SETTINGS);
    }
  }
}
