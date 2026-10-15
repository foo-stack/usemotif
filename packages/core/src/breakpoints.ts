/**
 * Default breakpoint set. Mobile-first: each name maps to the **min-width**
 * (in CSS pixels) at which the breakpoint becomes active. Tailwind-aligned.
 *
 * Override the pixel values with {@link configureBreakpoints}. The five names
 * are fixed; only their widths change.
 */
export const defaultBreakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointName = keyof typeof defaultBreakpoints;

/**
 * The active breakpoint widths. Defaults to {@link defaultBreakpoints} until
 * {@link configureBreakpoints} overrides them.
 *
 * This module-global is the single source of truth that BOTH the runtime
 * resolver and the compiler read when building `@media` / `@container` rules
 * and computing matches - so their CSS output agrees byte-for-byte. It must be
 * a build-fixed value, not a runtime/theme one: CSS media queries cannot read
 * `var()` (`@media (min-width: var(--x))` is invalid), so a breakpoint that
 * feeds an `@media` rule has to be a literal known when the CSS is built.
 */
let activeBreakpoints: Record<BreakpointName, number> = { ...defaultBreakpoints };

/**
 * Override one or more breakpoint pixel values. Merges over the defaults (so
 * unspecified names keep their default width); the five names are fixed.
 *
 * Call this ONCE at app entry, and pass the SAME object to the compiler
 * plugin's `breakpoints` option, so the runtime-emitted CSS and the compiled
 * CSS use identical thresholds. A mismatch means dev and prod disagree.
 *
 * @example
 *   configureBreakpoints({ md: 800, lg: 1100 });
 */
export function configureBreakpoints(overrides: Partial<Record<BreakpointName, number>>): void {
  activeBreakpoints = { ...defaultBreakpoints, ...overrides };
}

/** The active breakpoint widths - the configured set, or the defaults. */
export function getBreakpoints(): Readonly<Record<BreakpointName, number>> {
  return activeBreakpoints;
}

/**
 * Resolve a partial override into a full width map over the defaults. Used by
 * the renderer to compute the per-render-tree widths it threads through
 * `ThemeContext` (see `@usemotif/react`'s `useBreakpointWidths`), so JS match
 * resolution is per-tree rather than dependent on the process-global. The
 * `@media` CSS widths stay on the global (they cannot be `var()`-driven).
 */
export function resolveBreakpoints(
  overrides?: Partial<Record<BreakpointName, number>>,
): Record<BreakpointName, number> {
  return { ...defaultBreakpoints, ...overrides };
}

/**
 * Breakpoint names in ascending (mobile-first) min-width order. `Object.keys`
 * preserves insertion order, and {@link defaultBreakpoints} is authored
 * smallest-first, so this is the cascade order: the largest matching
 * breakpoint wins.
 */
export const MEDIA_KEYS = Object.keys(defaultBreakpoints) as readonly BreakpointName[];

/**
 * The result of {@link breakpointMatches} - a frozen map of each breakpoint
 * name to whether the current viewport is at least that wide. Drives the
 * `useMedia()` hook: `media.md` is `true` once the viewport reaches 768px.
 */
export type MediaState = Readonly<Record<BreakpointName, boolean>>;

/**
 * Default viewport width assumed during SSR and the first client render, so
 * server and client agree and hydration doesn't mismatch. The effect in
 * `useMedia()` measures the real width on mount and reconciles. Matches the
 * value the `Show`/`Hide` viewport-match path already uses.
 */
export const SSR_DEFAULT_VIEWPORT_WIDTH = 1024;

/**
 * Compute the breakpoint-match map for a viewport `width` (CSS px). Each entry
 * is `width >= defaultBreakpoints[name]` - mobile-first min-width semantics,
 * identical to the `@media (min-width: ...)` rules the responsive props emit.
 */
export function breakpointMatches(
  width: number,
  widths: Readonly<Record<BreakpointName, number>> = activeBreakpoints,
): MediaState {
  const out = {} as Record<BreakpointName, boolean>;
  for (const name of MEDIA_KEYS) out[name] = width >= widths[name];
  return out;
}

