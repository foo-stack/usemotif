/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { Text } from './Text.js';
import { styledSlots } from './styled-slots.js';

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
const styleOf = (host: string, index = 0): Record<string, unknown> => {
  const el = container.querySelectorAll(`[data-motif-host="${host}"]`)[index]!;
  return flatten(JSON.parse(el.getAttribute('data-motif-style') ?? 'null'));
};

const Card = styledSlots({
  slots: { root: Box, title: Text },
  base: { root: { p: 8 } },
  variants: {
    size: {
      sm: { root: { p: 12 }, title: { fontSize: 14 } },
      lg: { root: { p: 24 }, title: { fontSize: 20 } },
    },
  },
  defaultVariants: { size: 'sm' },
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('styledSlots (native)', () => {
  it('carries a variant set on the root to the slots inside it', () => {
    render(
      <Card.root size="lg">
        <Card.title>Plans</Card.title>
      </Card.root>,
    );
    expect(styleOf('View')).toMatchObject({ padding: 24 });
    expect(styleOf('Text')).toMatchObject({ fontSize: 20 });
  });

  it('falls back to the default variant', () => {
    render(
      <Card.root>
        <Card.title>Plans</Card.title>
      </Card.root>,
    );
    expect(styleOf('View')).toMatchObject({ padding: 12 });
    expect(styleOf('Text')).toMatchObject({ fontSize: 14 });
  });
});
