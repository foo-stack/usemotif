import { warnUnresolvedTokenRef } from './_dev-warnings.js';
import { mergeDecimalSegments } from './_token-path.js';
import type { ScaleName, Theme, TokenNode, TokenRef, TokenScale, TokenValue } from './types.js';

const KNOWN_SCALES: readonly ScaleName[] = [
  'colors',
  'space',
  'sizes',
  'radii',
  'fontSizes',
  'fontWeights',
  'fontFamilies',
  'lineHeights',
  'letterSpacings',
  'shadows',
  'gradients',
  'zIndices',
  'borderWidths',
  'opacities',
  'durations',
  'easings',
];

// `components` holds no style-prop scale, but an explicit `$components.*` ref still names it.
const KNOWN_SCALE_SET: ReadonlySet<string> = new Set([...KNOWN_SCALES, 'components']);

/** Split `'$a ?? $b'` into its alternatives, or `null` for a plain ref. */
export function splitFallbacks(ref: string): readonly string[] | null {
  if (!ref.includes('??')) return null;
  return ref.split('??').map((part) => part.trim());
}

/** Type guard: is the given value a `$`-prefixed token reference? */
export function isTokenRef(value: unknown): value is TokenRef {
  return typeof value === 'string' && value.length > 1 && value.charCodeAt(0) === 36;
}

/**
 * Walk a dotted path inside a token scale. Returns `undefined` if any segment
 * does not exist or hits a non-object before the end of the path.
 */
function walkPath(node: TokenNode | undefined, segments: readonly string[]): TokenNode | undefined {
  let current: TokenNode | undefined = node;
  for (const seg of segments) {
    if (current === undefined || current === null) return undefined;
    if (typeof current !== 'object') return undefined;
    // Own-property only - never walk the prototype chain, or `$colors.valueOf`
    // / `$x.constructor` would resolve to inherited `Object.prototype` members.
    if (!Object.hasOwn(current, seg)) return undefined;
    current = (current as TokenScale)[seg];
  }
  return current;
}

/**
 * Resolve one already-segmented path against the theme: explicit refs carry
 * their scale in the head segment, bare refs fall back to `defaultScale`.
 */
function lookup(
  segments: readonly string[],
  theme: Theme,
  options: ResolveTokenOptions,
): TokenNode | undefined {
  const [head, ...rest] = segments;
  if (head === undefined) return undefined;

  if (KNOWN_SCALE_SET.has(head)) {
    return walkPath(theme.tokens[head] as TokenNode | undefined, rest);
  }
  if (options.defaultScale !== undefined) {
    return walkPath(theme.tokens[options.defaultScale] as TokenNode | undefined, segments);
  }
  return undefined;
}

export interface ResolveTokenOptions {
  /**
   * If the reference is bare (e.g. `$primary` without a known scale prefix),
   * the resolver will first try to find it inside this scale. Style-prop
   * resolution sets this from the prop's associated scale.
   */
  readonly defaultScale?: ScaleName;
}

/**
 * Resolve a token reference to its underlying value.
 *
 * Resolution rules:
 *
 * 1. Strip the leading `$`, split on `.`.
 * 2. If the first segment is a known scale name (`colors`, `space`, ...),
 *    look up `theme.tokens.<scale>.<rest>`.
 * 3. Otherwise, if `defaultScale` is provided, look up
 *    `theme.tokens.<defaultScale>.<segments>`.
 * 4. If the resolved node is itself a `TokenRef` (semantic → primitive),
 *    recurse. Cycles are detected and short-circuit to `undefined`.
 * 5. A fallback chain, `'$components.button.bg ?? $colors.action.primary.bg'`,
 *    resolves to its first alternative that resolves. A last alternative that
 *    is not a ref is a literal default.
 *
 * Returns `undefined` if the path cannot be resolved.
 */
export function resolveToken(
  ref: TokenRef,
  theme: Theme,
  options: ResolveTokenOptions = {},
): TokenValue | undefined {
  const resolved = resolveTokenInner(ref, theme, options, new Set());
  if (resolved === undefined && process.env.NODE_ENV !== 'production') {
    warnUnresolvedTokenRef(ref, theme, options.defaultScale);
  }
  return resolved;
}

function resolveTokenInner(
  ref: TokenRef,
  theme: Theme,
  options: ResolveTokenOptions,
  seen: Set<string>,
): TokenValue | undefined {
  if (seen.has(ref)) return undefined;
  seen.add(ref);

  const alternatives = splitFallbacks(ref);
  if (alternatives !== null) {
    for (const alt of alternatives) {
      if (!isTokenRef(alt)) return alt === '' ? undefined : alt;
      const value = resolveTokenInner(alt, theme, options, new Set(seen));
      if (value !== undefined) return value;
    }
    return undefined;
  }

  const segments = ref.slice(1).split('.');
  let node = lookup(segments, theme, options);

  // Only if the plain path found nothing: retry with adjacent digit segments
  // merged, so the half-step keys the default `space` scale ships (`0.5`,
  // `1.5`, ...) are reachable as `$space.1.5`. Running this second keeps every
  // path that already resolved resolving to exactly the same node, and keeps
  // the merge off the hot path entirely.
  if (node === undefined) {
    const merged = mergeDecimalSegments(segments);
    if (merged !== segments) node = lookup(merged, theme, options);
  }

  if (node === undefined) return undefined;
  if (isTokenRef(node)) {
    return resolveTokenInner(node, theme, options, seen);
  }
  // Only string / number leaves are valid token values. Interior scale nodes
  // (objects) and functions (e.g. an own-property that holds a function) are
  // never valid CSS values.
  if (typeof node === 'object' || typeof node === 'function') return undefined;
  return node;
}

/**
 * Resolve every `$...` token reference in an output range against the
 * active theme. Used by `useTransform` so consumers can write
 * `[" $colors.brand.red", "$colors.brand.blue"]` and have the
 * interpolator see the resolved literals.
 *
 * - Non-string entries pass through unchanged.
 * - Strings that aren't token refs pass through unchanged.
 * - Token refs that resolve to a string / number replace the raw ref.
 * - Token refs that fail to resolve (typo, missing theme) pass
 *   through unchanged - same graceful-degrade as the rest of the
 *   token surface.
 *
 * Returns a freshly-allocated array; callers can pass the result
 * straight to `classifyOutputRange` / `interpolateOutputs`.
 */
export function resolveOutputRangeTokens<O extends string | number>(
  outputRange: readonly O[],
  theme: Theme | undefined,
): readonly (string | number)[] {
  const out: (string | number)[] = [];
  for (let i = 0; i < outputRange.length; i++) {
    const entry = outputRange[i] as O;
    if (typeof entry !== 'string' || !isTokenRef(entry)) {
      out.push(entry);
      continue;
    }
    if (theme === undefined) {
      out.push(entry);
      continue;
    }
    const resolved = resolveToken(entry, theme);
    out.push(resolved === undefined || typeof resolved === 'object' ? entry : resolved);
  }
  return out;
}

/**
 * Resolve any value that may be a token reference. Non-references pass
 * through unchanged. References that fail to resolve return `undefined`,
 * which callers can treat as a bailout.
 */
export function resolveValue<V extends TokenValue>(
  value: V | TokenRef | undefined,
  theme: Theme | undefined,
  options: ResolveTokenOptions = {},
): V | TokenValue | undefined {
  if (value === undefined) return undefined;
  if (!isTokenRef(value)) return value;
  if (theme === undefined) return undefined;
  return resolveToken(value, theme, options);
}

export { KNOWN_SCALES };
