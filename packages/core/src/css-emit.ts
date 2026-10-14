import type { AtRule } from './style.js';
import type { ResolvedStyle } from './types.js';

/**
 * Shared CSS-emission helpers used by both the web runtime
 * (`@usemotif/react`) and the compiler (`@usemotif/compiler-core`).
 *
 * The compiler must emit byte-identical class names and CSS bodies to the
 * runtime so that runtime-rendered and compile-extracted output collide
 * (deduplicate) on the same class. Keeping the helpers here is the
 * single-source-of-truth that prevents drift.
 */

// Mirrors React's `isUnitlessNumber` set (react-dom's CSSProperty table) so a
// bare number on these props is emitted without a `px` suffix - matching what
// the runtime's `style={...}` inline path produces. Any drift here breaks the
// runtime/compiler byte-identical invariant (the hashed class names diverge,
// so runtime- and compile-extracted rules stop deduplicating).
const UNITLESS_PROPS: ReadonlySet<string> = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
]);

/**
 * Tiny, fast, deterministic string hash. ~53 bits of entropy, base-36
 * encoded - the cyrb53 construction (two independent 32-bit mixing lanes
 * combined into a 53-bit result, the largest exact integer a JS number
 * holds). Used to generate stable class / keyframe names from the
 * serialised representation of a rule set. Not cryptographic.
 *
 * 53 bits raises the birthday-collision threshold from ~2^16 (≈77k) distinct
 * rule sets to ~2^26.5 (≈95M), so distinct serialisations effectively never
 * collide onto the same `m-...` name (where the second registrant would
 * silently win and mis-style). The serialisation itself is injective; this
 * just removes the hash as a practical collision source.
 */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  // 53-bit unsigned result: (h2 & 0x1fffff) * 2^32 + (h1 >>> 0).
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(36);
}

export function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Neutralise the characters in a CSS declaration value that could break
 * out of the surrounding rule (`}` / `;`), open a nested block (`{`), or
 * terminate the enclosing `<style>` element (`<`, the start of `</style>`).
 * They are rewritten as CSS hex escapes (`\HH `), which the CSS parser
 * treats as ordinary value characters - so legitimate values (colors,
 * lengths, `var(...)`, `cubic-bezier(...)`, font lists, `content` strings)
 * come out byte-identical and render the same, while a value smuggled in
 * from untrusted design-token JSON loses its structural meaning instead of
 * injecting arbitrary rules. A bare `>` is left alone - it cannot close a
 * rule or form `</style>` on its own - so `content: ">"` stays intact.
 *
 * Backslash is deliberately left untouched so author-written CSS escapes
 * (e.g. `content: '\2022'`) keep working; an attacker gains nothing from
 * it because the structural characters are themselves already escaped.
 *
 * Shared by the web runtime (`@usemotif/react`) and the compiler
 * (`@usemotif/compiler-core`) so both emit byte-identical CSS - and
 * therefore identical hashed class names.
 */
export function escapeCssValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[{};<\n\r\f\x00]/g, (ch) => `\\${ch.charCodeAt(0).toString(16)} `);
}

/**
 * Neutralise a token-key / animation-name segment that is interpolated into
 * a CSS custom-property *name* (`--scale-key`). The value side of a
 * declaration is guarded by {@link escapeCssValue}; the name side needs the
 * same treatment because token keys and animation names also originate from
 * untrusted/third-party design-token JSON - a key containing `}`, `{`, `;`,
 * `:`, or whitespace would otherwise close the declaration or rule block and
 * inject arbitrary CSS.
 *
 * Characters outside the safe custom-property charset (letters, digits, `_`,
 * `-`) become CSS hex escapes (`\HH `), which the parser treats as ordinary
 * name characters - so a declaration and any `var(--...)` reference built from
 * the same segment still resolve to the same property. A literal `.` is
 * mapped to `_` first to preserve the readable numeric-scale names the
 * runtime has always emitted (`--space-0_5`).
 */
export function escapeCssVarNameSegment(segment: string): string {
  let out = '';
  for (const ch of segment) {
    if (ch === '.') {
      out += '_';
    } else if (/[A-Za-z0-9_-]/.test(ch)) {
      out += ch;
    } else {
      out += `\\${ch.codePointAt(0)!.toString(16)} `;
    }
  }
  return out;
}

/**
 * `padding: 8` → `8px`. Unitless properties (opacity, zIndex, etc.) keep
 * the bare number. Mirrors React's inline-style auto-pixel rule so the
 * runtime's `style={...}` path and the compiler's emitted CSS agree.
 */
export function maybePx(prop: string, n: number): string {
  if (UNITLESS_PROPS.has(prop)) return String(n);
  return `${n}px`;
}

/**
 * Convert a single CSS-shaped object into a declaration string.
 *
 * `padding` becomes `padding`; `paddingLeft` becomes `padding-left`. Number
 * values for length-like properties get a `px` suffix.
 */
