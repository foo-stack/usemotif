import {
  PSEUDO_ELEMENT_PROP_NAMES,
  PSEUDO_STATE_PROP_NAMES,
  type MotifComponent,
  type StyleBag,
  resolveResponsiveVariants,
  type BreakpointName,
} from '@usemotif/core';
import { Box, type BoxProps } from './Box.js';
import { useTheme } from './theme-context.js';
import type { ElementType, ReactElement } from 'react';
import { createContext, createElement, useContext } from 'react';
import type { StyledContext, VariantContext } from './styled-context.js';

/**
 * Variants config - each entry is one of:
 *
 * - **Explicit** (`size: { sm: { p: '$2' }, md: { p: '$4' } }`) - a record
 *   keyed by enumerated values. The matching prop accepts only those keys.
 * - **Fallback** (`'...size': (val, ctx) => ({ p: val })`) - a function that
 *   returns a style bag for any incoming value. Use for "any token in this
 *   scale" cases where enumerating each value would be tedious. Fallback
 *   keys are prefixed with `...`; the rest of the key is the prop name. The
 *   optional second argument is a {@link VariantContext} carrying the active
 *   theme/tokens and the component's props, so the function can compute from
 *   raw token values (e.g. `(v, { tokens }) => ({ gap: tokens.space[v] }))`).
 *
 * Both forms can coexist for the same prop name. At runtime the explicit
 * record is checked first; if no key matches and a fallback exists, the
 * fallback function is called with the raw value and the context.
 *
 * A variant's style bag is a full {@link StyleBag}, so it may carry pseudo-
 * states (`_hover` / `_focus` / ...) and motion (`transition` / `enterStyle`)
 * alongside static styles - these resolve through `Box` exactly as the
 * equivalent call-site props would, and they deep-merge across the
 * base → variant → compound → caller layers.
 */
type ExplicitVariant = Record<string, StyleBag>;
type FallbackVariant = (val: never, ctx: VariantContext) => StyleBag;
export type AnyVariants = Record<string, ExplicitVariant | FallbackVariant>;

/**
 * Distill the **explicit** prop names from a variants config - keys that
 * do NOT start with `...`.
 */
type ExplicitNames<V> = string &
  {
    [K in keyof V]: K extends `...${string}` ? never : K;
  }[keyof V];

/** Distill the **fallback** prop names - keys starting with `...`, with the
 * prefix stripped. */
type FallbackNames<V> = string &
  {
    [K in keyof V]: K extends `...${infer N}` ? N : never;
  }[keyof V];

type AllVariantNames<V> = ExplicitNames<V> | FallbackNames<V>;

/** Value union for an explicit variant - the keys of its record (with
 * `'true'` / `'false'` widened to `boolean` for ergonomic boolean variants). */
type ExplicitValue<V, K extends string> = K extends keyof V
  ? V[K] extends ExplicitVariant
    ? keyof V[K] extends 'true' | 'false'
      ? boolean
      : keyof V[K]
    : never
  : never;

/** Value type accepted by the fallback function (its first parameter). The
 * `...rest` slot tolerates the optional `ctx` second parameter - without it,
 * a two-arg fallback `(val, ctx) => ...` would fail to match a one-arg pattern
 * and the inferred value type would collapse to `never`. */
type FallbackValue<V, K extends string> = `...${K}` extends keyof V
  ? V[`...${K}`] extends (val: infer A, ...rest: never[]) => unknown
    ? A
    : never
  : never;

/**
 * Variant prop type derived from a variants config. Each variant name -
 * whether declared with an explicit record, a fallback function, or both -
 * becomes one optional prop whose type is the union of both forms.
 */
type VariantValues<V extends AnyVariants> = {
  [K in AllVariantNames<V>]?: Responsive<ExplicitValue<V, K> | FallbackValue<V, K>>;
};

/**
 * A variant value, or one per breakpoint in the object, array, or string DSL
 * form: `size={{ base: 'sm', md: 'lg' }}`, `size={['sm', null, 'lg']}`, or
 * `size="base:sm md:lg"`.
 */
type Responsive<T> =
  | T
  | ({ base?: T } & { [K in BreakpointName]?: T } & { [K in `@${string}`]?: T })
  | readonly (T | null | undefined)[]
  | `${string}:${string}`;

