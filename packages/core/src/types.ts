/**
 * Core token and theme types.
 *
 * motif-js uses a two-layer token model:
 *
 *   - **Primitive tokens** are the palette: `colors.blue.500`, `space.4`,
 *     `radii.md`. They are theme-independent; the literal hex / pixel values.
 *
 *   - **Semantic tokens** reference primitives by intent: `action.primary.bg`,
 *     `surface.raised`, `text.muted`. They swap their underlying primitive
 *     when the active theme changes.
 *
 * Both layers live inside a `Theme.tokens` tree. The shape is recursive: a
 * scale (e.g. `colors`) may contain nested groups (e.g. `colors.blue.500`)
 * arbitrarily deep, and any leaf may be a literal value OR a `$`-prefixed
 * token reference that points at another node.
 */

/** Permissible primitive token leaf values. */
export type TokenValue = string | number;

/**
 * A `$`-prefixed token reference. Example: `'$colors.blue.500'` or
 * `'$action.primary.bg'`. The resolver walks the dotted path inside the
 * theme's token tree.
 */
export type TokenRef = `$${string}`;

/**
 * A node in the token tree: either a leaf value, a token reference (which
 * resolves to another leaf), or another nested scale.
 */
export type TokenNode<V extends TokenValue = TokenValue> = V | TokenRef | TokenScale<V>;

/** A nested map of token nodes. Recursive. */
export interface TokenScale<V extends TokenValue = TokenValue> {
  [key: string]: TokenNode<V>;
}

/**
 * The full token map of a theme. Each top-level key is a scale name
 * (`colors`, `space`, `fontSizes`, ...). Default scale set covers the
 * common CSS properties; user themes may add custom scales.
 */
export interface TokenMap {
  colors?: TokenScale<string>;
  space?: TokenScale<number | string>;
  sizes?: TokenScale<number | string>;
  radii?: TokenScale<number | string>;
  fontSizes?: TokenScale<number | string>;
  fontWeights?: TokenScale<number | string>;
  fontFamilies?: TokenScale<string>;
  lineHeights?: TokenScale<number | string>;
  letterSpacings?: TokenScale<number | string>;
  shadows?: TokenScale<string>;
  zIndices?: TokenScale<number>;
  borderWidths?: TokenScale<number | string>;
  opacities?: TokenScale<number>;
  durations?: TokenScale<string>;
  easings?: TokenScale<string>;
  /**
   * Named-curve animation presets. Each entry resolves to at least a
   * `{ duration, easing }` pair on web (CSS transitions) and on
   * native (driver timing). Spring-style fields (`type: 'spring'`,
   * `damping`, `mass`, `stiffness`) are honoured by the native
   * Reanimated driver and approximated to a `cubic-bezier(...)`
   * easing on web. Stored as a flat record (not a recursive
   * `TokenScale`) because animation tokens are object leaves, not
   * primitive `string | number` values.
   *
   * The catch-all index signature below intentionally excludes this
   * field's shape; animations are looked up via a dedicated helper
   * (`resolveAnimationToken`), not the generic `resolveToken` path.
   */
  animations?: Readonly<Record<string, AnimationToken>>;
  /**
   * Per-component tokens, read before the semantic ones: the kit's recipes
   * reference `$components.<recipe>.<part>` with a semantic fallback, so a
   * theme restyles the kit by defining these. Values are refs or CSS strings;
   * a bare number is emitted without a unit.
   */
  components?: TokenScale<TokenValue>;
  // Allow user-defined scales without breaking type-safety for known ones.
  [scale: string]: TokenScale<TokenValue> | Readonly<Record<string, AnimationToken>> | undefined;
}

/**
 * One animation preset entry. Can be expressed as a plain
 * `{ duration, easing }` (timing animation) or as a spring config
 * `{ type: 'spring', damping?, mass?, stiffness? }`. `duration` and
 * `easing` accept literal CSS values OR `$durations.<n>` /
 * `$easings.<name>` token references.
 */
export type AnimationToken = TimingAnimationToken | SpringAnimationToken;

export interface TimingAnimationToken {
  readonly type?: 'timing';
  readonly duration?: string;
  readonly easing?: string;
}

export interface SpringAnimationToken {
  readonly type: 'spring';
  /** Mass of the animated object. Higher = slower. Default 1. */
  readonly mass?: number;
  /** Damping ratio. Higher = less oscillation. Default 10. */
  readonly damping?: number;
  /** Spring stiffness. Higher = faster snap. Default 100. */
  readonly stiffness?: number;
  /** Web-only: explicit cubic-bezier override. When omitted, motif
   * approximates the spring with a fitted bezier. */
  readonly easing?: string;
  /** Web-only: explicit duration override. When omitted, motif
   * estimates from the spring parameters. */
  readonly duration?: string;
}

/**
 * Canonical scale names known to the style-prop schema. Every entry in
 * `TokenMap` that maps to a CSS property is keyed by one of these.
 */
export type ScaleName =
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
  | 'easings'
  | 'animations';

