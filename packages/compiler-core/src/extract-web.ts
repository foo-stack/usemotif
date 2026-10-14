import {
  buildAnimationCss,
  buildAtRulesCss,
  buildPseudoCss,
  hashAtRules,
  hashPseudoRules,
  isMotionProp,
  liftPseudoOverriddenBaseProps,
  resolveResponsiveStylesToVars,
  resolvePseudoElementBag,
  resolveStylesToVars,
  resolveTransitionToVars,
  styleProps,
  type PseudoRule,
  type StylePropDefinition,
  type TransitionValue,
} from '@usemotif/core';
import type { CallSiteAnalysis, ExtractWebOptions, WebExtractionResult } from './types.js';

/**
 * Group CSS properties that can override one another into a single "family"
 * key, collapsing shorthand↔longhand and logical↔physical overlaps
 * (`padding` / `paddingTop` / `paddingInline` / `pl` all → `padding`). Used
 * to decide whether a static prop conflicts with a dynamic one - see
 * {@link conflictsWith}. Anything without a known shorthand relationship maps
 * to itself, so exact-property collisions are still caught.
 */
const SHORTHAND_FAMILY: ReadonlyArray<readonly [RegExp, string]> = [
  [/^padding/, 'padding'],
  [/^margin/, 'margin'],
  [/^(?:inset|top|right|bottom|left)$/, 'inset'],
  [/^inset/, 'inset'],
  [/^(?:gap|rowGap|columnGap)$/, 'gap'],
  [/[Rr]adius$/, 'borderRadius'],
  [/^overflow/, 'overflow'],
  [/^(?:flex|flexGrow|flexShrink|flexBasis)$/, 'flex'],
];

function familyOfCssProperty(cssProp: string): string {
  for (const [re, fam] of SHORTHAND_FAMILY) {
    if (re.test(cssProp)) return fam;
  }
  return cssProp;
}

/**
 * The set of conflict families a style-prop name touches. Transform-axis
 * props (`x`, `scale`, ...) and a literal `transform` all collapse to the
 * single `transform` property they compose into.
 */
function propFamilies(propName: string): ReadonlySet<string> {
  const def = (styleProps as Record<string, StylePropDefinition | undefined>)[propName];
  if (def === undefined) return new Set([propName]);
  if (def.transformAxis !== undefined) return new Set(['transform']);
  const list = Array.isArray(def.cssProperty) ? def.cssProperty : [def.cssProperty];
  const out = new Set<string>();
  for (const c of list) out.add(familyOfCssProperty(c as string));
  return out;
}

function conflictsWith(propName: string, dynamicFamilies: ReadonlySet<string>): boolean {
  if (dynamicFamilies.size === 0) return false;
  for (const f of propFamilies(propName)) {
    if (dynamicFamilies.has(f)) return true;
  }
  return false;
}

function bagConflictsWithDynamic(
  style: Record<string, unknown>,
  dynamicFamilies: ReadonlySet<string>,
): boolean {
  if (dynamicFamilies.size === 0) return false;
  for (const key in style) {
    if (conflictsWith(key, dynamicFamilies)) return true;
  }
  return false;
}

/**
 * Selector suffix used by `<Box>` / `<Pressable>` to expose `exitStyle`
 * to a parent presence-boundary (e.g. `Dialog.Content` toggling
 * `data-motif-state="exiting"`). Mirrors `EXIT_SELECTOR` in
 * `packages/react-web/src/Box.tsx` - kept here as the compiler's
 * single source of truth for the same mapping. No `&` placeholder
 * needed: `buildPseudoCss` prepends the class selector so the emitted
 * rule reads `.<cn>[data-motif-state="exiting"]`.
 */
const EXIT_SELECTOR = '[data-motif-state="exiting"]';

/**
 * Canonical emit order for pseudo rules, keyed by source prop name. The
 * runtime's `buildSelectorRules` always emits in this fixed order
 * (hover → focus → active → disabled → before → after → exit) regardless
 * of attribute order. `hashPseudoRules` and `buildPseudoCss` are
 * order-sensitive, so the compiler must sort into the same order or it
 * produces a different class hash (and a different cascade) than the
 * runtime for the same element - breaking compiled/runtime dedupe.
 */
