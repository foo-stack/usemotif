/**
 * Type-level tests for the per-prop value rule. Not a Vitest suite: the
 * package globs `src/**\/*.test.ts`, which `.test-d.ts` does not match, so
 * `yarn typecheck` is the gate.
 *
 * Core's own program is necessarily unaugmented, because a module
 * augmentation applies to a whole compilation. These assertions therefore
 * check `StylePropValueFrom` against explicit token maps, which is the rule
 * `StyleProps` applies to whichever map the consumer augmented in. The
 * end-to-end path through a real `declare module` is proven separately by
 * `yarn tokens:check`.
 */
import { expectTypeOf } from 'vitest';
import { createTheme } from './createTheme.js';
import type {
  FontVariationAxisSettings,
  MotifComponent,
  ScaleValueFrom,
  StyleProps,
  StylePropValueFrom,
  ValidateStylePropsFrom,
  ValidateTokenValue,
} from './style-props.js';
import type { StrictTokens } from './token-path.js';

const theme = createTheme({
  name: 'test',
  tokens: {
    colors: { brand: { 500: '#3b82f6' } },
    space: { 4: 16, 8: 32 },
  },
} as const);
type Tokens = (typeof theme)['tokens'];

// ─────────── a prop offers its own scale, and only its own ───────

// `p` names the `space` scale, so the space paths are assignable...
expectTypeOf<'$space.4'>().toExtend<StylePropValueFrom<Tokens, 'p'>>();
expectTypeOf<'$space.8'>().toExtend<StylePropValueFrom<Tokens, 'p'>>();

// ...and `backgroundColor` names `colors`, so the colour path lands there.
expectTypeOf<'$colors.brand.500'>().toExtend<StylePropValueFrom<Tokens, 'backgroundColor'>>();

// The union really is per scale. `(string & {})` keeps every string
// assignable, so membership is the assertion that can distinguish the two:
// a colour path must not be a member of the space prop's token arm.
type SpaceTokenArm = Extract<StylePropValueFrom<Tokens, 'p'>, `$${string}`>;
expectTypeOf<SpaceTokenArm>().toEqualTypeOf<'$space.4' | '$space.8'>();
expectTypeOf<
  Extract<StylePropValueFrom<Tokens, 'backgroundColor'>, `$${string}`>
>().toEqualTypeOf<'$colors.brand.500'>();

// ─────────── permissive on purpose ───────────────────────────────

// Raw CSS values still compile. This is what makes the change non-breaking.
expectTypeOf<'12px'>().toExtend<StylePropValueFrom<Tokens, 'p'>>();
expectTypeOf<12>().toExtend<StylePropValueFrom<Tokens, 'p'>>();

// So does a path the scale does not contain. Rejecting it is a separate,
// opt-in mode; conflating the two is what this deliberately avoids.
expectTypeOf<'$nope'>().toExtend<StylePropValueFrom<Tokens, 'p'>>();
expectTypeOf<'$space.999'>().toExtend<StylePropValueFrom<Tokens, 'p'>>();

// ─────────── props without a scale are untouched ─────────────────

// `position` carries no `scale` entry, so it keeps exactly its old type.
expectTypeOf<StylePropValueFrom<Tokens, 'position'>>().toEqualTypeOf<string | number>();
expectTypeOf<StylePropValueFrom<Tokens, 'flexDirection'>>().toEqualTypeOf<string | number>();

// `fontVariationSettings` keeps its typed object form and gains no token arm.
expectTypeOf<StylePropValueFrom<Tokens, 'fontVariationSettings'>>().toEqualTypeOf<
  string | FontVariationAxisSettings
>();
expectTypeOf<{ wght: 600 }>().toExtend<StylePropValueFrom<Tokens, 'fontVariationSettings'>>();

// ─────────── a theme missing a scale ─────────────────────────────

// A consumer may augment with a theme that has no `colors` while
// `backgroundColor` still names that scale. The prop must stay usable, so it
// falls back to `string | number` rather than resolving to `never`.
const spaceOnly = createTheme({ name: 'space-only', tokens: { space: { 4: 16 } } } as const);
type SpaceOnly = (typeof spaceOnly)['tokens'];

expectTypeOf<StylePropValueFrom<SpaceOnly, 'backgroundColor'>>().toEqualTypeOf<string | number>();
expectTypeOf<'#fff'>().toExtend<StylePropValueFrom<SpaceOnly, 'backgroundColor'>>();
expectTypeOf<StylePropValueFrom<SpaceOnly, 'backgroundColor'>>().not.toEqualTypeOf<never>();

// The scale it does define still derives.
expectTypeOf<'$space.4'>().toExtend<StylePropValueFrom<SpaceOnly, 'p'>>();

// The same fallback covers the empty map, which is what every unaugmented
// consumer gets.
expectTypeOf<ScaleValueFrom<Record<never, never>, 'space'>>().toEqualTypeOf<string | number>();

