'use client';

import { useExitPresence, type MotionPhase } from '@usemotif/react';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { useReducedMotion } from './_use-reduced-motion.js';

export interface UseExitTransitionResult {
  /** True while the element should be rendered (`open` or `exiting`). */
  readonly shouldRender: boolean;
  /** Current motion phase. */
  readonly phase: MotionPhase;
  /**
   * Ref to attach to the element whose `transitionend` event signals the exit
   * is complete (the CSS-driver route). Optional - the fallback timer and
   * registered-exit completions also settle the unmount.
   */
  readonly elementRef: React.RefObject<HTMLElement | null>;
  /**
   * Boundary component to wrap exit-aware children in. Publishes the
   * `PresenceContext` so a descendant `<Box exitStyle>` driven by an imperative
   * driver (WAAPI) can register its off-thread exit and settle the unmount
   * precisely when it finishes.
   */
  readonly ExitBoundary: (props: { children: ReactNode }) => ReactElement;
}

/**
 * Delays unmount until the element's exit finishes. When `open` flips
 * `true` → `false` the element stays rendered in the `'exiting'` phase, and the
 * boundary settles to `'closed'` on the FIRST of:
 *  - every descendant that called `registerExit` (via the provided
 *    `ExitBoundary`/`PresenceContext`) signalling completion - the off-thread
 *    WAAPI route, which settles exactly when the animation's `finished` resolves;
 *  - a `transitionend` on the attached element or a descendant - the CSS route;
 *  - the `fallbackDurationMs` timer (default 400ms) - the backstop.
 *
 * Reduced motion (or `fallbackDurationMs <= 0`) skips the exit phase and
 * unmounts synchronously.
 *
 * Dialog-based overlays (Dialog/Modal/Drawer/AlertDialog) consume this; wrapping
 * their content in `ExitBoundary` is what lets a WAAPI-driven descendant surface
 * animate out off the main thread.
 */
export function useExitTransition(
  open: boolean,
  fallbackDurationMs = 400,
): UseExitTransitionResult {
  const reducedMotion = useReducedMotion();
  const { shouldRender, phase, settle, ExitBoundary } = useExitPresence(
    open,
    reducedMotion ? 0 : fallbackDurationMs,
  );
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (phase !== 'exiting' || el === null) return undefined;
    const onEnd = (event: TransitionEvent): void => {
      // Accept the transition on the element itself OR a descendant - the
      // documented CSS usage puts `exitStyle` on a child `<Box>`, so the
      // event bubbles up with `target === child`.
      const target = event.target as Node | null;
      if (target !== el && (target === null || !el.contains(target))) return;
      settle();
    };
    el.addEventListener('transitionend', onEnd);
    return () => el.removeEventListener('transitionend', onEnd);
  }, [phase, settle]);

  return { shouldRender, phase, elementRef, ExitBoundary };
}
