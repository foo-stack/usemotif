import {
  createGestureRecognizer,
  type GestureHandlers,
  type GestureOptions,
  type PinchInfo,
  type SwipeDirection,
  type SwipeInfo,
} from '@usemotif/core';
import { useEffect, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

export type { GestureHandlers, GestureOptions, PinchInfo, SwipeDirection, SwipeInfo };

/** Result of {@link useGesture}: touch handlers to spread on a Box or View. */
export interface UseGestureResult {
  readonly gestureProps: {
    onTouchStart: (event: GestureResponderEvent) => void;
    onTouchMove: (event: GestureResponderEvent) => void;
    onTouchEnd: (event: GestureResponderEvent) => void;
    onTouchCancel: () => void;
  };
}

/**
 * Swipe, long press, double tap and pinch on one view, from its touches. The web hook reads
 * pointer events through the same recognizer, so a gesture means the same thing on both.
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
  const [gestureProps] = useState<UseGestureResult['gestureProps']>(() => {
    const each =
      (step: 'down' | 'move' | 'up') =>
      (e: GestureResponderEvent): void => {
        const { changedTouches, timestamp } = e.nativeEvent;
        for (const t of changedTouches) {
          const id = Number(t.identifier);
          if (step === 'move') recognizer.move(id, t.pageX, t.pageY);
          else recognizer[step](id, t.pageX, t.pageY, timestamp);
        }
      };
    return {
      onTouchStart: each('down'),
      onTouchMove: each('move'),
      onTouchEnd: each('up'),
      onTouchCancel: () => recognizer.cancel(),
    };
  });
  return { gestureProps };
}
