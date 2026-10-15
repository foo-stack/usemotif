import type { MotionValue, OutputRangeKind } from '@usemotif/core';
import type { RefObject } from 'react';
import { setScrollAnimator } from './_scroll-animator.js';
import {
  writeComposedTransformToStyle,
  writeMotionValueToStyle,
  type MotionBinding,
} from './_motion-bindings.js';

/**
 * CSS scroll-driven animation for scroll-linked motion values.
 *
 * `useScroll` tags its progress values with the timeline they follow, and `useTransform` tags a
 * value derived from one with its ranges. When a Box binds a tagged value and the browser
 * supports `animation-timeline`, the binding becomes `@keyframes` on that timeline instead of a
 * per-frame write, so it animates off the main thread. Anything that can't be expressed that
 * way keeps the JS path.
 */

type Axis = 'block' | 'inline';

/** The scroll timeline a progress value follows. */
export type ScrollTimelineSpec =
  | { readonly kind: 'page'; readonly axis: Axis }
  | {
      readonly kind: 'scroll';
      readonly axis: Axis;
      readonly container: RefObject<HTMLElement | null>;
    }
  | { readonly kind: 'view'; readonly axis: Axis; readonly target: RefObject<HTMLElement | null> };

interface Link {
  readonly source: MotionValue;
  readonly input: readonly number[];
  readonly output: readonly (string | number)[];
}

const TIMELINES = new WeakMap<MotionValue, ScrollTimelineSpec>();
const LINKS = new WeakMap<MotionValue, Link>();

/** Tag a scroll progress value with its timeline, or untag it with `null`. */
export function tagScrollTimeline(mv: MotionValue, spec: ScrollTimelineSpec | null): void {
  setScrollAnimator(applyScrollAnimations);
  if (spec === null) TIMELINES.delete(mv);
  else TIMELINES.set(mv, spec);
}

/**
 * Tag a `useTransform` result with its ranges when CSS keyframes interpolate them exactly as
 * the JS path does: numbers or one shared length unit, inputs ascending within 0 to 1.
 */
export function tagTransformLink(
  mv: MotionValue,
  source: MotionValue,
  input: readonly number[],
  output: readonly (string | number)[] | undefined,
  kind: OutputRangeKind,
): void {
  const linear = kind === 'numeric' || kind === 'unit-matched';
  const inRange =
    input.length >= 2 &&
    input.length === output?.length &&
    input.every((v, i) => v >= 0 && v <= 1 && (i === 0 || v > input[i - 1]!));
  if (linear && inRange) LINKS.set(mv, { source, input, output: output! });
  else LINKS.delete(mv);
}

/** The timeline and keyframe stops a bound value compiles to, or `null` for the JS path. */
export function scrollAnimationOf(mv: MotionValue): {
  timeline: ScrollTimelineSpec;
  input: readonly number[];
  output: readonly (string | number)[];
} | null {
  const direct = TIMELINES.get(mv);
  if (direct !== undefined) return { timeline: direct, input: [0, 1], output: [0, 1] };
  const link = LINKS.get(mv);
  const timeline = link === undefined ? undefined : TIMELINES.get(link.source);
  return timeline === undefined ? null : { timeline, input: link!.input, output: link!.output };
}

let supported: boolean | undefined;
export function supportsScrollTimelines(): boolean {
  supported ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()');
  return supported;
}

/** Test hook: forget the cached feature check. */
export function _resetScrollTimelineSupportForTesting(): void {
  supported = undefined;
}

let sheet: CSSStyleSheet | null = null;
const injected = new Set<string>();
const scoped = new Set<string>();
let nextName = 0;
const NAMES = new WeakMap<object, string>();

