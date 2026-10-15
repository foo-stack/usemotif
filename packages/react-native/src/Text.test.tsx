/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Text } from './Text.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
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

describe('native Text - lines prop (#31)', () => {
  it('renders without numberOfLines when `lines` is omitted', () => {
    render(<Text>plain</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('data-motif-host')).toBe('Text');
    expect(el.getAttribute('numberOfLines')).toBeNull();
  });

  it('lines={1} passes through as numberOfLines=1 on the RN Text host', () => {
    render(<Text lines={1}>truncate me</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('numberOfLines')).toBe('1');
  });

  it('lines={3} passes through as numberOfLines=3', () => {
    render(<Text lines={3}>truncate to three lines</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('numberOfLines')).toBe('3');
  });

  it('preserves the underlying RN Text host and other props', () => {
    render(
      <Text lines={2} fontSize={16}>
        styled
      </Text>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('data-motif-host')).toBe('Text');
    expect(el.getAttribute('numberOfLines')).toBe('2');
    // Style prop survives (the RN mock JSON-stringifies it onto data-motif-style).
    const styleAttr = el.getAttribute('data-motif-style');
    expect(styleAttr).toBeTruthy();
    expect(styleAttr).toContain('"fontSize":16');
  });
});

describe('native Text - font scaling', () => {
  it("caps the system text size at the theme's fontScale.max, and a prop overrides it", async () => {
    const { ThemeProvider } = await import('./Theme.js');
    const theme = { name: 't', tokens: { fontScale: { max: 1.5 } } };
    render(
      <ThemeProvider themes={[theme]} active="t">
        <Text>capped</Text>
        <Text maxFontSizeMultiplier={3}>override</Text>
      </ThemeProvider>,
    );
    const texts = container.querySelectorAll('[data-motif-host="Text"]');
    expect(texts[0]!.getAttribute('maxFontSizeMultiplier')).toBe('1.5');
    expect(texts[1]!.getAttribute('maxFontSizeMultiplier')).toBe('3');
  });

  it('leaves the system text size uncapped without the token', () => {
    render(<Text>free</Text>);
    expect(container.firstElementChild!.getAttribute('maxFontSizeMultiplier')).toBeNull();
  });
});
