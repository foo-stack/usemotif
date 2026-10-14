import type { DragInfo } from '@usemotif/react';

/** A release this far (px) from where the swipe started dismisses the toast. */
export const SWIPE_DISMISS_DISTANCE = 80;
/** A release this fast (px/s) dismisses it however short the swipe. */
export const SWIPE_DISMISS_VELOCITY = 500;

/** Whether a sideways swipe ended far or fast enough to dismiss. */
export function isSwipeDismiss(info: Pick<DragInfo, 'offset' | 'velocity'>): boolean {
  return (
    Math.abs(info.offset.x) > SWIPE_DISMISS_DISTANCE ||
    Math.abs(info.velocity.x) > SWIPE_DISMISS_VELOCITY
  );
}

/** Opacity while dragged: fades towards 0.4 as the toast nears the dismiss distance. */
export function swipeOpacity(x: number): number {
  return 1 - Math.min(Math.abs(x) / (SWIPE_DISMISS_DISTANCE * 2), 1) * 0.6;
}
