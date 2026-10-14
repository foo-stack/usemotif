/** @vitest-environment jsdom */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Theme } from '@usemotif/core';
import { Input, TextArea } from './forms.js';
import { ThemeProvider } from './Theme.js';

const theme: Theme = {
  name: 't',
  tokens: {
    space: { 2: 8, 3: 12 },
    fontSizes: { md: 16 },
    radii: { md: 8 },
    colors: {
      border: { default: '#ccc' },
      surface: { base: '#fff' },
      text: { default: '#111' },
      action: { danger: { bg: '#d00' } },
    },
  },
};

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() =>
    root.render(
      <ThemeProvider themes={[theme]} active="t">
        {node}
      </ThemeProvider>,
    ),
  );
}

function styleOf(el: Element): Record<string, unknown> {
  const raw = el.getAttribute('data-motif-style');
  const parsed: unknown = raw === null ? {} : JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return Object.assign({}, ...list.filter((x) => x !== null && typeof x === 'object'));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('native Input adornments', () => {
  it('renders the bare input without adornments', () => {
    render(<Input placeholder="x" />);
    const input = container.querySelector('[data-motif-host="TextInput"]')!;
    expect(styleOf(input).borderWidth).toBe(1);
    expect(input.parentElement?.getAttribute('data-motif-host')).not.toBe('View');
  });

  it('puts adornments in a row that carries the surface, wrapping strings in Text', () => {
    render(<Input startElement="$" endElement="USD" />);
    const input = container.querySelector('[data-motif-host="TextInput"]')!;
    const row = input.parentElement!;
    expect(row.getAttribute('data-motif-host')).toBe('View');
    expect(styleOf(row)).toMatchObject({
      flexDirection: 'row',
      paddingInline: 12,
      borderWidth: 1,
      borderColor: '#ccc',
      backgroundColor: '#fff',
    });
    expect(styleOf(input)).toMatchObject({ flex: 1, color: '#111', paddingTop: 8 });
    expect(styleOf(input).borderWidth).toBeUndefined();
    expect(styleOf(input).paddingInline).toBeUndefined();
    const texts = Array.from(row.children).map((c) => c.getAttribute('data-motif-host'));
    expect(texts).toEqual(['Text', 'TextInput', 'Text']);
    expect(row.textContent).toBe('$USD');
  });
});

describe('native TextArea autoResize', () => {
  function props(): Record<string, unknown> {
    const el = container.querySelector('[data-motif-host="TextInput"]')!;
    const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
    return (el as unknown as Record<string, Record<string, unknown>>)[key]!;
  }

  function grow(height: number): void {
    const handler = props().onContentSizeChange as (e: unknown) => void;
    act(() =>
      handler({
        nativeEvent: { contentSize: { width: 200, height } },
      }),
    );
  }

  it('follows the content height between rows and maxRows, scrolling only when capped', () => {
    render(<TextArea autoResize rows={2} maxRows={4} />);
    const el = (): Element => container.querySelector('[data-motif-host="TextInput"]')!;
    grow(30);
    expect(styleOf(el()).height).toBe(48);
    grow(70);
    expect(styleOf(el()).height).toBe(70);
    expect(props().scrollEnabled).toBe(false);
    grow(200);
    expect(styleOf(el()).height).toBe(96);
    expect(props().scrollEnabled).toBe(true);
  });

  it('keeps a fixed height without autoResize', () => {
    render(<TextArea rows={2} />);
    grow(200);
    const el = container.querySelector('[data-motif-host="TextInput"]')!;
    expect(styleOf(el).height).toBeUndefined();
    expect(styleOf(el).minHeight).toBe(48);
  });
});
