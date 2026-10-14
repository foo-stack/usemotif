import {
  type MotifComponent,
  PSEUDO_ELEMENT_SELECTOR,
  PSEUDO_SELECTOR,
  PSEUDO_STATE_PROP_NAMES,
  STYLE_PROP_NAMES,
  buildAnimationCss,
  buildAnimationShorthand,
  extractKeyframeFromAnimation,
  liftPseudoOverriddenBaseProps,
  resolveResponsiveStylesToVars,
  resolvePseudoElementBag,
  resolveStylesToVars,
  resolveTransitionToVars,
  type AnimationValue,
  type BreakpointName,
  type ExitStyleBag,
  type LayoutTransition,
  type MotionStyleProps,
  type MotionValueWideningOf,
  type PseudoElementStyleBag,
  type PseudoElementStyleProps,
  type PseudoStatePropName,
  type StateStyleBag,
  type StateStyleProps,
  type StyleProps,
  type StylePropName,
  type TransitionValue,
} from '@usemotif/core';
import type {
  ReactElement,
  CSSProperties,
  ElementType,
  HTMLAttributes,
  ReactNode,
  Ref,
} from 'react';
import { createElement } from 'react';
import {
  warnIfFlexPropsWithoutFlexDisplay,
  warnIfFocusOnNonTabbable,
  warnIfMotionWithoutTransition,
} from './_dev-warnings.js';
import { BoxWithEnter } from './_box-enter.js';
import { BoxWithExit } from './_box-exit.js';
import { getMotionDriver } from './_animation/index.js';
import { BoxWithMotionValues } from './_box-motion-values.js';
import { useLayoutAnimation, type LayoutAnimationKind } from './use-layout-animation.js';
import { useDrag, type DragConstraints, type DragInfo, type DragSpringConfig } from './use-drag.js';
import { splitMotionValueProps } from './_motion-bindings.js';
import {
  injectAtRules,
  injectKeyframes,
  injectPseudoRules,
  type PseudoRule,
} from './style-cache.js';
import { useActiveCollector } from './collector-context.js';
import { useCssLayer } from './css-layer-context.js';

/** Selector suffix used to opt into `exitStyle` from a parent boundary. */
const EXIT_SELECTOR = '[data-motif-state="exiting"]';

/**
 * A responsive style-prop value. One of:
 *
 * - Literal value (string / number) - applied unconditionally.
 * - Responsive object - keyed by:
 *   - `base` - unconditional (applied as inline style).
 *   - `<bp>` (e.g. `md`) - applied at `@media (min-width: ...)`.
 *   - `@<bp>` - applied at `@container (min-width: ...)` against the
 *     nearest container ancestor.
 *   - `@<name>.<bp>` - applied at `@container <name> (min-width: ...)`.
 * - Responsive array `[base, sm, md, lg, xl, '2xl']` - positional shorthand
 *   for the object form (media-query keys only). Trailing slots optional.
 */
type Responsive<V> =
  | V
  | ({ base?: V } & { [K in BreakpointName]?: V } & { [K in `@${string}`]?: V })
  | readonly (V | undefined)[];

/**
 * Style props at the React level - every prop also accepts a responsive
 * object containing per-breakpoint overrides. A select subset of props
 * additionally accepts a `MotionValue` (see `MotionValueWideningOf`)
 * at the top-level slot so 60fps imperative updates can bypass the
 * React render cycle.
 */
type ResponsiveStyleProps = {
  -readonly [K in keyof StyleProps]?:
    // `Exclude`, not `NonNullable`. `NonNullable<T>` is `T & {}`, and that
    // intersection reduces `(string & {}) | '$space.4'` back to a bare
    // `string`, which swallows every token path a prop offers. The value
    // would still be accepted, so nothing would fail: the editor would just
    // stop suggesting. `scripts/check-token-types.mjs` fails if this is
    // reverted.
    Responsive<Exclude<StyleProps[K], undefined>> | MotionValueWideningOf<K & StylePropName>;
};

