/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { Box } from './Box.js';
import { ThemeProvider } from './Theme.js';

const theme = { name: 'light', tokens: { colors: { brand: '#7c3aed' } } };
const sheetText = (root: ShadowRoot): string =>
  root.adoptedStyleSheets.flatMap((s) => Array.from(s.cssRules, (r) => r.cssText)).join('\n');

describe('ThemeProvider styleTarget', () => {
  it('adopts the theme and runtime rules into a shadow root, and removes them on unmount', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.append(mount);
    const root = createRoot(mount);

    await act(async () =>
      root.render(
        <ThemeProvider themes={[theme]} active="light" styleTarget={shadow}>
          <Box id="card" bg="$colors.brand" _hover={{ opacity: 0.5 }} />
        </ThemeProvider>,
      ),
    );
    const css = sheetText(shadow);
    expect(css).toContain('--colors-brand: #7c3aed');
    const cls = shadow
      .querySelector('#card')!
      .className.split(' ')
      .find((c) => c.startsWith('m-'))!;
    expect(css).toContain(`.${cls}:hover`);

    // A rule emitted after registration reaches the target too.
    await act(async () =>
      root.render(
        <ThemeProvider themes={[theme]} active="light" styleTarget={shadow}>
          <Box id="card" bg="$colors.brand" _hover={{ opacity: 0.25 }} />
        </ThemeProvider>,
      ),
    );
    expect(sheetText(shadow)).toContain('opacity: 0.25');

    act(() => root.unmount());
    expect(shadow.adoptedStyleSheets).toHaveLength(0);
    host.remove();
  });
});
