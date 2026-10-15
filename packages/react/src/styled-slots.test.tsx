/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { styledSlots } from './styled-slots.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

const Card = styledSlots({
  slots: { root: 'article', title: 'h3' },
  base: { root: { p: 8 }, title: { fontWeight: 600 } },
  variants: {
    size: {
      sm: { root: { p: 12 }, title: { fontSize: 14 } },
      lg: { root: { p: 24 }, title: { fontSize: 20 } },
    },
    tone: { quiet: { title: { opacity: 0.6 } }, loud: {} },
  },
  compoundVariants: [{ size: 'lg', tone: 'quiet', css: { title: { opacity: 0.8 } } }],
  defaultVariants: { size: 'sm' },
});

const el = (sel: string): HTMLElement => container.querySelector<HTMLElement>(sel)!;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('styledSlots', () => {
  it('styles each slot from its share of the config, with defaults', () => {
    render(
      <Card.root>
        <Card.title>Plans</Card.title>
      </Card.root>,
    );
    expect(el('article').style.padding).toBe('12px');
    expect(el('h3').style.fontSize).toBe('14px');
    expect(el('h3').style.fontWeight).toBe('600');
  });

  it('carries a variant set on the root to the slots inside it', () => {
    render(
      <Card.root size="lg">
        <Card.title>Plans</Card.title>
      </Card.root>,
    );
    expect(el('article').style.padding).toBe('24px');
    expect(el('h3').style.fontSize).toBe('20px');
    expect(el('article').hasAttribute('size')).toBe(false);
  });

  it("lets a slot take its own value, and applies a compound across the slots' values", () => {
    render(
      <Card.root size="lg" tone="quiet">
        <Card.title size="sm">Plans</Card.title>
        <Card.title data-testid="b">More</Card.title>
      </Card.root>,
    );
    const [own, inherited] = container.querySelectorAll<HTMLElement>('h3');
    expect(own!.style.fontSize).toBe('14px');
    expect(own!.style.opacity).toBe('0.6');
    expect(inherited!.style.fontSize).toBe('20px');
    expect(inherited!.style.opacity).toBe('0.8');
  });
});
