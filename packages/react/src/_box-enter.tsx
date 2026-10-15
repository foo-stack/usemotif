'use client';

import { resolveStylesToVars, type MotionStyleBag } from '@usemotif/core';
import {
  createElement,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { useStaggerDelay } from './_stagger-context.js';
import { getMotionDriver } from './_animation/index.js';
import { useDriverExit } from './_box-exit.js';
import { isFlushingViewTransition } from './_view-transition.js';

export interface BoxWithEnterProps {
  readonly as: ElementType;
  readonly passThrough: Record<string, unknown>;
  readonly finalClassName: string | undefined;
  readonly baseStyle: Record<string, string | number>;
  readonly inlineStyle: CSSProperties | undefined;
  readonly enterStyle: MotionStyleBag;
  /** Present when the element also animates out - driven off the same ref. */
  readonly exitStyle?: MotionStyleBag;
  readonly children?: ReactNode;
}

/**
 * Internal sub-component that owns the per-instance "have we mounted
 * past the first paint yet?" state required for entry animations.
 *
 * Mechanics:
 *
 * 1. The initial render - server AND the first client (hydration) render -
 *    has `entering === false`, i.e. the **resting** style with no enter
 *    overlay. So the SSR HTML never contains the hidden overlay
 *    (`opacity: 0`) - no FOUC, no invisible-until-hydrated content - and the
 *    first client render is byte-identical to the server output (no
 *    hydration mismatch).
 * 2. `useLayoutEffect` (client only - layout effects never run on the server)
 *    flips `entering` to `true` synchronously, *before* the browser paints
 *    the first client frame, so the very first painted frame shows the enter
 *    overlay. A `requestAnimationFrame` then flips it back to the resting
 *    style on the next frame; the browser sees the style change and runs the
 *    CSS transition declared via `transition` against each animatable
 *    property.
 *
 * The net effect: SSR content stays invisible-overlay-free in the HTML and
 * the entry animation plays purely client-side after the first commit.
 *
 * Box only dispatches here when `enterStyle !== undefined`, so call
 * sites that don't use entry animations pay no hook cost.
 *
 * *How* the overlay-then-rest transition plays is delegated to the active
 * motion driver (see `registerMotionDriver`). The default `cssDriver`
 * reproduces the mechanics above byte-for-byte; the opt-in `waapiDriver`
 * runs the entry off the main thread via `element.animate()` instead. This
 * shell owns only the cross-driver concerns: resolving the enter overlay,
 * the stagger delay, and assembling the final inline style.
 */
export function BoxWithEnter(props: BoxWithEnterProps) {
  const {
    as,
    passThrough,
    finalClassName,
    baseStyle,
    inlineStyle,
    enterStyle,
    exitStyle,
    children,
  } = props;

  // Ref handed to the driver. The CSS driver ignores it; imperative drivers
  // (WAAPI) need the element, so the ref is only attached below when the
  // active driver asks for it - arbitrary `as` components needn't forward one.
  const ref = useRef<HTMLElement | null>(null);
  // Parent `<Stack stagger={...}>` injects a per-child delay through this
  // context. When non-zero we append `transition-delay` to the resolved
  // inline style - without overwriting any `transition` the consumer set.
  const staggerDelaySec = useStaggerDelay();

  const driver = getMotionDriver();
  // Mounted by a view transition, the box starts entered: the browser animates its arrival.
  const [entering] = useState(() => !isFlushingViewTransition());
  const from = entering ? resolveStylesToVars(enterStyle as Record<string, unknown>).style : {};
  const { overlay, reducedMotion } = driver.useEntry(ref, { from, delaySec: staggerDelaySec });
  // Exit shares the same ref/driver. Inert unless a presence boundary is
  // exiting AND `exitStyle` is set; the CSS driver's exit is a no-op.
  useDriverExit(ref, exitStyle, driver);

  const staggerStyle: CSSProperties | undefined =
    !reducedMotion && staggerDelaySec > 0 ? { transitionDelay: `${staggerDelaySec}s` } : undefined;

  const style = (
    overlay === null
      ? { ...baseStyle, ...staggerStyle, ...inlineStyle }
      : { ...baseStyle, ...overlay, ...staggerStyle, ...inlineStyle }
  ) as CSSProperties;

  const elementProps: Record<string, unknown> = {
    ...passThrough,
    className: finalClassName,
    style,
  };
  if (driver.needsRef === true) {
    elementProps.ref = ref;
  }

  return createElement(as, elementProps, children);
}
