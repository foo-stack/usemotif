import {
  getBreakpoints,
  isResponsiveObject,
  PREFERENCE_QUERIES,
  type PreferenceKey,
  parseResponsiveDSL,
  parseResponsiveKey,
  responsiveArrayToObject,
  type BreakpointName,
} from '@usemotif/core';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Dimensions } from 'react-native';
import type { ContainerContextValue } from './container-context.js';

/**
 * Subscribe to RN's `Dimensions` and return the current window width.
 * Re-renders the consumer whenever the device rotates / window resizes
 * (relevant on tablets, foldables, and split-screen on iPadOS /
 * Android).
 *
 * The hook reads the **window** dimension (excludes the status bar /
 * notch on most platforms) which is the right unit for breakpoint
 * matching.
 */
/** The user preferences React Native reports, for the `@contrast`-style responsive keys. */
interface NativePreferences {
  readonly contrast: boolean;
  readonly reducedTransparency: boolean;
  readonly landscape: boolean;
}

interface PreferenceSources {
  isHighTextContrastEnabled?: () => Promise<boolean>;
  isDarkerSystemColorsEnabled?: () => Promise<boolean>;
  isReduceTransparencyEnabled?: () => Promise<boolean>;
  addEventListener?: (event: string, handler: (enabled: boolean) => void) => { remove(): void };
}

let preferences: NativePreferences = {
  contrast: false,
  reducedTransparency: false,
  landscape: false,
};
const preferenceListeners = new Set<() => void>();
let preferencesStarted = false;

function setPreferences(patch: Partial<NativePreferences>): void {
  const next = { ...preferences, ...patch };
  if (
    next.contrast === preferences.contrast &&
    next.reducedTransparency === preferences.reducedTransparency &&
    next.landscape === preferences.landscape
  ) {
    return;
  }
  preferences = next;
  for (const listener of preferenceListeners) listener();
}

/**
 * Read the platform's settings once, for the whole app, and follow their changes. Android reports
 * high text contrast and iOS darker system colours; either counts as `@contrast`. Reduced
 * transparency is iOS's. A method the platform lacks is skipped.
 */
function startPreferences(): void {
  if (preferencesStarted) return;
  preferencesStarted = true;
  const { width, height } = Dimensions.get('window');
  setPreferences({ landscape: width > height });
  Dimensions.addEventListener('change', ({ window }) => {
    setPreferences({ landscape: window.width > window.height });
  });
  const sources = AccessibilityInfo as unknown as PreferenceSources;
  let highContrast = false;
  let darkerColours = false;
  const follow = (
    read: (() => Promise<boolean>) | undefined,
    event: string,
    apply: (enabled: boolean) => void,
  ): void => {
    read?.call(sources).then(apply, () => {});
    sources.addEventListener?.(event, apply);
  };
  follow(sources.isHighTextContrastEnabled, 'highTextContrastChanged', (on) => {
    highContrast = on;
    setPreferences({ contrast: highContrast || darkerColours });
  });
  follow(sources.isDarkerSystemColorsEnabled, 'darkerSystemColorsChanged', (on) => {
    darkerColours = on;
    setPreferences({ contrast: highContrast || darkerColours });
  });
  follow(sources.isReduceTransparencyEnabled, 'reduceTransparencyChanged', (on) => {
    setPreferences({ reducedTransparency: on });
  });
}

function subscribePreferences(listener: () => void): () => void {
  startPreferences();
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

/** Whether a preference key's condition holds now. Print and forced colours never do on native. */
function preferenceActive(key: PreferenceKey): boolean {
  if (key === '@contrast') return preferences.contrast;
  if (key === '@reducedTransparency') return preferences.reducedTransparency;
  if (key === '@landscape') return preferences.landscape;
  return false;
}

/** Test hook: put the preferences back to their defaults. */
export function _setPreferencesForTesting(patch: Partial<NativePreferences> | null): void {
  if (patch === null) {
    preferences = { contrast: false, reducedTransparency: false, landscape: false };
    preferencesStarted = false;
    return;
  }
  setPreferences(patch);
}

/** The current preferences; a new object whenever one changes, so it can key a cache. */
export function usePreferences(): NativePreferences {
  return useSyncExternalStore(
    subscribePreferences,
    () => preferences,
    () => preferences,
  );
}

export function useViewportWidth(): number {
  // Responsive values resolve against the user's preferences as well as the width, so every
  // component that resolves them re-renders when one changes.
  usePreferences();
  const [width, setWidth] = useState<number>(() => Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWidth(window.width);
    });
    return () => sub.remove();
  }, []);
  return width;
}

