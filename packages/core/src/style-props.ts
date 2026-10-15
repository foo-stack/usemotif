import type { MotifTokens, ScalePath, StrictTokens } from './token-path.js';
import type { BreakpointName } from './breakpoints.js';
import type { ResolvedStyle, ScaleName } from './types.js';

/**
 * Typed object form of the `fontVariationSettings` style prop. Maps
 * OpenType variable-font axis tags to their numeric values; the resolver
 * serializes to the CSS shorthand
 * `'<tag>' <value>, '<tag>' <value>, ...`.
 *
 * Common axes are typed for autocomplete; foundry-specific axes (any
 * 4-character tag) flow through the index signature.
 *
 * Iteration order in the emitted CSS string follows the object's
 * insertion order - modern JS preserves it for non-numeric string keys.
 *
 * @example
 *   <Box fontVariationSettings={{ opsz: 36, wght: 600 }}>...</Box>
 *   // → font-variation-settings: 'opsz' 36, 'wght' 600;
 *
 *   <Box fontVariationSettings={{ opsz: 48, SOFT: 50, WONK: 1 }}>...</Box>
 *   // → font-variation-settings: 'opsz' 48, 'SOFT' 50, 'WONK' 1;
 */
export interface FontVariationAxisSettings {
  /** Optical size axis. Typical 6-144; pair with the design's `font-size`. */
  readonly opsz?: number;
  /** Weight axis. CSS-aligned 1-1000 (400 = regular, 700 = bold). */
  readonly wght?: number;
  /** Width axis. Typical 50-200; varies by font. */
  readonly wdth?: number;
  /** Italic axis. Typically 0 (upright) or 1 (italic). */
  readonly ital?: number;
  /** Slant axis. Degrees, typically -15 to 0 (negative = oblique). */
  readonly slnt?: number;
  /** Grade axis (GRAD). Foundry-specific (Inter, Roboto Flex, ...). */
  readonly GRAD?: number;
  /** Softness axis (SOFT). Foundry-specific (Fraunces). */
  readonly SOFT?: number;
  /** Catch-all for foundry-specific axes (any 4-character OpenType tag). */
  readonly [axis: string]: number | undefined;
}

/**
 * Serialize a {@link FontVariationAxisSettings} object to the CSS
 * `font-variation-settings` shorthand. Each axis tag is single-quoted
 * (per the CSS spec) and paired with its numeric value. Axes whose value
 * is `undefined` are skipped.
 *
 * @internal - exported for the runtime/compiler resolvers; consumers go
 * through the style prop.
 */
export function serializeFontVariationSettings(value: FontVariationAxisSettings): string {
  const parts: string[] = [];
  for (const axis in value) {
    const v = value[axis];
    if (v === undefined) continue;
    parts.push(`'${axis}' ${v}`);
  }
  return parts.join(', ');
}

/**
 * Schema entry for one style prop. Maps the prop name to one or more CSS
 * properties, optionally records which token scale token references in this
 * prop should be looked up against, and optionally provides a serializer
 * for a typed object form (e.g. `fontVariationSettings`).
 */
export interface StylePropDefinition {
  /** Single CSS property, or several (for shorthand like `px` → L+R). */
  readonly cssProperty: string | readonly string[];
  /** Token scale to use when the value is a `$`-prefixed bare reference. */
  readonly scale?: ScaleName;
  /**
   * Serializer for a typed object form of this prop. Called by the
   * resolvers when the value is a plain object that is *not* a recognised
   * responsive object. Returns the CSS string the resolver should emit.
   * Use for shorthand-shaped props like `fontVariationSettings`.
   */
  readonly serialize?: (value: object) => string;
  /**
   * When set, the prop participates in CSS `transform` composition.
   * The resolver routes the value into a per-axis bag instead of
   * writing to `style.transform` directly; after the props loop, all
   * axes are composed into one canonical `transform` string. The value
   * is one of {@link TRANSFORM_AXIS_NAMES}.
   */
  readonly transformAxis?: TransformAxis;
}

/**
 * Transform shorthand prop axes. Each maps to a CSS `transform`
 * function - `'x'`/`'y'`/`'z'` to `translateX/Y/Z`, `'rotate'` to the
 * 2D `rotate()` (i.e. `rotateZ`), etc. The resolver assembles a single
 * `transform` string in the canonical order declared here.
 *
 * Canonical order matches framer-motion: translate → rotate → scale →
 * skew. Matrix multiplication is non-commutative so the order is
 * load-bearing.
 */
export const TRANSFORM_AXIS_NAMES = [
  'x',
  'y',
  'z',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'scale',
  'scaleX',
  'scaleY',
  'skew',
  'skewX',
  'skewY',
] as const;

export type TransformAxis = (typeof TRANSFORM_AXIS_NAMES)[number];

/** Lookup for fast membership / canonical-order checks. */
export const TRANSFORM_AXIS_SET: ReadonlySet<string> = new Set(TRANSFORM_AXIS_NAMES);

/**
 * The single source of truth for style props. Both the runtime resolver and
 * the compiler consume this schema; both renderers (web and native) use the
 * same prop names.
 *
 * Naming follows two conventions:
 *
 * - Tamagui / styled-system shorthand for spacing and sizing (`p`, `m`,
 *   `w`, `h`, `bg`) - these are by far the most-used in real apps.
 * - Long CSS-property names for everything else, so users coming from CSS
 *   feel at home (`flexDirection`, `alignItems`, `borderRadius`).
 */
