'use client';

import {
  computeTargetScrollProgress,
  createMotionValue,
  parseScrollOffset,
  type MotionValue,
  type ScrollOffsetPair,
} from '@usemotif/core';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { tagScrollTimeline, type ScrollTimelineSpec } from './_scroll-timeline.js';

/**
 * Handle returned by {@link useScrollTarget}. Same call shape as the
 * native handle, so `{ ref, onLayout }` can be spread onto the tracked
 * `<Box>` on either platform. On web the element is measured with
 * `getBoundingClientRect`, so `onLayout` is explicitly `undefined`.
 */
export interface ScrollTargetHandle {
  /** Spread onto the tracked element. */
  readonly ref: RefObject<HTMLElement | null>;
  /** Native-only; `undefined` on web. */
  readonly onLayout?: undefined;
}

/**
 * Create a target handle for {@link useScroll}. Exists so scroll-linked
 * code written against native compiles and runs unchanged on web; a
 * plain `useRef` passed as `target` works too.
 *
 * @example
 * ```tsx
 * const target = useScrollTarget();
 * const { scrollYProgress } = useScroll({ target });
 *
 * <Box ref={target.ref} onLayout={target.onLayout}>tracked</Box>
 * ```
 */
export function useScrollTarget(): ScrollTargetHandle {
  const ref = useRef<HTMLElement | null>(null);
  const handleRef = useRef<ScrollTargetHandle | null>(null);
  if (handleRef.current === null) handleRef.current = { ref };
  return handleRef.current;
}

/**
 * Options for {@link useScroll}.
 *
 * Three shapes:
 *
 * - `useScroll()` - track window scroll.
 * - `useScroll({ container })` - track scroll inside a specific element.
 * - `useScroll({ target, offset?, container? })` - track when a specific
 *   element enters / exits the viewport (or scroll container). Progress
 *   advances `0 → 1` between the two `offset` anchors. Default offset
 *   is `['start end', 'end start']` - progress goes 0→1 from element-top
 *   entering viewport-bottom to element-bottom exiting viewport-top.
 */
export interface UseScrollOptions {
  /**
   * Ref to the scroll container element. When provided, scroll values
   * are derived from this element's `scrollLeft` / `scrollTop`. When
   * omitted, the window is the scroll source.
   *
   * The ref must be populated by the time `useScroll`'s effect runs -
   * mount the element in a child component (parent effects fire after
   * child mounts, so `ref.current` is set before the listener attaches).
   * Conditionally mounting the container after first render is not
   * supported in v1; the hook subscribes once and does not re-bind on
   * ref-current mutation.
   */
  container?: RefObject<HTMLElement | null>;
  /**
   * Ref to the target element whose scroll-relative progress is tracked.
   * When set, `scrollXProgress` / `scrollYProgress` advance `0 → 1`
   * between the two anchors in {@link offset}; `scrollX` / `scrollY`
   * continue to report raw scroll position. Accepts a plain ref or the
   * handle from {@link useScrollTarget}.
   */
  target?: RefObject<HTMLElement | null> | ScrollTargetHandle;
  /**
   * Pair of `<element-edge> <viewport-edge>` anchors. Used only when
   * {@link target} is set. Each anchor maps to a scroll position; the
   * first is progress=0, the second is progress=1.
   *
   * Default: `['start end', 'end start']`. Element edges:
   * `start`/`center`/`end` (top/middle/bottom for the Y axis).
   * Viewport edges: same vocabulary. Numeric / percentage forms are
   * also accepted - see {@link ScrollOffsetEdge}.
   */
  offset?: ScrollOffsetPair;
}

/**
 * Motion values returned by {@link useScroll}.
 *
 * All four are {@link MotionValue}s - feed them to {@link useTransform}
 * to derive opacity, translate, scale, etc. without triggering React
 * renders. `*Progress` values are `0..1` ratios. With no `target`, the
 * progress reflects scroll position over the maximum scrollable range.
 * With a `target`, the progress runs between the two `offset` anchors.
 */
export interface UseScrollResult {
  scrollX: MotionValue<number>;
  scrollY: MotionValue<number>;
  scrollXProgress: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
}

const DEFAULT_OFFSET: ScrollOffsetPair = ['start end', 'end start'];
const DEFAULT_OFFSET_KEY = JSON.stringify(DEFAULT_OFFSET);

/**
 * Track scroll position as motion values that bypass React renders.
 *
 * Without options, listens to `window` scroll. Pass `container: ref` to
 * listen to a specific scroll container. Pass `target: ref` to track
 * when a specific element enters / exits the viewport instead of
 * tracking absolute scroll progress.
 *
 * @example
 * ```tsx
 * function ParallaxHero() {
 *   const { scrollYProgress } = useScroll();
 *   const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
 *   return <Box style={{ transform: `translateY(${y.get()}px)` }} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ScrollReveal() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const { scrollYProgress } = useScroll({
 *     target: ref,
 *     offset: ['start end', 'end start'],
 *   });
 *   const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
 *   return <Box ref={ref} opacity={opacity}>fades in on entry</Box>;
 * }
 * ```
 *
 * @remarks
 * Scroll / resize events are coalesced via `requestAnimationFrame`, so
 * motion values update at most once per frame. Listeners are
 * registered with `passive: true` and won't block scrolling. With
 * `target`, a `ResizeObserver` watches the element so layout changes
 * (font load, image dimensions arriving, ...) refresh the anchors.
 *
 * Respect user reduced-motion preference at the consumer site
 * (`useReducedMotion()` branch) - `useScroll` does not gate itself.
 */