// ─────────── unaugmented is exactly today's behaviour ────────────

// Core ships unaugmented, so the live `StyleProps` must be unchanged. This is
// the assertion that keeps the change a minor rather than a major.
expectTypeOf<NonNullable<StyleProps['p']>>().toEqualTypeOf<string | number>();
expectTypeOf<NonNullable<StyleProps['backgroundColor']>>().toEqualTypeOf<string | number>();
expectTypeOf<NonNullable<StyleProps['fontVariationSettings']>>().toEqualTypeOf<
  string | FontVariationAxisSettings
>();

// ─────────── strict token paths ──────────────────────────────────

// Parameterised for the same reason the rest of this file is: setting the
// flag is a module augmentation, which applies to a whole compilation, so
// core's own program is necessarily in the un-opted-in state. The strict
// fixture behind `yarn tokens:check` is what covers the flag being on.

// A path the scale contains passes through unchanged.
expectTypeOf<ValidateTokenValue<'$space.4', Tokens, 'space'>>().toEqualTypeOf<'$space.4'>();

// A path it does not contain becomes the message, and the message names both
// the value and the scale, because "invalid" alone does not help anyone.
expectTypeOf<
  ValidateTokenValue<'$space.999', Tokens, 'space'>
>().toEqualTypeOf<"Not a path in the 'space' scale: $space.999">();
expectTypeOf<
  ValidateTokenValue<'$colors.brand.500', Tokens, 'space'>
>().toEqualTypeOf<"Not a path in the 'space' scale: $colors.brand.500">();

// Everything that is not a `$` string passes through untouched. The widened
// `string` case is the load-bearing one: it is what keeps a value read from a
// variable or a prop compiling.
expectTypeOf<ValidateTokenValue<'12px', Tokens, 'space'>>().toEqualTypeOf<'12px'>();
expectTypeOf<ValidateTokenValue<12, Tokens, 'space'>>().toEqualTypeOf<12>();
expectTypeOf<ValidateTokenValue<string, Tokens, 'space'>>().toEqualTypeOf<string>();
expectTypeOf<ValidateTokenValue<number, Tokens, 'space'>>().toEqualTypeOf<number>();
expectTypeOf<ValidateTokenValue<'日本語', Tokens, 'fontFamilies'>>().toEqualTypeOf<'日本語'>();

// Strict without a theme: every `$` string is an error, and the message says
// which scale was missing rather than reporting `never`.
expectTypeOf<
  ValidateTokenValue<'$space.4', Record<never, never>, 'space'>
>().toEqualTypeOf<"Not a path in the 'space' scale: $space.4">();
expectTypeOf<ValidateTokenValue<'12px', Record<never, never>, 'space'>>().toEqualTypeOf<'12px'>();

// ─────────── the props-level validator ───────────────────────────

// Each prop is checked against its own scale, not a shared one.
type Checked = ValidateStylePropsFrom<Tokens, { p: '$space.4'; backgroundColor: '$space.4' }>;
expectTypeOf<Checked['p']>().toEqualTypeOf<'$space.4'>();
expectTypeOf<
  Checked['backgroundColor']
>().toEqualTypeOf<"Not a path in the 'colors' scale: $space.4">();

// A scale-less style prop and a non-style prop both pass through.
type Passthrough = ValidateStylePropsFrom<Tokens, { position: '$nope'; id: '$nope' }>;
expectTypeOf<Passthrough['position']>().toEqualTypeOf<'$nope'>();
expectTypeOf<Passthrough['id']>().toEqualTypeOf<'$nope'>();

// ─────────── the flag is off unless asked for ────────────────────

// Core ships un-opted-in, so `MotifComponent` must be the plain signature.
// This is the assertion that keeps strict mode from costing anything to a
// consumer who only wanted autocomplete.
expectTypeOf<StrictTokens>().toEqualTypeOf<false>();
expectTypeOf<MotifComponent<{ p?: string }, null>>().toEqualTypeOf<
  (props: { p?: string }) => null
>();

// ─────────── gradients ───────────────────────────────────────────

// `backgroundImage` is bound to the `gradients` scale, so a theme's gradient
// paths autocomplete there and nowhere else; raw CSS still compiles.
type GradientTokens = { gradients: { hero: 'linear-gradient(red, blue)' } };
expectTypeOf<'$gradients.hero'>().toExtend<StylePropValueFrom<GradientTokens, 'backgroundImage'>>();
expectTypeOf<'url(a.png)'>().toExtend<StylePropValueFrom<GradientTokens, 'backgroundImage'>>();
expectTypeOf<ScaleValueFrom<GradientTokens, 'gradients'>>().toEqualTypeOf<
  '$gradients.hero' | (string & {}) | number
>();
