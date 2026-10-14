/**
 * Deriving `$`-reference types from a theme's token tree.
 *
 * These are types only; nothing here emits runtime code. They exist so a
 * consumer's theme can drive what a `$` reference is allowed to say, instead
 * of every reference being the opaque `TokenRef` (`` `$${string}` ``).
 *
 * The source has to be a literal token object, normally `typeof myTheme`
 * from {@link createTheme}. A declared interface cannot work: `TokenScale`
 * carries `[key: string]: TokenNode<V>`, and an index signature puts `string`
 * back into `keyof`, which collapses every derived union to `string`.
 */

/**
 * The union of dotted leaf paths through a token tree.
 *
 * Object nodes recurse; every other node is a leaf. A token whose value is
 * itself a `$` reference is a leaf too, because a `TokenRef` is a string:
 * `{ primary: '$colors.brand.500' }` yields `'primary'`, not a path into the
 * reference it points at.
 *
 * Numeric keys are included because token scales are routinely keyed by
 * number (`space.4`, `colors.gray.500`). TypeScript widens those keys to
 * their string form inside a template literal, which is what callers want:
 * the emitted reference is `$space.4`.
 *
 * @example
 *   type P = Paths<{ brand: { 500: '#3b82f6' }; fg: '#000' }>;
 *   //   => 'brand.500' | 'fg'
 */
export type Paths<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object ? `${K}.${Paths<T[K]>}` : `${K}`;
    }[keyof T & (string | number)]
  : never;

/**
 * A `$`-prefixed reference into one named scale of a token map.
 *
 * Generic over the token map rather than reading a global theme, because
 * nothing has bound a consumer's theme at this layer yet.
 *
 * **Keep references scoped to a single scale.** Handing a style prop the
 * union of every scale's paths measured 8 to 9 times the type-check cost of
 * the per-scale form at realistic call-site volume, and it is the one shape
 * choice here that matters for performance.
 *
 * @example
 *   type Space = ScalePath<typeof theme.tokens, 'space'>;
 *   //   => '$space.4' | '$space.8'
 */
export type ScalePath<TTokens, S extends keyof TTokens & string> = `$${S}.${Paths<TTokens[S]>}`;

/**
 * The scale names a token map is expected to carry.
 *
 * `animations` is deliberately absent. It is a flat
 * `Record<string, AnimationToken>` of object leaves rather than a recursive
 * `TokenScale`, and it resolves through `resolveAnimationToken` rather than
 * the generic `$`-path walk, so deriving dotted paths into it would describe
 * lookups that do not happen.
 *
 * A theme may define scales beyond these; `ScalePath` accepts any key its
 * token map actually has.
 */
export type KnownScaleName =
  | 'colors'
  | 'space'
  | 'sizes'
  | 'radii'
  | 'fontSizes'
  | 'fontWeights'
  | 'fontFamilies'
  | 'lineHeights'
  | 'letterSpacings'
  | 'shadows'
  | 'gradients'
  | 'zIndices'
  | 'borderWidths'
  | 'opacities'
  | 'durations'
  | 'easings';

/**
 * The interface a consumer extends with their own theme, so every `$`
 * reference in the app is derived from the tokens that actually exist.
 *
 * Empty by default, and empty is a supported state: an app that never
 * augments it gets exactly the types it got before this existed. Augment it
 * from anywhere in the app's own sources, once:
 *
 * @example
 *   import { createTheme } from '@usemotif/core';
 *
 *   export const appTheme = createTheme({ name: 'app', tokens: { ... } } as const);
 *
 *   declare module '@usemotif/core' {
 *     interface MotifCustomTheme extends AppTheme {}
 *   }
 *   type AppTheme = typeof appTheme;
 *
 * The `as const` is load-bearing. Without it the token values widen to
 * `string`/`number`, which is harmless, but a missing `as const` on a token
 * tree built through a helper can also widen the *keys*, and widened keys
 * derive no paths.
 */
export interface MotifCustomTheme {}

/**
 * The token map of a theme-shaped type, or the empty map when the argument
 * carries no `tokens` at all.
 *
 * Split out from {@link MotifTokens} so the resolution rule is testable
 * without augmenting anything. A module augmentation applies to the whole
 * compilation, so a single program cannot assert both the augmented and the
 * unaugmented outcome; this type lets the rule be checked directly while
 * `MotifTokens` proves the unaugmented default.
 */
export type TokensOf<TTheme> = TTheme extends { tokens: infer TTokens }
  ? TTokens
  : Record<never, never>;

/**
 * The active theme's token map: whatever {@link MotifCustomTheme} was
 * augmented with, or the empty map when it was not.
 *
 * The empty map is deliberate rather than a fallback to `TokenMap`. `keyof`
 * an empty map is `never`, so every scale lookup misses and every style prop
 * keeps its pre-existing `string | number` type. Falling back to `TokenMap`
 * would instead hand every prop a `` `$scale.${string}` `` arm derived from
 * `TokenScale`'s index signature, which suggests nothing and is a change in
 * behaviour for an app that asked for none.
 */
export type MotifTokens = TokensOf<MotifCustomTheme>;

/**
 * The interface a consumer extends to turn on type-level options that are
 * deliberately not on by default.
 *
 * Separate from {@link MotifCustomTheme} on purpose. Deriving autocomplete
 * from a theme and rejecting a path that theme does not contain are two
 * decisions, and a consumer has to be able to make the first without the
 * second. The closest comparable library ties them together, and that is the
 * single most reported thing about its type layer.
 *
 * @example
 *   declare module '@usemotif/core' {
 *     interface MotifCustomTheme extends AppTheme {}
 *     interface MotifTypeOptions {
 *       strictTokens: true;
 *     }
 *   }
 */
export interface MotifTypeOptions {}

/**
 * Whether `$` paths a scale does not contain are rejected rather than merely
 * unsuggested. `false` unless a consumer set `strictTokens` on
 * {@link MotifTypeOptions}.
 */
export type StrictTokens = MotifTypeOptions extends { strictTokens: true } ? true : false;