type AscBreakpoints = ReadonlyArray<{ name: BreakpointName; px: number }>;

/**
 * Build the ascending (mobile-first) breakpoint list for a given width map, so
 * the resolver walks slots smallest-first and the *largest* breakpoint ≤ the
 * viewport width wins. Sorted by px so a custom config that reorders widths
 * still cascades correctly.
 *
 * Previously this was frozen at module load from `defaultBreakpoints`, so
 * `<ThemeProvider breakpoints={...}>` had NO effect on native responsive props.
 * Now the RN primitives pass their per-tree widths (`useBreakpointWidths()`)
 * in, unifying the declarative path with `useMedia`/`Show`/`Hide`.
 */
function ascendingBreakpoints(widths: Readonly<Record<BreakpointName, number>>): AscBreakpoints {
  return (Object.keys(widths) as BreakpointName[])
    .map((name) => ({ name, px: widths[name] }))
    .sort((a, b) => a.px - b.px);
}

/**
 * Pick the right slot of a responsive value for the given viewport
 * width. Native equivalent of the web's `@media (min-width: ...)`
 * cascade - the slot whose breakpoint is the *largest* one ≤ `width`
 * wins, with `base` as the fallback.
 *
 * Container-query keys (`@<bp>` / `@<name>.<bp>`) are **ignored**
 * here; those are handled by the container-query polyfill via the
 * Container's `onLayout`. If a value carries only container keys
 * (no `base` and no plain breakpoint slots), the result is
 * `undefined` (consumer's caller drops the prop).
 *
 * @param value The responsive shape - object, array, or DSL string.
 *   Non-responsive values pass through unchanged.
 * @param width Current viewport width in CSS pixels.
 */
export function resolveResponsiveAtWidth(
  value: unknown,
  width: number,
  asc: AscBreakpoints = ascendingBreakpoints(getBreakpoints()),
): unknown {
  // Arrays: positional `[base, sm, md, ...]`. Convert to object form
  // and walk through the same logic.
  if (Array.isArray(value)) {
    return pickFromObject(responsiveArrayToObject(value as readonly unknown[]), width, asc);
  }
  // Strings: DSL ("base:$2 md:$4") or literal CSS value ("#fff",
  // "rgb(0,0,0)", etc.). The parser returns null for non-DSL strings.
  if (typeof value === 'string') {
    const parsed = parseResponsiveDSL(value);
    if (parsed === null) return value;
    return pickFromObject(parsed, width, asc);
  }
  // Objects: walk keys, pick the right one.
  if (isResponsiveObject(value)) {
    return pickFromObject(value as Record<string, unknown>, width, asc);
  }
  return value;
}

/**
 * Apply the breakpoint cascade across a responsive object. Returns
 * the value at the largest media-query breakpoint <= `width`, or
 * `base` if none qualify, or `undefined` if the object is
 * container-only.
 */
function pickFromObject(obj: Record<string, unknown>, width: number, asc: AscBreakpoints): unknown {
  let chosen: unknown = obj['base'];
  for (const { name, px } of asc) {
    if (width < px) break;
    const slot = obj[name];
    if (slot !== undefined) chosen = slot;
  }
  return applyPreferences(obj, chosen);
}

/** The value for the last preference key that holds, after the width cascade chose `chosen`. */
function applyPreferences(obj: Record<string, unknown>, chosen: unknown): unknown {
  for (const key of Object.keys(PREFERENCE_QUERIES) as PreferenceKey[]) {
    if (obj[key] !== undefined && preferenceActive(key)) chosen = obj[key];
  }
  return chosen;
}

