import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { darkTheme, lightTheme } from '@usemotif/tokens';
import { motifPreview } from './index.js';

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

const preview = motifPreview({
  themes: [lightTheme, darkTheme],
  breakpoints: { sm: 640, md: 768, xl: 1280 },
});

function renderStory(globals: Record<string, unknown>): void {
  // Storybook allows one decorator or a list.
  const decorator = [preview.decorators].flat()[0] as unknown as (
    Story: () => ReactElement,
    context: { globals: Record<string, unknown> },
  ) => ReactElement;
  act(() => {
    root.render(decorator(() => createElement('p', { id: 'story' }, 'story'), { globals }));
  });
}

describe('motifPreview', () => {
  it('wraps each story in the chosen theme and direction', () => {
    renderStory({ motifTheme: 'dark', motifDirection: 'rtl' });
    const story = container.querySelector('#story')!;
    expect(story.closest('[data-theme]')!.getAttribute('data-theme')).toBe('dark');
    expect(story.closest('[dir]')!.getAttribute('dir')).toBe('rtl');
  });

  it('falls back to the first theme and left to right', () => {
    renderStory({});
    const story = container.querySelector('#story')!;
    expect(story.closest('[data-theme]')!.getAttribute('data-theme')).toBe('light');
    expect(story.closest('[dir]')?.getAttribute('dir') ?? 'ltr').toBe('ltr');
  });

  it('offers every theme and both directions in the toolbar', () => {
    const items = (key: string) =>
      (preview.globalTypes![key]!.toolbar as { items: { value: string }[] }).items.map(
        (i) => i.value,
      );
    expect(items('motifTheme')).toEqual(['light', 'dark']);
    expect(items('motifDirection')).toEqual(['ltr', 'rtl']);
    expect(preview.initialGlobals).toEqual({ motifTheme: 'light', motifDirection: 'ltr' });
  });

  it('adds a viewport at each breakpoint', () => {
    const options = (
      preview.parameters as {
        viewport: { options: Record<string, { styles: { width: string }; type: string }> };
      }
    ).viewport.options;
    expect(Object.keys(options)).toEqual(['motif-sm', 'motif-md', 'motif-xl']);
    expect(options['motif-md']).toMatchObject({ styles: { width: '768px' }, type: 'tablet' });
    expect(options['motif-sm']!.type).toBe('mobile');
  });
});