/**
 * Props for the Box primitive.
 *
 * Style props ({@link StyleProps}) accept literal CSS values, `$`-prefixed
 * token references, or responsive objects (`{ base, sm, md, lg, xl }`).
 * Pseudo-state props ({@link StateStyleProps}) - `_hover`, `_focus`,
 * `_active`, `_disabled` - accept flat style bags applied via the matching
 * CSS pseudo-class. Motion props ({@link MotionStyleProps}) - `enterStyle`,
 * `exitStyle`, `transition` - drive mount/unmount transitions and
 * prop-change interpolation. Standard HTML attributes (id, data-*,
 * aria-*, event handlers) flow through to the rendered element.
 */
export type BoxProps = ResponsiveStyleProps &
  StateStyleProps &
  PseudoElementStyleProps &
  MotionStyleProps &
  Omit<HTMLAttributes<HTMLElement>, keyof StyleProps | 'style' | 'children' | 'className'> & {
    /** Render as a different HTML element (defaults to `div`). */
    as?: ElementType;
    /** Extra class name(s) - concatenated with any responsive class motif emits. */
    className?: string;
    /** Inline style overrides - merged on top of the resolved style. */
    style?: CSSProperties;
    /**
     * Ref forwarded to the rendered element. React 19 surfaces this as
     * a regular prop, so callback refs and `RefObject`s both work
     * directly on `<Box>`. The ref points at the underlying DOM
     * element (an `HTMLElement` or `SVGElement` depending on `as`).
     */
    ref?: Ref<HTMLElement | null>;
    /**
     * Animate layout changes using FLIP. Set to `true` to animate
     * both position and size; pass `'position'` or `'size'` to limit
     * the axes. When set, the Box wraps itself with
     * `useLayoutAnimation` so size / position changes between commits
     * tween smoothly instead of snapping. Defaults to 300ms ease-in-out;
     * `layoutTransition` changes that.
     */
    layout?: boolean | 'position' | 'size';
    /**
     * Duration and easing of the `layout` animation, as literals or
     * `$durations` / `$easings` tokens. Tokens emit CSS variables, so a
     * theme switch applies.
     *
     * @example
     * ```tsx
     * <Box layout layoutTransition={{ duration: '$durations.5', easing: '$easings.decelerate' }} />
     * ```
     */
    layoutTransition?: LayoutTransition;
    /**
     * Native-only layout callback. Accepted as `undefined` so handles
     * built for both platforms (`useScrollTarget`, `useLayoutAnimation`)
     * spread onto a web Box, and never forwarded to the DOM.
     */
    onLayout?: undefined;
    /**
     * Make the Box draggable. `true` enables free 2D drag; `'x'` /
     * `'y'` locks the drag to a single axis. Internally wires
     * `useDrag` and binds its `x` / `y` motion values to the Box's
     * transform shorthand props.
     *
     * The companion props ({@link dragConstraints}, {@link dragElastic},
     * {@link dragMomentum}, {@link dragTransition}, and the lifecycle
     * callbacks) configure the drag.
     */
    drag?: boolean | 'x' | 'y';
    /** Bounds for the drag offset. See `useDrag`'s `DragConstraints`. */
    dragConstraints?: DragConstraints;
    /**
     * Rubber-band elasticity past `dragConstraints`. `0` (default)
     * clamps hard; `1` lets the value extend freely.
     */
    dragElastic?: number;
    /**
     * Continue with velocity-driven momentum and spring-settle on
     * release. Pair with `dragTransition` to tune the spring.
     */
    dragMomentum?: boolean;
    /** Spring config for the release momentum / elastic-return settle. */
    dragTransition?: DragSpringConfig;
    /** Fires on drag start. */
    onDragStart?: (info: DragInfo) => void;
    /** Fires on every drag move. */
    onDrag?: (info: DragInfo) => void;
    /** Fires on drag release (before the momentum settle). */
    onDragEnd?: (info: DragInfo) => void;
    /** Content. */
    children?: ReactNode;
  };