export function stringifyDeclarations(style: ResolvedStyle): string {
  const out: string[] = [];
  for (const key in style) {
    const value = style[key];
    if (value === undefined) continue;
    const cssProp = escapeCssValue(camelToKebab(key));
    const cssValue = typeof value === 'number' ? maybePx(key, value) : escapeCssValue(value);
    out.push(`${cssProp}: ${cssValue};`);
  }
  return out.join(' ');
}

/**
 * A class-scoped CSS rule for a pseudo-state (`:hover`, `:focus-visible`,
 * etc.). `&` inside the suffix is replaced with the class selector to
 * support selector lists like `':disabled, &[aria-disabled="true"]'`.
 */
export interface PseudoRule {
  readonly pseudo: string;
  readonly style: ResolvedStyle;
  /** An at-rule the rule nests in, for a state bag with responsive values. */
  readonly at?: string;
}

/**
 * Build the CSS body for a list of at-rules under a class name.
 *
 * An entry with `atRule === ''` is the **base class block**: emitted as a
 * bare class selector with no at-rule wrapper. Used by the responsive
 * resolver to keep `base` values at the same specificity as their
 * media/container overrides.
 *
 * @example
 *   buildAtRulesCss('m-abc', [{ atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } }])
 *   // → '@media (min-width: 768px) { .m-abc { padding: var(--space-4); } }'
 */
export function buildAtRulesCss(
  className: string,
  rules: readonly AtRule[],
  layer?: string,
): string {
  return wrapInLayer(
    rules
      .map((r) =>
        r.atRule === ''
          ? `.${className} { ${stringifyDeclarations(r.style)} }`
          : `${r.atRule} { .${className} { ${stringifyDeclarations(r.style)} } }`,
      )
      .join('\n'),
    layer,
  );
}

/**
 * A CSS cascade-layer name: an identifier, optionally dot-separated for
 * sub-layers (`motif`, `motif.base`). Anything else is rejected rather than
 * escaped - a layer name is a structural identifier chosen by the app author,
 * not a value, and silently mangling it would produce a layer nothing can
 * order against.
 */
const LAYER_NAME = /^[A-Za-z_-][\w-]*(\.[A-Za-z_-][\w-]*)*$/;

/**
 * Wrap emitted CSS in `@layer <name> { ... }`, or return it unchanged when no
 * layer is configured.
 *
 * Layers decide precedence independently of specificity and source order,
 * which is the only way a host stylesheet can be given priority over Motif's
 * own rules - source order can't do it, because runtime-injected rules land
 * in `document.head` after the bundled stylesheet, and code splitting makes
 * the order between injected chunks unstable.
 *
 * A single layer is deliberate: inside it, specificity and source order still
 * apply exactly as they do unlayered, so every existing base → responsive →
 * pseudo relationship is preserved. Splitting those tiers across sub-layers
 * would make specificity irrelevant *between* the tiers and break them.
 */
export function wrapInLayer(css: string, layer?: string): string {
  if (layer === undefined || layer === '') return css;
  if (!LAYER_NAME.test(layer)) {
    throw new Error(`motif: invalid CSS layer name ${JSON.stringify(layer)}`);
  }
  if (css === '') return css;
  return `@layer ${layer} { ${css} }`;
}

/**
 * Build the CSS body for a list of pseudo-state rules under a class name.
 *
 * @example
 *   buildPseudoCss('m-abc', [{ pseudo: ':hover', style: { opacity: 0.8 } }])
 *   // → '.m-abc:hover { opacity: 0.8; }'
 */
export function buildPseudoCss(
  className: string,
  rules: readonly PseudoRule[],
  layer?: string,
): string {
  return wrapInLayer(
    rules
      .map((r) => {
        const rule = `${scopePseudoSelector(r.pseudo, className)} { ${stringifyDeclarations(r.style)} }`;
        return r.at === undefined ? rule : `${r.at} { ${rule} }`;
      })
      .join('\n'),
    layer,
  );
}

/**
 * Scope a (possibly comma-separated) pseudo selector to a class. Each member
 * containing `&` has the `&` replaced by the class selector; a member with no
 * `&` is prefixed with the class. The previous implementation only handled
 * `&` at the whole-string level, so a selector list like
 * `:disabled, &[aria-disabled="true"]` left the bare `:disabled` member
 * page-global - one such rule styled every disabled element in the app.
 *
 * Splitting is depth-aware so commas inside `:not(...)` or an attribute value
 * (`[x="a,b"]`) don't split a member.
 */
function scopePseudoSelector(pseudo: string, className: string): string {
  const members: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of pseudo) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      members.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  members.push(current);
  return members
    .map((m) => {
      const trimmed = m.trim();
      return trimmed.includes('&')
        ? trimmed.replace(/&/g, `.${className}`)
        : `.${className}${trimmed}`;
    })
    .join(', ');
}