const stylePropsLiteral = {
  // Padding. `px`/`mx` and the `*s`/`*e` shorthands are *logical* -
  // they resolve relative to the writing direction (see `<Direction>`).
  // `pl`/`pr` stay physical as an explicit escape hatch.
  p: { cssProperty: 'padding', scale: 'space' },
  px: { cssProperty: 'paddingInline', scale: 'space' },
  py: { cssProperty: ['paddingTop', 'paddingBottom'], scale: 'space' },
  ps: { cssProperty: 'paddingInlineStart', scale: 'space' },
  pe: { cssProperty: 'paddingInlineEnd', scale: 'space' },
  pt: { cssProperty: 'paddingTop', scale: 'space' },
  pr: { cssProperty: 'paddingRight', scale: 'space' },
  pb: { cssProperty: 'paddingBottom', scale: 'space' },
  pl: { cssProperty: 'paddingLeft', scale: 'space' },
  padding: { cssProperty: 'padding', scale: 'space' },
  paddingInline: { cssProperty: 'paddingInline', scale: 'space' },
  paddingInlineStart: { cssProperty: 'paddingInlineStart', scale: 'space' },
  paddingInlineEnd: { cssProperty: 'paddingInlineEnd', scale: 'space' },

  // Margin - `mx` and `ms`/`me` are logical; `ml`/`mr` stay physical.
  m: { cssProperty: 'margin', scale: 'space' },
  mx: { cssProperty: 'marginInline', scale: 'space' },
  my: { cssProperty: ['marginTop', 'marginBottom'], scale: 'space' },
  ms: { cssProperty: 'marginInlineStart', scale: 'space' },
  me: { cssProperty: 'marginInlineEnd', scale: 'space' },
  mt: { cssProperty: 'marginTop', scale: 'space' },
  mr: { cssProperty: 'marginRight', scale: 'space' },
  mb: { cssProperty: 'marginBottom', scale: 'space' },
  ml: { cssProperty: 'marginLeft', scale: 'space' },
  margin: { cssProperty: 'margin', scale: 'space' },
  marginInline: { cssProperty: 'marginInline', scale: 'space' },
  marginInlineStart: { cssProperty: 'marginInlineStart', scale: 'space' },
  marginInlineEnd: { cssProperty: 'marginInlineEnd', scale: 'space' },

  // Gap
  gap: { cssProperty: 'gap', scale: 'space' },
  rowGap: { cssProperty: 'rowGap', scale: 'space' },
  columnGap: { cssProperty: 'columnGap', scale: 'space' },

  // Color
  bg: { cssProperty: 'backgroundColor', scale: 'colors' },
  backgroundColor: { cssProperty: 'backgroundColor', scale: 'colors' },
  color: { cssProperty: 'color', scale: 'colors' },
  borderColor: { cssProperty: 'borderColor', scale: 'colors' },

  // Background - image / positioning / sizing / blending family.
  // Pass-through CSS values; `background` is the shorthand. A theme's
  // `gradients` scale feeds `backgroundImage`, so `$gradients.hero` (or
  // the bare `$hero`) resolves and autocompletes. Web-only by design:
  // native renderers accept the type for parity, but image and gradient
  // values no-op on RN (handled by `<Image>`, not `View` styles).
  background: { cssProperty: 'background' },
  backgroundImage: { cssProperty: 'backgroundImage', scale: 'gradients' },
  backgroundPosition: { cssProperty: 'backgroundPosition' },
  backgroundRepeat: { cssProperty: 'backgroundRepeat' },
  backgroundSize: { cssProperty: 'backgroundSize' },
  backgroundOrigin: { cssProperty: 'backgroundOrigin' },
  backgroundClip: { cssProperty: 'backgroundClip' },
  backgroundAttachment: { cssProperty: 'backgroundAttachment' },
  backgroundBlendMode: { cssProperty: 'backgroundBlendMode' },

  // Sizing
  w: { cssProperty: 'width', scale: 'sizes' },
  h: { cssProperty: 'height', scale: 'sizes' },
  width: { cssProperty: 'width', scale: 'sizes' },
  height: { cssProperty: 'height', scale: 'sizes' },
  minW: { cssProperty: 'minWidth', scale: 'sizes' },
  minH: { cssProperty: 'minHeight', scale: 'sizes' },
  minWidth: { cssProperty: 'minWidth', scale: 'sizes' },
  minHeight: { cssProperty: 'minHeight', scale: 'sizes' },
  maxW: { cssProperty: 'maxWidth', scale: 'sizes' },
  maxH: { cssProperty: 'maxHeight', scale: 'sizes' },
  maxWidth: { cssProperty: 'maxWidth', scale: 'sizes' },
  maxHeight: { cssProperty: 'maxHeight', scale: 'sizes' },

  // Border
  borderRadius: { cssProperty: 'borderRadius', scale: 'radii' },
  borderWidth: { cssProperty: 'borderWidth', scale: 'borderWidths' },
  borderStyle: { cssProperty: 'borderStyle' },
  borderTopWidth: { cssProperty: 'borderTopWidth', scale: 'borderWidths' },
  borderRightWidth: { cssProperty: 'borderRightWidth', scale: 'borderWidths' },
  borderBottomWidth: { cssProperty: 'borderBottomWidth', scale: 'borderWidths' },
  borderLeftWidth: { cssProperty: 'borderLeftWidth', scale: 'borderWidths' },
  borderTopStyle: { cssProperty: 'borderTopStyle' },
  borderRightStyle: { cssProperty: 'borderRightStyle' },
  borderBottomStyle: { cssProperty: 'borderBottomStyle' },
  borderLeftStyle: { cssProperty: 'borderLeftStyle' },
  borderTopColor: { cssProperty: 'borderTopColor', scale: 'colors' },
  borderRightColor: { cssProperty: 'borderRightColor', scale: 'colors' },
  borderBottomColor: { cssProperty: 'borderBottomColor', scale: 'colors' },
  borderLeftColor: { cssProperty: 'borderLeftColor', scale: 'colors' },

  // Typography
  fontSize: { cssProperty: 'fontSize', scale: 'fontSizes' },
  fontWeight: { cssProperty: 'fontWeight', scale: 'fontWeights' },
  fontFamily: { cssProperty: 'fontFamily', scale: 'fontFamilies' },
  lineHeight: { cssProperty: 'lineHeight', scale: 'lineHeights' },
  letterSpacing: { cssProperty: 'letterSpacing', scale: 'letterSpacings' },
  textAlign: { cssProperty: 'textAlign' },
  textDecoration: { cssProperty: 'textDecoration' },
  textTransform: { cssProperty: 'textTransform' },

  // Text flow / wrapping. Enum-string properties - no scale. Pair
  // `whiteSpace: 'nowrap'` with `overflow: 'hidden'` and
  // `textOverflow: 'ellipsis'` for the canonical single-line truncation
  // triplet. `wordBreak` / `overflowWrap` / `hyphens` control where
  // line breaks may happen inside long words and how non-CJK text
  // hyphenates. Native renderers accept these at the type level for
  // cross-platform parity but only `textAlign`-family props have
  // first-class RN support; non-applicable values are silently
  // dropped by Yoga at layout time.
  whiteSpace: { cssProperty: 'whiteSpace' },
  wordBreak: { cssProperty: 'wordBreak' },
  overflowWrap: { cssProperty: 'overflowWrap' },
  hyphens: { cssProperty: 'hyphens' },
  textOverflow: { cssProperty: 'textOverflow' },

  // Flex / Layout
  display: { cssProperty: 'display' },
  flexDirection: { cssProperty: 'flexDirection' },
  alignItems: { cssProperty: 'alignItems' },
  alignContent: { cssProperty: 'alignContent' },
  alignSelf: { cssProperty: 'alignSelf' },
  justifyContent: { cssProperty: 'justifyContent' },
  justifyItems: { cssProperty: 'justifyItems' },
  justifySelf: { cssProperty: 'justifySelf' },
  flexWrap: { cssProperty: 'flexWrap' },
  flex: { cssProperty: 'flex' },
  flexGrow: { cssProperty: 'flexGrow' },
  flexShrink: { cssProperty: 'flexShrink' },
  flexBasis: { cssProperty: 'flexBasis', scale: 'sizes' },
  order: { cssProperty: 'order' },

  // Grid layout (1.7). Plain string-passthrough props for declaring
  // grids and placing children. Numeric values flow through React's
  // pixel-auto-completion when applicable (e.g. `gridColumnStart={2}`).
  gridTemplateColumns: { cssProperty: 'gridTemplateColumns' },
  gridTemplateRows: { cssProperty: 'gridTemplateRows' },
  gridTemplateAreas: { cssProperty: 'gridTemplateAreas' },
  gridTemplate: { cssProperty: 'gridTemplate' },
  gridColumn: { cssProperty: 'gridColumn' },
  gridColumnStart: { cssProperty: 'gridColumnStart' },
  gridColumnEnd: { cssProperty: 'gridColumnEnd' },
  gridRow: { cssProperty: 'gridRow' },
  gridRowStart: { cssProperty: 'gridRowStart' },
  gridRowEnd: { cssProperty: 'gridRowEnd' },
  gridArea: { cssProperty: 'gridArea' },
  gridAutoRows: { cssProperty: 'gridAutoRows' },
  gridAutoColumns: { cssProperty: 'gridAutoColumns' },
  gridAutoFlow: { cssProperty: 'gridAutoFlow' },
  placeItems: { cssProperty: 'placeItems' },
  placeContent: { cssProperty: 'placeContent' },
  placeSelf: { cssProperty: 'placeSelf' },

  // Position. `start`/`end` are logical insets (writing-direction
  // aware); `left`/`right` stay physical.
  position: { cssProperty: 'position' },
  top: { cssProperty: 'top', scale: 'space' },
  right: { cssProperty: 'right', scale: 'space' },
  bottom: { cssProperty: 'bottom', scale: 'space' },
  left: { cssProperty: 'left', scale: 'space' },
  start: { cssProperty: 'insetInlineStart', scale: 'space' },
  end: { cssProperty: 'insetInlineEnd', scale: 'space' },
  insetInlineStart: { cssProperty: 'insetInlineStart', scale: 'space' },
  insetInlineEnd: { cssProperty: 'insetInlineEnd', scale: 'space' },

  // Outline (focus rings, etc.)
  outline: { cssProperty: 'outline' },
  outlineStyle: { cssProperty: 'outlineStyle' },
  outlineWidth: { cssProperty: 'outlineWidth', scale: 'borderWidths' },
  outlineColor: { cssProperty: 'outlineColor', scale: 'colors' },
  outlineOffset: { cssProperty: 'outlineOffset', scale: 'space' },

  // Effects
  opacity: { cssProperty: 'opacity', scale: 'opacities' },
  shadow: { cssProperty: 'boxShadow', scale: 'shadows' },
  boxShadow: { cssProperty: 'boxShadow', scale: 'shadows' },
  zIndex: { cssProperty: 'zIndex', scale: 'zIndices' },

  // Overflow
  overflow: { cssProperty: 'overflow' },
  overflowX: { cssProperty: 'overflowX' },
  overflowY: { cssProperty: 'overflowY' },

  // Cursor
  cursor: { cssProperty: 'cursor' },

  // Object (image / video sizing)
  objectFit: { cssProperty: 'objectFit' },
  objectPosition: { cssProperty: 'objectPosition' },
  aspectRatio: { cssProperty: 'aspectRatio' },

  // Variable-font axes - typed object form serializes to CSS shorthand.
  fontVariationSettings: {
    cssProperty: 'fontVariationSettings',
    serialize: (value) => serializeFontVariationSettings(value as FontVariationAxisSettings),
  },

  // Visual masking / clipping - string passthrough only (web-only, no
  // typed object form). Pair `maskImage` with `WebkitMaskImage` at the
  // call site for older-Safari coverage.
  maskImage: { cssProperty: 'maskImage' },
  WebkitMaskImage: { cssProperty: 'WebkitMaskImage' },
  clipPath: { cssProperty: 'clipPath' },

  // Container queries (1.5). `containerType` opts an element into
  // being a containment context that descendants can query; pair with
  // `containerName` to give the context a stable name. The `@<bp>` /
  // `@<name>.<bp>` responsive-prop syntax already targets these
  // contexts (shipped in 1.2).
  containerType: { cssProperty: 'containerType' },
  containerName: { cssProperty: 'containerName' },

  // Transform (1.7). String passthrough - accepts the full CSS
  // `transform` value (`translateY(-1px)`, `scale(0.985)`, composed
  // chains, `matrix(...)`, etc.). Pair with `transition: 'transform
  // 200ms ease'` (already supported via `transition` prop) to drive
  // animations. Common pseudo-state surfaces: `_hover={{ transform:
  // 'translateY(-1px)' }}`, `_active={{ transform: 'scale(0.985)' }}`.
  transform: { cssProperty: 'transform' },
  transformOrigin: { cssProperty: 'transformOrigin' },
  transformBox: { cssProperty: 'transformBox' },
  transformStyle: { cssProperty: 'transformStyle' },
  perspective: { cssProperty: 'perspective' },
  perspectiveOrigin: { cssProperty: 'perspectiveOrigin' },
  backfaceVisibility: { cssProperty: 'backfaceVisibility' },

  // Transform shorthand props. Each maps to a single `transform`
  // function and composes with siblings into one canonical `transform`
  // string at resolution time. Translates use `space` scale so they
  // can pick up theme-token values (`x="$space.4"` etc.) the same way
  // `top`/`left`/`marginTop` do. Rotations / skews / scales are
  // unitless / degree literals - no theme scale.
  //
  // Numeric values serialise per the platform: web emits `Npx` for
  // translates (via React's CSS pixel-auto) and `Ndeg` for
  // rotations/skews; native emits the RN transform-array form
  // (`{ translateX: N }` numbers, `{ rotate: 'Ndeg' }` strings, etc.).
  // Both go through `composeTransformAxes*` in this package.
  //
  // If `transform="..."` is also set, the literal wins - author
  // explicit-override semantics; the shorthand is silently dropped on
  // that element. Mixing requires composing the shorthand into the
  // literal manually.
  x: { cssProperty: 'transform', scale: 'space', transformAxis: 'x' },
  y: { cssProperty: 'transform', scale: 'space', transformAxis: 'y' },
  z: { cssProperty: 'transform', scale: 'space', transformAxis: 'z' },
  rotate: { cssProperty: 'transform', transformAxis: 'rotate' },
  rotateX: { cssProperty: 'transform', transformAxis: 'rotateX' },
  rotateY: { cssProperty: 'transform', transformAxis: 'rotateY' },
  rotateZ: { cssProperty: 'transform', transformAxis: 'rotateZ' },
  scale: { cssProperty: 'transform', transformAxis: 'scale' },
  scaleX: { cssProperty: 'transform', transformAxis: 'scaleX' },
  scaleY: { cssProperty: 'transform', transformAxis: 'scaleY' },
  skew: { cssProperty: 'transform', transformAxis: 'skew' },
  skewX: { cssProperty: 'transform', transformAxis: 'skewX' },
  skewY: { cssProperty: 'transform', transformAxis: 'skewY' },
} as const satisfies Record<string, StylePropDefinition>;