/**
 * The atom of motif-js: a styled, theme-aware, responsive container.
 *
 * Token references (`bg="$colors.surface.base"`) emit `var(--...)` strings
 * resolved by the `[data-theme]` cascade.
 * Responsive objects (`p={{ base: '$2', md: '$4' }}`) emit per-breakpoint
 * media queries injected once into a stylesheet and applied via a generated
 * class name.
 * Pseudo-state props (`_hover={{ bg: '...' }}`) emit selector-suffixed
 * rules (`:hover`, `:focus-visible`, `:active`,
 * `:disabled, &[aria-disabled="true"]`) hashed into a deduped class.
 * Motion props (`transition`, `enterStyle`, `exitStyle`) drive mount /
 * unmount and prop-change interpolation. `transition` lands on inline
 * `style.transition`; `enterStyle` is paid as one runtime state per
 * instance (only when set); `exitStyle` is emitted as a CSS rule keyed on
 * `[data-motif-state="exiting"]` and consumed by exit-aware boundaries
 * (e.g. `Dialog.Content`).
 */
export const Box: MotifComponent<BoxProps, ReactElement | null> = function (props: BoxProps) {
  // Read the SSR collector unconditionally as the very first hook so it
  // runs on EVERY render path - the layout/drag dispatches and the
  // compiled-output fast path below all return early, and a hook placed
  // after them would be called on some renders but not others. Toggling a
  // style prop (or `layout`/`drag`) at one call site would then change the
  // hook count between renders and crash with "rendered fewer hooks than
  // expected". It's a cheap `useContext` (null on the client), so paying
  // it on the fast path costs nothing meaningful.
  const activeCollector = useActiveCollector();
  // App-level config from `<ThemeProvider cssLayer>`; `undefined` for every
  // app that hasn't opted in, which is the unchanged path throughout.
  const cssLayer = useCssLayer();

  // Layout-animation dispatch sits at the very top because the wrapper
  // owns the element ref the FLIP hook needs to write to. The wrapper
  // re-enters Box without `layout` set, so there's no recursion.
  if (props.layout !== undefined && props.layout !== false) {
    return createElement(BoxWithLayout, props);
  }

  // Drag dispatch - same pattern as `layout`. The wrapper runs
  // `useDrag`, spreads the resulting handlers onto the inner Box, and
  // binds the x/y motion values to the transform shorthand. The drag
  // props get stripped on the inner pass so there's no recursion.
  if (props.drag !== undefined && props.drag !== false) {
    return createElement(BoxWithDrag, props);
  }

  const {
    as = 'div',
    className: userClassName,
    style: inlineStyle,
    children,
    _hover,
    _focus,
    _active,
    _disabled,
    _checked,
    _selected,
    _expanded,
    _invalid,
    _pressed,
    _focusWithin,
    _readOnly,
    _before,
    _after,
    enterStyle,
    exitStyle,
    transition,
    animation,
    animateOnly,
    layout: _layout,
    layoutTransition: _layoutTransition,
    onLayout: _onLayout,
    drag: _drag,
    dragConstraints: _dragConstraints,
    dragElastic: _dragElastic,
    dragMomentum: _dragMomentum,
    dragTransition: _dragTransition,
    onDragStart: _onDragStart,
    onDrag: _onDrag,
    onDragEnd: _onDragEnd,
    ...rest
  } = props;

  // Hot-path predicate: most call sites set zero pseudo bags, so a
  // single short-circuited boolean is faster than building a state
  // object eagerly. Pseudo-states (`_hover`, `_focus`, ...) and pseudo-
  // elements (`_before`, `_after`) share the rule-injection path
  // because they hash + emit identically.
  const hasPseudo =
    _hover !== undefined ||
    _focus !== undefined ||
    _active !== undefined ||
    _disabled !== undefined ||
    _checked !== undefined ||
    _selected !== undefined ||
    _expanded !== undefined ||
    _invalid !== undefined ||
    _pressed !== undefined ||
    _focusWithin !== undefined ||
    _readOnly !== undefined ||
    _before !== undefined ||
    _after !== undefined;
  const hasMotion =
    transition !== undefined ||
    enterStyle !== undefined ||
    exitStyle !== undefined ||
    animation !== undefined;

  if (process.env.NODE_ENV !== 'production') {
    if (_focus !== undefined) warnIfFocusOnNonTabbable(as, rest);
    if (hasMotion) warnIfMotionWithoutTransition(enterStyle, exitStyle, transition);
    warnIfFlexPropsWithoutFlexDisplay(as, rest);
  }

  // Pull motion-value-typed style props out before any other prop
  // walking runs - the regular resolver below has no awareness of
  // `MotionValue` and would silently drop the slots. Returns the
  // existing `rest` untouched (same object identity) when no MVs are
  // present, so the no-MV path pays only one `for...in` traversal.
  const { motionBindings, restWithoutMv } = splitMotionValueProps(rest as Record<string, unknown>);
  const hasMotionValues = motionBindings.length > 0;

  // Compiled-output fast path: when the build tool's motif plugin has
  // already extracted every style prop, `rest` carries no style props and
  // no pseudo-state / motion bags are present. The resolver / class-
  // injection round-trip is pure overhead in that case. Cheap
  // O(rest.keys) early return keeps the wrapper's runtime cost close to
  // a plain `createElement`. Motion-value bindings disqualify the fast
  // path because they need the ref + subscription effect in
  // `BoxWithMotionValues`.
  if (!hasPseudo && !hasMotion && !hasMotionValues && !hasAnyStyleProp(restWithoutMv)) {
    return createElement(
      as,
      {
        ...restWithoutMv,
        ...(userClassName !== undefined && userClassName !== ''
          ? { className: userClassName }
          : {}),
        ...(inlineStyle !== undefined ? { style: inlineStyle } : {}),
      },
      children,
    );
  }

  // Under a layer, base props must become a class: inline styles cannot
  // participate in a cascade layer, so leaving them inline would keep Motif
  // winning over the host stylesheet no matter how the layers are ordered -
  // the exact thing the layer was configured to fix.
  const {
    baseStyle,
    atRules,
    rest: passThrough,
  } = resolveResponsiveStylesToVars(restWithoutMv, {
    baseAsClass: cssLayer !== undefined,
  });

  // Skip pseudo-rule collection + injection entirely when no pseudo bags
  // and no exitStyle are present - the common case for render-heavy
  // lists. When pseudos ARE present, build the rule list once so we
  // can both inject it and use it to decide which base props must be
  // lifted from inline → class block to restore the cascade
  // (see liftPseudoOverriddenBaseProps).
  const selectorRules =
    hasPseudo || exitStyle !== undefined
      ? buildSelectorRules(
          {
            _hover,
            _focus,
            _active,
            _disabled,
            _checked,
            _selected,
            _expanded,
            _invalid,
            _pressed,
            _focusWithin,
            _readOnly,
          },
          _before,
          _after,
          exitStyle,
        )
      : undefined;

  // `transition` wins over `animation` when both are set - `transition`
  // is the more specific, lower-level instruction. Without `transition`,
  // `animation` dispatches on form: a string is the M-1 surface (theme
  // `animations` token reference, expands to a CSS `transition`); an
  // `AnimationObject` assembles a CSS `animation` shorthand and may
  // carry a `Keyframe` whose `@keyframes` rule gets injected here once
  // (deduped by name). `animateOnly` only applies to the string form.
  const animationKeyframe = extractKeyframeFromAnimation(animation);
  if (animationKeyframe !== undefined) {
    injectKeyframes(animationKeyframe.name, animationKeyframe.css, activeCollector, cssLayer);
  }
  // Apply base `transition` / `animation` BEFORE the lift below, so a
  // selector rule that overrides `transition` - notably an `exitStyle` that
  // carries its own timing - can pull the base value into the class block and
  // win the cascade for that state. (Applied after, the base `transition`
  // would stay inline and clobber the exit rule.)
  const motionBase = applyMotion(baseStyle, transition, animation, animateOnly);

  // Lift any base style key that a state-pseudo bag (or the exit rule)
  // overrides - without this, inline (1,0,0,0) clobbers the pseudo class rule
  // (0,1,1) and declarations like `_disabled={{ boxShadow: 'none' }}` never win.
  const { inlineBase: baseStyleWithMotion, atRules: liftedAtRules } =
    selectorRules === undefined
      ? { inlineBase: motionBase, atRules }
      : liftPseudoOverriddenBaseProps(motionBase, selectorRules, atRules);

  const responsiveClass = injectAtRules(liftedAtRules, activeCollector, cssLayer);
  const pseudoClass =
    selectorRules === undefined
      ? undefined
      : injectPseudoRules(selectorRules, activeCollector, cssLayer);
  const finalClassName =
    [responsiveClass, pseudoClass, userClassName].filter(Boolean).join(' ') || undefined;

  // Motion-value path subsumes the entry-animation path: when both
  // are set, `BoxWithMotionValues` runs the enter overlay first and
  // activates MV subscriptions only after the overlay has settled, so
  // there's no race between React-managed enter writes and imperative
  // MV writes on the same `style` slot.
  if (hasMotionValues) {
    return createElement(
      BoxWithMotionValues,
      {
        as,
        passThrough,
        finalClassName,
        baseStyle: baseStyleWithMotion,
        inlineStyle,
        motionBindings,
        enterStyle,
      },
      children,
    );
  }

  if (enterStyle !== undefined) {
    return createElement(
      BoxWithEnter,
      {
        as,
        passThrough,
        finalClassName,
        baseStyle: baseStyleWithMotion,
        inlineStyle,
        enterStyle,
        // BoxWithEnter drives enter and exit off the same ref. When the active
        // driver is imperative (WAAPI) an exitStyle is played off-thread through
        // the presence context; with the CSS driver this is inert (cascade owns
        // exit). Only forwarded when set so the conditional spread stays cheap.
        ...(exitStyle !== undefined ? { exitStyle } : {}),
      },
      children,
    );
  }

  // Exit-only imperative path: a Box with `exitStyle` but no `enterStyle`, under
  // a driver that drives exit imperatively (WAAPI `needsRef`). The CSS driver
  // leaves exit to the cascade, so it never dispatches here and the plain path
  // below stays byte-identical. `getMotionDriver()` is read only when an
  // exitStyle is present (the rare case), so the common path pays nothing.
  if (exitStyle !== undefined && getMotionDriver().needsRef === true) {
    return createElement(
      BoxWithExit,
      {
        as,
        passThrough,
        finalClassName,
        baseStyle: baseStyleWithMotion,
        inlineStyle,
        exitStyle,
      },
      children,
    );
  }

  return createElement(
    as,
    {
      ...passThrough,
      className: finalClassName,
      style: { ...baseStyleWithMotion, ...inlineStyle } as CSSProperties,
    },
    children,
  );
};

