import * as t from '@babel/types';
import {
  isMotionProp,
  isStyleProp,
  PSEUDO_ELEMENT_SELECTOR,
  PSEUDO_SELECTOR,
  type MotionPropName,
} from '@usemotif/core';
import { evaluateLiteral, type ScopeLike } from './literal.js';
import type { PrimitiveInfo } from './primitives.js';
import type {
  CallSiteAnalysis,
  MotionPropAnalysis,
  PropAnalysis,
  PseudoStateAnalysis,
} from './types.js';

/**
 * Pressable pseudo-state prop names → CSS pseudo selectors. Imported from
 * core (the single source of truth) rather than re-declared, so the compiler
 * and runtime can never drift - every selector member is `&`-scoped and
 * `buildPseudoCss` replaces `&` with the generated class selector.
 */
const PSEUDO_STATE_PROPS: Readonly<Record<string, string>> = {
  ...PSEUDO_SELECTOR,
  // `_before` / `_after` ride the same path; their `::before` / `::after`
  // selectors are the ones the runtime keys its rules by.
  ...PSEUDO_ELEMENT_SELECTOR,
};

/**
 * Classify a JSX opening element's attributes for static extraction.
 *
 * Walks the attribute list, separates style props from pass-through, and
 * runs each style-prop value through {@link evaluateLiteral} to decide if
 * it's compile-time resolvable.
 *
 * The classification rule is simple:
 * - any spread → `dynamic` (unknown shape, runtime keeps everything).
 * - any dynamic style prop alongside any static style prop → `partial-static`.
 * - all style props static → `static`.
 * - no style props at all → `static` (a no-op extraction; caller skips).
 *
 * When `primitive` is supplied, the analyzer also:
 *  - rewrites alias attributes (Stack's `direction` → `flexDirection`),
 *  - synthesizes the primitive's default style props (`display: 'flex'`,
 *    Stack's default `flexDirection: 'column'`), unless the user passed
 *    them already.
 *
 * Synthesized props carry `sourceName: null` so callers know there's no
 * source attribute to drop.
 */
export function classifyJsxAttributes(
  attributes: readonly (t.JSXAttribute | t.JSXSpreadAttribute)[],
  scope?: ScopeLike,
  primitive?: PrimitiveInfo,
): CallSiteAnalysis {
  const staticProps: Array<PropAnalysis & { isStatic: true }> = [];
  const dynamicProps: Array<PropAnalysis & { isStatic: false }> = [];
  const passThrough: PropAnalysis[] = [];
  const pseudoStateProps: PseudoStateAnalysis[] = [];
  const motionProps: MotionPropAnalysis[] = [];
  const seenStyleNames = new Set<string>();
  let hasSpread = false;

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      hasSpread = true;
      continue;
    }

    const nameNode = attr.name;
    let name: string;
    if (t.isJSXIdentifier(nameNode)) {
      name = nameNode.name;
    } else if (t.isJSXNamespacedName(nameNode)) {
      // `xml:lang` etc. - never a style prop. Skip.
      passThrough.push({
        name: `${nameNode.namespace.name}:${nameNode.name.name}`,
        isStatic: true,
      });
      continue;
    } else {
      continue;
    }

    // Pressable pseudo-state bag: `_hover={{ opacity: 0.8 }}`. Extracted
    // when the value resolves to a literal object; otherwise the prop
    // joins `dynamicProps` so the classifier flips to partial-static /
    // dynamic and the wrapper stays in place.
    const pseudo = PSEUDO_STATE_PROPS[name];
    if (pseudo !== undefined) {
      const value = attr.value;
      let extracted: Record<string, unknown> | null = null;
      if (value !== null && t.isJSXExpressionContainer(value)) {
        const expr = value.expression;
        if (!t.isJSXEmptyExpression(expr)) {
          const lit = evaluateLiteral(expr, scope);
          if (
            lit.ok &&
            typeof lit.value === 'object' &&
            lit.value !== null &&
            !Array.isArray(lit.value)
          ) {
            extracted = lit.value as Record<string, unknown>;
          }
        }
      }
      if (extracted !== null) {
        pseudoStateProps.push({ name, pseudo, style: extracted });
      } else {
        dynamicProps.push({ name, isStatic: false, handle: attr, sourceName: name });
      }
      continue;
    }

    // Motion-prop bag: `transition`, `enterStyle`, `exitStyle`,
    // `animation`, `animateOnly`. Literal-arg shapes go into
    // `motionProps` so the per-renderer extractor can decide what to
    // consume; dynamic shapes fall into `dynamicProps` and force the
    // classification to partial-static / dynamic, just like literal
    // vs dynamic style props.
    if (isMotionProp(name)) {
      const literal = evaluateMotionLiteral(name, attr.value, scope);
      if (literal.ok) {
        motionProps.push({ name: name as MotionPropName, value: literal.value });
      } else {
        dynamicProps.push({ name, isStatic: false, handle: attr, sourceName: name });
      }
      continue;
    }

    // Alias resolution: Stack's `direction` → `flexDirection`. The
    // aliased attribute is still classified as a style prop, but its
    // canonical name is the alias target.
    const alias = primitive?.aliasedStyleProps[name];
    const canonicalName = alias?.mapsTo ?? name;
    const isAliased = alias !== undefined;

    if (!isAliased && !isStyleProp(canonicalName)) {
      passThrough.push({ name, isStatic: true });
      continue;
    }

    const value = attr.value;
    if (value === null || value === undefined) {
      // Boolean attribute - `<Box prop />`. Style props don't have a
      // boolean form; treat as dynamic for safety.
      dynamicProps.push({ name: canonicalName, isStatic: false, handle: attr, sourceName: name });
      seenStyleNames.add(canonicalName);
      continue;
    }
    if (t.isStringLiteral(value)) {
      staticProps.push({
        name: canonicalName,
        isStatic: true,
        value: value.value,
        sourceName: name,
      });
      seenStyleNames.add(canonicalName);
      continue;
    }
    if (t.isJSXExpressionContainer(value)) {
      const expr = value.expression;
      if (t.isJSXEmptyExpression(expr)) continue;
      const lit = evaluateLiteral(expr, scope);
      if (lit.ok) {
        staticProps.push({
          name: canonicalName,
          isStatic: true,
          value: lit.value,
          sourceName: name,
        });
      } else {
        dynamicProps.push({ name: canonicalName, isStatic: false, handle: attr, sourceName: name });
      }
      seenStyleNames.add(canonicalName);
      continue;
    }

    // JSXElement / JSXFragment values aren't valid for style props.
    dynamicProps.push({ name: canonicalName, isStatic: false, handle: attr, sourceName: name });
    seenStyleNames.add(canonicalName);
  }

  // Primitive-driven synthesis: fill in defaults the wrapper would have
  // applied at runtime. Skipped for any name the user explicitly set.
  if (primitive !== undefined) {
    for (const aliasName in primitive.aliasedStyleProps) {
      const info = primitive.aliasedStyleProps[aliasName]!;
      if (seenStyleNames.has(info.mapsTo)) continue;
      if (info.defaultValue !== undefined) {
        staticProps.push({
          name: info.mapsTo,
          isStatic: true,
          value: info.defaultValue,
          sourceName: null,
        });
        seenStyleNames.add(info.mapsTo);
      }
    }
    for (const synthName in primitive.synthesizedStyleProps) {
      if (seenStyleNames.has(synthName)) continue;
      staticProps.push({
        name: synthName,
        isStatic: true,
        value: primitive.synthesizedStyleProps[synthName]!,
        sourceName: null,
      });
      seenStyleNames.add(synthName);
    }
  }

  let classification: CallSiteAnalysis['classification'];
  const hasAnyStatic =
    staticProps.length > 0 || pseudoStateProps.length > 0 || motionProps.length > 0;
  if (hasSpread) {
    classification = 'dynamic';
  } else if (!hasAnyStatic) {
    classification = dynamicProps.length === 0 ? 'static' : 'dynamic';
  } else {
    classification = dynamicProps.length === 0 ? 'static' : 'partial-static';
  }

  return {
    classification,
    staticProps,
    dynamicProps,
    passThrough,
    pseudoStateProps,
    motionProps,
    hasSpread,
  };
}