/**
 * The single active breakpoint for a viewport `width` - the largest whose
 * min-width the viewport meets, or `'base'` below the smallest. The simple
 * counterpart to {@link breakpointMatches} for `useBreakpoint()`.
 */
export function activeBreakpoint(
  width: number,
  widths: Readonly<Record<BreakpointName, number>> = activeBreakpoints,
): BreakpointName | 'base' {
  let active: BreakpointName | 'base' = 'base';
  for (const name of MEDIA_KEYS) {
    if (width >= widths[name]) active = name;
  }
  return active;
}

/** Structural equality of two match maps - used to skip a re-render when a
 * resize doesn't cross any breakpoint boundary. */
export function sameMatches(a: MediaState, b: MediaState): boolean {
  for (const name of MEDIA_KEYS) {
    if (a[name] !== b[name]) return false;
  }
  return true;
}

/**
 * The base (unprefixed) key in a responsive prop object.
 *
 * @example
 *   <Box p={{ base: '$2', md: '$4' }} />
 */
export const BASE_BREAKPOINT_KEY = 'base';

/**
 * Fixed media-query keys recognised inside a responsive prop object.
 * Container-query keys (`@<bp>`, `@<name>.<bp>`) are recognised separately
 * by {@link parseResponsiveKey} since the name slot is open-ended.
 */
export const RESPONSIVE_KEYS: ReadonlySet<string> = new Set([
  BASE_BREAKPOINT_KEY,
  ...Object.keys(defaultBreakpoints),
]);

/**
 * Type-guard: does this value look like a responsive prop object (a plain
 * object with at least one recognised breakpoint or container-query key)?
 *
 * Lenient by design: the responsive resolver supports objects that mix valid
 * breakpoint keys with a typo'd/unknown key (the unknown key is dropped
 * silently). Object-form value props (e.g. `fontVariationSettings`) are
 * disambiguated separately at the `serialize` call site via
 * {@link isResponsiveObjectOfObjects}, which also inspects the value shape.
 */
export function isResponsiveObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  for (const key in value as Record<string, unknown>) {
    if (RESPONSIVE_KEYS.has(key) || isPreferenceKey(key)) return true;
    if (key.startsWith('@')) {
      const inner = key.slice(1);
      const dotIdx = inner.indexOf('.');
      const bp = dotIdx === -1 ? inner : inner.slice(dotIdx + 1);
      if (Object.hasOwn(defaultBreakpoints, bp)) return true;
    }
  }
  return false;
}

/**
 * Stricter responsive check used to disambiguate **object-valued** props (those
 * with a `serialize`, e.g. `fontVariationSettings`). A responsive wrapping of an
 * object-valued prop has object values at each breakpoint
 * (`{ base: { wght: 400 }, md: { wght: 700 } }`); the direct serialized form has
 * scalar values (`{ wght: 400 }`). So the object is responsive only when it
 * passes {@link isResponsiveObject} *and* every value is itself a plain object.
 *
 * This keeps `fontVariationSettings={{ wght: 400 }}` (and even the
 * breakpoint-name-colliding `{ md: 400 }`) on the serialize path instead of
 * being mis-read as responsive and silently dropped.
 */
export function isResponsiveObjectOfObjects(value: unknown): value is Record<string, unknown> {
  if (!isResponsiveObject(value)) return false;
  for (const key in value) {
    const v = (value as Record<string, unknown>)[key];
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  }
  return true;
}

/**
 * Positional slot order for the array responsive syntax:
 * `p={[base, sm, md, lg, xl, '2xl']}`. Slot 0 is `base`; subsequent slots
 * map to breakpoints in mobile-first order. Trailing slots are optional.
 */
export const RESPONSIVE_ARRAY_SLOTS: readonly (typeof BASE_BREAKPOINT_KEY | BreakpointName)[] = [
  BASE_BREAKPOINT_KEY,
  ...(Object.keys(defaultBreakpoints) as BreakpointName[]),
];