/** All known style-prop names (used for prop filtering at runtime). */
export type StylePropName = keyof typeof stylePropsLiteral;

/**
 * The schema, exposed with the loose `StylePropDefinition` type so the
 * resolver can read `.scale` uniformly across entries (some have it, some
 * don't). Key autocomplete is preserved via `StylePropName`.
 */
export const styleProps: Readonly<Record<StylePropName, StylePropDefinition>> = stylePropsLiteral;

/** A set version for fast membership checks during prop filtering. */
export const STYLE_PROP_NAMES: ReadonlySet<string> = new Set(Object.keys(styleProps));

/** True iff the given key is a recognized style prop. */
export function isStyleProp(key: string): key is StylePropName {
  return STYLE_PROP_NAMES.has(key);
}

/**
 * The value type for a prop bound to one token scale.
 *
 * `(string & {})` is what keeps the derived paths visible in a completion
 * list. A bare `string` in the union would absorb the literal members and
 * the editor would suggest nothing; the intersection stays distinct long
 * enough to be listed while still accepting any raw CSS value.
 *
 * A scale the active token map does not define falls back to
 * `string | number` rather than resolving to `never`. A consumer whose theme
 * omits `colors` still has a `backgroundColor` prop, and a `never`-typed prop
 * would be unusable rather than merely un-suggested.
 */