/**
 * The variant props of a `styled()` component, from its variants config or
 * from the component itself: `VariantProps<typeof Button>`.
 */
export type VariantProps<T> = T extends (...args: never[]) => unknown
  ? T extends { readonly '~variants'?: infer V extends AnyVariants }
    ? VariantValues<V>
    : never
  : T extends AnyVariants
    ? VariantValues<T>
    : never;

/** A `styled()` component. `'~variants'` is type-only, for `VariantProps<typeof X>`. */
export type StyledComponent<V extends AnyVariants> = MotifComponent<
  VariantValues<V> & Omit<BoxProps, keyof VariantValues<V>>,
  ReactElement | null
> & { readonly '~variants'?: V };

/**
 * One entry in `compoundVariants` - a set of variant matchers plus the
 * styles to apply when *all* matchers are satisfied at once. Use for cases
 * like "primary intent at large size gets a heavier weight".
 *
 * Matchers can only target **explicit** variants - fallback values vary
 * over an open set, so compound matching against them is undefined.
 */
export type CompoundVariant<V extends AnyVariants> = {
  [K in keyof V as V[K] extends ExplicitVariant ? K : never]?: V[K] extends ExplicitVariant
    ? keyof V[K] extends 'true' | 'false'
      ? boolean
      : keyof V[K]
    : never;
} & {
  /** Style props applied when every matcher above is true. May carry
   * pseudo-state and motion props like any other styled() layer. */
  css: StyleBag;
};

/**
 * Configuration object passed to `styled()`. All fields are optional -
 * the absolute minimum useful styled() takes only `base`.
 */
export interface StyledConfig<V extends AnyVariants = AnyVariants> {
  /** Style props always applied. May include pseudo-state (`_hover`, ...)
   * and motion (`transition`, `enterStyle`, ...) props, not only static ones. */
  base?: StyleBag;
  /** Named groups of style overrides. Mix explicit (`size: { sm, md }`)
   * and fallback (`'...size': (val, ctx) => ...`) entries. */
  variants?: V;
  /** Style overrides applied when several **explicit** variant matchers
   * all match at once. Fallback variants cannot participate. */
  compoundVariants?: readonly CompoundVariant<V>[];
  /** Variant values used when the prop is not specified by the caller.
   * Only **explicit** variants can have defaults - fallback values are
   * picked at the call site. */
  defaultVariants?: {
    [K in keyof V as V[K] extends ExplicitVariant ? K : never]?: V[K] extends ExplicitVariant
      ? keyof V[K] extends 'true' | 'false'
        ? boolean
        : keyof V[K]
      : never;
  };
  /** A styled context (from `createStyledContext`). When set, this component
   * reads inherited variant values from the context - filling in any variant
   * the caller omitted - and re-provides the merged result to its
   * descendants, so a parent's variant (e.g. a Button's `size`) flows to its
   * sub-components without prop threading. */
  context?: StyledContext<Record<string, unknown>>;
}

/**
 * Shared empty context. Every styled component reads *some* styled context so
 * the hook call stays unconditional (rules-of-hooks); when no `context` is
 * configured it reads this one, whose value never changes - so it never
 * triggers a re-render.
 */
const EMPTY_STYLED_CONTEXT = createContext<Record<string, unknown>>({});

/**
 * Keys whose values are themselves style bags ({@link StyleBag}-nested) and so
 * must DEEP-merge one level across the base → variants → compound → caller
 * layers, rather than wholesale-replace. Without this a variant's `_hover`
 * would clobber the base's `_hover` instead of extending it. `transition` and
 * `animation` are single values, not bags, so they intentionally replace.
 */
