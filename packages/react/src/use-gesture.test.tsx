/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box } from './Box.js';
import { useGesture, type GestureHandlers } from './use-gesture.js';

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

function pointer(type: string, clientX: number, clientY = 0): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(ev, {
    pointerId: { value: 1 },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return ev;
}

function Target(handlers: GestureHandlers): React.ReactElement {
  const { gestureProps } = useGesture(handlers);
  return <Box data-testid="t" {...gestureProps} />;
}

describe('useGesture (web)', () => {
  it('reads pointer events as a swipe and as a double tap', () => {
    const onSwipe = vi.fn();
    const onDoubleTap = vi.fn();
    act(() => root.render(<Target onSwipe={onSwipe} onDoubleTap={onDoubleTap} />));
    const el = container.querySelector<HTMLElement>('[data-testid="t"]')!;
    expect(el.style.touchAction).toBe('none');
    act(() => {
      el.dispatchEvent(pointer('pointerdown', 200));
      el.dispatchEvent(pointer('pointermove', 120));
      el.dispatchEvent(pointer('pointerup', 100));
    });
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'left', distance: 100 }),
    );
    act(() => {
      for (let i = 0; i < 2; i++) {
        el.dispatchEvent(pointer('pointerdown', 50));
        el.dispatchEvent(pointer('pointerup', 50));
      }
    });
    expect(onDoubleTap).toHaveBeenCalledOnce();
  });
});
