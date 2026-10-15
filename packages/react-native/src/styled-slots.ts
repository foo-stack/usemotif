import type { StyleBag } from '@usemotif/core';
import type { ElementType } from 'react';
import { createStyledContext } from './styled-context.js';
import { styled, type AnyVariants, type StyledComponent, type StyledConfig } from './styled.js';

/** Style bags keyed by slot name. */
export type SlotStyles<S extends string> = { readonly [K in S]?: StyleBag };

/** A slot recipe's variants: each value styles any of the slots. */
export type SlotVariants<S extends string> = Record<string, Record<string, SlotStyles<S>>>;

/** One `styledSlots` config: the element each slot renders, and how each is styled. */
export interface SlotRecipeConfig<S extends string, V extends SlotVariants<S>> {
  readonly slots: Readonly<Record<S, ElementType>>;
  readonly base?: SlotStyles<S>;
  readonly variants?: V;
  readonly compoundVariants?: readonly ({ readonly [K in keyof V]?: keyof V[K] } & {
    readonly css: SlotStyles<S>;
  })[];
  readonly defaultVariants?: { readonly [K in keyof V]?: keyof V[K] };
}

/** The variants one slot sees: each value's bag for that slot. */
export type SlotVariantsOf<V> = { [K in keyof V]: { [Value in keyof V[K]]: StyleBag } };

/** The components `styledSlots` returns, one per slot. */
export type SlotComponents<S extends string, V> = {
  readonly [K in S]: StyledComponent<
    SlotVariantsOf<V> extends AnyVariants ? SlotVariantsOf<V> : never
  >;
};

function mapValues<T, U>(
  record: Readonly<Record<string, T>>,
  fn: (value: T) => U,
): Record<string, U> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, fn(v)]));
}

/**
 * Style several named parts of a component from one config, with variants they share. Returns a
 * `styled` component per slot. A variant set on one slot reaches every slot rendered inside it,
 * so `size` on the root sizes the title and the body too, with no prop threading; a slot can
 * still take its own value.
 *
 * @example
 * ```tsx
 * const Card = styledSlots({
 *   slots: { root: 'article', title: 'h3', body: 'div' },
 *   base: { root: { borderRadius: '$lg', p: '$4' }, title: { fontWeight: '$semibold' } },
 *   variants: {
 *     size: {
 *       sm: { root: { p: '$3' }, title: { fontSize: '$md' } },
 *       lg: { root: { p: '$6' }, title: { fontSize: '$xl' } },
 *     },
 *   },
 *   defaultVariants: { size: 'sm' },
 * });
 *
 * <Card.root size="lg">
 *   <Card.title>Plans</Card.title>
 *   <Card.body>...</Card.body>
 * </Card.root>
 * ```
 */
export function styledSlots<S extends string, V extends SlotVariants<S> = Record<never, never>>(
  config: SlotRecipeConfig<S, V>,
): SlotComponents<S, V> {
  const variants = (config.variants ?? {}) as SlotVariants<S>;
  // A styled context passes on only the keys its defaults name, so every variant is named, with
  // `undefined` where the recipe sets no default.
  const defaultVariants = (config.defaultVariants ?? {}) as Record<string, unknown>;
  const context = createStyledContext(
    Object.fromEntries(Object.keys(variants).map((name) => [name, defaultVariants[name]])),
  );
  const out: Record<string, unknown> = {};
  for (const slot of Object.keys(config.slots) as S[]) {
    const slotConfig: StyledConfig = {
      context,
      variants: mapValues(variants, (values) => mapValues(values, (bags) => bags[slot] ?? {})),
      ...(config.base?.[slot] !== undefined ? { base: config.base[slot] } : {}),
      ...(config.defaultVariants !== undefined
        ? {
            defaultVariants: config.defaultVariants as NonNullable<StyledConfig['defaultVariants']>,
          }
        : {}),
      ...(config.compoundVariants !== undefined
        ? {
            compoundVariants: config.compoundVariants.map(({ css, ...match }) => ({
              ...match,
              css: css[slot] ?? {},
            })) as NonNullable<StyledConfig['compoundVariants']>,
          }
        : {}),
    };
    out[slot] = styled(config.slots[slot], slotConfig);
  }
  return out as SlotComponents<S, V>;
}