export type ScaleValueFrom<TTokens, S extends ScaleName> = S extends keyof TTokens & string
  ? ScalePath<TTokens, S> | (string & {}) | number
  : string | number;

/**
 * Per-prop value type. A prop that names a token scale offers that scale's
 * `$` paths from the augmented theme, plus any raw string or number;
 * `fontVariationSettings` additionally accepts a typed
 * {@link FontVariationAxisSettings} object that the resolver serializes to
 * the CSS shorthand. Every other prop is `string | number`.
 *
 * The scale is read from the schema rather than restated here, so a prop
 * that gains or loses a `scale` entry cannot drift out of sync with the type
 * that describes it.
 *
 * **Scoped per scale on purpose.** Offering the union of every scale's paths
 * measured 8 to 9 times the type-check cost, and it also admits paths like
 * `$colors.4` that no resolver walks.
 */
export type StylePropValueFrom<TTokens, K extends StylePropName> = K extends 'fontVariationSettings'
  ? string | FontVariationAxisSettings
  : (typeof stylePropsLiteral)[K] extends { scale: infer S extends ScaleName }
    ? ScaleValueFrom<TTokens, S>
    : string | number;

/**
 * The message a rejected `$` path resolves to.
 *
 * A message type rather than `never`, because the message is the entire
 * reason a consumer turns this on. Taking the mapped type alone (rather than
 * intersecting it with the inferred props) is what lets TypeScript report
 * `Type '"$nope"' is not assignable to type '"...: $nope"'` instead of
 * collapsing it to `never`.
 */