const NESTED_BAG_KEYS: ReadonlySet<string> = new Set<string>([
  ...PSEUDO_STATE_PROP_NAMES,
  ...PSEUDO_ELEMENT_PROP_NAMES,
  'enterStyle',
  'exitStyle',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge `next` onto `into`, deep-merging one level for the nested style-bag
 * keys (`_hover`, `_focus`, `enterStyle`, ...) so interaction and motion layers
 * accumulate across the styled() layers; shallow-replace for everything else.
 */
function mergeBags(
  into: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...into };
  for (const key in next) {
    if (!Object.hasOwn(next, key)) continue;
    const value = next[key];
    const prev = out[key];
    out[key] =
      NESTED_BAG_KEYS.has(key) && isPlainObject(prev) && isPlainObject(value)
        ? { ...prev, ...value }
        : value;
  }
  return out;
}

/**
 * `styled(Component, config)` returns a new React component that:
 *
 * 1. Reads the variant props out of its incoming props.
 * 2. Resolves `base` + active variants + matching compound variants into a
 *    single merged style-props object.
 * 3. Renders `Component` with the merged style props (plus any pass-through
 *    props the caller supplied).
 *
 * Style props from the caller always override the variant-derived defaults,
 * so a one-off tweak doesn't require authoring a new variant.
 *
 * If `Component` is a string (e.g. `'button'`), the result is rendered via
 * `<Box as="button">` so style props go through the standard pipeline.
 */
export function styled<V extends AnyVariants = Record<string, never>>(
  Component: ElementType,
  config: StyledConfig<V>,
): StyledComponent<V> {
  // Build the set of all variant prop names (explicit + fallback). The
  // names drive the props-vs-pass-through split during render.
  const variantNames: string[] = [];
  const explicitVariants: Record<string, ExplicitVariant> = {};
  const fallbackVariants: Record<string, FallbackVariant> = {};

  if (config.variants !== undefined) {
    for (const key of Object.keys(config.variants)) {
      const value = config.variants[key];
      if (key.startsWith('...')) {
        const name = key.slice(3);
        fallbackVariants[name] = value as FallbackVariant;
        if (!variantNames.includes(name)) variantNames.push(name);
      } else {
        explicitVariants[key] = value as ExplicitVariant;
        if (!variantNames.includes(key)) variantNames.push(key);
      }
    }
  }

  // Definition-time constants. Only a fallback variant can read the theme via
  // its `ctx`, so the theme subscription is skipped entirely when there are
  // none - keeping plain styled components from re-rendering on theme switch.
  const ctxDef = config.context;
  const ctxToRead = ctxDef?.Context ?? EMPTY_STYLED_CONTEXT;
  const needsTheme = Object.keys(fallbackVariants).length > 0;

  function renderStyled(
    props: VariantValues<V> & Omit<BoxProps, keyof VariantValues<V>>,
    theme: VariantContext['theme'],
    inherited: Record<string, unknown>,
  ): ReactElement {
    // Split the props into variant-selectors vs everything-else.
    const propsRecord = props as Record<string, unknown>;
    const variantValues: Record<string, unknown> = {};
    const passThrough: Record<string, unknown> = {};
    for (const key in propsRecord) {
      if (variantNames.includes(key)) {
        // Skip an explicit `undefined` variant value (`size={cond ? 'sm' :
        // undefined}`) - otherwise it clobbers `defaultVariants` in the merge
        // below and the apply loop's `value === undefined` skip drops the
        // default's styles entirely. Treat it as "variant omitted".
        if (propsRecord[key] !== undefined) variantValues[key] = propsRecord[key];
      } else if (propsRecord[key] !== undefined) {
        // An explicit `undefined` (e.g. `bg={cond ? 'red' : undefined}`) must
        // not clobber a base/variant value when `passThrough` is spread over
        // `merged` below - treat it as "prop omitted".
        passThrough[key] = propsRecord[key];
      }
    }

    // Layer order (lowest → highest precedence):
    //   context defaults  <  defaultVariants  <  inherited styled-context  <  caller props
    // Context defaults sit BELOW this component's own `defaultVariants` so a
    // standalone component (no provider) keeps its own default; a parent that
    // actually provides a value (`inherited`, only populated when a provider
    // is mounted - the context default is an empty sentinel) still overrides
    // it, and an explicit caller prop overrides everything.
    const effectiveVariants: Record<string, unknown> = {
      ...(ctxDef?.defaults as Record<string, unknown> | undefined),
      ...(config.defaultVariants as Record<string, unknown> | undefined),
      ...inherited,
      ...variantValues,
    };

    // Context handed to fallback variant functions as their 2nd argument.
    const variantCtx: VariantContext = {
      theme,
      tokens: theme?.tokens,
      props: propsRecord,
    };

    // Build the merged style props, in order:
    //   1. base
    //   2. each active variant (explicit lookup, fallback fn if missed)
    //   3. each matching compoundVariant
    //   4. caller-provided style props (so callers can override anything)
    // Steps 1 to 3 run once per breakpoint when a variant value is responsive.
    const build = (active: Record<string, unknown>): Record<string, unknown> => {
      let merged: Record<string, unknown> = { ...config.base };

      for (const variantName of variantNames) {
        const value = active[variantName];
        if (value === undefined) continue;
        const explicit = explicitVariants[variantName];
        const explicitKey = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
        // Own-property only - a variant value of `constructor` / `toString` /
        // `__proto__` would otherwise hit an inherited member and shadow the
        // declared fallback variant.
        const fromExplicit =
          explicit !== undefined && Object.hasOwn(explicit, explicitKey)
            ? explicit[explicitKey]
            : undefined;
        if (fromExplicit !== undefined) {
          merged = mergeBags(merged, fromExplicit);
          continue;
        }
        const fallback = fallbackVariants[variantName];
        if (fallback !== undefined) {
          merged = mergeBags(
            merged,
            (fallback as (val: unknown, ctx: VariantContext) => StyleBag)(
              value,
              variantCtx,
            ) as Record<string, unknown>,
          );
        }
      }

      if (config.compoundVariants !== undefined) {
        for (const compound of config.compoundVariants) {
          const { css, ...matchers } = compound as CompoundVariant<V> &
            Record<string, unknown> & {
              css: StyleBag;
            };
          let allMatch = true;
          for (const matchKey in matchers) {
            const expected = matchers[matchKey];
            const actual = active[matchKey];
            // String()-coerce non-boolean values on BOTH sides, matching the
            // explicit-variant loop above - otherwise a numeric variant (`400`)
            // fails to match a compound key the explicit lookup would have hit.
            const actualKey =
              typeof actual === 'boolean' ? (actual ? 'true' : 'false') : String(actual);
            const expectedKey =
              typeof expected === 'boolean' ? (expected ? 'true' : 'false') : String(expected);
            if (actualKey !== expectedKey) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            merged = mergeBags(merged, css as Record<string, unknown>);
          }
        }
      }
      return merged;
    };
    const merged = resolveResponsiveVariants(effectiveVariants, build);

    // Caller's own props override the merged set so users can tweak a single
    // instance without authoring a new variant; pseudo/motion bags deep-merge
    // so a one-off `_hover` extends the variant's rather than replacing it.
    const finalProps: Record<string, unknown> = mergeBags(merged, passThrough);

    const element =
      typeof Component === 'string'
        ? createElement(Box, { as: Component, ...finalProps } as BoxProps)
        : createElement(Component, finalProps);

    // Re-provide the merged context values (restricted to the context's
    // declared keys) so descendants inherit this component's resolved
    // variants. Only the declared keys are forwarded, never the whole bag.
    if (ctxDef !== undefined) {
      const provided: Record<string, unknown> = {};
      for (const key of Object.keys(ctxDef.defaults)) {
        const resolved = effectiveVariants[key];
        provided[key] = resolved === undefined ? ctxDef.defaults[key] : resolved;
      }
      return createElement(ctxDef.Provider, { value: provided }, element);
    }
    return element;
  }

  // Two impls so each calls a fixed, unconditional set of hooks. The theme
  // subscription only exists on the variant that can use it (has fallbacks).
  function StyledThemed(
    props: VariantValues<V> & Omit<BoxProps, keyof VariantValues<V>>,
  ): ReactElement {
    return renderStyled(props, useTheme(), useContext(ctxToRead));
  }
  function StyledPlain(
    props: VariantValues<V> & Omit<BoxProps, keyof VariantValues<V>>,
  ): ReactElement {
    return renderStyled(props, undefined, useContext(ctxToRead));
  }

  const displayName =
    typeof Component === 'string'
      ? `styled.${Component}`
      : `styled(${(Component as { displayName?: string; name?: string }).displayName ?? (Component as { name?: string }).name ?? 'Component'})`;
  StyledThemed.displayName = displayName;
  StyledPlain.displayName = displayName;

  return (needsTheme ? StyledThemed : StyledPlain) as StyledComponent<V>;
}