/**
 * A complete theme definition: a name plus the full token tree. Themes can
 * be nested via `<Theme>` boundaries; the resolver always uses the closest
 * theme in scope.
 *
 * The optional `fonts`, `root`, and `reducedMotion` fields drive web-only
 * runtime emission from `<ThemeProvider>` - `@font-face` declarations,
 * `body` / `::selection` resets, and the `prefers-reduced-motion` guard.
 * They are no-ops on native (the engine has no global stylesheet).
 */
export interface Theme {
  /** Unique name, used as `data-theme` attribute on web. */
  readonly name: string;
  /** Full token tree (primitives + semantics interleaved). */
  readonly tokens: TokenMap;
  /**
   * `@font-face` declarations to emit alongside this theme. Deduped
   * across themes by `(family, weight, style, src)` - light and dark
   * typically share the same font assets, so registering the family on
   * one theme is enough.
   */
  readonly fonts?: readonly FontFace[];
  /**
   * Body and `::selection` styles to emit at the document root. Token
   * references resolve via the CSS-variable cascade, so a single
   * declaration like `background: '$colors.bg.base'` flips automatically
   * when the active theme changes.
   *
   * For `body` resets to take effect, the `data-theme` attribute must
   * sit on `<html>` or `<body>` (not the `<ThemeProvider>` wrapper div).
   * Most apps already follow this convention.
   */
  readonly root?: ThemeRootStyles;
  /**
   * Whether this theme is light or dark. On web it is emitted as
   * `color-scheme` in the theme's block, and the root `<ThemeProvider>` sets
   * it on `<html>` for the active theme, so scrollbars and native form
   * controls match.
   */
  readonly colorScheme?: 'light' | 'dark';
  /**
   * The colour for the browser's own chrome, such as the mobile address bar:
   * a colour or a `$`-token reference. The root `<ThemeProvider>` writes the
   * active theme's value, resolved to a literal, to
   * `<meta name="theme-color">` on web.
   */
  readonly themeColor?: string;
  /**
   * `prefers-reduced-motion` policy.
   *
   *   - `'guard'` (default when any theme sets the field): emit a
   *     `@media (prefers-reduced-motion: reduce)` block that forces all
   *     animations and transitions to ~0ms.
   *   - `'off'`: skip emission. Use this when the consuming app handles
   *     the guard itself.
   */
  readonly reducedMotion?: ReducedMotionMode;
}

/**
 * One `@font-face` source. A bare URL string is shorthand for a single
 * `{ url, format: <auto-detected> }` entry; pass an array of objects when
 * you need to provide multiple formats or `tech()` annotations.
 */
export interface FontSource {
  readonly url: string;
  readonly format?:
    | 'woff2'
    | 'woff'
    | 'truetype'
    | 'opentype'
    | 'embedded-opentype'
    | 'svg'
    | string;
  /** `tech()` descriptor - e.g. `'variations'` for variable fonts. */
  readonly tech?: string;
}

/**
 * One `@font-face` declaration. Field names mirror the CSS spec; required
 * fields are `family` and `src`.
 */
export interface FontFace {
  /** Font family name, as referenced from token scales (`fontFamilies`). */
  readonly family: string;
  /** Source URL or list of `{ url, format, tech }` alternatives. */
  readonly src: string | readonly FontSource[];
  readonly weight?: number | string;
  readonly style?: 'normal' | 'italic' | 'oblique' | string;
  readonly display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  readonly stretch?: string;
  readonly unicodeRange?: string;
  readonly fontVariationSettings?: string;
  readonly fontFeatureSettings?: string;
}

/**
 * Body / `::selection` resets emitted at the document root. Values may
 * be literal CSS or `$`-prefixed token references - the latter resolve
 * via the CSS-variable cascade, so a single declaration tracks the
 * active theme automatically.
 */
export interface ThemeRootStyles {
  readonly background?: StyleValue;
  readonly color?: StyleValue;
  readonly fontFamily?: StyleValue;
  readonly fontSize?: StyleValue;
  readonly fontWeight?: StyleValue;
  readonly lineHeight?: StyleValue;
  readonly letterSpacing?: StyleValue;
  readonly fontFeatureSettings?: StyleValue;
  readonly fontVariationSettings?: StyleValue;
  readonly textRendering?: StyleValue;
  readonly WebkitFontSmoothing?: StyleValue;
  readonly MozOsxFontSmoothing?: StyleValue;
  /** `::selection { background-color: ... }` */
  readonly selectionBackground?: StyleValue;
  /** `::selection { color: ... }` */
  readonly selectionColor?: StyleValue;
}

/** `prefers-reduced-motion` policy - see {@link Theme.reducedMotion}. */
export type ReducedMotionMode = 'guard' | 'off';

/**
 * Writing direction for a subtree. Drives how logical style props
 * (`paddingInline`, `insetInlineStart`, ...) and flex `row` layouts
 * resolve. Set per-subtree with the renderer's `<Direction>` provider.
 */
export type Direction = 'ltr' | 'rtl';

