import {
  GROUP_ATTRIBUTE,
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
  resolveStateRules,
  resolveStylesToVars,
  resolveTransitionToVars,
  type AnimationValue,
  type ExitStyleBag,
  type MotionStyleBag,
  type PseudoElementStyleBag,
  type PseudoStatePropName,
  type StateStyleBag,
  type TransitionValue,
} from '@usemotif/core';
import type { CSSProperties, ElementType } from 'react';
import type { BoxProps } from './Box.js';
import {
  warnIfFlexPropsWithoutFlexDisplay,
  warnIfFocusOnNonTabbable,
  warnIfMotionWithoutTransition,
} from './_dev-warnings.js';
import { splitMotionValueProps, type MotionBinding } from './_motion-bindings.js';
import {
  injectAtRules,
  injectKeyframes,
  injectPseudoRules,
  type PseudoRule,
  type SSRStyleCollector,
} from './style-cache.js';

const EXIT_SELECTOR = '[data-motif-state="exiting"]';

/** What a Box renders, before any wrapper that needs hooks. */
export type ResolvedBox =
  | { readonly kind: 'plain'; readonly as: ElementType; readonly props: Record<string, unknown> }
  | {
      readonly kind: 'styled';
      readonly as: ElementType;
      readonly passThrough: Record<string, unknown>;
      readonly finalClassName: string | undefined;
      readonly baseStyle: Record<string, string | number>;
      readonly inlineStyle: CSSProperties | undefined;
      readonly motionBindings: readonly MotionBinding[];
      readonly enterStyle: MotionStyleBag | undefined;
      readonly exitStyle: ExitStyleBag | undefined;
    };

/**
 * Resolve a Box's props to its element, class names and inline style, emitting its CSS through
 * the given collector (or the style cache when there is none). Hook-free and context-free, so
 * the client `Box` and the Server Component `Box` share it; `layout` and `drag` are dispatched
 * before this runs.
 */
export function resolveBox(
  props: BoxProps,
  collector: SSRStyleCollector | null,
  cssLayer: string | undefined,
): ResolvedBox {
  const {
    as = 'div',
    className: userClassName,
    style: inlineStyle,
    children: _children,
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
    _groupHover,
    _groupFocus,
    _groupActive,
    group,
    _before,
    _after,
    enterStyle,
    exitStyle,
    transition,
    animation,
    animateOnly,
    layout: _layout,
    layoutId: _layoutId,
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
    _groupHover !== undefined ||
    _groupFocus !== undefined ||
    _groupActive !== undefined ||
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
  // Before the fast path, which a bare `<Box group>` takes. `rest` is this
  // render's own object, so writing to it is safe; non-style keys pass through.
  if (group === true) restWithoutMv[GROUP_ATTRIBUTE] = '';

  // Compiled-output fast path: when the build tool's motif plugin has
  // already extracted every style prop, `rest` carries no style props and
  // no pseudo-state / motion bags are present. The resolver / class-
  // injection round-trip is pure overhead in that case. Cheap
  // O(rest.keys) early return keeps the wrapper's runtime cost close to
  // a plain `createElement`. Motion-value bindings disqualify the fast
  // path because they need the ref + subscription effect in
  // `BoxWithMotionValues`.
  if (!hasPseudo && !hasMotion && !hasMotionValues && !hasAnyStyleProp(restWithoutMv)) {
    return {
      kind: 'plain',
      as,
      props: {
        ...restWithoutMv,
        ...(userClassName !== undefined && userClassName !== ''
          ? { className: userClassName }
          : {}),
        ...(inlineStyle !== undefined ? { style: inlineStyle } : {}),
      },
    };
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
            _groupHover,
            _groupFocus,
            _groupActive,
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
    injectKeyframes(animationKeyframe.name, animationKeyframe.css, collector, cssLayer);
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

  const responsiveClass = injectAtRules(liftedAtRules, collector, cssLayer);
  const pseudoClass =
    selectorRules === undefined ? undefined : injectPseudoRules(selectorRules, collector, cssLayer);
  const finalClassName =
    [responsiveClass, pseudoClass, userClassName].filter(Boolean).join(' ') || undefined;

  return {
    kind: 'styled',
    as,
    passThrough,
    finalClassName,
    baseStyle: baseStyleWithMotion,
    inlineStyle,
    motionBindings,
    enterStyle,
    exitStyle,
  };
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
      rules.push(...resolveStateRules(PSEUDO_SELECTOR[name], bag as Record<string, unknown>));
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