/**
 * Wrapper that wires `useLayoutAnimation` into a Box. Box dispatches
 * here whenever `layout` is set, the hook owns the ref it writes the
 * inverse transform through, and we recurse into Box with the layout
 * prop stripped so the inner render runs the normal codepath.
 *
 * Consumer-passed `ref` is composed with the hook's ref so consumers
 * still get a usable handle to the underlying element.
 */
function BoxWithLayout(props: BoxProps) {
  const { layout, layoutTransition, ref: userRef, ...rest } = props;
  const kind: LayoutAnimationKind =
    layout === true || layout === undefined ? 'all' : (layout as LayoutAnimationKind);
  const { ref: layoutRef } = useLayoutAnimation<HTMLElement>({ kind, ...layoutTransition });

  const composedRef = (node: HTMLElement | null): void => {
    layoutRef.current = node;
    if (typeof userRef === 'function') userRef(node);
    else if (userRef !== null && userRef !== undefined) {
      (userRef as { current: HTMLElement | null }).current = node;
    }
  };

  return <Box {...(rest as BoxProps)} ref={composedRef} />;
}

/**
 * Wrapper that wires `useDrag` into a Box. Pulls the drag props out
 * of the surface, runs the hook with them, and re-enters Box with the
 * pointer handlers spread on top + the x/y motion values bound to the
 * transform shorthand. The drag props get stripped on the inner pass
 * so the dispatch is bounded.
 *
 * `onPointerDown` from `dragProps` composes with any consumer-supplied
 * `onPointerDown` - the drag handler fires first, then the consumer's.
 */
