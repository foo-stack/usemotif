/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Animated, Easing } from 'react-native';
import type { Theme } from '@usemotif/core';
import { Box } from './Box.js';
import { ThemeProvider } from './Theme.js';
import { useLayoutAnimation } from './use-layout-animation.js';

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

describe('native useLayoutAnimation', () => {
  it('returns ref + onLayout + style bindings consumers spread onto a Box', () => {
    let captured: ReturnType<typeof useLayoutAnimation> | undefined;
    function Probe(): null {
      captured = useLayoutAnimation();
      return null;
    }
    render(<Probe />);
    expect(captured).toBeDefined();
    expect(captured!.ref.current).toBeNull();
    expect(typeof captured!.onLayout).toBe('function');
    expect(captured!.style).toBeDefined();
  });

  it('does not animate on the first onLayout (records baseline only)', () => {
    let captured: ReturnType<typeof useLayoutAnimation> | undefined;
    function Probe(): null {
      captured = useLayoutAnimation();
      return null;
    }
    render(<Probe />);
    const ev = { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } } };
    expect(() =>
      captured!.onLayout!(
        ev as Parameters<NonNullable<NonNullable<typeof captured>['onLayout']>>[0],
      ),
    ).not.toThrow();
  });

  it('applies an inverse transform on subsequent layout deltas', () => {
    let captured: ReturnType<typeof useLayoutAnimation> | undefined;
    function Probe(): null {
      captured = useLayoutAnimation();
      return null;
    }
    render(<Probe />);

    captured!.onLayout!({
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } },
    } as Parameters<NonNullable<NonNullable<typeof captured>['onLayout']>>[0]);
    captured!.onLayout!({
      nativeEvent: { layout: { x: 50, y: 30, width: 200, height: 50 } },
    } as Parameters<NonNullable<NonNullable<typeof captured>['onLayout']>>[0]);

    // The style.transform shape carries Animated.Value entries; after
    // the second onLayout fires, the values are set to the inverse
    // delta. We just assert the shape is present and the entries are
    // Animated.Value instances (mock returns __animatedValue serial).
    const transform = captured!.style!.transform as ReadonlyArray<Record<string, unknown>>;
    expect(transform.length).toBe(4);
    expect(transform[0]).toHaveProperty('translateX');
    expect(transform[1]).toHaveProperty('translateY');
    expect(transform[2]).toHaveProperty('scaleX');
    expect(transform[3]).toHaveProperty('scaleY');
  });
});

describe('native Box layoutTransition', () => {
  const theme: Theme = {
    name: 't',
    tokens: {
      durations: { 5: '500ms' },
      easings: { decelerate: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
  };

  afterEach(() => {
    vi.restoreAllMocks();
    delete (Easing as { bezier?: unknown }).bezier;
  });

  /** Lays the Box out twice, so its FLIP runs, and returns the timing configs. */
  function relayout(node: ReactNode): Array<{ duration: number; easing?: unknown }> {
    const timing = vi.spyOn(Animated, 'timing');
    render(
      <ThemeProvider themes={[theme]} active="t">
        {node}
      </ThemeProvider>,
    );
    const el = container.querySelector('[testID="b"]') as unknown as Record<string, unknown>;
    // The mock View keeps `onLayout` to itself; read it off the View's fiber.
    const fiber = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))!] as {
      return: { memoizedProps: { onLayout: (e: unknown) => void } };
    };
    const { onLayout } = fiber.return.memoizedProps;
    act(() => onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } } }));
    act(() => onLayout({ nativeEvent: { layout: { x: 40, y: 0, width: 100, height: 100 } } }));
    return timing.mock.calls.map((c) => c[1] as unknown as { duration: number; easing?: unknown });
  }

  it('resolves token timing against the theme, bezier easings included', () => {
    const curve = (t: number): number => t;
    const bezier = vi.fn(() => curve);
    (Easing as { bezier?: unknown }).bezier = bezier;
    const configs = relayout(
      <Box
        testID="b"
        layout
        layoutTransition={{ duration: '$durations.5', easing: '$easings.decelerate' }}
      />,
    );
    expect(configs.length).toBeGreaterThan(0);
    expect(configs.every((c) => c.duration === 500 && c.easing === curve)).toBe(true);
    expect(bezier).toHaveBeenCalledWith(0, 0, 0.2, 1);
  });

  it('keeps 300ms when no duration is given', () => {
    const configs = relayout(<Box testID="b" layout />);
    expect(configs.length).toBeGreaterThan(0);
    expect(configs.every((c) => c.duration === 300)).toBe(true);
  });
});
