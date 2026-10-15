/** @vitest-environment jsdom */
import { lightTheme } from '@usemotif/tokens';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider } from 'usemotif';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarChart } from './index.native.js';

// react-native-svg is an optional peer the test environment does not install.
vi.mock('usemotif', async (original) => ({
  ...(await original<object>()),
  SVG_PRIMITIVES: { Path: 'path', Rect: 'rect', Line: 'line' },
  Svg: ({ children }: { children?: ReactNode }) => <svg>{children}</svg>,
}));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('charts on React Native', () => {
  it('labels the chart for accessibility and paints with resolved theme colours', () => {
    act(() =>
      root.render(
        <ThemeProvider themes={[lightTheme]} active={lightTheme.name}>
          <BarChart
            label="Visits"
            data={[
              { label: 'Mon', value: 3 },
              { label: 'Tue', value: 5 },
            ]}
          />
        </ThemeProvider>,
      ),
    );
    const image = container.querySelector('[data-motif-host="View"]')!;
    const key = Object.keys(image).find((k) => k.startsWith('__reactProps'))!;
    const props = (image as unknown as Record<string, Record<string, unknown>>)[key]!;
    expect(props.role).toBe('img');
    expect(props['aria-label']).toBe('Visits: Mon 3, Tue 5');
    const fills = [...container.querySelectorAll('rect')].map((r) => r.getAttribute('fill'));
    expect(fills).toHaveLength(2);
    for (const fill of fills) expect(fill).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