/**
 * Hash a list of at-rules into a deterministic class name (`m-<hash>`).
 * Serialisation order is preserved (the resolver guarantees stable
 * media → anon-container → named-container ordering).
 */
export function hashAtRules(rules: readonly AtRule[], layer?: string): string {
  // JSON-encode the [selector, declarations] pairs rather than joining on
  // `|` / `||`. Those delimiters are legal inside CSS values (font-family
  // lists, grid-template-areas, custom-property fallbacks, container/
  // selector text), so the old join was not injective - two different
  // rule sets could serialise to the same string and collide on one class.
  // JSON escaping makes the serialisation a bijection.
  const serialised = JSON.stringify(rules.map((r) => [r.atRule, stringifyDeclarations(r.style)]));
  return `m-${hashString(withLayer(serialised, layer))}`;
}

/** Hash a list of pseudo rules into a deterministic class name. */
export function hashPseudoRules(rules: readonly PseudoRule[], layer?: string): string {
  // The at-rule joins the entry only when present, so flat rules hash as before.
  const serialised = JSON.stringify(
    rules.map((r) =>
      r.at === undefined
        ? [r.pseudo, stringifyDeclarations(r.style)]
        : [r.pseudo, stringifyDeclarations(r.style), r.at],
    ),
  );
  return `m-${hashString(withLayer(serialised, layer))}`;
}

/**
 * Fold the layer name into the hash input.
 *
 * Two scopes with the same declarations but different layers must not collapse
 * to one class: the style cache dedupes by class name, so the second scope's
 * differently-layered rule would never be emitted. Appending nothing when
 * there is no layer keeps every existing class name byte-identical.
 */
function withLayer(serialised: string, layer?: string): string {
  return layer === undefined || layer === '' ? serialised : `${serialised}@${layer}`;
}

/**
 * Restore the cascade for pseudo-state overrides. Without this lift,
 * any base style prop is emitted as inline style (specificity
 * `1,0,0,0`) while pseudo-state rules emit as `.<class>:state`
 * (`0,1,1`) - inline wins, so `_disabled.boxShadow: 'none'` never
 * overrides a base `boxShadow="..."` even though the `:disabled`
 * selector matches.
 *
 * The fix: for any CSS property a state-pseudo bag overrides
 * (`_hover` / `_focus` / `_active` / `_disabled` / `exitStyle`),
 * move the corresponding base value out of inline and into a
 * **base class block** (`.<class> { ... }`, specificity `0,1,0`).
 * The pseudo rule at `0,1,1` then wins the cascade per the spec.
 *
 * Pseudo-element rules (`::before` / `::after`) are NOT lifted - they
 * target a different element from the parent, so even when they
 * declare the same CSS property name (`color`, `background`) they
 * don't compete with the parent's inline style.
 *
 * Shared by the web runtime (`@usemotif/react`) and the compiler
 * (`@usemotif/compiler-core`) so both produce the same inline/class
 * split and therefore the same hashed class names.
 */
export function liftPseudoOverriddenBaseProps(
  baseStyle: Record<string, string | number>,
  selectorRules: readonly PseudoRule[],
  atRules: ReadonlyArray<AtRule>,
): {
  inlineBase: Record<string, string | number>;
  atRules: ReadonlyArray<AtRule>;
} {
  // Collect the union of CSS property keys that any STATE-pseudo bag
  // overrides. Pseudo-element selectors start with `::`; skip them.
  let overrideKeys: Set<string> | null = null;
  for (const rule of selectorRules) {
    if (rule.pseudo.startsWith('::')) continue;
    for (const k in rule.style) {
      (overrideKeys ??= new Set<string>()).add(k);
    }
  }
  if (overrideKeys === null) return { inlineBase: baseStyle, atRules };

  // Split baseStyle into the props that stay inline and the props
  // that must be lifted to a class block.
  let inlineBase: Record<string, string | number> | null = null;
  let liftedBase: Record<string, string | number> | null = null;
  for (const k in baseStyle) {
    if (overrideKeys.has(k)) {
      (liftedBase ??= {})[k] = baseStyle[k]!;
    } else {
      (inlineBase ??= {})[k] = baseStyle[k]!;
    }
  }
  if (liftedBase === null) return { inlineBase: baseStyle, atRules };

  // Merge the lifted props into the existing base class block (the
  // empty-atRule entry from the responsive resolver) if present;
  // otherwise prepend a new one so it sits before media / container
  // overrides in source order - matching the existing convention.
  const baseIdx = atRules.findIndex((r) => r.atRule === '');
  let nextAtRules: AtRule[];
  if (baseIdx >= 0) {
    nextAtRules = atRules.slice();
    nextAtRules[baseIdx] = {
      atRule: '',
      style: { ...atRules[baseIdx]!.style, ...liftedBase },
    };
  } else {
    nextAtRules = [{ atRule: '', style: liftedBase }, ...atRules];
  }

  return {
    inlineBase: inlineBase ?? {},
    atRules: nextAtRules,
  };
}