function insertKeyframes(name: string, body: string): void {
  if (injected.has(name)) return;
  injected.add(name);
  if (sheet === null) {
    const style = document.createElement('style');
    style.setAttribute('data-motif-timelines', '');
    document.head.appendChild(style);
    sheet = style.sheet;
  }
  sheet?.insertRule(`@keyframes ${name} { ${body} }`, sheet.cssRules.length);
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * A named timeline on a container or target. Named timelines are only visible to the scroller's
 * descendants, so the name is also added to `timeline-scope` on the root element, which makes it
 * visible to an animated element anywhere on the page.
 */
function namedTimeline(element: HTMLElement, property: string, axis: Axis): string {
  let name = NAMES.get(element);
  if (name === undefined) {
    name = `--motif-tl-${nextName++}`;
    NAMES.set(element, name);
  }
  element.style.setProperty(property, `${name} ${axis}`);
  if (!scoped.has(name)) {
    scoped.add(name);
    document.documentElement.style.setProperty('timeline-scope', [...scoped].join(', '));
  }
  return name;
}

function timelineOf(spec: ScrollTimelineSpec): { timeline: string; range: string } | null {
  if (spec.kind === 'page') return { timeline: `scroll(root ${spec.axis})`, range: 'normal' };
  const element = spec.kind === 'scroll' ? spec.container.current : spec.target.current;
  if (element === null) return null;
  return spec.kind === 'scroll'
    ? { timeline: namedTimeline(element, 'scroll-timeline', spec.axis), range: 'normal' }
    : {
        timeline: namedTimeline(element, 'view-timeline', spec.axis),
        range: 'cover 0% cover 100%',
      };
}

/**
 * Put every binding that can run on a scroll timeline onto one, as inline `animation-*`
 * longhands, and return the bindings left for the JS path. Leaves everything on the JS path
 * when the browser lacks scroll timelines, when the element already has an inline animation,
 * or for a transform axis that shares `transform` with another axis binding. `pending` says a
 * binding waited on a ref that was not attached yet, so a later pass may compile it.
 */
export function applyScrollAnimations(
  element: HTMLElement | SVGElement,
  bindings: readonly MotionBinding[],
): { rest: readonly MotionBinding[]; clear: () => void; pending: boolean } {
  const none = { rest: bindings, clear: () => {}, pending: false };
  if (!supportsScrollTimelines() || element.style.animationName !== '') return none;
  const axisBindings = bindings.filter((b) => b.transformAxis !== undefined).length;
  const scratch = document.createElement('div');

  const names: string[] = [];
  const timelines: string[] = [];
  const ranges: string[] = [];
  const rest: MotionBinding[] = [];
  let pending = false;
  for (const binding of bindings) {
    const animation = scrollAnimationOf(binding.mv);
    const timeline = animation === null ? null : timelineOf(animation.timeline);
    // A container or target whose ref is not attached yet, as with a parent target during a
    // child's first layout effect.
    if (animation !== null && timeline === null) pending = true;
    if (
      animation === null ||
      timeline === null ||
      (binding.transformAxis !== undefined && axisBindings > 1)
    ) {
      rest.push(binding);
      continue;
    }
    const declaration = (value: string | number): string => {
      scratch.removeAttribute('style');
      if (binding.transformAxis !== undefined) {
        writeComposedTransformToStyle(scratch, { [binding.transformAxis]: value });
      } else {
        writeMotionValueToStyle(scratch, binding.cssProperty, binding.scale, value);
      }
      return scratch.style.cssText;
    };
    const { input, output } = animation;
    // Explicit 0% and 100% stops hold the end values, matching the JS path's clamping.
    const stops = [
      `0% { ${declaration(output[0]!)} }`,
      ...input.map((at, i) => `${+(at * 100).toFixed(4)}% { ${declaration(output[i]!)} }`),
      `100% { ${declaration(output[output.length - 1]!)} }`,
    ].join(' ');
    const name = `motif-scroll-${hash(stops)}`;
    insertKeyframes(name, stops);
    names.push(name);
    timelines.push(timeline.timeline);
    ranges.push(timeline.range);
  }
  if (names.length === 0) return { ...none, pending };

  const style = element.style;
  style.animationName = names.join(', ');
  style.animationDuration = names.map(() => 'auto').join(', ');
  style.animationTimingFunction = 'linear';
  style.animationFillMode = 'both';
  style.setProperty('animation-timeline', timelines.join(', '));
  style.setProperty('animation-range', ranges.join(', '));
  return {
    rest,
    pending,
    clear: () => {
      for (const property of [
        'animation-name',
        'animation-duration',
        'animation-timing-function',
        'animation-fill-mode',
        'animation-timeline',
        'animation-range',
      ]) {
        style.removeProperty(property);
      }
    },
  };
}
