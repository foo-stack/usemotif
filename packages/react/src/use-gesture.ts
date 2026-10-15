'use client';

import {
  createGestureRecognizer,
  type GestureHandlers,
  type GestureOptions,
  type PinchInfo,
  type SwipeDirection,
  type SwipeInfo,
} from '@usemotif/core';
import { useEffect, useRef, useState } from 'react';

export type { GestureHandlers, GestureOptions, PinchInfo, SwipeDirection, SwipeInfo };

/** Result of {@link useGesture}: handlers to spread on the element. */
export interface UseGestureResult {
  readonly gestureProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    /** `touch-action: none`, so a touch screen reports swipes and pinches instead of scrolling. */
    style: { touchAction: 'none' };
  };
}

/**
 * Swipe, long press, double tap and pinch on one element, from pointer events on web and
 * touches on native, through the same recognizer.
 *
 * `gestureProps` carries `style={{ touchAction: 'none' }}`, without which a touch screen takes
 * swipes and pinches for scrolling and zooming; merge it into any `style` you pass. To drag the
 * same element, run `useDrag` alongside and call both `onPointerDown` handlers.
 *
 * @example
 * ```tsx
 * const { gestureProps } = useGesture({
 *   onSwipe: ({ direction }) => direction === 'left' && next(),
 *   onDoubleTap: () => like(),
 *   onPinch: ({ scale }) => zoom.set(scale),
 * });
 * return <Box {...gestureProps} />;
 * ```
 */
export function useGesture(
  handlers: GestureHandlers,
  options: GestureOptions = {},
): UseGestureResult {
  const latest = useRef({ handlers, options });
  latest.current = { handlers, options };
  const [recognizer] = useState(() =>
    createGestureRecognizer(
      () => latest.current.handlers,
      () => latest.current.options,
    ),
  );
  useEffect(() => () => recognizer.cancel(), [recognizer]);
  const [gestureProps] = useState<UseGestureResult['gestureProps']>(() => ({
    onPointerDown: (e) => {
      // Keep receiving this pointer's moves and release when it leaves the element.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic events in tests carry no active pointer to capture.
      }
      recognizer.down(e.pointerId, e.clientX, e.clientY, e.timeStamp);
    },
    onPointerMove: (e) => recognizer.move(e.pointerId, e.clientX, e.clientY),
    onPointerUp: (e) => recognizer.up(e.pointerId, e.clientX, e.clientY, e.timeStamp),
    onPointerCancel: () => recognizer.cancel(),
    style: { touchAction: 'none' },
  }));
  return { gestureProps };
}
