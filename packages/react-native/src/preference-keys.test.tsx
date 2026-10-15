/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AccessibilityInfo } from 'react-native';
import { Box } from './Box.js';
import { _setPreferencesForTesting } from './responsive.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function flatten(s: unknown): Record<string, unknown> {
  if (s === null || s === undefined) return {};
  if (Array.isArray(s))
    return s.reduce<Record<string, unknown>>((a, x) => Object.assign(a, flatten(x)), {});
  return s as Record<string, unknown>;
}
const style = (): Record<string, unknown> =>
  flatten(
    JSON.parse(
      container.querySelector('[data-motif-host="View"]')!.getAttribute('data-motif-style') ??
        'null',
    ),
  );

beforeEach(() => {
  _setPreferencesForTesting(null);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete (AccessibilityInfo as unknown as Record<string, unknown>).isDarkerSystemColorsEnabled;
  _setPreferencesForTesting(null);
});

describe('preference keys on native', () => {
  it('switches a value when the preference turns on, and back', () => {
    render(
      <Box bg={{ base: '#ffffff', '@contrast': '#000000' }} p={{ base: 4, '@landscape': 8 }} />,
    );
    expect(style()).toMatchObject({ backgroundColor: '#ffffff', padding: 4 });
    act(() => _setPreferencesForTesting({ contrast: true, landscape: true }));
    expect(style()).toMatchObject({ backgroundColor: '#000000', padding: 8 });
    act(() => _setPreferencesForTesting({ contrast: false }));
    expect(style()).toMatchObject({ backgroundColor: '#ffffff', padding: 8 });
  });

  it("reads the platform's setting through AccessibilityInfo", async () => {
    (AccessibilityInfo as unknown as Record<string, unknown>).isDarkerSystemColorsEnabled = () =>
      Promise.resolve(true);
    render(<Box bg={{ base: '#ffffff', '@contrast': '#000000' }} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(style()).toMatchObject({ backgroundColor: '#000000' });
  });

  it('never applies print or forced colours', () => {
    act(() =>
      _setPreferencesForTesting({ contrast: true, reducedTransparency: true, landscape: true }),
    );
    render(<Box bg={{ base: '#ffffff', '@print': '#000000', '@forcedColors': '#111111' }} />);
    expect(style()).toMatchObject({ backgroundColor: '#ffffff' });
  });
});