export type InvalidTokenPath<
  V extends string,
  S extends string,
> = `Not a path in the '${S}' scale: ${V}`;

/**
 * Check one style-prop value against the scale its prop is bound to.
 *
 * Only a literal `$` string is checked. A widened `string` fails
 * `` V extends `$${string}` `` and passes straight through, which is what
 * keeps `<Box p={someString} />` compiling. That is also why this has to run
 * through a generic type parameter: a non-generic prop type never sees the
 * literal.
 *
 * The alternative considered was typing the string arm as a union of template
 * literals over every allowed first character, with `$` left out. It rejects
 * a bad path correctly and then rejects every `string` variable and every
 * value starting with a non-ASCII character, so it is not usable.
 */
export type ValidateTokenValue<
  V,
  TTokens,
  S extends ScaleName,
> = V extends `$${string} ?? ${infer Rest}`
  ? // The `$components` head of a fallback chain is optional by design, so only the rest is checked.
    ValidateTokenValue<Rest, TTokens, S> extends Rest
    ? V
    : InvalidTokenPath<V & string, S>
  : V extends `$${string}`
    ? S extends keyof TTokens & string
      ? V extends ScalePath<TTokens, S>
        ? V
        : InvalidTokenPath<V & string, S>
      : InvalidTokenPath<V & string, S>
    : V;

/**
 * Check every style prop in a props object against its own scale.
 *
 * Props with no scale, and keys that are not style props, pass through
 * untouched.
 */
export type ValidateStylePropsFrom<TTokens, P> = {
  [K in keyof P]: K extends StylePropName
    ? (typeof stylePropsLiteral)[K] extends { scale: infer S extends ScaleName }
      ? ValidateTokenValue<P[K], TTokens, S>
      : P[K]
    : P[K];
};

/** {@link ValidateStylePropsFrom} applied to the active theme. */
export type ValidateStyleProps<P> = ValidateStylePropsFrom<MotifTokens, P>;

/**
 * The declared type of a component that accepts style props.
 *
 * Resolves to the plain, non-generic signature unless a consumer sets
 * `strictTokens`. That switch is what keeps the cost off everyone who did not
 * ask for it: without the flag there is no type parameter to instantiate per
 * call site.
 *
 * `R` is the element type, supplied by the binding package. This package has
 * no React dependency and does not gain one for this.
 */
export type MotifComponent<P, R> = StrictTokens extends true
  ? <const T extends P>(props: ValidateStyleProps<T>) => R
  : (props: P) => R;

/**
 * {@link StylePropValueFrom} applied to the active theme. Not re-exported
 * from the package barrel: the parameterised form exists so the rule can be
 * checked against a token map directly, since a module augmentation applies
 * to a whole compilation and core's own program is necessarily unaugmented.
 */
type StylePropValue<K extends StylePropName> = StylePropValueFrom<MotifTokens, K>;

/**
 * Strongly-typed style props object. Each accepts a literal CSS value or a
 * `$`-prefixed token reference. Values are passed through React's normal
 * `style` prop, so React's pixel-auto-completion applies for length
 * properties (numeric width / height / etc. become `Npx`).
 */
