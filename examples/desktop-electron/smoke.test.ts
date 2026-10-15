import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, expect, test } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));

// Launches the real Electron app and asserts the shared <DemoScreen/> painted.
// This is the proof "first-class desktop" rests on: the same component the web
// renders is alive in a desktop window. Requires the desktop-web build to
// exist (`yarn workspace @usemotif/example-desktop-web build`).
test('renders the shared demo in an Electron window', async () => {
  const app = await electron.launch({ args: [join(here, 'main.js')] });
  try {
    const window = await app.firstWindow();
    // Assert the demo rendered into the DOM. Use attachment, not visibility:
    // under xvfb the element renders but Playwright's visibility heuristic is
    // unreliable in the virtual framebuffer (the window isn't truly painted).
    // Presence is enough for a smoke - it proves the React tree mounted.
    // The heading proves the themed primitives mounted and resolved tokens.
    await expect(window.getByText('motif on the desktop')).toBeAttached();
    // The interactive control proves Button + state are in the tree.
    await expect(window.getByText(/Toggle theme/)).toBeAttached();
    // The title bar drags the window and its trailing slot does not. jsdom drops `app-region`,
    // so this is where TitleBar's drag region is proven.
    const bar = window.getByText('motif desktop demo').locator('xpath=../..');
    const region = (el: Element): string => {
      const style = getComputedStyle(el);
      return style.getPropertyValue('app-region') || style.getPropertyValue('-webkit-app-region');
    };
    expect(await bar.evaluate(region)).toBe('drag');
    // The last child is the overlay inset; the trailing slot sits just before it.
    expect(await bar.locator('xpath=./*[last()-1]').evaluate(region)).toBe('no-drag');
  } finally {
    await app.close();
  }
});
