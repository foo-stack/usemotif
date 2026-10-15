/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGesture, type UseGestureResult } from './use-gesture.js';

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

type Touch = { identifier: number; pageX: number; pageY: number };
const touches = (timestamp: number, ...changedTouches: Touch[]) =>
  ({ nativeEvent: { changedTouches, timestamp } }) as never;

describe('useGesture (native)', () => {
  it('reads two touches spreading apart as a pinch', () => {
    const onPinch = vi.fn();
    let props: UseGestureResult['gestureProps'] | undefined;
    function Probe(): null {
      props = useGesture({ onPinch }).gestureProps;
      return null;
    }
    act(() => root.render(<Probe />));
    props!.onTouchStart(touches(0, { identifier: 1, pageX: 100, pageY: 100 }));
    props!.onTouchStart(touches(5, { identifier: 2, pageX: 150, pageY: 100 }));
    props!.onTouchMove(touches(20, { identifier: 2, pageX: 250, pageY: 100 }));
    props!.onTouchEnd(touches(40, { identifier: 2, pageX: 250, pageY: 100 }));
    expect(onPinch.mock.calls.map(([info]) => info)).toEqual([
      { scale: 1, phase: 'start' },
      { scale: 3, phase: 'change' },
      { scale: 3, phase: 'end' },
    ]);
  });
});
