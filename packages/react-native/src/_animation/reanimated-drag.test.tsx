/** @vitest-environment jsdom */
/**
 * The Reanimated drag backing against stub peers, installed so
 * the driver sees Reanimated and gesture-handler, with a Pan gesture that
 * records its callbacks and runs them on demand. This checks the JS-side
 * wiring only; the worklets themselves need a real runtime.
 */
import { act, useEffect, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _setPeersForTesting, reanimatedDriver } from './reanimated.js';
import type { MotionDriver } from './types.js';

type Handler = (e?: Record<string, number>) => void;
const handlers: Record<string, Handler> = {};

const reanimated = {
  useSharedValue: <T,>(v: T): { value: T } => useState(() => ({ value: v }))[0],
  runOnJS: (fn: Handler): Handler => fn,
};
const gestureHandler = {
  Gesture: {
    Pan: () => {
      const pan = new Proxy(
        {},
        {
          get: (_, name: string) => (cb: Handler) => {
            handlers[name] = cb;
            return pan;
          },
        },
      );
      return pan;
    },
  },
  GestureDetector: ({ children }: { children: ReactNode }) => children,
};

const driver: MotionDriver = reanimatedDriver;
let container: HTMLElement;
let root: Root;

beforeEach(() => {
  _setPeersForTesting(reanimated, gestureHandler);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  _setPeersForTesting(null, null);
});

describe('reanimatedDriver - useDragBacking', () => {
  it('keeps the Wrapper and the dragged subtree mounted across drag renders', () => {
    let mounts = 0;
    function Child(): null {
      useEffect(() => {
        mounts += 1;
      }, []);
      return null;
    }
    const wrappers: unknown[] = [];
    function Probe(): ReactNode {
      const result = driver.useDragBacking!({
        axis: 'both',
        constraints: undefined,
        dragElastic: 0,
        dragMomentum: false,
        dragTransition: { stiffness: 200, damping: 25, mass: 1, restSpeed: 0.1, restDistance: 0.1 },
      });
      const Wrapper = result!.Wrapper!;
      wrappers.push(Wrapper);
      return (
        <Wrapper>
          <Child />
        </Wrapper>
      );
    }
    act(() => root.render(<Probe />));
    // onBegin flips `isDragging`, which re-renders the host mid-gesture.
    act(() => handlers.onBegin!());
    act(() =>
      handlers.onUpdate!({ translationX: 12, translationY: 0, velocityX: 0, velocityY: 0 }),
    );
    act(() => handlers.onFinalize!());
    expect(wrappers.length).toBeGreaterThan(1);
    expect(new Set(wrappers).size).toBe(1);
    expect(mounts).toBe(1);
  });
});
