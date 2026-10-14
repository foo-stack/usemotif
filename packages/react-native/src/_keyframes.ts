import { isTokenRef, resolveToken, type Keyframe, type Theme } from '@usemotif/core';
import { processColor } from 'react-native';
import { sanitizeNativeStyle } from './_native-style.js';

/** One keyframe stop, converted to native style. `offset` runs 0..1. */
export interface KeyframeStop {
  readonly offset: number;
  readonly style: Readonly<Record<string, unknown>>;
}

export interface KeyframeTiming {
  readonly durationMs: number;
  readonly delayMs: number;
  /** `Infinity` for `'infinite'`. Fractional counts end partway through. */
  readonly iterations: number;
  readonly direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  readonly fillMode: 'none' | 'forwards' | 'backwards' | 'both';
}

const PX_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/;

function parseStopOffset(stop: string): number | null {
  const s = stop.trim();
  if (s === 'from') return 0;
  if (s === 'to') return 1;
  const m = /^(\d+(?:\.\d+)?)%$/.exec(s);
  if (m === null) return null;
  const n = Number(m[1]) / 100;
  return n <= 1 ? n : null;
}

/**
 * Turn a keyframe definition into sorted native stops: token refs resolved
 * against the theme, `Npx` lengths to numbers, CSS transform strings to RN
 * arrays. Stops sharing an offset merge, later properties winning, as in CSS.
 */
export function compileKeyframes(
  frames: NonNullable<Keyframe['frames']>,
  theme: Theme | undefined,
): KeyframeStop[] {
  const byOffset = new Map<number, Record<string, unknown>>();
  for (const stop in frames) {
    const raw = frames[stop];
    if (raw === undefined) continue;
    const style: Record<string, unknown> = {};
    for (const key in raw) {
      let value: unknown = raw[key];
      if (typeof value === 'string' && isTokenRef(value)) {
        value = theme === undefined ? undefined : resolveToken(value, theme);
      }
      if (typeof value === 'string') {
        const px = PX_RE.exec(value);
        if (px !== null) value = Number(px[1]);
      }
      if (value !== undefined) style[key] = value;
    }
    const native = sanitizeNativeStyle(style);
    for (const part of stop.split(',')) {
      const offset = parseStopOffset(part);
      if (offset === null) continue;
      byOffset.set(offset, { ...byOffset.get(offset), ...native });
    }
  }
  return [...byOffset.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([offset, style]) => ({ offset, style }));
}

const UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]+)$/;

// RN's own parser, so every colour format the platform draws is one it can
// blend. Platform colours come back as objects and stay discrete.
function colorOf(value: string): number | null {
  const parsed: unknown = processColor(value);
  return typeof parsed === 'number' ? parsed >>> 0 : null;
}

function mixColor(a: number, b: number, t: number): string {
  const channel = (shift: number): number => {
    const from = (a >>> shift) & 255;
    return from + (((b >>> shift) & 255) - from) * t;
  };
  const alpha = Math.round((channel(24) / 255) * 1000) / 1000;
  return `rgba(${Math.round(channel(16))}, ${Math.round(channel(8))}, ${Math.round(channel(0))}, ${alpha})`;
}

function mixScalar(a: unknown, b: unknown, t: number): unknown {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (typeof a === 'string' && typeof b === 'string') {
    const ua = UNIT_RE.exec(a);
    const ub = UNIT_RE.exec(b);
    if (ua !== null && ub !== null && ua[2] === ub[2]) {
      const from = Number(ua[1]);
      return `${from + (Number(ub[1]) - from) * t}${ua[2]}`;
    }
    const ca = colorOf(a);
    const cb = colorOf(b);
    if (ca !== null && cb !== null) return mixColor(ca, cb, t);
  }
  // Discrete values flip halfway through the segment, as CSS does.
  return t < 0.5 ? a : b;
}

