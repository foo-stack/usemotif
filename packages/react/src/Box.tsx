import {
  type MotifComponent,
  resolveTransitionToVars,
  type BreakpointName,
  type LayoutTransition,
  type MotionStyleProps,
  type MotionValueWideningOf,
  type PseudoElementStyleProps,
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
import { createElement, useContext } from 'react';
import { BoxWithEnter } from './_box-enter.js';
import { BoxWithExit } from './_box-exit.js';
import { getMotionDriver } from './_animation/index.js';
import { BoxWithMotionValues } from './_box-motion-values.js';
import { useLayoutAnimation, type LayoutAnimationKind } from './use-layout-animation.js';
import { useDrag, type DragConstraints, type DragInfo, type DragSpringConfig } from './use-drag.js';
import { useActiveCollector } from './collector-context.js';
import { useCssLayer } from './css-layer-context.js';
import { resolveBox } from './_box-render.js';
import { ViewTransitionNames } from './_view-transition.js';

/** Selector suffix used to opt into `exitStyle` from a parent boundary. */

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
     * Shared layout identity. When a Box with this id unmounts and another with the same id
     * mounts in the same commit, the new one animates from the old one's position and size,
     * for an underline that moves between tabs or a card that expands into a panel. Implies
     * `layout`.
     *
     * @example
     * ```tsx
     * {tabs.map((tab) => (
     *   <Box key={tab}>
     *     {tab}
     *     {tab === active ? <Box layoutId="underline" height={2} bg="$colors.accent.fg" /> : null}
     *   </Box>
     * ))}
     * ```
     */
    layoutId?: string;
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
     * Mark this Box as a group, so descendants can style themselves by its
     * state with `_groupHover`, `_groupFocus`, and `_groupActive`.
     *
     * @example
     * ```tsx
     * <Box group>
     *   <Text _groupHover={{ color: '$colors.action.primary.bg' }}>Read more</Text>
     * </Box>
     * ```
     */
    group?: boolean;
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
  if ((props.layout !== undefined && props.layout !== false) || props.layoutId !== undefined) {
    return createElement(BoxWithLayout, props);
  }

  // Drag dispatch - same pattern as `layout`. The wrapper runs
  // `useDrag`, spreads the resulting handlers onto the inner Box, and
  // binds the x/y motion values to the transform shorthand. The drag
  // props get stripped on the inner pass so there's no recursion.
  if (props.drag !== undefined && props.drag !== false) {
    return createElement(BoxWithDrag, props);
  }

  const resolved = resolveBox(props, activeCollector, cssLayer);
  if (resolved.kind === 'plain') return createElement(resolved.as, resolved.props, props.children);
  const {
    as,
    passThrough,
    finalClassName,
    baseStyle: baseStyleWithMotion,
    inlineStyle,
    motionBindings,
    enterStyle,
    exitStyle,
  } = resolved;
  const { children } = props;

  // Motion-value path subsumes the entry-animation path: when both
  // are set, `BoxWithMotionValues` runs the enter overlay first and
  // activates MV subscriptions only after the overlay has settled, so
  // there's no race between React-managed enter writes and imperative
  // MV writes on the same `style` slot.
  if (motionBindings.length > 0) {
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
  const { layout, layoutId, layoutTransition, ref: userRef, ...rest } = props;
  const kind: LayoutAnimationKind =
    layout === true || layout === undefined || layout === false
      ? 'all'
      : (layout as LayoutAnimationKind);
  const { ref: layoutRef } = useLayoutAnimation<HTMLElement>({
    kind,
    ...layoutTransition,
    ...(layoutId !== undefined ? { layoutId } : {}),
  });
  // Inside a view-transition Presence the browser morphs boxes that share a name.
  const named = useContext(ViewTransitionNames) && layoutId !== undefined;

  const composedRef = (node: HTMLElement | null): void => {
    layoutRef.current = node;
    if (typeof userRef === 'function') userRef(node);
    else if (userRef !== null && userRef !== undefined) {
      (userRef as { current: HTMLElement | null }).current = node;
    }
  };

  return (
    <Box
      {...(rest as BoxProps)}
      {...(named
        ? {
            style: {
              ...rest.style,
              viewTransitionName: `motif-${layoutId.replace(/[^\w-]/g, '_')}`,
            },
          }
        : {})}
      ref={composedRef}
    />
  );
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

// Re-export for the conformance harness - useful in tests that pre-
// resolve a transition value without rendering Box.
export { resolveTransitionToVars };
export type { TransitionValue };
