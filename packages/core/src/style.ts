import {
  containerQueryForBreakpoint,
  defaultBreakpoints,
  isResponsiveObject,
  isResponsiveObjectOfObjects,
  mediaQueryForBreakpoint,
  parseResponsiveDSL,
  parseResponsiveKey,
  responsiveArrayToObject,
  type BreakpointName,
} from './breakpoints.js';
import { tokenRefToCssVar } from './css-vars.js';
import { isTokenRef, resolveValue } from './token.js';
import { isStyleProp, styleProps, type StylePropDefinition } from './style-props.js';
import {
  composeTransformAxesNative,
  composeTransformAxesWeb,
  type TransformAxes,
} from './transform-composer.js';
import type { ResolvedStyle, Theme } from './types.js';

export interface ResolveStylesResult {
  /** CSS-shaped object ready to apply via React's `style` prop. */
  readonly style: ResolvedStyle;
  /** All non-style props, pass-through to the underlying element. */
  readonly rest: Record<string, unknown>;
}

/**
 * Walk a props bag, separating style props from everything else and resolving
 * any token references against the given theme.
 *
 * Style props that resolve to `undefined` (unknown token, unresolved ref) are
 * silently dropped. Style props that are explicitly `null` or `undefined` in
 * the input are also dropped. All other values pass through unchanged
 * (numbers stay numbers - React's inline-style auto-pixelation handles
 * length properties).
 */
export function resolveStyles(
  props: Record<string, unknown>,
  theme: Theme | undefined,
): ResolveStylesResult {
  const style: ResolvedStyle = {};
  const rest: Record<string, unknown> = {};
  let transformAxes: TransformAxes | null = null;
  let hasLiteralTransform = false;

  for (const key in props) {
    const value = props[key];

    if (!isStyleProp(key)) {
      rest[key] = value;
      continue;
    }

    if (value === undefined || value === null) continue;

    const def = styleProps[key];
    let resolved: string | number | undefined;

    if (
      def.serialize !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      // Disambiguate by value shape, not "any key looks like a breakpoint": an
      // object-form value (`{ wght: 400 }`, even `{ md: 400 }`) serializes; only
      // a responsive wrapping with object values per breakpoint is responsive.
      !isResponsiveObjectOfObjects(value)
    ) {
      resolved = def.serialize(value as object);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // A non-array object here is a responsive bag (`{ base: 2, md: 4 }`). The
      // native resolver expects responsive props to be pre-resolved by the
      // renderer; emitting the object as a CSS value would break RN styling.
      continue;
    } else {
      const scale = def.scale;
      resolved = resolveValue(
        value as string | number,
        theme,
        scale === undefined ? {} : { defaultScale: scale },
      );
    }

    if (resolved === undefined) continue;

    if (def.transformAxis !== undefined) {
      (transformAxes ??= {})[def.transformAxis] = resolved;
      continue;
    }

    if (typeof def.cssProperty === 'string') {
      if (def.cssProperty === 'transform') hasLiteralTransform = true;
      style[def.cssProperty] = resolved;
    } else {
      for (const cssProp of def.cssProperty) {
        style[cssProp] = resolved;
      }
    }
  }

  // Compose transform-axis bag into RN's array form. Literal
  // `transform` wins by author-intent - when both are present, the
  // axis values are silently dropped (mixing requires explicit
  // composition).
  if (transformAxes !== null && !hasLiteralTransform) {
    const composed = composeTransformAxesNative(transformAxes);
    if (composed !== undefined) {
      style.transform = composed as unknown as string;
    }
  }

  return { style, rest };
}

/**
 * Variant of {@link resolveStyles} for the CSS-variable path. No theme is
 * required - token references emit `var(--...)` strings that the active
 * `[data-theme]` cascade resolves at the browser level.
 *
 * Use this in tandem with `themeToCssBlock` (and a `<ThemeProvider>` that
 * mounts that block in the document). Theme switches become attribute swaps;
 * no React re-render of subscribers is needed.
 */
