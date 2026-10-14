import type { FontFace, ReducedMotionMode, Theme, ThemeRootStyles, TokenMap } from './types.js';

/**
 * Construct a theme. A pass-through factory that preserves the literal
 * `tokens` shape, so a caller can derive `$`-reference types from it.
 *
 * `fonts`, `root`, `reducedMotion`, `colorScheme`, and `themeColor` are
 * optional web-only hints picked up by `<ThemeProvider>` (see
 * {@link Theme}). They have no effect on native.
 */
// The `Omit` in the return type is load-bearing and looks removable.
// `Theme` declares `tokens: TokenMap`, so intersecting it with
// `{ tokens: T }` yields `TokenMap & T` rather than `T`. `TokenMap`'s
// scales are `TokenScale`, which carries `[key: string]: TokenNode<V>`,
// and that index signature puts `string` back into `keyof`, collapsing
// any path union derived from the result to `string`. Dropping `Theme`'s
// own `tokens` first is what keeps the literal shape reachable.
// `token-path.test-d.ts` fails if this is reverted.
export function createTheme<T extends TokenMap>(def: {
  readonly name: string;
  readonly tokens: T;
  readonly fonts?: readonly FontFace[];
  readonly root?: ThemeRootStyles;
  readonly reducedMotion?: ReducedMotionMode;
  readonly colorScheme?: 'light' | 'dark';
  readonly themeColor?: string;
}): Omit<Theme, 'tokens'> & { readonly tokens: T } {
  return def;
}

/**
 * `B` with `O` merged over it, scale by scale and key by key. A leaf in `O`
 * replaces the one in `B`, and each `animations` entry is a leaf, so an
 * override replaces that preset whole rather than mixing its fields.
 */
export type MergeTokens<B, O> = {
  readonly [K in keyof B | keyof O]: K extends keyof O
    ? K extends keyof B
      ? K extends 'animations'
        ? Omit<B[K], keyof O[K]> & O[K]
        : B[K] extends string | number
          ? O[K]
          : O[K] extends string | number
            ? O[K]
            : MergeTokens<B[K], O[K]>
      : O[K]
    : K extends keyof B
      ? B[K]
      : never;
};

/**
 * Derive a theme from `base`, deep-merging `tokens` over the base tokens. The
 * result keeps both literal shapes, so `$`-paths from the base and the
 * overrides both reach the style props. `fonts`, `root`, `reducedMotion`,
 * `colorScheme`, and `themeColor` replace the base's when given. Neither input is modified.
 *
 * @example
 * ```ts
 * const brand = extendTheme(lightTheme, {
 *   name: 'brand',
 *   tokens: { colors: { action: { primary: { bg: '$colors.violet.600' } } } },
 * });
 * ```
 */
export function extendTheme<
  B extends TokenMap,
  // oxlint-disable-next-line typescript/no-empty-object-type -- "no overrides" when `tokens` is omitted
  O extends TokenMap = {},
>(
  base: Omit<Theme, 'tokens'> & { readonly tokens: B },
  def: {
    readonly name: string;
    readonly tokens?: O;
    readonly fonts?: readonly FontFace[];
    readonly root?: ThemeRootStyles;
    readonly reducedMotion?: ReducedMotionMode;
    readonly colorScheme?: 'light' | 'dark';
    readonly themeColor?: string;
  },
): Omit<Theme, 'tokens'> & { readonly tokens: MergeTokens<B, O> } {
  const { tokens, ...rest } = def;
  return {
    ...base,
    ...rest,
    tokens: (tokens === undefined ? base.tokens : mergeScales(base.tokens, tokens)) as MergeTokens<
      B,
      O
    >,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merges each scale; the `animations` entries are leaves, replaced whole. */
function mergeScales(base: TokenMap, over: TokenMap): TokenMap {
  const out: Record<string, unknown> = { ...base };
  for (const [scale, value] of Object.entries(over)) {
    const prev = out[scale];
    out[scale] =
      isPlainObject(prev) && isPlainObject(value)
        ? merge(prev, value, scale === 'animations')
        : value;
  }
  return out as TokenMap;
}

function merge(
  base: Record<string, unknown>,
  over: Record<string, unknown>,
  entriesAreLeaves = false,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const prev = out[key];
    out[key] =
      !entriesAreLeaves && isPlainObject(prev) && isPlainObject(value) ? merge(prev, value) : value;
  }
  return out;
}
