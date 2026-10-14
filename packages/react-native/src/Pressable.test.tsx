import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Theme } from '@usemotif/core';
import { __setDimensions } from './__test-setup__/react-native-mock.js';
import { Pressable } from './Pressable.js';
import { Direction } from './Direction.js';
import { ThemeProvider } from './Theme.js';

const theme: Theme = {
  name: 'test',
  tokens: {
    colors: { primary: { 500: '#3b82f6' } },
    space: { 2: 8, 4: 16 },
  },
};

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function pressable(): HTMLElement {
  const el = container.querySelector('[data-motif-host="Pressable"]');
  if (el === null) throw new Error('No Pressable found');
  return el as HTMLElement;
}

function styleOn(el: HTMLElement): Record<string, unknown> {
  const raw = el.getAttribute('data-motif-style');
  if (raw === null) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.reduce<Record<string, unknown>>((acc, x) => Object.assign(acc, x ?? {}), {});
  }
  return parsed as Record<string, unknown>;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.removeChild(container);
});

describe('Native Pressable - base render', () => {
  it('renders an RN Pressable host', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable />
      </ThemeProvider>,
    );
    expect(pressable()).not.toBeNull();
  });

  it('applies base style props', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable px="$4" bg="$primary.500" />
      </ThemeProvider>,
    );
    const style = styleOn(pressable());
    expect(style.paddingInline).toBe(16);
    expect(style.backgroundColor).toBe('#3b82f6');
  });
});

describe('Native Pressable - onPress', () => {
  it('fires onPress when invoked', () => {
    const handler = vi.fn();
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable onPress={handler} />
      </ThemeProvider>,
    );
    act(() => {
      pressable().click();
    });
    expect(handler).toHaveBeenCalled();
  });

  it('suppresses onPress when disabled', () => {
    const handler = vi.fn();
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable onPress={handler} disabled />
      </ThemeProvider>,
    );
    act(() => {
      pressable().click();
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Native Pressable - pseudo-state styles', () => {
  it('applies _hover style when pressable-state has hovered=true', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable
          opacity={1}
          _hover={{ opacity: 0.9 }}
          // Test-only: tells the mock to invoke the style fn with a state.
          // The host renders the resolved style array under data-motif-style.
          {...({ 'data-motif-pressable-state': JSON.stringify({ hovered: true }) } as Record<
            string,
            string
          >)}
        />
      </ThemeProvider>,
    );
    expect(styleOn(pressable()).opacity).toBe(0.9);
  });

  it('applies _active style when pressed=true', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable
          opacity={1}
          _active={{ opacity: 0.5 }}
          {...({ 'data-motif-pressable-state': JSON.stringify({ pressed: true }) } as Record<
            string,
            string
          >)}
        />
      </ThemeProvider>,
    );
    expect(styleOn(pressable()).opacity).toBe(0.5);
  });

  it('resolves a responsive state bag at the current viewport width', () => {
    __setDimensions(800);
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable
          opacity={1}
          _active={{ opacity: { base: 0.9, md: 0.5 } }}
          {...({ 'data-motif-pressable-state': JSON.stringify({ pressed: true }) } as Record<
            string,
            string
          >)}
        />
      </ThemeProvider>,
    );
    expect(styleOn(pressable()).opacity).toBe(0.5);
    __setDimensions(400);
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable
          key="narrow"
          opacity={1}
          _active={{ opacity: { base: 0.9, md: 0.5 } }}
          {...({ 'data-motif-pressable-state': JSON.stringify({ pressed: true }) } as Record<
            string,
            string
          >)}
        />
      </ThemeProvider>,
    );
    expect(styleOn(pressable()).opacity).toBe(0.9);
  });

  it('applies _disabled style when disabled=true', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable opacity={1} disabled _disabled={{ opacity: 0.4 }} />
      </ThemeProvider>,
    );
    expect(styleOn(pressable()).opacity).toBe(0.4);
  });

  // #249 - state bags must run through the same native translation as the
  // base, or a bag's `shadow`/web-only keys reach StyleSheet.create raw.
  it('sanitizes a pseudo-state bag (shadow → native shadow props)', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable
          _active={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
          {...({ 'data-motif-pressable-state': JSON.stringify({ pressed: true }) } as Record<
            string,
            string
          >)}
        />
      </ThemeProvider>,
    );
    const style = styleOn(pressable());
    expect(style.boxShadow).toBeUndefined();
    expect(style.shadowRadius).toBe(2);
    expect(style.elevation).toBe(2);
  });
});

describe('Native Pressable - disabled passthrough (#242)', () => {
  it('forwards disabled to the underlying RN Pressable host', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable disabled />
      </ThemeProvider>,
    );
    expect((pressable() as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not mark the host disabled when not disabled', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Pressable />
      </ThemeProvider>,
    );
    expect((pressable() as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('Native Pressable - direction injection (#267)', () => {
  it('injects the nested writing direction into the base style', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Direction value="rtl">
          <Pressable ps="$4" />
        </Direction>
      </ThemeProvider>,
    );
    expect(styleOn(pressable()).direction).toBe('rtl');
  });
});
