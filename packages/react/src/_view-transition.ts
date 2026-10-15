'use client';

import { createContext, useState } from 'react';
import { flushSync } from 'react-dom';
import { useIsomorphicLayoutEffect } from './_use-isomorphic-layout-effect.js';

let flushing = false;

/** True while a view transition is applying its update, so FLIP and enter animations stand down. */
export function isFlushingViewTransition(): boolean {
  return flushing;
}

/** Set by a `Presence` running view transitions, so `layoutId` boxes name themselves for it. */
export const ViewTransitionNames = createContext(false);

function canTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  );
}

/**
 * The value to render, moved to `value` inside `document.startViewTransition` so the browser
 * snapshots the old render first and animates to the new one. The old value stays on screen for
 * the commit in between. `active` is false where the API is missing, under reduced motion, or
 * when not `enabled`, and the value then follows at once.
 */
export function useViewTransitionValue<T>(
  value: T,
  enabled: boolean,
): { value: T; active: boolean } {
  const [shown, setShown] = useState(value);
  const active = enabled && canTransition();
  if (!active && !Object.is(shown, value)) setShown(value);
  useIsomorphicLayoutEffect(() => {
    if (!active || Object.is(shown, value)) return;
    document.startViewTransition(() => {
      flushing = true;
      try {
        flushSync(() => setShown(value));
      } finally {
        flushing = false;
      }
    });
  }, [active, shown, value]);
  return { value: active ? shown : value, active };
}