export function useScroll(options?: UseScrollOptions): UseScrollResult {
  const containerRef = options?.container;
  const target = options?.target;
  const targetRef = target !== undefined && 'ref' in target ? target.ref : target;
  const rawOffset = options?.offset ?? DEFAULT_OFFSET;
  // Stabilise the offset by value. Callers commonly pass an inline array
  // literal (`offset={['start end', 'end start']}`), a new identity every
  // render. Keying the effect on the array's identity would tear down and
  // re-add the scroll/resize listeners + ResizeObserver on every render.
  // The offset is all primitives, so a serialized key is a safe stable id.
  const offsetKey = JSON.stringify(rawOffset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const offset = useMemo(() => rawOffset, [offsetKey]);

  const [values] = useState<UseScrollResult>(() => ({
    scrollX: createMotionValue(0),
    scrollY: createMotionValue(0),
    scrollXProgress: createMotionValue(0),
    scrollYProgress: createMotionValue(0),
  }));

  // The CSS timeline each progress value follows, for a Box that binds it in a browser with
  // scroll-driven animation. A target's default offset is exactly a `view()` timeline's cover
  // range; other offsets have no CSS equivalent and stay on this hook's measurements.
  const timeline = (axis: 'block' | 'inline'): ScrollTimelineSpec | null => {
    if (targetRef !== undefined) {
      return offsetKey === DEFAULT_OFFSET_KEY ? { kind: 'view', axis, target: targetRef } : null;
    }
    return containerRef !== undefined
      ? { kind: 'scroll', axis, container: containerRef }
      : { kind: 'page', axis };
  };
  tagScrollTimeline(values.scrollYProgress, timeline('block'));
  tagScrollTimeline(values.scrollXProgress, timeline('inline'));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const containerEl = containerRef?.current ?? null;
    const offsets = parseScrollOffset(offset);
    let rafId: number | null = null;

    const measure = (): void => {
      rafId = null;
      const sx = containerEl !== null ? containerEl.scrollLeft : window.scrollX;
      const sy = containerEl !== null ? containerEl.scrollTop : window.scrollY;
      values.scrollX.set(sx);
      values.scrollY.set(sy);

      const targetEl = targetRef?.current ?? null;
      if (targetEl !== null) {
        // Target-relative progress: combine element position with
        // current viewport. `getBoundingClientRect` returns
        // viewport-relative coordinates; adding the scroll position
        // converts to content-space, which the math expects.
        const rect = targetEl.getBoundingClientRect();
        const viewportWidth = containerEl !== null ? containerEl.clientWidth : window.innerWidth;
        const viewportHeight = containerEl !== null ? containerEl.clientHeight : window.innerHeight;

        // Element coords in the container's content space:
        if (containerEl !== null) {
          const containerRect = containerEl.getBoundingClientRect();
          const elementContentX = rect.left - containerRect.left + sx;
          const elementContentY = rect.top - containerRect.top + sy;
          values.scrollXProgress.set(
            computeTargetScrollProgress(elementContentX, rect.width, sx, viewportWidth, offsets),
          );
          values.scrollYProgress.set(
            computeTargetScrollProgress(elementContentY, rect.height, sy, viewportHeight, offsets),
          );
        } else {
          const elementContentX = rect.left + sx;
          const elementContentY = rect.top + sy;
          values.scrollXProgress.set(
            computeTargetScrollProgress(elementContentX, rect.width, sx, viewportWidth, offsets),
          );
          values.scrollYProgress.set(
            computeTargetScrollProgress(elementContentY, rect.height, sy, viewportHeight, offsets),
          );
        }
        return;
      }

      // No target - fall back to scroll-progress over the container's
      // maximum scrollable distance. Same shape as the original hook.
      if (containerEl !== null) {
        const maxX = Math.max(0, containerEl.scrollWidth - containerEl.clientWidth);
        const maxY = Math.max(0, containerEl.scrollHeight - containerEl.clientHeight);
        values.scrollXProgress.set(maxX === 0 ? 0 : sx / maxX);
        values.scrollYProgress.set(maxY === 0 ? 0 : sy / maxY);
      } else {
        const docEl = document.documentElement;
        const maxX = Math.max(0, docEl.scrollWidth - window.innerWidth);
        const maxY = Math.max(0, docEl.scrollHeight - window.innerHeight);
        values.scrollXProgress.set(maxX === 0 ? 0 : sx / maxX);
        values.scrollYProgress.set(maxY === 0 ? 0 : sy / maxY);
      }
    };

    const schedule = (): void => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(measure);
    };

    measure();

    const eventTarget: EventTarget = containerEl ?? window;
    eventTarget.addEventListener('scroll', schedule, { passive: true });
    // Resize affects both layout-anchor math (target case) and
    // max-scrollable distance (non-target case). Window resize is the
    // useful signal in both modes.
    window.addEventListener('resize', schedule, { passive: true });

    // Target case: watch element layout changes - fonts settling, image
    // sizes arriving, dynamic content - so the anchor coords stay in
    // sync without a scroll event triggering them.
    let resizeObserver: ResizeObserver | null = null;
    const targetEl = targetRef?.current ?? null;
    if (targetEl !== null && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        schedule();
      });
      resizeObserver.observe(targetEl);
      if (containerEl !== null) resizeObserver.observe(containerEl);
    }

    return () => {
      eventTarget.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [containerRef, targetRef, offset, values]);

  return values;
}