export type StyleProps = {
  -readonly [K in StylePropName]?: StylePropValue<K>;
};

/**
 * Pseudo-state prop names. The runtime resolver and the compiler both
 * consume this list - keep it in core so there is one source of truth
 * across renderers and build-time tooling.
 *
 * `_focus` deliberately maps to `:focus-visible` (mouse-click focus does
 * not show the focus ring). See {@link PSEUDO_SELECTOR}.
 */
export const PSEUDO_STATE_PROP_NAMES = [
  '_hover',
  '_focus',
  '_active',
  '_disabled',
  '_checked',
  '_selected',
  '_expanded',
  '_invalid',
  '_pressed',
  '_focusWithin',
  '_readOnly',
  '_groupHover',
  '_groupFocus',
  '_groupActive',
] as const;

export type PseudoStatePropName = (typeof PSEUDO_STATE_PROP_NAMES)[number];

/** Set form for fast membership checks during prop filtering. */
export const PSEUDO_STATE_PROPS: ReadonlySet<string> = new Set(PSEUDO_STATE_PROP_NAMES);

/** True iff the given key is a recognized pseudo-state prop. */
export function isPseudoStateProp(key: string): key is PseudoStatePropName {
  return PSEUDO_STATE_PROPS.has(key);
}

/** The attribute a `group` Box renders, which the `_group*` states key on. */
export const GROUP_ATTRIBUTE = 'data-motif-group';

/**
 * Pseudo-state prop → CSS selector suffix. Every member is written with a
 * leading `&` so it is scoped to the generated class. The `_disabled`
 * selector lists `&:disabled` (covers native form controls) followed by
 * `&[aria-disabled="true"]` (covers non-form surfaces with `aria-disabled`).
 *
 * The `&` on `:disabled` is load-bearing: without it the member emits as a
 * bare, page-global `:disabled` rule that styles every disabled element in
 * the app. `buildPseudoCss` scopes each comma-separated member to the class.
 *
 * `_checked` and `_selected` cover the interactive states ARIA exposes on form
 * and composite-widget elements: `_checked` for checkbox / switch / radio
 * (`:checked` for native inputs, `[aria-checked="true"]` for custom ones),
 * `_selected` for the active option in tabs / listboxes (`[aria-selected]`).
 * `_expanded` covers the open state of a disclosure trigger - accordion /
 * collapsible / popover trigger (`[aria-expanded="true"]`), so the trigger can
 * recolour or rotate a chevron purely from its own ARIA state.
 *
 * `_invalid` reads `[aria-invalid="true"]` rather than `:invalid`, which
 * matches an empty required field before the user has touched it. `_pressed`
 * is a toggle button's `[aria-pressed="true"]`; a pointer press is `_active`.
 * `_readOnly` reads the `readonly` attribute or `[aria-readonly="true"]`
 * rather than `:read-only`, which matches every element that is not
 * editable, a plain `div` included.
 *
 * The group states style an element by the state of an ancestor marked with
 * `group`, which renders {@link GROUP_ATTRIBUTE}: `_groupHover` applies while
 * any marked ancestor is hovered.
 */
export const PSEUDO_SELECTOR: Readonly<Record<PseudoStatePropName, string>> = {
  _hover: ':hover',
  _focus: ':focus-visible',
  _active: ':active',
  _disabled: '&:disabled, &[aria-disabled="true"]',
  _checked: '&:checked, &[aria-checked="true"]',
  _selected: '&[aria-selected="true"]',
  _expanded: '&[aria-expanded="true"]',
  _invalid: '&[aria-invalid="true"]',
  _pressed: '&[aria-pressed="true"]',
  _focusWithin: ':focus-within',
  _readOnly: '&[readonly], &[aria-readonly="true"]',
  _groupHover: `[${GROUP_ATTRIBUTE}]:hover &`,
  _groupFocus: `[${GROUP_ATTRIBUTE}]:focus-visible &`,
  _groupActive: `[${GROUP_ATTRIBUTE}]:active &`,
};

/**
 * Style bag for a pseudo-state. Same prop shape as {@link StyleProps}, and each
 * value may be responsive: object, array, or the string DSL.
 */
export type StateStyleBag = {
  // `Exclude`, not `NonNullable`: `NonNullable<T>` is `T & {}`, and that
  // intersection reduces a prop's `(string & {}) | '$space.4'` union back to
  // a bare `string`, dropping every token path from `_hover={{ ... }}`.
  -readonly [K in keyof StyleProps]?: StateStyleValue<Exclude<StyleProps[K], undefined>>;
};

/**
 * A value inside a state bag: a literal, or the responsive object or array
 * form (the string DSL is a string already). On web the responsive slots nest
 * at-rules under the state selector.
 */
export type StateStyleValue<V> =
  | V
  | ({ base?: V } & { [K in BreakpointName]?: V } & { [K in `@${string}`]?: V })
  | readonly (V | undefined)[];

/**
 * Pseudo-state props as React props - accepted by every styled primitive.
 * Each prop is an optional bag of flat style props applied when the
 * matching CSS pseudo-class is active.
 */
export type StateStyleProps = {
  -readonly [K in PseudoStatePropName]?: StateStyleBag;
};