function BoxWithDrag(props: BoxProps) {
  const {
    drag,
    dragConstraints,
    dragElastic,
    dragMomentum,
    dragTransition,
    onDragStart,
    onDrag,
    onDragEnd,
    onPointerDown: consumerPointerDown,
    ...rest
  } = props;

  const axis = drag === 'x' || drag === 'y' ? drag : 'both';
  const { dragProps, x, y } = useDrag({
    axis,
    ...(dragConstraints !== undefined ? { constraints: dragConstraints } : {}),
    ...(dragElastic !== undefined ? { dragElastic } : {}),
    ...(dragMomentum !== undefined ? { dragMomentum } : {}),
    ...(dragTransition !== undefined ? { dragTransition } : {}),
    ...(onDragStart !== undefined ? { onDragStart } : {}),
    ...(onDrag !== undefined ? { onDrag } : {}),
    ...(onDragEnd !== undefined ? { onDragEnd } : {}),
  });

  const composedPointerDown = (event: React.PointerEvent<HTMLElement>): void => {
    dragProps.onPointerDown(event);
    if (typeof consumerPointerDown === 'function') consumerPointerDown(event);
  };

  return (
    <Box
      {...(rest as BoxProps)}
      x={x as never}
      y={y as never}
      onPointerDown={composedPointerDown}
    />
  );
}

