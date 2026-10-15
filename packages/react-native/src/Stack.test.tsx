import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Theme } from '@usemotif/core';
import { HStack, Stack, VStack } from './Stack.js';
import { Text } from './Text.js';
import { ThemeProvider } from './Theme.js';

const theme: Theme = {
  name: 'test',
  tokens: {
    colors: { surface: { base: '#ffffff' } },
    space: { 1: 4, 2: 8, 4: 16 },
  },
};

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function viewStyle(
  el: HTMLElement,
  selector = '[data-motif-host="View"]',
): Record<string, unknown> {
  const v = el.querySelector(selector);
  if (v === null) throw new Error(`No host found for selector ${selector}`);
  const raw = v.getAttribute('data-motif-style');
  if (raw === null) return {};
  return flatten(JSON.parse(raw));
}

function flatten(s: unknown): Record<string, unknown> {
  if (s === null || s === undefined) return {};
  if (Array.isArray(s)) {
    return s.reduce<Record<string, unknown>>((acc, x) => Object.assign(acc, flatten(x)), {});
  }
  return s as Record<string, unknown>;
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

describe('Stack - flex defaults', () => {
  it('Stack defaults to column direction', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Stack gap="$2" />
      </ThemeProvider>,
    );
    const style = viewStyle(container);
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(style.gap).toBe(8); // $space.2
  });

  it('Stack respects explicit direction', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Stack direction="row" />
      </ThemeProvider>,
    );
    expect(viewStyle(container).flexDirection).toBe('row');
  });

  it('HStack is row-direction shorthand', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <HStack />
      </ThemeProvider>,
    );
    expect(viewStyle(container).flexDirection).toBe('row');
  });

  it('VStack is column-direction shorthand', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <VStack />
      </ThemeProvider>,
    );
    expect(viewStyle(container).flexDirection).toBe('column');
  });
});

describe('Stack - stagger', () => {
  it('passes delayMs=index * stagger * 1000 to each child driver entry', async () => {
    const { registerMotionDriver } = await import('./_animation/index.js');
    const calls: Array<{ delayMs: number | undefined }> = [];
    registerMotionDriver({
      name: 'capture',
      useEntryAnimation: (opts) => {
        calls.push({ delayMs: opts.delayMs });
        return null;
      },
      useExitAnimation: () => ({}),
    });
    try {
      const { Box } = await import('./Box.js');
      render(
        <ThemeProvider themes={[theme]} active="test">
          <Stack stagger={0.05}>
            <Box enterStyle={{ opacity: 0 }} />
            <Box enterStyle={{ opacity: 0 }} />
            <Box enterStyle={{ opacity: 0 }} />
          </Stack>
        </ThemeProvider>,
      );
      expect(calls.length).toBe(3);
      expect(calls[0]!.delayMs).toBe(0);
      expect(calls[1]!.delayMs).toBeCloseTo(50, 5);
      expect(calls[2]!.delayMs).toBeCloseTo(100, 5);
    } finally {
      registerMotionDriver(null);
    }
  });

  it('starts the wave from staggerFrom', async () => {
    const { registerMotionDriver } = await import('./_animation/index.js');
    const calls: Array<number | undefined> = [];
    registerMotionDriver({
      name: 'capture',
      useEntryAnimation: (opts) => {
        calls.push(opts.delayMs);
        return null;
      },
      useExitAnimation: () => ({}),
    });
    try {
      const { Box } = await import('./Box.js');
      render(
        <ThemeProvider themes={[theme]} active="test">
          <Stack stagger={0.05} staggerFrom="center">
            <Box enterStyle={{ opacity: 0 }} />
            <Box enterStyle={{ opacity: 0 }} />
            <Box enterStyle={{ opacity: 0 }} />
          </Stack>
        </ThemeProvider>,
      );
      expect(calls[0]).toBeCloseTo(50, 5);
      expect(calls[1]).toBe(0);
      expect(calls[2]).toBeCloseTo(50, 5);
    } finally {
      registerMotionDriver(null);
    }
  });

  it('omits delayMs for children outside any stagger provider', async () => {
    const { registerMotionDriver } = await import('./_animation/index.js');
    const calls: Array<{ delayMs: number | undefined }> = [];
    registerMotionDriver({
      name: 'capture-none',
      useEntryAnimation: (opts) => {
        calls.push({ delayMs: opts.delayMs });
        return null;
      },
      useExitAnimation: () => ({}),
    });
    try {
      const { Box } = await import('./Box.js');
      render(
        <ThemeProvider themes={[theme]} active="test">
          <Stack>
            <Box enterStyle={{ opacity: 0 }} />
            <Box enterStyle={{ opacity: 0 }} />
          </Stack>
        </ThemeProvider>,
      );
      // No stagger → delayMs is 0 for every child.
      expect(calls.every((c) => c.delayMs === 0)).toBe(true);
    } finally {
      registerMotionDriver(null);
    }
  });
});

describe('Text - host element', () => {
  it('renders RN Text host (separate from View)', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Text>hello</Text>
      </ThemeProvider>,
    );
    const text = container.querySelector('[data-motif-host="Text"]');
    expect(text).not.toBeNull();
    expect(text?.textContent).toBe('hello');
    // Should NOT be inside a View - Text is its own host.
    expect(container.querySelector('[data-motif-host="View"]')).toBeNull();
  });

  it('applies font / color style props', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Text fontSize={16} color="#ff0000">
          x
        </Text>
      </ThemeProvider>,
    );
    const style = viewStyle(container, '[data-motif-host="Text"]');
    expect(style.fontSize).toBe(16);
    expect(style.color).toBe('#ff0000');
  });

  it('resolves token refs in text styles', () => {
    render(
      <ThemeProvider themes={[theme]} active="test">
        <Text bg="$colors.surface.base">x</Text>
      </ThemeProvider>,
    );
    const style = viewStyle(container, '[data-motif-host="Text"]');
    expect(style.backgroundColor).toBe('#ffffff');
  });
});