/**
 * A CSS-shaped object after style-prop resolution. Values are plain strings
 * or numbers; all token references have been resolved.
 */
export type ResolvedStyle = Record<string, string | number>;

/** A literal CSS value, allowing both string forms and numbers. */
export type CSSValue = string | number;

/**
 * The value a style prop may receive: a literal CSS value or a token
 * reference. Responsive shorthands (object / array / DSL) are layered on top
 * in the responsive module.
 */
export type StyleValue<V extends CSSValue = CSSValue> = V | TokenRef;

/**
 * Spring physics configuration. Defaults match a critically-damped
 * UI spring (`stiffness=100, damping=10, mass=1`) - close to framer-
 * motion's defaults, easy to tune toward bouncier or stiffer feels.
 *
 * `restSpeed` and `restDistance` set the settle thresholds: the spring
 * snaps to the target once both `|velocity| < restSpeed` and
 * `|value - target| < restDistance`. Lower values let the spring
 * crawl closer before settling; higher values cut animation tails
 * shorter at the cost of a more visible snap.
 */
export interface SpringConfig {
  /** Spring stiffness. Higher = faster snap. Default `100`. */
  stiffness?: number;
  /** Damping coefficient. Higher = less oscillation. Default `10`. */
  damping?: number;
  /** Mass of the spring. Higher = slower. Default `1`. */
  mass?: number;
  /** Settle threshold for velocity. Default `0.01`. */
  restSpeed?: number;
  /** Settle threshold for distance to target. Default `0.01`. */
  restDistance?: number;
  /** Initial velocity to seed on the first `.set()`. Default `0`. */
  velocity?: number;
}

/**
 * Axis filter for `useDrag`. `'x'` and `'y'` lock movement to
 * the horizontal or vertical axis; the other axis stays pinned to its
 * starting position. Omit (or pass `'both'`) to allow free 2D drag.
 */
export type DragAxis = 'x' | 'y' | 'both';

/**
 * Drag-constraint bounds in pixels relative to the drag start. Each
 * bound is optional - omitted bounds are unconstrained on that side.
 *
 * `left` / `right` are negative / positive offsets on the X axis;
 * `top` / `bottom` are negative / positive offsets on the Y axis.
 * Constraints clamp the offset at every move event before it's
 * written to the motion values, so consumers reading `x` / `y` always
 * see in-bounds values (unless {@link UseDragOptions.dragElastic}
 * lets the value overshoot during the gesture - the value still
 * settles back to bounds on release).
 */
export interface DragConstraints {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

/** Snapshot of the drag state passed to lifecycle callbacks. */
export interface DragInfo {
  /** Current offset from the drag-start position (clamped to constraints). */
  readonly offset: { readonly x: number; readonly y: number };
  /** Pixel-per-second velocity at the moment of the callback. Computed
   * from the last two pointer samples; zero before the first move. */
  readonly velocity: { readonly x: number; readonly y: number };
}

/**
 * Spring config for the post-release momentum animation. Same shape
 * as {@link SpringConfig} so consumers can
 * share configs between draggers and spring motion values.
 */
export interface DragSpringConfig {
  /** Spring stiffness. Default `200`. */
  stiffness?: number;
  /** Damping coefficient. Default `25`. */
  damping?: number;
  /** Mass. Default `1`. */
  mass?: number;
  /** Settle threshold for velocity. Default `0.1`. */
  restSpeed?: number;
  /** Settle threshold for distance to target. Default `0.1`. */
  restDistance?: number;
}

/** Options for `useDrag`. */
export interface UseDragOptions {
  /** Lock the drag to a single axis. Default `'both'` (free 2D drag). */
  axis?: DragAxis;
  /** Bounds for the drag offset. See {@link DragConstraints}. */
  constraints?: DragConstraints;
  /**
   * Rubber-band elasticity past {@link constraints}. `0` (default)
   * clamps hard at bounds; `1` lets the value extend freely (no
   * constraint at all). Values between scale the over-the-bound
   * portion of the offset linearly - the canonical iOS-style
   * over-scroll feel.
   *
   * Has no effect when {@link constraints} is omitted.
   */
  dragElastic?: number;
  /**
   * When `true`, the released value continues with velocity-driven
   * inertia and settles via a spring back into {@link constraints}.
   * When `false` (default), the value stops at its release position.
   *
   * Tune the settle behaviour through {@link dragTransition}.
   */
  dragMomentum?: boolean;
  /**
   * Spring config for the post-release settle. Only used when
   * {@link dragMomentum} is true or the released value is outside
   * {@link constraints} (overshoot from {@link dragElastic}).
   */
  dragTransition?: DragSpringConfig;
  /** Fires once on pointer-down (or equivalent). */
  onDragStart?: (info: DragInfo) => void;
  /** Fires on every move event during a drag. */
  onDrag?: (info: DragInfo) => void;
  /** Fires once on pointer-up / cancel - before the momentum settle. */
  onDragEnd?: (info: DragInfo) => void;
}
