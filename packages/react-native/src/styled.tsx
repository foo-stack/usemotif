import {
  PSEUDO_ELEMENT_PROP_NAMES,
  PSEUDO_STATE_PROP_NAMES,
  resolveResponsiveVariants,
  type BreakpointName,
  type MotifComponent,
  type StyleBag,
} from '@usemotif/core';
import { Box, type BoxProps } from './Box.js';
import { useTheme } from './theme-context.js';
import { warnStringTagOnNative } from './_dev-warnings.js';
import type { ElementType, ReactElement } from 'react';
import { createContext, createElement, useContext } from 'react';
import type { StyledContext, VariantContext } from './styled-context.js';

/**
 * Native build of the `styled()` factory. Mirrors the web implementation in
 * `@usemotif/react`'s `styled.tsx` - where the full prose for each type and
 * merge rule lives; the only difference is that the underlying `Box` primitive
 * and `useTheme` are this package's rather than the web renderer's.
 */

type ExplicitVariant = Record<string, StyleBag>;
type FallbackVariant = (val: never, ctx: VariantContext) => StyleBag;
export type AnyVariants = Record<string, ExplicitVariant | FallbackVariant>;

type ExplicitNames<V> = string &
  {
    [K in keyof V]: K extends `...${string}` ? never : K;
  }[keyof V];

type FallbackNames<V> = string &
  {
    [K in keyof V]: K extends `...${infer N}` ? N : never;
  }[keyof V];

type AllVariantNames<V> = ExplicitNames<V> | FallbackNames<V>;

type ExplicitValue<V, K extends string> = K extends keyof V
  ? V[K] extends ExplicitVariant
    ? keyof V[K] extends 'true' | 'false'
      ? boolean
      : keyof V[K]
    : never
  : never;

/** Tolerates the optional `ctx` second parameter - see `@usemotif/react`'s `styled.tsx`. */
type FallbackValue<V, K extends string> = `...${K}` extends keyof V
  ? V[`...${K}`] extends (val: infer A, ...rest: never[]) => unknown
    ? A
    : never
  : never;

type VariantValues<V extends AnyVariants> = {
  [K in AllVariantNames<V>]?: Responsive<ExplicitValue<V, K> | FallbackValue<V, K>>;
};

type Responsive<T> =
  | T
  | ({ base?: T } & { [K in BreakpointName]?: T } & { [K in `@${string}`]?: T })
  | readonly (T | null | undefined)[]
  | `${string}:${string}`;

export type VariantProps<T> = T extends (...args: never[]) => unknown
  ? T extends { readonly '~variants'?: infer V extends AnyVariants }
    ? VariantValues<V>
    : never
  : T extends AnyVariants
    ? VariantValues<T>
    : never;

export type StyledComponent<V extends AnyVariants> = MotifComponent<
  VariantValues<V> & Omit<BoxProps, keyof VariantValues<V>>,
  ReactElement | null
> & { readonly '~variants'?: V };

export type CompoundVariant<V extends AnyVariants> = {
  [K in keyof V as V[K] extends ExplicitVariant ? K : never]?: V[K] extends ExplicitVariant
    ? keyof V[K] extends 'true' | 'false'
      ? boolean
      : keyof V[K]
    : never;
} & {
  css: StyleBag;
};

export interface StyledConfig<V extends AnyVariants = AnyVariants> {
  base?: StyleBag;
  variants?: V;
  compoundVariants?: readonly CompoundVariant<V>[];
  defaultVariants?: {
    [K in keyof V as V[K] extends ExplicitVariant ? K : never]?: V[K] extends ExplicitVariant
      ? keyof V[K] extends 'true' | 'false'
        ? boolean
        : keyof V[K]
      : never;
  };
  /** A styled context (from `createStyledContext`) - see `@usemotif/react`'s `styled.tsx`. */
  context?: StyledContext<Record<string, unknown>>;
}

/** Shared empty context so the consume hook stays unconditional - see web. */
const EMPTY_STYLED_CONTEXT = createContext<Record<string, unknown>>({});

/** Keys whose values are nested style bags and so deep-merge one level across
 * the styled() layers (a variant's `_hover` extends the base's). See web. */
const NESTED_BAG_KEYS: ReadonlySet<string> = new Set<string>([
  ...PSEUDO_STATE_PROP_NAMES,
  ...PSEUDO_ELEMENT_PROP_NAMES,
  'enterStyle',
  'exitStyle',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merge `next` onto `into`, deep-merging the nested bag keys; see web. */
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

export function styled<V extends AnyVariants = Record<string, never>>(
  Component: ElementType,
  config: StyledConfig<V>,
): StyledComponent<V> {
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

  const ctxDef = config.context;
  const ctxToRead = ctxDef?.Context ?? EMPTY_STYLED_CONTEXT;
  const needsTheme = Object.keys(fallbackVariants).length > 0;

  function renderStyled(
    props: VariantValues<V> & Omit<BoxProps, keyof VariantValues<V>>,
    theme: VariantContext['theme'],
    inherited: Record<string, unknown>,
  ): ReactElement {
    const propsRecord = props as Record<string, unknown>;
    const variantValues: Record<string, unknown> = {};
    const passThrough: Record<string, unknown> = {};
    for (const key in propsRecord) {
      if (variantNames.includes(key)) {
        // Skip an explicit `undefined` variant value so it can't clobber
        // `defaultVariants` (see `@usemotif/react`'s `styled.tsx`).
        if (propsRecord[key] !== undefined) variantValues[key] = propsRecord[key];
      } else if (propsRecord[key] !== undefined) {
        // An explicit `undefined` (e.g. `bg={cond ? 'red' : undefined}`) must
        // not clobber a base/variant value when `passThrough` is spread over
        // `merged` below - treat it as "prop omitted".
        passThrough[key] = propsRecord[key];
      }
    }

    // context defaults < defaultVariants < inherited styled-context < caller
    // props (see web for the full rationale). Context defaults sit below the
    // component's own defaultVariants so a standalone component keeps its own
    // default when no provider is mounted.
    const effectiveVariants: Record<string, unknown> = {
      ...(ctxDef?.defaults as Record<string, unknown> | undefined),
      ...(config.defaultVariants as Record<string, unknown> | undefined),
      ...inherited,
      ...variantValues,
    };

    const variantCtx: VariantContext = {
      theme,
      tokens: theme?.tokens,
      props: propsRecord,
    };

    // Run once per breakpoint when a variant value is responsive.
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
            // String()-coerce non-boolean values on both sides (see web #308).
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

    const finalProps: Record<string, unknown> = mergeBags(merged, passThrough);

    let element: ReactElement;
    if (typeof Component === 'string') {
      // A string element type has no native equivalent - there is no `button`
      // or `span` to render - so the tag is dropped and a plain Box (RN
      // `View`) renders in its place. The dev warning tells the author to pass
      // a component if they wanted the same behaviour on both platforms.
      //
      // The tag is deliberately NOT forwarded as `as`: native `BoxProps` has
      // no such field and native Box never destructures it, so it would fall
      // through Box's rest-spread and land on the underlying View as a stray
      // prop without changing the rendered element type.
      warnStringTagOnNative(Component);
      element = createElement(Box, finalProps as BoxProps);
    } else {
      element = createElement(Component, finalProps);
    }

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
