import { isTokenRef, resolveToken } from './token.js';
import { tokenRefToCssVar } from './css-vars.js';
import { escapeCssVarNameSegment } from './css-emit.js';
import {
  isKeyframe,
  type AnimationObject,
  type Keyframe,
  type TransitionObject,
  type TransitionValue,
} from './style-props.js';
import type { AnimationToken, Theme } from './types.js';

const DEFAULT_PROPERTY = 'all';
const DEFAULT_DURATION = '200ms';
const DEFAULT_EASING = 'ease';

/**
 * Resolve a `transition` prop value to a CSS `transition` string with
 * literal values. Token references resolve against `theme`. Used by the
 * native renderer / tests where `var(--...)` cannot be emitted.
 *
 * Returns `undefined` if `value` is `undefined` so callers can chain.
 */
export function resolveTransition(
  value: TransitionValue | undefined,
  theme: Theme | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => stringifyObject(entry, theme, false)).join(', ');
  }
  return stringifyObject(value as TransitionObject, theme, false);
}

/**
 * Resolve a `transition` prop value to a CSS string with `var(--...)`
 * substitutions for token references. Used by the web renderer where
 * the active theme drives the cascade and literal resolution would
 * defeat theme switching.
 */
export function resolveTransitionToVars(value: TransitionValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => stringifyObject(entry, undefined, true)).join(', ');
  }
  return stringifyObject(value as TransitionObject, undefined, true);
}

function stringifyObject(
  obj: TransitionObject,
  theme: Theme | undefined,
  emitVars: boolean,
): string {
  const property = obj.property ?? DEFAULT_PROPERTY;
  const duration = resolvePart(obj.duration, theme, emitVars, 'durations') ?? DEFAULT_DURATION;
  const easing = resolvePart(obj.easing, theme, emitVars, 'easings') ?? DEFAULT_EASING;
  const delay = resolvePart(obj.delay, theme, emitVars, 'durations');
  return delay === undefined
    ? `${property} ${duration} ${easing}`
    : `${property} ${duration} ${easing} ${delay}`;
}

function resolvePart(
  value: string | undefined,
  theme: Theme | undefined,
  emitVars: boolean,
  defaultScale: 'durations' | 'easings',
): string | undefined {
  if (value === undefined) return undefined;
  if (!isTokenRef(value)) return value;
  if (emitVars) return tokenRefToCssVar(value, defaultScale);
  if (theme === undefined) return undefined;
  const resolved = resolveToken(value, theme, { defaultScale });
  return typeof resolved === 'string' ? resolved : undefined;
}

/**
 * Look up a named animation preset on the active theme. Returns the
 * raw {@link AnimationToken} (timing or spring) so the caller can
 * decide whether to expand it to a CSS transition string (web) or a
 * driver timing pair (native).
 *
 * Returns `undefined` if the name doesn't resolve - callers should
 * fall back to their default timing (200ms ease).
 */
export function resolveAnimationToken(
  name: string | undefined,
  theme: Theme | undefined,
): AnimationToken | undefined {
  if (name === undefined) return undefined;
  if (theme === undefined) return undefined;
  const animations = theme.tokens.animations;
  if (animations === undefined) return undefined;
  return animations[name];
}

/**
 * Build a CSS `transition` string for the web renderer from an
 * `animation="quick"` reference and an optional `animateOnly` list.
 * The result uses `var(--motif-anim-<name>-{duration,easing})`
 * references so theme switches flip the timing through the cascade
 * without re-rendering. Pre-condition: the animation name is
 * registered on the active theme - this helper doesn't validate.
 *
 * - `animateOnly` undefined → `all var(--...) var(--...)` (every changed
 *   property animates).
 * - `animateOnly: ['transform']` → single-property transition.
 * - `animateOnly: ['transform', 'opacity']` → comma-joined list.
 *
 * Returns `undefined` when `name` is undefined.
 */
export function buildAnimationCss(
  name: string | undefined,
  animateOnly?: readonly string[],
): string | undefined {
  if (name === undefined) return undefined;
  // Must escape identically to the declaration side (writeAnimationVars) so
  // the var() reference resolves to the same custom property.
  const safe = escapeCssVarNameSegment(name);
  const dur = `var(--motif-anim-${safe}-duration)`;
  const ease = `var(--motif-anim-${safe}-easing)`;
  const props = animateOnly === undefined || animateOnly.length === 0 ? ['all'] : [...animateOnly];
  return props.map((p) => `${p} ${dur} ${ease}`).join(', ');
}

/**
 * Build a CSS `animation` shorthand for the web renderer from an
 * {@link AnimationObject}. Token references in `duration` / `easing` /
 * `delay` resolve to `var(--...)` so theme switches flip the timing
 * through the cascade. When `name` is a {@link Keyframe}, returns its
 * stable hash-based name; the caller is responsible for ensuring the
 * `@keyframes` rule is registered (see `keyframes()` in
 * `@usemotif/react`).
 *
 * Field order in the output mirrors the CSS spec:
 *
 *   `<name> <duration> <easing> <delay> <iteration-count> <direction> <fill-mode> <play-state>`
 *
 * Empty / unset slots are omitted, so a minimal `{ name: 'spin' }`
 * produces just `spin 200ms ease`.
 */
export function buildAnimationShorthand(obj: AnimationObject): string {
  const name = isKeyframe(obj.name) ? obj.name.name : obj.name;
  const duration = resolvePart(obj.duration, undefined, true, 'durations') ?? '200ms';
  const easing = resolvePart(obj.easing, undefined, true, 'easings') ?? 'ease';
  const delay = resolvePart(obj.delay, undefined, true, 'durations');

  const slots: string[] = [name, duration, easing];
  if (delay !== undefined) slots.push(delay);
  if (obj.iterationCount !== undefined) slots.push(String(obj.iterationCount));
  if (obj.direction !== undefined) slots.push(obj.direction);
  if (obj.fillMode !== undefined) slots.push(obj.fillMode);
  if (obj.playState !== undefined) slots.push(obj.playState);
  return slots.join(' ');
}

/**
 * Pull the {@link Keyframe} out of an `animation` prop value, if any.
 * Used by the web renderer to inject the `@keyframes` rule once before
 * applying the `animation` style.
 *
 * Returns `undefined` for string / undefined / object-without-Keyframe.
 */
export function extractKeyframeFromAnimation(
  value: string | AnimationObject | undefined,
): Keyframe | undefined {
  if (value === undefined || typeof value === 'string') return undefined;
  if (isKeyframe(value.name)) return value.name;
  return undefined;
}

export { springToCssTiming } from './css-vars.js';
