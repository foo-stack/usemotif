import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Story list is read from the built Storybook index. Build first
// (`yarn build`) - the baseline run assumes storybook-static exists.
const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, '../../storybook-static/index.json');

interface IndexEntry {
  readonly id: string;
  readonly title: string;
  readonly name: string;
  readonly type: 'story' | 'docs';
}

function loadStoryIds(): string[] {
  let raw: string;
  try {
    raw = readFileSync(indexPath, 'utf8');
  } catch {
    throw new Error(
      `storybook-static/index.json not found at ${indexPath}. Run \`yarn workspace @usemotif/uikit build\` first.`,
    );
  }
  const index = JSON.parse(raw) as { entries?: Record<string, IndexEntry> };
  return (
    Object.values(index.entries ?? {})
      .filter((e) => e.type === 'story')
      // Motion stories are inherently animated (JS rAF / springs / drag) and
      // can't be frozen by Playwright's CSS `animations: 'disabled'`, so they'd
      // flake. Excluded from VR - verify motion on-device (Phase 7) instead.
      .filter((e) => !e.id.startsWith('motion-'))
      .map((e) => e.id)
  );
}

const storyIds = loadStoryIds();

const FIXED_NOW = new Date('2026-01-15T12:00:00Z');

for (const id of storyIds) {
  test(id, async ({ page }) => {
    // Calendar and DatePicker stories (and Calendar's "today" marker) read the
    // current date, so freeze it: otherwise their snapshots change every day.
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.waitForSelector('#storybook-root', { state: 'attached' });
    // CDN Inter loads async - wait for it so snapshots don't flip between the
    // system-font fallback and the loaded face.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    // Let layout + portals settle.
    await page.waitForTimeout(150);
    await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true });
  });
}