// Inserting _checked / _selected after _disabled keeps every existing key's
// RELATIVE order, so elements that don't use the new pseudos hash byte-for-byte
// as before (only the relative order among an element's own pseudos matters).
const PSEUDO_ORDER: Readonly<Record<string, number>> = {
  _hover: 0,
  _focus: 1,
  _active: 2,
  _disabled: 3,
  _checked: 4,
  _selected: 5,
  _expanded: 6,
  _before: 7,
  _after: 8,
  exitStyle: 9,
};

/**
 * Compile-time equivalent of the runtime path in `<Box>` and `<Pressable>`:
 * `resolveResponsiveStylesToVars` → split into base style + at-rules,
 * `resolveStylesToVars` → pseudo-state declarations, `hashAtRules` /
 * `hashPseudoRules` → deterministic class names, `buildAtRulesCss` /
 * `buildPseudoCss` → CSS bodies.
 *
 * Because both the runtime and this function go through the exact same
 * `@usemotif/core` resolver, the compiled and runtime-rendered output
 * collide on the same `m-<hash>` classes. Concretely: a page using motif
 * mid-migration where some files are compiled and others aren't still
 * dedupes correctly - the compiler can't disagree with the runtime
 * because they're sharing every byte of the formatting pipeline.
 *
 * Only the static subset of props is fed in; dynamic props stay on the
 * JSX element for the runtime to pick up.
 */
