import type { MotionBinding } from './_motion-bindings.js';

/** Puts a Box's scroll-linked bindings on CSS scroll timelines; see `_scroll-timeline.ts`. */
export type ScrollAnimator = (
  element: HTMLElement | SVGElement,
  bindings: readonly MotionBinding[],
) => { rest: readonly MotionBinding[]; clear: () => void; pending: boolean };

let animator: ScrollAnimator | null = null;

/**
 * The slot Box reads. `_scroll-timeline.ts` fills it the first time `useScroll` tags a value, so a
 * Box in an app that never tracks scroll does not bundle the timeline compiler.
 */
export function scrollAnimator(): ScrollAnimator | null {
  return animator;
}

export function setScrollAnimator(value: ScrollAnimator): void {
  animator = value;
}