export function resolveStylesToVars(props: Record<string, unknown>): ResolveStylesResult {
  const style: ResolvedStyle = {};
  const rest: Record<string, unknown> = {};
  let transformAxes: TransformAxes | null = null;
  let hasLiteralTransform = false;

  for (const key in props) {
    const value = props[key];

    if (!isStyleProp(key)) {
      rest[key] = value;
      continue;
    }

    if (value === undefined || value === null) continue;

    const def = styleProps[key];
    let out: string | number | undefined;

    if (typeof value === 'string' && isTokenRef(value)) {
      out = tokenRefToCssVar(value, def.scale);
      // If the ref couldn't be encoded (no defaultScale, malformed), drop.
      if (out === undefined) continue;
    } else if (typeof value === 'string' || typeof value === 'number') {
      out = value;
    } else if (
      def.serialize !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      // Disambiguate by value shape (see resolveStyles): an axis bag like
      // `{ md: 400 }` serializes; only a responsive wrapping with per-breakpoint
      // object values is responsive. Using the weaker `isResponsiveObject` here
      // mis-classified `fontVariationSettings={{ md: 400 }}`.
      !isResponsiveObjectOfObjects(value)
    ) {
      out = def.serialize(value as object);
    } else {
      continue;
    }

    if (def.transformAxis !== undefined) {
      (transformAxes ??= {})[def.transformAxis] = out;
      continue;
    }

    if (typeof def.cssProperty === 'string') {
      if (def.cssProperty === 'transform') hasLiteralTransform = true;
      style[def.cssProperty] = out;
    } else {
      for (const cssProp of def.cssProperty) {
        style[cssProp] = out;
      }
    }
  }

  // Compose transform-axis bag into a single CSS `transform` string.
  // Literal `transform` wins; the shorthand is dropped on that
  // element to honour author intent.
  if (transformAxes !== null && !hasLiteralTransform) {
    const composed = composeTransformAxesWeb(transformAxes);
    if (composed !== undefined) style.transform = composed;
  }

  return { style, rest };
}

/**
 * Resolve one state bag (`_hover`, `_focus`, ...) into its rules. A flat bag
 * is one rule, built exactly as before so its class hash is unchanged. A bag
 * holding responsive values adds a rule per breakpoint or container query, so
 * `_hover={{ bg: { base: 'red', md: 'blue' } }}` emits `.m-x:hover` and
 * `@media (min-width: 768px) { .m-x:hover }`. The runtime `Box` and the
 * compiler both build state rules here. Returns `PseudoRule`s, written out
 * structurally because `css-emit` already imports from this module.
 */
export function resolveStateRules(
  pseudo: string,
  bag: Record<string, unknown>,
): { pseudo: string; style: ResolvedStyle; at?: string }[] {
  const { atRules } = resolveResponsiveStylesToVars(bag, { baseAsClass: true });
  if (atRules.every((r) => r.atRule === '')) {
    return [{ pseudo, style: resolveStylesToVars(bag).style }];
  }
  return atRules.map((r) =>
    r.atRule === '' ? { pseudo, style: r.style } : { pseudo, style: r.style, at: r.atRule },
  );
}

/**
 * Resolve a `_before` / `_after` bag to a CSS-shaped style. `content` is not a
 * registered style prop, so it is carried by hand, and it defaults to `'""'`:
 * without one, browsers render no pseudo-element. It comes first so the rule
 * hashes the same wherever it is built; the runtime `Box` and the compiler
 * both use this function.
 */
export function resolvePseudoElementBag(
  bag: { readonly content?: string } & Record<string, unknown>,
): Record<string, string | number> {
  const { content, ...rest } = bag;
  const { style } = resolveStylesToVars(rest);
  return { content: content ?? '""', ...style };
}

/**
 * Resolve a single style-prop value - literal, token ref, or non-style - into
 * a CSS-var-friendly output. Returns `undefined` if the value should be
 * dropped (null / undefined / unresolvable).
 */
function resolveSingleValueToVar(
  value: unknown,
  def: StylePropDefinition,
): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && isTokenRef(value)) {
    return tokenRefToCssVar(value, def.scale);
  }
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (
    def.serialize !== undefined &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !isResponsiveObjectOfObjects(value)
  ) {
    return def.serialize(value as object);
  }
  return undefined;
}

/**
 * Apply a single style prop's resolved value to a target style object,
 * expanding shorthand (`px` → `paddingLeft` + `paddingRight`). Returns
 * `'transform-axis'` when the value should instead be routed into the
 * per-slot transform-axes bag (caller stages the axis there);
 * `'literal-transform'` when the value is a literal `transform`
 * string (caller flips its "literal wins" flag); `'normal'`
 * otherwise.
 */
function applyToStyle(
  target: ResolvedStyle,
  def: StylePropDefinition,
  value: string | number,
): 'transform-axis' | 'literal-transform' | 'normal' {
  if (def.transformAxis !== undefined) return 'transform-axis';
  if (typeof def.cssProperty === 'string') {
    target[def.cssProperty] = value;
    return def.cssProperty === 'transform' ? 'literal-transform' : 'normal';
  }
  for (const cssProp of def.cssProperty) {
    target[cssProp] = value;
  }
  return 'normal';
}