export function extractWeb(
  analysis: CallSiteAnalysis,
  options: ExtractWebOptions = {},
): WebExtractionResult {
  // Must match `<ThemeProvider cssLayer>` exactly. The class name is derived
  // from the layer as well as the declarations, so a mismatch means compiled
  // and runtime rules hash differently and stop deduplicating - the same
  // build-time/runtime agreement `breakpoints` already requires.
  const layer = options.cssLayer;
  if (analysis.classification === 'dynamic') {
    return { inlineStyle: {}, className: undefined, css: '', consumedProps: [] };
  }
  if (
    analysis.staticProps.length === 0 &&
    analysis.pseudoStateProps.length === 0 &&
    analysis.motionProps.length === 0
  ) {
    return { inlineStyle: {}, className: undefined, css: '', consumedProps: [] };
  }

  // Families of CSS properties touched by *dynamic* style props. A static
  // prop (or a pseudo bag) that shares a family with a dynamic prop must NOT
  // be hoisted into the inline `style` slot: the runtime merges
  // `{ ...baseStyle, ...style }`, so a hoisted static value would always beat
  // a dynamic one regardless of source order - inverting the cascade
  // (`<Box padding={4} pt={x} />` would silently drop `pt`). Such props are
  // left on the JSX element for the runtime to resolve in attribute order.
  const dynamicFamilies = new Set<string>();
  for (const dp of analysis.dynamicProps) {
    if (isMotionProp(dp.name)) continue;
    for (const f of propFamilies(dp.name)) dynamicFamilies.add(f);
  }
  // If any motion prop is dynamic, leave *all* motion props at runtime: the
  // static/dynamic precedence between sibling motion props (`transition` vs
  // `animation`) and the `animateOnly` modifier can't be resolved correctly
  // once split across the inline slot and the runtime resolver.
  const hasDynamicMotion = analysis.dynamicProps.some((dp) => isMotionProp(dp.name));

  const propsBag: Record<string, unknown> = {};
  const consumed: string[] = [];
  for (const p of analysis.staticProps) {
    // Conflicts with a dynamic prop's family → keep on the JSX (don't consume).
    if (conflictsWith(p.name, dynamicFamilies)) continue;
    propsBag[p.name] = p.value;
    // Skip synthesized props (sourceName === null) - they have no source
    // attribute to drop. For aliased props we record the original source
    // name so the babel rewriter strips `direction` rather than the
    // canonical `flexDirection`.
    if (p.sourceName === null) continue;
    consumed.push(p.sourceName ?? p.name);
  }

  // Under a layer, base props have to be emitted as a class rather than
  // inline, exactly as the runtime does - inline styles cannot belong to a
  // cascade layer.
  const { baseStyle, atRules } = resolveResponsiveStylesToVars(propsBag, {
    baseAsClass: layer !== undefined,
  });

  // Collect pseudo rules with their canonical rank, then sort - the
  // compiler sees props in attribute order but the runtime emits in a
  // fixed order, and the hash/CSS are order-sensitive (see PSEUDO_ORDER).
  const rankedPseudo: { rank: number; rule: PseudoRule }[] = [];
  for (const ps of analysis.pseudoStateProps) {
    // A pseudo bag that overrides a property held by a dynamic base prop
    // (`opacity={o} _hover={{ opacity: 1 }}`) must stay at runtime: the
    // compiler can only lift *static* base props into the class block, so a
    // dynamic base prop would land inline and out-specificity the compiled
    // `:hover` rule. The runtime performs the lift itself when the bag is
    // present on the element.
    if (bagConflictsWithDynamic(ps.style, dynamicFamilies)) continue;
    // Pseudo-element bags carry `content` (defaulted when absent) the way the
    // runtime resolves them, so the rule hashes identically.
    const style = ps.pseudo.startsWith('::')
      ? resolvePseudoElementBag(ps.style)
      : resolveStylesToVars(ps.style).style;
    rankedPseudo.push({ rank: PSEUDO_ORDER[ps.name] ?? 50, rule: { pseudo: ps.pseudo, style } });
    consumed.push(ps.name);
  }

  // Motion props share the same byte-identical pipeline the runtime uses
  // (`resolveTransitionToVars` for `transition`, `buildAnimationCss` for
  // `animation`). `transition` wins over `animation` when both literal -
  // mirrors the runtime precedence in `Box.tsx`. `enterStyle` is left at
  // runtime: it's a first-paint overlay that needs React state to flip.
  let transitionValue: string | undefined;
  let animationName: string | undefined;
  let animateOnly: readonly string[] | undefined;
  for (const m of analysis.motionProps) {
    if (hasDynamicMotion) break; // a sibling motion prop is dynamic - leave all at runtime
    if (m.name === 'transition') {
      transitionValue = resolveTransitionToVars(m.value as TransitionValue);
      consumed.push('transition');
    } else if (m.name === 'animation') {
      animationName = m.value as string;
      consumed.push('animation');
    } else if (m.name === 'animateOnly') {
      animateOnly = m.value as readonly string[];
      consumed.push('animateOnly');
    } else if (m.name === 'exitStyle') {
      const { style } = resolveStylesToVars(m.value as Record<string, unknown>);
      rankedPseudo.push({ rank: PSEUDO_ORDER.exitStyle!, rule: { pseudo: EXIT_SELECTOR, style } });
      consumed.push('exitStyle');
    }
    // `enterStyle` deliberately not listed: it has no compile-time CSS
    // representation - the runtime owns the overlay-then-flip lifecycle.
  }
  if (transitionValue === undefined && animationName !== undefined) {
    transitionValue = buildAnimationCss(animationName, animateOnly);
  }

  // Materialise the pseudo rules in the runtime's canonical order. Array
  // sort is stable, so any equal-rank entries keep their source order.
  const pseudoRules: PseudoRule[] = rankedPseudo.sort((a, b) => a.rank - b.rank).map((r) => r.rule);

  // Lift any base prop that a state-pseudo bag also overrides out of the
  // inline style and into the base class block - the same step the runtime
  // (`Box.tsx`) performs. Without it, inline style (specificity 1,0,0,0)
  // would clobber the pseudo class rule (0,1,1), so e.g.
  // `_disabled={{ boxShadow: 'none' }}` over a base `boxShadow` would never
  // win, AND the emitted at-rule hash would differ from the runtime's
  // (which includes the lifted prop), breaking compiled/runtime dedupe.
  // Guard on pseudoRules to mirror the runtime's `selectorRules !== undefined`.
  let effectiveBase = baseStyle;
  let effectiveAtRules = atRules;
  if (pseudoRules.length > 0) {
    const lifted = liftPseudoOverriddenBaseProps(baseStyle, pseudoRules, atRules);
    effectiveBase = lifted.inlineBase;
    effectiveAtRules = lifted.atRules;
  }

  const inlineStyle =
    transitionValue === undefined
      ? effectiveBase
      : { ...effectiveBase, transition: transitionValue };

  const classNames: string[] = [];
  const cssChunks: string[] = [];
  if (effectiveAtRules.length > 0) {
    const cn = hashAtRules(effectiveAtRules, layer);
    classNames.push(cn);
    cssChunks.push(buildAtRulesCss(cn, effectiveAtRules, layer));
  }
  if (pseudoRules.length > 0) {
    const cn = hashPseudoRules(pseudoRules, layer);
    classNames.push(cn);
    cssChunks.push(buildPseudoCss(cn, pseudoRules, layer));
  }

  return {
    inlineStyle,
    className: classNames.length > 0 ? classNames.join(' ') : undefined,
    css: cssChunks.join('\n'),
    consumedProps: consumed,
  };
}