/**
 * Evaluate a motion-prop attribute value to its literal shape. The valid
 * literal shapes vary by prop:
 *
 * - `transition` - a string (`'opacity 200ms ease'`), a single object
 *   literal (`{ property, duration, easing, delay }`), or an array of
 *   such objects.
 * - `enterStyle` / `exitStyle` - a flat object literal.
 * - `animation` - a string preset name.
 * - `animateOnly` - an array of property-name strings.
 *
 * String-literal JSX attributes (no braces) are accepted for the
 * string-shaped props (`transition`, `animation`).
 *
 * Anything else returns `{ ok: false }` so the caller routes the prop to
 * `dynamicProps`.
 */
function evaluateMotionLiteral(
  name: string,
  value: t.JSXAttribute['value'],
  scope: ScopeLike | undefined,
): { ok: true; value: unknown } | { ok: false } {
  if (value === null || value === undefined) return { ok: false };
  if (t.isStringLiteral(value)) {
    if (name === 'transition' || name === 'animation') {
      return { ok: true, value: value.value };
    }
    return { ok: false };
  }
  if (!t.isJSXExpressionContainer(value)) return { ok: false };
  const expr = value.expression;
  if (t.isJSXEmptyExpression(expr)) return { ok: false };
  const lit = evaluateLiteral(expr, scope);
  if (!lit.ok) return { ok: false };

  if (name === 'transition') {
    if (typeof lit.value === 'string') return { ok: true, value: lit.value };
    if (Array.isArray(lit.value)) return { ok: true, value: lit.value };
    if (typeof lit.value === 'object' && lit.value !== null) {
      return { ok: true, value: lit.value };
    }
    return { ok: false };
  }
  if (name === 'enterStyle' || name === 'exitStyle') {
    if (typeof lit.value === 'object' && lit.value !== null && !Array.isArray(lit.value)) {
      return { ok: true, value: lit.value };
    }
    return { ok: false };
  }
  if (name === 'animation') {
    if (typeof lit.value === 'string') return { ok: true, value: lit.value };
    return { ok: false };
  }
  if (name === 'animateOnly') {
    if (Array.isArray(lit.value) && lit.value.every((v) => typeof v === 'string')) {
      return { ok: true, value: lit.value };
    }
    return { ok: false };
  }
  return { ok: false };
}
