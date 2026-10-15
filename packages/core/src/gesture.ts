/** The direction of a swipe, by its dominant axis. */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeInfo {
  readonly direction: SwipeDirection;
  /** Average speed over the gesture, in px per second. */
  readonly velocity: number;
  /** Straight-line distance from press to release, in px. */
  readonly distance: number;
}

export interface PinchInfo {
  /** Distance between the two touches relative to where the pinch began. */
  readonly scale: number;
  readonly phase: 'start' | 'change' | 'end';
}

/** Callbacks for {@link createGestureRecognizer} and the `useGesture` hooks. */
export interface GestureHandlers {
  readonly onSwipe?: (info: SwipeInfo) => void;
  readonly onLongPress?: () => void;
  readonly onDoubleTap?: () => void;
  readonly onPinch?: (info: PinchInfo) => void;
}

export interface GestureOptions {
  /** How long a still press lasts before it is a long press, in ms. Default 500. */
  readonly longPressMs?: number;
  /** The most time between two taps of a double tap, in ms. Default 300. */
  readonly doubleTapMs?: number;
  /** The least distance a swipe covers, in px. Default 40. */
  readonly swipeDistance?: number;
  /** The least average speed of a swipe, in px per second. Default 300. */
  readonly swipeVelocity?: number;
}

/** Movement under this many px still counts as a press or a tap. */
const SLOP = 10;

interface Pointer {
  readonly x0: number;
  readonly y0: number;
  readonly t0: number;
  x: number;
  y: number;
}

export interface GestureRecognizer {
  down(id: number, x: number, y: number, time: number): void;
  move(id: number, x: number, y: number): void;
  up(id: number, x: number, y: number, time: number): void;
  cancel(): void;
}

const spread = (a: Pointer, b: Pointer): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Recognises swipe, long press, double tap and pinch from a stream of pointer or touch
 * positions, so web pointer events and native touch events share one definition of each.
 * Handlers and options are read through getters, so the latest ones apply mid-gesture.
 */
export function createGestureRecognizer(
  handlers: () => GestureHandlers,
  options: () => GestureOptions = () => ({}),
): GestureRecognizer {
  const pointers = new Map<number, Pointer>();
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let pressed = false;
  let moved = false;
  let pinch: { start: number; scale: number } | undefined;
  // Set once two touches were down, so lifting the last one is not read as a tap or swipe.
  let multi = false;
  let lastTap: { x: number; y: number; t: number } | undefined;

  const clearPress = (): void => {
    if (pressTimer !== undefined) clearTimeout(pressTimer);
    pressTimer = undefined;
  };
  const pair = (): [Pointer, Pointer] | undefined => {
    const [a, b] = pointers.values();
    return a !== undefined && b !== undefined ? [a, b] : undefined;
  };

  return {
    down(id, x, y, time) {
      pointers.set(id, { x0: x, y0: y, t0: time, x, y });
      if (pointers.size === 1) {
        pressed = false;
        moved = false;
        multi = false;
        if (handlers().onLongPress !== undefined) {
          pressTimer = setTimeout(() => {
            pressed = true;
            handlers().onLongPress?.();
          }, options().longPressMs ?? 500);
        }
        return;
      }
      clearPress();
      multi = true;
      const both = pair();
      if (both !== undefined && pinch === undefined && handlers().onPinch !== undefined) {
        pinch = { start: Math.max(spread(...both), 1), scale: 1 };
        handlers().onPinch?.({ scale: 1, phase: 'start' });
      }
    },
    move(id, x, y) {
      const p = pointers.get(id);
      if (p === undefined) return;
      p.x = x;
      p.y = y;
      if (!moved && Math.hypot(x - p.x0, y - p.y0) > SLOP) {
        moved = true;
        clearPress();
      }
      const both = pair();
      if (pinch !== undefined && both !== undefined) {
        pinch.scale = spread(...both) / pinch.start;
        handlers().onPinch?.({ scale: pinch.scale, phase: 'change' });
      }
    },
    up(id, x, y, time) {
      const p = pointers.get(id);
      if (p === undefined) return;
      pointers.delete(id);
      clearPress();
      if (pinch !== undefined) {
        if (pointers.size < 2) {
          handlers().onPinch?.({ scale: pinch.scale, phase: 'end' });
          pinch = undefined;
        }
        return;
      }
      if (multi || pressed || pointers.size > 0) return;
      const dx = x - p.x0;
      const dy = y - p.y0;
      const distance = Math.hypot(dx, dy);
      const velocity = (distance / Math.max(time - p.t0, 1)) * 1000;
      const { swipeDistance = 40, swipeVelocity = 300, doubleTapMs = 300 } = options();
      if (distance >= swipeDistance && velocity >= swipeVelocity) {
        const direction: SwipeDirection =
          Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        handlers().onSwipe?.({ direction, velocity, distance });
        lastTap = undefined;
        return;
      }
      if (moved) return;
      if (
        lastTap !== undefined &&
        time - lastTap.t <= doubleTapMs &&
        Math.hypot(x - lastTap.x, y - lastTap.y) <= SLOP * 2
      ) {
        lastTap = undefined;
        handlers().onDoubleTap?.();
        return;
      }
      lastTap = { x, y, t: time };
    },
    cancel() {
      clearPress();
      pointers.clear();
      if (pinch !== undefined) handlers().onPinch?.({ scale: pinch.scale, phase: 'end' });
      pinch = undefined;
    },
  };
}