/**
 * A single CSS at-rule produced by the responsive resolver. The renderer
 * wraps the supplied style in a class selector under this at-rule.
 *
 * `atRule` is the full prefix, e.g. `@media (min-width: 768px)` or
 * `@container card (min-width: 1024px)`. The empty string `''` is a
 * sentinel for the **base class block** - emitted as `.<class> { ... }`
 * with no at-rule wrapper, so its declarations sit at the same
 * specificity as the responsive overrides and the cascade order
 * (base first, then media, then containers) decides the winner.
 */
export interface AtRule {
  readonly atRule: string;
  readonly style: ResolvedStyle;
}

export interface ResolveResponsiveOptions {
  /**
   * Emit base style props as a class block instead of inline styles.
   *
   * Set by the renderer when a CSS cascade layer is configured. Inline styles
   * cannot belong to a layer, so an app that has put Motif in a layer below
   * its own stylesheet still loses to Motif on every base prop unless those
   * props become classes.
   *
   * Off by default: the inline path is cheaper and is what every unlayered
   * app already gets.
   */
  readonly baseAsClass?: boolean;
}

export interface ResolveResponsiveResult {
  /** Style applied unconditionally (the `base` slot of any responsive object). */
  readonly baseStyle: ResolvedStyle;
  /**
   * At-rules to be injected as class-scoped CSS. Emitted in cascade order:
   * media first (least specific), then anonymous container queries, then
   * named container queries (alphabetical). Within each group, breakpoints
   * are mobile-first (sm → 2xl).
   */
  readonly atRules: ReadonlyArray<AtRule>;
  /** Non-style props pass-through. */
  readonly rest: Record<string, unknown>;
}

type StylePerBp = Partial<Record<BreakpointName, ResolvedStyle>>;

const BREAKPOINT_ORDER = Object.keys(defaultBreakpoints) as readonly BreakpointName[];

/**
 * Like {@link resolveStylesToVars}, but additionally handles **responsive
 * object** values. Both media-query and container-query keys are supported
 * within the same object:
 *
 * - `base` → unconditional (inline style).
 * - `<bp>` (e.g. `md`) → `@media (min-width: ...)`.
 * - `@<bp>` (e.g. `@md`) → `@container (min-width: ...)` against the nearest
 *   container ancestor.
 * - `@<name>.<bp>` (e.g. `@card.md`) → `@container <name> (min-width: ...)`.
 *
 * Renderer-agnostic: produces the data the renderer needs but does not inject
 * anything into the DOM.
 */