/**
 * Pseudo-element prop names. Generate decorative content via CSS
 * `::before` / `::after`. The runtime resolver, the compiler, and both
 * renderers consume this list - keep it in core so there is one source
 * of truth across surfaces.
 */
export const PSEUDO_ELEMENT_PROP_NAMES = ['_before', '_after'] as const;

export type PseudoElementPropName = (typeof PSEUDO_ELEMENT_PROP_NAMES)[number];

/** Set form for fast membership checks during prop filtering. */
export const PSEUDO_ELEMENT_PROPS: ReadonlySet<string> = new Set(PSEUDO_ELEMENT_PROP_NAMES);

/** True iff the given key is a recognized pseudo-element prop. */
export function isPseudoElementProp(key: string): key is PseudoElementPropName {
  return PSEUDO_ELEMENT_PROPS.has(key);
}

/**
 * Pseudo-element prop → CSS selector suffix. `::` is two-colon for
 * pseudo-elements per CSS3 spec; older `:before` / `:after` are
 * intentionally not used.
 */
export const PSEUDO_ELEMENT_SELECTOR: Readonly<Record<PseudoElementPropName, string>> = {
  _before: '::before',
  _after: '::after',
};

/**
 * Style bag for a pseudo-element. Same prop shape as
 * {@link StateStyleBag} plus an optional `content` field. Browsers
 * require `content` for `::before` / `::after` to render - the runtime
 * defaults it to `'""'` (an empty quoted string) when omitted, so
 * decorative pseudo-elements without text content render correctly.
 *
 * Quote your literal text in the value: `content: '">"'` produces
 * `content: ">"` in the emitted CSS.
 */
export type PseudoElementStyleBag = StateStyleBag & {
  /** Generated content. Defaults to `'""'` when omitted so the
   * pseudo-element renders. Quote literal text - `content: '">"'`. */
  readonly content?: string;
};

/**
 * Pseudo-element props as React props - accepted by every styled
 * primitive on web. Native renderers accept the type but emit nothing
 * (React Native has no pseudo-elements).
 */
export type PseudoElementStyleProps = {
  -readonly [K in PseudoElementPropName]?: PseudoElementStyleBag;
};

/**
 * Motion-prop names. Mount/unmount transitions and prop-change transitions
 * - the schema lives here so the compiler (T3.6 / future) can recognise
 * the names statically.
 */
export const MOTION_PROP_NAMES = [
  'enterStyle',
  'exitStyle',
  'transition',
  'animation',
  'animateOnly',
] as const;

export type MotionPropName = (typeof MOTION_PROP_NAMES)[number];

/** Set form for fast membership checks during prop filtering. */
export const MOTION_PROPS: ReadonlySet<string> = new Set(MOTION_PROP_NAMES);

/** True iff the given key is a recognised motion prop. */
export function isMotionProp(key: string): key is MotionPropName {
  return MOTION_PROPS.has(key);
}

/**
 * Style bag applied during a motion phase (`enterStyle` on first mount,
 * `exitStyle` while the element is unmounting). Same shape as
 * {@link StateStyleBag}: flat style props, no responsive nesting.
 */
export type MotionStyleBag = StateStyleBag;

/**
 * Style bag for `exitStyle`. Like {@link MotionStyleBag}, but may also carry
 * its own `transition`, which times the exit phase independently of the base
 * `transition` (which drives enter and ordinary prop changes) - this is how
 * enter and exit get asymmetric timing. The exit transition is emitted into
 * the `[data-motif-state="exiting"]` rule and overrides the base for that
 * state.
 */
export type ExitStyleBag = MotionStyleBag & {
  readonly transition?: TransitionValue;
};

/**
 * Declarative shape for a single transition. Maps to CSS `transition-*`
 * properties. `duration` and `easing` accept either a literal CSS value
 * or a `$durations.<n>` / `$easings.<name>` token reference resolved
 * against the active theme.
 */
export interface TransitionObject {
  /** CSS property to transition (`'opacity'`, `'transform'`, `'all'`, ...). Defaults to `'all'` when omitted. */
  readonly property?: string;
  /** Duration - CSS time string or a `$durations.<n>` token reference. Defaults to `'200ms'`. */
  readonly duration?: string;
  /** Easing curve - CSS keyword / cubic-bezier or a `$easings.<name>` token reference. Defaults to `'ease'`. */
  readonly easing?: string;
  /** Delay before the transition starts. Same value forms as `duration`. */
  readonly delay?: string;
}

/**
 * Timing for a Box's `layout` animation. Same value forms as
 * {@link TransitionObject}: a literal CSS time and easing, or `$durations` /
 * `$easings` token references. Each part defaults to `300ms` / `ease-in-out`.
 */
export interface LayoutTransition {
  readonly duration?: string;
  readonly easing?: string;
}

/**
 * Permitted shapes for the `transition` prop:
 *
 * - Raw CSS string (`"opacity 200ms ease"`) - passed through verbatim.
 * - `TransitionObject` - declarative single property.
 * - `readonly TransitionObject[]` - multiple properties, joined with `,`.
 */
export type TransitionValue = string | TransitionObject | readonly TransitionObject[];

/**
 * One registered `@keyframes` rule. Returned by `keyframes(...)` (web
 * renderer). The `name` is the stable hash-based identifier emitted as
 * the @keyframes name; `css` is the full @keyframes block ready to
 * inject into a `<style>` element.
 *
 * Carries a brand symbol so the runtime can distinguish a registered
 * keyframe from an arbitrary `{ name, css }` shape.
 */