function buildSelectorRules(
  states: { readonly [K in PseudoStatePropName]: StateStyleBag | undefined },
  before: PseudoElementStyleBag | undefined,
  after: PseudoElementStyleBag | undefined,
  exit: ExitStyleBag | undefined,
): PseudoRule[] {
  const rules: PseudoRule[] = [];
  // The name list's order is the emit order the compiler's PSEUDO_ORDER mirrors.
  for (const name of PSEUDO_STATE_PROP_NAMES) {
    const bag = states[name];
    if (bag !== undefined) {
      rules.push({
        pseudo: PSEUDO_SELECTOR[name],
        style: resolveStylesToVars(bag as Record<string, unknown>).style,
      });
    }
  }
  if (before !== undefined) {
    rules.push({
      pseudo: PSEUDO_ELEMENT_SELECTOR._before,
      style: resolvePseudoElementBag(before),
    });
  }
  if (after !== undefined) {
    rules.push({
      pseudo: PSEUDO_ELEMENT_SELECTOR._after,
      style: resolvePseudoElementBag(after),
    });
  }
  if (exit !== undefined) {
    // `exitStyle` may carry its own `transition`, setting the exit-phase
    // timing independently of the base `transition` (which drives enter and
    // ordinary prop changes) - this is what makes enter/exit asymmetric.
    // `resolveStylesToVars` drops `transition`, so pull it out and resolve it
    // into the exit rule explicitly. The base `transition` is then lifted to a
    // class (see `liftPseudoOverriddenBaseProps`), so this attribute-qualified
    // rule wins the cascade for the exiting state.
    const { transition: exitTransition, ...exitRest } = exit;
    const style = resolveStylesToVars(exitRest as Record<string, unknown>).style;
    if (exitTransition !== undefined) {
      const resolved = resolveTransitionToVars(exitTransition);
      if (resolved !== undefined) style.transition = resolved;
    }
    rules.push({ pseudo: EXIT_SELECTOR, style });
  }
  return rules;
}

/**
 * Apply `transition` / `animation` to the base style. `transition`
 * wins when both are set. The string form of `animation` continues to
 * emit as CSS `transition` (M-1 surface, theme token reference); the
 * object form emits as CSS `animation` shorthand (M-2 surface).
 */
function applyMotion(
  baseStyle: Record<string, string | number>,
  transition: TransitionValue | undefined,
  animation: AnimationValue | undefined,
  animateOnly: readonly string[] | undefined,
): Record<string, string | number> {
  if (transition !== undefined) {
    const v = resolveTransitionToVars(transition);
    return v === undefined ? baseStyle : { ...baseStyle, transition: v };
  }
  if (animation === undefined) return baseStyle;
  if (typeof animation === 'string') {
    const v = buildAnimationCss(animation, animateOnly);
    return v === undefined ? baseStyle : { ...baseStyle, transition: v };
  }
  return { ...baseStyle, animation: buildAnimationShorthand(animation) };
}

function hasAnyStyleProp(rest: Record<string, unknown>): boolean {
  for (const key in rest) {
    if (STYLE_PROP_NAMES.has(key)) return true;
  }
  return false;
}

// Re-export for the conformance harness - useful in tests that pre-
// resolve a transition value without rendering Box.
export { resolveTransitionToVars };
export type { TransitionValue };
