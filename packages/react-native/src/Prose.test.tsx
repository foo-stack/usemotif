/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Linking } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prose } from './Prose.js';

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
  vi.restoreAllMocks();
});

const propsOf = (el: Element): Record<string, unknown> =>
  (el as unknown as Record<string, Record<string, unknown>>)[
    Object.keys(el).find((k) => k.startsWith('__reactProps'))!
  ]!;

describe('Prose (native)', () => {
  it('renders Markdown with motif primitives', () => {
    const open = vi.spyOn(Linking, 'openURL').mockResolvedValue(true);
    act(() =>
      root.render(
        <Prose
          markdown={
            '## Title\n\nA **b** [go](https://a.dev)\n\n1. one\n2. two\n\n![Chart](https://a.dev/c.png)'
          }
        />,
      ),
    );
    const texts = [...container.querySelectorAll('[data-motif-host="Text"]')];
    const heading = texts.find((t) => propsOf(t).accessibilityRole === 'header')!;
    expect(heading.textContent).toBe('Title');
    const link = texts.find((t) => propsOf(t).accessibilityRole === 'link')!;
    expect(link.textContent).toBe('go');
    act(() => (propsOf(link).onPress as () => void)());
    expect(open).toHaveBeenCalledWith('https://a.dev');
    expect(texts.map((t) => t.textContent)).toEqual(
      expect.arrayContaining(['1.', '2.', 'one', 'two']),
    );
    expect(container.querySelector('[data-motif-host="Image"]')).not.toBeNull();
  });
});