export function resolveResponsiveStylesToVars(
  props: Record<string, unknown>,
  options: ResolveResponsiveOptions = {},
): ResolveResponsiveResult {
  // Under a cascade layer, base props must be emitted as a class rather than
  // inline: inline styles cannot participate in a layer at all, so leaving
  // them inline would defeat the whole point - the host stylesheet still
  // could not win. `baseClassStyle` is the existing route for exactly this
  // (it is what a responsive override already forces), so the layered mode is
  // that path made unconditional rather than a second mechanism.
  const baseAsClass = options.baseAsClass === true;
  const baseStyle: ResolvedStyle = {};
  const baseClassStyle: ResolvedStyle = {};
  const baseSlot = baseAsClass ? baseClassStyle : baseStyle;
  const mediaPerBp: StylePerBp = {};
  const anonContainerPerBp: StylePerBp = {};
  const namedContainerPerBp: Record<string, StylePerBp> = {};
  const rest: Record<string, unknown> = {};

  // Per-slot transform-axis bookkeeping. `slotAxes` accumulates the
  // shorthand props per responsive slot so each slot composes its own
  // `transform` string independent of the others (base, each bp,
  // named containers). `slotsWithLiteralTransform` records slots that
  // also have a literal `transform="..."` value - those win and the
  // axes are dropped on that slot.
  const slotAxes = new Map<ResolvedStyle, TransformAxes>();
  const slotsWithLiteralTransform = new Set<ResolvedStyle>();
  const writeToSlot = (
    slot: ResolvedStyle,
    def: StylePropDefinition,
    value: string | number,
  ): void => {
    const tag = applyToStyle(slot, def, value);
    if (tag === 'transform-axis') {
      let axes = slotAxes.get(slot);
      if (axes === undefined) {
        axes = {};
        slotAxes.set(slot, axes);
      }
      axes[def.transformAxis!] = value;
    } else if (tag === 'literal-transform') {
      slotsWithLiteralTransform.add(slot);
    }
  };

  for (const key in props) {
    const value = props[key];

    if (!isStyleProp(key)) {
      rest[key] = value;
      continue;
    }

    if (value === undefined || value === null) continue;

    const def = styleProps[key];

    // A string that parses as the responsive DSL is treated as responsive
    // (precedence over a literal value). This is unambiguous in practice -
    // no valid CSS literal is shaped like `<breakpoint>:<value>`; see
    // parseResponsiveDSL for the guards that keep real literals out.
    // For a prop with an object serializer (`fontVariationSettings`), an object
    // like `{ md: 400 }` is an axis bag, not a responsive wrapper - only a
    // per-breakpoint-object shape counts as responsive. For every other prop,
    // any breakpoint-keyed object is responsive.
    const objectIsResponsive =
      def.serialize !== undefined ? isResponsiveObjectOfObjects(value) : isResponsiveObject(value);
    const responsive: Record<string, unknown> | null = Array.isArray(value)
      ? responsiveArrayToObject(value)
      : objectIsResponsive
        ? (value as Record<string, unknown>)
        : typeof value === 'string'
          ? parseResponsiveDSL(value)
          : null;

    if (responsive !== null) {
      const obj = responsive;
      // Per-prop decision: route `base` to the class block only when this
      // prop has at least one non-base override. Without overrides, inline
      // is fine (no cascade fight) and saves a class-rule byte.
      let hasOverride = false;
      for (const probeKey in obj) {
        const probe = parseResponsiveKey(probeKey);
        if (probe !== null && probe.kind !== 'base') {
          hasOverride = true;
          break;
        }
      }
      for (const bpKey in obj) {
        const parsed = parseResponsiveKey(bpKey);
        if (parsed === null) continue;

        const resolved = resolveSingleValueToVar(obj[bpKey], def);
        if (resolved === undefined) continue;

        if (parsed.kind === 'base') {
          writeToSlot(hasOverride || baseAsClass ? baseClassStyle : baseStyle, def, resolved);
        } else if (parsed.kind === 'media') {
          mediaPerBp[parsed.bp] ??= {};
          writeToSlot(mediaPerBp[parsed.bp]!, def, resolved);
        } else if (parsed.name === undefined) {
          anonContainerPerBp[parsed.bp] ??= {};
          writeToSlot(anonContainerPerBp[parsed.bp]!, def, resolved);
        } else {
          const bucket = (namedContainerPerBp[parsed.name] ??= {});
          bucket[parsed.bp] ??= {};
          writeToSlot(bucket[parsed.bp]!, def, resolved);
        }
      }
      continue;
    }

    const resolved = resolveSingleValueToVar(value, def);
    if (resolved === undefined) continue;
    writeToSlot(baseSlot, def, resolved);
  }

  // Compose each slot's transform-axis bag into a CSS `transform`
  // string. Slots that received a literal `transform` keep that
  // value (author intent); the axes accumulated on those slots are
  // dropped.
  for (const [slot, axes] of slotAxes) {
    if (slotsWithLiteralTransform.has(slot)) continue;
    const composed = composeTransformAxesWeb(axes);
    if (composed !== undefined) slot.transform = composed;
  }

  const atRules: AtRule[] = [];

  // 0. Base class block - emitted *before* the media / container blocks
  //    so the source-order cascade lets responsive overrides win at
  //    matching specificity (0,0,1,0). Without this, base values would
  //    sit in inline `style` (1,0,0,0) and clobber every override.
  if (Object.keys(baseClassStyle).length > 0) {
    atRules.push({ atRule: '', style: baseClassStyle });
  }

  // 1. Media queries - least specific, emitted first so containers override.
  for (const bp of BREAKPOINT_ORDER) {
    const style = mediaPerBp[bp];
    if (style !== undefined && Object.keys(style).length > 0) {
      atRules.push({ atRule: mediaQueryForBreakpoint(bp), style });
    }
  }

  // 2. Anonymous container queries - bind to nearest container ancestor.
  for (const bp of BREAKPOINT_ORDER) {
    const style = anonContainerPerBp[bp];
    if (style !== undefined && Object.keys(style).length > 0) {
      atRules.push({ atRule: containerQueryForBreakpoint(bp), style });
    }
  }

  // 3. Named container queries - alphabetical by name for determinism.
  const names = Object.keys(namedContainerPerBp).sort();
  for (const name of names) {
    const bucket = namedContainerPerBp[name]!;
    for (const bp of BREAKPOINT_ORDER) {
      const style = bucket[bp];
      if (style !== undefined && Object.keys(style).length > 0) {
        atRules.push({ atRule: containerQueryForBreakpoint(bp, name), style });
      }
    }
  }

  return { baseStyle, atRules, rest };
}