/**
 * Convert an array responsive value `[base, sm, md, ...]` into the
 * equivalent object form. Slots beyond {@link RESPONSIVE_ARRAY_SLOTS}
 * are ignored. `undefined` slots are dropped (so sparse arrays are fine).
 *
 * Arrays only express media-query keys - container queries always need
 * an explicit name slot, so they're not addressable positionally.
 */
export function responsiveArrayToObject(arr: readonly unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const len = Math.min(arr.length, RESPONSIVE_ARRAY_SLOTS.length);
  for (let i = 0; i < len; i++) {
    const value = arr[i];
    if (value === undefined) continue;
    out[RESPONSIVE_ARRAY_SLOTS[i]!] = value;
  }
  return out;
}

/**
 * Build a CSS `@media (min-width: ...)` query for a named breakpoint.
 */
export function mediaQueryForBreakpoint(name: BreakpointName): string {
  return `@media (min-width: ${activeBreakpoints[name]}px)`;
}

/**
 * Build a CSS `@container` query for a named breakpoint, optionally scoped
 * to a named container. Without a name, the rule binds to the nearest
 * container ancestor.
 */
export function containerQueryForBreakpoint(name: BreakpointName, containerName?: string): string {
  const px = activeBreakpoints[name];
  return containerName === undefined
    ? `@container (min-width: ${px}px)`
    : `@container ${containerName} (min-width: ${px}px)`;
}

/**
 * Discriminated parse result for a responsive-object key.
 * - `base` - the unconditional slot (applied as inline style).
 * - `media` - `@media (min-width: bp)`.
 * - `container` - `@container [name] (min-width: bp)`.
 *
 * `null` means the key is not a recognised responsive key (silently dropped
 * by the resolver to keep the door open for future shorthands).
 */
export type ResponsiveKey =
  | { readonly kind: 'base' }
  | { readonly kind: 'media'; readonly bp: BreakpointName }
  | { readonly kind: 'container'; readonly bp: BreakpointName; readonly name?: string }
  | { readonly kind: 'preference'; readonly preference: PreferenceKey };

/**
 * User-preference conditions, usable as responsive keys beside the breakpoints:
 * `bg={{ base: '$colors.surface.muted', '@contrast': '$colors.surface.base' }}`. On the web each
 * is a media query; on React Native the ones the platform reports come from `AccessibilityInfo`
 * and the window's shape.
 */
export const PREFERENCE_QUERIES = {
  '@contrast': '@media (prefers-contrast: more)',
  '@forcedColors': '@media (forced-colors: active)',
  '@reducedTransparency': '@media (prefers-reduced-transparency: reduce)',
  '@print': '@media print',
  '@landscape': '@media (orientation: landscape)',
} as const;

/** A preference condition's responsive key. */
export type PreferenceKey = keyof typeof PREFERENCE_QUERIES;

/** The order preference rules are emitted in, after every width rule, so a preference wins. */
export const PREFERENCE_ORDER = Object.keys(PREFERENCE_QUERIES) as readonly PreferenceKey[];

function isPreferenceKey(key: string): key is PreferenceKey {
  return Object.hasOwn(PREFERENCE_QUERIES, key);
}

/**
 * Parse a responsive **string DSL** value into the equivalent object form.
 *
 * The DSL is space-separated `<key>:<value>` pairs, where each `<key>` is
 * any responsive key recognised by {@link parseResponsiveKey} (`base`,
 * a breakpoint name, `@<bp>`, or `@<name>.<bp>`).
 *
 * Examples:
 * - `"sm:4 md:8"` → `{ sm: 4, md: 8 }`
 * - `"base:$2 md:$4 lg:$8"` → `{ base: '$2', md: '$4', lg: '$8' }`
 * - `"@card.md:row"` → `{ '@card.md': 'row' }`
 *
 * Returns `null` if the input does not parse as a valid DSL - every token
 * must have form `<knownKey>:<rest>`, with a non-empty value. The caller
 * should fall back to treating the input as a literal value in that case.
 *
 * Numeric values are coerced from string to number when they parse
 * cleanly (no unit suffix). `"md:8"` → `{ md: 8 }`; `"md:8px"` →
 * `{ md: '8px' }`. This matches the mental model of writing the
 * equivalent object form.
 *
 * **Precedence / ambiguity.** When a string prop value parses as a valid
 * DSL it is interpreted as responsive, *taking precedence over a literal
 * interpretation*. In practice this is unambiguous: no valid CSS value is
 * shaped like `<breakpoint>:<value>` (e.g. `md:1fr`), so a string that
 * parses here was almost certainly written as the DSL. The guards below
 * keep real literals out: a token whose key isn't a known breakpoint /
 * container key (so `url(http://...)`, `rgb(0, 0, 0)`, `1fr 2fr`, ...) returns
 * `null`, and so does anything containing `;`, `{` or `}` (which appear in
 * literal/serialized CSS but never inside a DSL value).
 */
