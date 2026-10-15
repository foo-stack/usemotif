import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGestureRecognizer, type GestureHandlers } from './gesture.js';

let handlers: { [K in keyof GestureHandlers]-?: ReturnType<typeof vi.fn> };
let g: ReturnType<typeof createGestureRecognizer>;

beforeEach(() => {
  vi.useFakeTimers();
  handlers = { onSwipe: vi.fn(), onLongPress: vi.fn(), onDoubleTap: vi.fn(), onPinch: vi.fn() };
  g = createGestureRecognizer(() => handlers as GestureHandlers);
});
afterEach(() => vi.useRealTimers());

describe('createGestureRecognizer', () => {
  it('reads a quick flick as a swipe in its dominant direction', () => {
    g.down(1, 100, 100, 0);
    g.move(1, 40, 110);
    g.up(1, 20, 110, 100);
    expect(handlers.onSwipe).toHaveBeenCalledWith({
      direction: 'left',
      velocity: expect.any(Number),
      distance: expect.any(Number),
    });
    expect(handlers.onSwipe.mock.calls[0]![0].velocity).toBeGreaterThan(300);
  });

  it('does not read a slow drag as a swipe, or as a tap', () => {
    g.down(1, 0, 0, 0);
    g.move(1, 0, 80);
    g.up(1, 0, 80, 2000);
    g.down(1, 0, 80, 2100);
    g.up(1, 0, 80, 2150);
    expect(handlers.onSwipe).not.toHaveBeenCalled();
    expect(handlers.onDoubleTap).not.toHaveBeenCalled();
  });

  it('fires a long press after a still hold, and nothing on release', () => {
    g.down(1, 5, 5, 0);
    vi.advanceTimersByTime(499);
    expect(handlers.onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(handlers.onLongPress).toHaveBeenCalledOnce();
    g.up(1, 5, 5, 600);
    g.down(1, 5, 5, 650);
    g.up(1, 5, 5, 700);
    expect(handlers.onDoubleTap).not.toHaveBeenCalled();
  });

  it('cancels a long press once the pointer moves past the slop', () => {
    g.down(1, 0, 0, 0);
    g.move(1, 20, 0);
    vi.advanceTimersByTime(600);
    expect(handlers.onLongPress).not.toHaveBeenCalled();
  });

  it('reads two quick taps in one place as a double tap', () => {
    g.down(1, 10, 10, 0);
    g.up(1, 10, 10, 50);
    g.down(1, 12, 11, 200);
    g.up(1, 12, 11, 240);
    expect(handlers.onDoubleTap).toHaveBeenCalledOnce();
    g.down(1, 10, 10, 1000);
    g.up(1, 10, 10, 1040);
    expect(handlers.onDoubleTap).toHaveBeenCalledOnce();
  });

  it('reports a pinch as the spread between two touches, then nothing else', () => {
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 10);
    g.move(2, 300, 100);
    g.up(2, 300, 100, 200);
    g.up(1, 100, 100, 210);
    expect(handlers.onPinch.mock.calls.map(([i]) => i)).toEqual([
      { scale: 1, phase: 'start' },
      { scale: 2, phase: 'change' },
      { scale: 2, phase: 'end' },
    ]);
    expect(handlers.onSwipe).not.toHaveBeenCalled();
    expect(handlers.onLongPress).not.toHaveBeenCalled();
  });
});