export interface Keyframe {
  readonly name: string;
  readonly css: string;
  /** The definition the block was rendered from. Native reads it to run the
   * animation, since it has no `@keyframes` rule to hand the work to. */
  readonly frames?: { readonly [stop: string]: ResolvedStyle };
  /** Brand. Use `isKeyframe(value)` to check. */
  readonly [keyframeBrand]: true;
}

export const keyframeBrand: unique symbol = Symbol.for('motif.keyframe');

/** True iff the value looks like a registered {@link Keyframe}. */
export function isKeyframe(value: unknown): value is Keyframe {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [keyframeBrand]?: unknown })[keyframeBrand] === true
  );
}

/**
 * Object form of the `animation` prop - assembles a CSS `animation`
 * shorthand from named slots. Field names mirror the CSS spec.
 *
 * `name` accepts either a string (a name already registered via theme
 * `animations` tokens, a standalone @keyframes block, or any literal
 * identifier) OR a {@link Keyframe} returned by `keyframes(...)`. When
 * a Keyframe is passed, the runtime injects the `@keyframes` rule once
 * (deduped by name) before rendering.
 *
 * `duration` and `easing` accept a literal CSS time / curve OR a
 * `$durations.<n>` / `$easings.<name>` token reference resolved
 * against the active theme via the CSS-variable cascade.
 */
export interface AnimationObject {
  readonly name: string | Keyframe;
  /** Duration - CSS time or `$durations.<n>` token ref. Defaults `'200ms'`. */
  readonly duration?: string;
  /** Easing - CSS keyword/cubic-bezier or `$easings.<name>`. Defaults `'ease'`. */
  readonly easing?: string;
  readonly iterationCount?: 'infinite' | number;
  readonly direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  readonly fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  readonly delay?: string;
  readonly playState?: 'running' | 'paused';
}

/**
 * Permitted shapes for the `animation` prop:
 *
 * - **String** - a name registered on the theme's `animations` scale
 *   (`"quick"`, `"bouncy"`). Resolves to a CSS `transition` shorthand
 *   built from `var(--motif-anim-<name>-{duration,easing})` so theme
 *   switches flip the timing through the cascade. Backward compatible
 *   with the M-1 surface.
 * - **{@link AnimationObject}** - structured form that assembles a CSS
 *   `animation` shorthand. Use this for `@keyframes`-driven animations
 *   (pass a `Keyframe` as `name`).
 */
export type AnimationValue = string | AnimationObject;

/**
 * Motion props as React props, accepted on every styled primitive on web and
 * React Native. Native runs them through its motion driver rather than CSS.
 */
export type MotionStyleProps = {
  /** Initial style on first mount. The element transitions from these
   * values to the resolved target style during entry. SSR omits this
   * overlay - entry animations run on client-mounted elements only. */
  readonly enterStyle?: MotionStyleBag;
  /** Exit-state style overlay. Applied while the element is unmounting
   * via an exit-aware boundary (e.g. `Dialog.Content`); emitted as a
   * CSS rule keyed on `[data-motif-state="exiting"]`. May carry its own
   * `transition` to time the exit independently of the base `transition`. */
  readonly exitStyle?: ExitStyleBag;
  /** Transition shorthand. Lands as the inline `transition` CSS value
   * on the rendered element so the browser can interpolate between
   * style changes. */
  readonly transition?: TransitionValue;
  /**
   * Animation reference - string (theme `animations` token name) or
   * {@link AnimationObject} (structured form, supports `Keyframe`).
   *
   * String form mirrors the M-1 surface: resolves against the active
   * theme's `animations` token scale (e.g. `"bouncy"`, `"snappy"`).
   * Object form assembles a CSS `animation` shorthand and supports
   * `@keyframes`-driven animation via `keyframes(...)`. On web, expands
   * to a CSS `transition` (string form) or `animation` (object form)
   * value; on native, supplies the duration / easing for the entry
   * driver. When both `animation` and `transition` are set,
   * `transition` takes precedence (it's the more specific instruction).
   */
  readonly animation?: AnimationValue;
  /**
   * Restrict the animation to a specific list of CSS properties (or
   * style-prop names). When omitted, the animation applies to all
   * changed properties (`transition: all <dur> <ease>` on web). Pass
   * `['transform']` for transform-only animation, or
   * `['opacity', 'transform']` for both.
   */
  readonly animateOnly?: readonly string[];
};

/**
 * A complete style bag for the `styled()` factory's layers - `base`,
 * `variants`, and `compoundVariants`. It is {@link StyleProps} (flat,
 * non-responsive style props) widened with the interaction and motion layers
 * every styled primitive already accepts: pseudo-states
 * ({@link StateStyleProps} - `_hover` / `_focus` / `_active` / `_disabled`),
 * pseudo-elements ({@link PseudoElementStyleProps} - `_before` / `_after`),
 * and motion ({@link MotionStyleProps} - `transition` / `enterStyle` /
 * `exitStyle` / `animation`).
 *
 * This is what lets a variant carry its own hover or transition rather than
 * only static styling: the layers resolve through `Box` exactly as the
 * equivalent call-site props would. Responsive nesting is intentionally
 * excluded, matching the flat shape of the `base` / variant bags.
 */
export type StyleBag = StyleProps & StateStyleProps & PseudoElementStyleProps & MotionStyleProps;