/**
 * Full native cascade: resolve a single responsive value against
 * BOTH the viewport width and the container chain.
 *
 * Cascade order (later wins):
 * 1. `base` slot
 * 2. Plain breakpoint slots (`sm`, `md`, ...) where viewport ≥ bp
 * 3. Anonymous container slots (`@<bp>`) where the nearest
 *    container's width ≥ bp
 * 4. Named container slots (`@<name>.<bp>`) where the matching
 *    container's width ≥ bp; multiple names walk in alphabetical
 *    order so the cascade is deterministic across renders
 *
 * Same precedence as the web emitter (`media → anon → named`,
 * mobile-first within each group).
 */
export function resolveResponsiveAtViewportAndContainer(
  value: unknown,
  viewportWidth: number,
  container: ContainerContextValue,
  asc: AscBreakpoints = ascendingBreakpoints(getBreakpoints()),
): unknown {
  // Arrays: media-only positional shorthand. Container chain doesn't
  // apply since arrays can't carry @-keys. Delegate to the viewport
  // resolver.
  if (Array.isArray(value)) {
    return resolveResponsiveAtWidth(value, viewportWidth, asc);
  }
  // Strings: DSL or literal. DSL parses to an object; literals pass
  // through unchanged.
  if (typeof value === 'string') {
    const parsed = parseResponsiveDSL(value);
    if (parsed === null) return value;
    return cascadeObject(parsed, viewportWidth, container, asc);
  }
  if (isResponsiveObject(value)) {
    return cascadeObject(value as Record<string, unknown>, viewportWidth, container, asc);
  }
  return value;
}

/**
 * Apply the full media + container cascade to a responsive object.
 * Preserves the same precedence the web emitter uses.
 */
function cascadeObject(
  obj: Record<string, unknown>,
  viewportWidth: number,
  container: ContainerContextValue,
  asc: AscBreakpoints,
): unknown {
  let chosen: unknown = obj['base'];

  // Pass 1 - media keys (mobile-first).
  for (const { name, px } of asc) {
    if (viewportWidth < px) break;
    const slot = obj[name];
    if (slot !== undefined) chosen = slot;
  }

  // Bucket the @-keys by name so we can apply anonymous first then
  // named (alphabetical), each in mobile-first breakpoint order.
  const anonByBp: Partial<Record<BreakpointName, unknown>> = {};
  const namedByName: Record<string, Partial<Record<BreakpointName, unknown>>> = {};
  for (const key in obj) {
    if (!key.startsWith('@')) continue;
    const parsed = parseResponsiveKey(key);
    if (parsed === null || parsed.kind !== 'container') continue;
    if (parsed.name === undefined) {
      anonByBp[parsed.bp] = obj[key];
    } else {
      (namedByName[parsed.name] ??= {})[parsed.bp] = obj[key];
    }
  }

  // Pass 2 - anonymous container keys (@<bp>) against nearestWidth.
  if (container.nearestWidth !== null) {
    for (const { name, px } of asc) {
      if (container.nearestWidth < px) break;
      const slot = anonByBp[name];
      if (slot !== undefined) chosen = slot;
    }
  }

  // Pass 3 - named container keys (@<name>.<bp>) against the named
  // container's width. Names walked alphabetically for deterministic
  // ordering across renders.
  const sortedNames = Object.keys(namedByName).sort();
  for (const cname of sortedNames) {
    const cw = container.named.get(cname);
    if (cw === undefined) continue;
    const buckets = namedByName[cname]!;
    for (const { name, px } of asc) {
      if (cw < px) break;
      const slot = buckets[name];
      if (slot !== undefined) chosen = slot;
    }
  }

  // Pass 4 - preference conditions, last, so a user preference wins over any width.
  return applyPreferences(obj, chosen);
}

/**
 * Walk a props bag, applying the full viewport + container cascade.
 * Used by Box / Text / Pressable / Image when wrapped (directly or
 * transitively) in a `<Container>`.
 */
export function resolveResponsivePropsAtViewportAndContainer(
  props: Record<string, unknown>,
  viewportWidth: number,
  container: ContainerContextValue,
  widths: Readonly<Record<BreakpointName, number>> = getBreakpoints(),
): Record<string, unknown> {
  // Sort the per-tree widths once for the whole prop bag, not per prop.
  const asc = ascendingBreakpoints(widths);
  const out: Record<string, unknown> = {};
  for (const key in props) {
    out[key] = resolveResponsiveAtViewportAndContainer(props[key], viewportWidth, container, asc);
  }
  return out;
}