function axisOf(entry: unknown): string | undefined {
  return entry !== null && typeof entry === 'object' ? Object.keys(entry)[0] : undefined;
}

/** Same axes in the same order mix axis by axis; anything else is discrete. */
function mixTransform(a: unknown, b: unknown, t: number): unknown {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length !== b.length ||
    a.some((entry, i) => axisOf(entry) !== axisOf(b[i]))
  ) {
    return t < 0.5 ? a : b;
  }
  return a.map((entry: Record<string, unknown>, i) => {
    const axis = axisOf(entry)!;
    return { [axis]: mixScalar(entry[axis], (b[i] as Record<string, unknown>)[axis], t) };
  });
}

/**
 * The style at `progress` (0..1 through one iteration). Each property
 * interpolates between the stops that define it, with `ease` applied per
 * segment. A property missing from the 0% or 100% stop takes the element's own
 * value from `base`, or else holds the nearest stop that defines it.
 */
export function sampleKeyframes(
  stops: readonly KeyframeStop[],
  progress: number,
  ease: (t: number) => number,
  base: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const p = Math.min(1, Math.max(0, progress));
  const props = new Set<string>();
  for (const stop of stops) for (const key in stop.style) props.add(key);

  const out: Record<string, unknown> = {};
  for (const prop of props) {
    const defined: { offset: number; value: unknown }[] = [];
    for (const stop of stops) {
      if (prop in stop.style) defined.push({ offset: stop.offset, value: stop.style[prop] });
    }
    const first = defined[0]!;
    const last = defined.at(-1)!;
    if (first.offset > 0) defined.unshift({ offset: 0, value: base[prop] ?? first.value });
    if (last.offset < 1) defined.push({ offset: 1, value: base[prop] ?? last.value });

    let i = 0;
    while (i < defined.length - 2 && p > defined[i + 1]!.offset) i++;
    const from = defined[i]!;
    const to = defined[i + 1]!;
    const span = to.offset - from.offset;
    const t = ease(span === 0 ? 1 : (p - from.offset) / span);
    out[prop] =
      prop === 'transform'
        ? mixTransform(from.value, to.value, t)
        : mixScalar(from.value, to.value, t);
  }
  return out;
}

function directed(timing: KeyframeTiming, iteration: number, fraction: number): number {
  const odd = iteration % 2 === 1;
  const reversed =
    timing.direction === 'reverse' ||
    (timing.direction === 'alternate' && odd) ||
    (timing.direction === 'alternate-reverse' && !odd);
  return reversed ? 1 - fraction : fraction;
}

/**
 * Where a CSS animation is `elapsedMs` after it started: the iteration
 * progress to sample, or `null` when no keyframe style applies (inside the
 * delay without a backwards fill, or after the end without a forwards fill).
 */
export function keyframeProgress(
  elapsedMs: number,
  timing: KeyframeTiming,
): { progress: number | null; done: boolean } {
  const { durationMs, delayMs, iterations, fillMode } = timing;
  if (elapsedMs < delayMs) {
    const fills = fillMode === 'backwards' || fillMode === 'both';
    return { progress: fills ? directed(timing, 0, 0) : null, done: false };
  }
  const active = elapsedMs - delayMs;
  if (durationMs <= 0 || active >= durationMs * iterations) {
    const fills = fillMode === 'forwards' || fillMode === 'both';
    if (!fills) return { progress: null, done: true };
    if (!Number.isFinite(iterations)) return { progress: directed(timing, 0, 1), done: true };
    const whole = Number.isInteger(iterations) && iterations > 0;
    const iteration = whole ? iterations - 1 : Math.floor(iterations);
    const fraction = whole ? 1 : iterations - Math.floor(iterations);
    return { progress: directed(timing, iteration, fraction), done: true };
  }
  const position = active / durationMs;
  const iteration = Math.floor(position);
  return { progress: directed(timing, iteration, position - iteration), done: false };
}
