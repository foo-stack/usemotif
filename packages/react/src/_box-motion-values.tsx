'use client';

import { resolveStylesToVars, type MotionStyleBag, type TransformAxes } from '@usemotif/core';
import { useIsomorphicLayoutEffect } from './_use-isomorphic-layout-effect.js';
import {
  createElement,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react';
import {
  writeComposedTransformToStyle,
  writeMotionValueToStyle,
  type MotionBinding,
} from './_motion-bindings.js';
import { scrollAnimator } from './_scroll-animator.js';

export interface BoxWithMotionValuesProps {
  readonly as: ElementType;
  readonly passThrough: Record<string, unknown>;
  readonly finalClassName: string | undefined;
  readonly baseStyle: Record<string, string | number>;
  readonly inlineStyle: CSSProperties | undefined;
  readonly motionBindings: readonly MotionBinding[];
  /** Set when the Box also has an entry animation. */
  readonly enterStyle: MotionStyleBag | undefined;
  readonly children?: ReactNode;
}

/**
 * Wrapper sub-component for any `<Box>` whose props include a motion
 * value. Owns the element ref + the subscription effect that writes
 * each motion value's current value straight to `element.style` on
 * change - bypassing React's render cycle so per-frame updates do not
 * incur reconciliation cost.
 *
 * When `enterStyle` is also set, the entry animation runs first
 * (`hasMounted` state mirrors `BoxWithEnter`'s mechanic). Motion-value
 * subscriptions activate **after** the entry animation has settled,
 * so the enter overlay and the per-frame MV writes don't race for the
 * same `style` slot.
 *
 * User-passed `ref` is composed with the internal element ref so
 * consumers retain the usual ref semantics on `<Box ref={...}>` even
 * when MVs are in play.
 *
 * Box dispatches here only when at least one motion-value-typed style
 * prop is set; the common no-MV path stays on the existing inline /
 * `BoxWithEnter` codepaths and pays no hook cost from this file.
 */
export function BoxWithMotionValues(props: BoxWithMotionValuesProps) {
  const {
    as,
    passThrough,
    finalClassName,
    baseStyle,
    inlineStyle,
    motionBindings,
    enterStyle,
    children,
  } = props;

  // Compose a user-passed `ref` (React 19 surfaces it as a regular
  // prop) with our internal element ref. Strip from passThrough to
  // avoid double-attaching when we spread.
  const userRef = (passThrough as { ref?: Ref<HTMLElement> }).ref;
  const passThroughWithoutRef: Record<string, unknown> = { ...passThrough };
  if ('ref' in passThroughWithoutRef) delete passThroughWithoutRef.ref;

  const internalRef = useRef<HTMLElement | null>(null);
  const refCallback = useCallback(
    (node: HTMLElement | null) => {
      internalRef.current = node;
      if (typeof userRef === 'function') {
        userRef(node);
      } else if (userRef !== null && userRef !== undefined) {
        (userRef as { current: HTMLElement | null }).current = node;
      }
    },
    [userRef],
  );

  // Entry animation. When no enterStyle, `hasMounted` starts true and
  // the entry overlay is skipped entirely.
  const hasEnter = enterStyle !== undefined;
  const [hasMounted, setHasMounted] = useState<boolean>(!hasEnter);

  // Client-only gate for the enter overlay. Starts `false` so the initial
  // render - server AND the first client (hydration) render - emits the
  // resting style: the hidden overlay (`opacity: 0`) never ships in the SSR
  // HTML (no FOUC) and hydration matches. The layout effect below flips it on
  // before the first client paint, so the overlay is painted purely
  // client-side and the rAF settle still drives the transition.
  const [entering, setEntering] = useState<boolean>(false);

  useIsomorphicLayoutEffect(() => {
    if (!hasEnter || hasMounted) return;
    setEntering(true);
    const id = requestAnimationFrame(() => {
      setHasMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, [hasEnter, hasMounted]);

  // One extra pass for a scroll timeline whose container or target ref attached after this
  // Box's first layout effect ran.
  const [, retryScroll] = useState(0);
  const retriedScroll = useRef(false);

  // Motion-value subscriptions. Re-run every render (no deps) - MV
  // on/off is O(1), the binding list is typically tiny, and this
  // sidesteps the variable-length-deps problem cleanly. The seed call
  // makes the very first paint reflect the MV's current value (so a
  // pre-animated MV doesn't briefly show the literal baseStyle).
  //
  // Transform-axis bindings (`x`, `y`, `rotate`, ...) share one
  // `style.transform` slot - multiple per-prop writes would clobber
  // each other on every frame. The runtime collects current axis
  // values into a single `transformAxes` bag and re-composes via the
  // core's web composer on every change; non-axis bindings keep the
  // per-property writer.
  useIsomorphicLayoutEffect(() => {
    if (!hasMounted) return;
    const element = internalRef.current;
    if (element === null) return;

    // Bindings that follow a scroll timeline run as CSS scroll-driven animation where the
    // browser has it; the rest are written per change below.
    const scroll = scrollAnimator()?.(element, motionBindings) ?? {
      rest: motionBindings,
      clear: () => {},
      pending: false,
    };
    const bindings = scroll.rest;
    let retry: number | undefined;
    if (scroll.pending && !retriedScroll.current) {
      retriedScroll.current = true;
      retry = requestAnimationFrame(() => retryScroll((n) => n + 1));
    }

    const transformAxes: TransformAxes = {};
    let hasTransformAxes = false;
    for (const b of bindings) {
      if (b.transformAxis !== undefined) {
        const value = b.mv.get();
        if (typeof value === 'string' || typeof value === 'number') {
          transformAxes[b.transformAxis] = value;
        }
        hasTransformAxes = true;
      } else {
        writeMotionValueToStyle(element, b.cssProperty, b.scale, b.mv.get());
      }
    }
    if (hasTransformAxes) writeComposedTransformToStyle(element, transformAxes);

    const unsubs: Array<() => void> = bindings.map((b) =>
      b.mv.on('change', (value) => {
        if (b.transformAxis !== undefined) {
          if (typeof value === 'string' || typeof value === 'number') {
            transformAxes[b.transformAxis] = value;
          }
          writeComposedTransformToStyle(element, transformAxes);
          return;
        }
        writeMotionValueToStyle(element, b.cssProperty, b.scale, value);
      }),
    );

    return () => {
      for (const u of unsubs) u();
      scroll.clear();
      if (retry !== undefined) cancelAnimationFrame(retry);
    };
  });

  const enterResolved =
    hasEnter && entering && !hasMounted
      ? resolveStylesToVars(enterStyle as unknown as Record<string, unknown>).style
      : null;

  const style = (
    enterResolved === null
      ? { ...baseStyle, ...inlineStyle }
      : { ...baseStyle, ...enterResolved, ...inlineStyle }
  ) as CSSProperties;

  return createElement(
    as,
    {
      ...passThroughWithoutRef,
      ref: refCallback,
      className: finalClassName,
      style,
    },
    children,
  );
}