export function parseResponsiveDSL(input: string): Record<string, unknown> | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  // DSL values never contain declaration/rule punctuation; their presence
  // marks the input as literal/serialized CSS, not a responsive DSL.
  if (/[;{}]/.test(trimmed)) return null;
  const tokens = trimmed.split(/\s+/);
  const result: Record<string, unknown> = {};
  for (const token of tokens) {
    const colonIdx = token.indexOf(':');
    if (colonIdx === -1) return null;
    const key = token.slice(0, colonIdx);
    const raw = token.slice(colonIdx + 1);
    if (raw.length === 0) return null;
    if (parseResponsiveKey(key) === null) return null;
    // Coerce to a number only when the round-trip is lossless. Otherwise
    // `"09"` → 9 and `"1.50"` → 1.5 would silently rewrite a value the
    // author meant as a string token-key segment (e.g. space scales keyed
    // `'050'`/`'075'`), and diverge from the object/array syntaxes which
    // never coerce.
    result[key] = /^-?\d+(\.\d+)?$/.test(raw) && String(Number(raw)) === raw ? Number(raw) : raw;
  }
  return result;
}

/**
 * Parse a responsive-object key into its at-rule kind.
 *
 * Recognises:
 * - `base` → unconditional.
 * - `<bp>` (e.g. `md`) → media query.
 * - `@<bp>` (e.g. `@md`) → container query against nearest container.
 * - `@<name>.<bp>` (e.g. `@card.md`) → container query against named container.
 * - `@contrast`, `@forcedColors`, `@reducedTransparency`, `@print`, `@landscape` → a preference
 *   condition (see {@link PREFERENCE_QUERIES}).
 *
 * Container names must be non-empty; the breakpoint must exist in
 * {@link defaultBreakpoints}. Anything else returns `null`.
 */
export function parseResponsiveKey(key: string): ResponsiveKey | null {
  if (key === BASE_BREAKPOINT_KEY) return { kind: 'base' };
  if (Object.hasOwn(defaultBreakpoints, key)) return { kind: 'media', bp: key as BreakpointName };
  if (!key.startsWith('@')) return null;
  if (isPreferenceKey(key)) return { kind: 'preference', preference: key };

  const inner = key.slice(1);
  const dotIdx = inner.indexOf('.');
  if (dotIdx === -1) {
    if (Object.hasOwn(defaultBreakpoints, inner)) {
      return { kind: 'container', bp: inner as BreakpointName };
    }
    return null;
  }

  const name = inner.slice(0, dotIdx);
  const bp = inner.slice(dotIdx + 1);
  // The name is interpolated raw into an `@container <name> (...)` prelude by
  // `containerQueryForBreakpoint`, which is emitted verbatim into the
  // stylesheet. Only accept valid CSS idents so a key sourced from config/CMS
  // (`{ [`@${name}.md`]: 'row' }`) can't smuggle at-rules/selectors into the
  // page - the same class of guard as `escapeThemeNameForSelector`.
  if (CONTAINER_NAME_RE.test(name) && Object.hasOwn(defaultBreakpoints, bp)) {
    return { kind: 'container', bp: bp as BreakpointName, name };
  }
  return null;
}

/** A valid CSS custom-ident for a `container-name` (ident-start then
 * ident-chars). Deliberately excludes `.`, `(`, `)`, `{`, `}`, whitespace,
 * and other CSS-significant characters. */
const CONTAINER_NAME_RE = /^[A-Za-z_-][\w-]*$/;
