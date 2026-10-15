import type { MotifComponent } from '@usemotif/core';
import { type ReactElement, Children, type ReactNode } from 'react';
import { Box, type BoxProps } from './Box.js';
import { StaggerContext } from './_stagger-context.js';

export interface StackProps extends Omit<BoxProps, 'display' | 'flexDirection'> {
  /**
   * Stack direction. Defaults to `'column'` for `Stack` and `VStack`,
   * `'row'` for `HStack`.
   */
  direction?: BoxProps['flexDirection'];
  /**
   * Stagger entry-animation delay between direct children, in seconds.
   * Each child gets `index * stagger` added to its `transition-delay`,
   * so children with `enterStyle` mount in a wave instead of all-at-once.
   *
   * Composes with each child's own `transition` delay - the stagger is
   * added to whatever the child already specifies.
   *
   * `prefers-reduced-motion: reduce` collapses stagger to `0`
   * automatically; explicit `stagger={0}` does the same.
   *
   * @example
   * ```tsx
   * <Stack stagger={0.05}>
   *   {items.map((item) => (
   *     <Box key={item.id} enterStyle={{ opacity: 0 }}>{item.label}</Box>
   *   ))}
   * </Stack>
   * ```
   */
  stagger?: number;
  /**
   * Where the stagger wave starts: the `'first'` child (the default), the
   * `'last'`, the `'center'`, or a child index. Each child waits `stagger`
   * times its distance from that point.
   *
   * @example
   * ```tsx
   * <Stack stagger={0.05} staggerFrom="center">{cards}</Stack>
   * ```
   */
  staggerFrom?: 'first' | 'last' | 'center' | number;
}

/**
 * A flexbox container that stacks its children with consistent spacing.
 *
 * `Stack` is column-based by default; use `direction="row"` (or the `HStack`
 * shorthand) for horizontal layouts. The `gap` style prop controls spacing
 * between items via the CSS `gap` property - works the same with column
 * and row direction, no need for hacks like negative margins.
 *
 * Set `stagger` to orchestrate a per-child delay on entry animations.
 *
 * @example
 *
 * ```tsx
 * <Stack gap="$4" alignItems="center">
 *   <Heading>Title</Heading>
 *   <Text>Body</Text>
 * </Stack>
 * ```
 */
export const Stack: MotifComponent<StackProps, ReactElement | null> = function ({
  direction = 'column',
  stagger,
  staggerFrom,
  children,
  ...rest
}: StackProps) {
  const wrapped = wrapForStagger(children, stagger, staggerFrom);
  return (
    <Box display="flex" flexDirection={direction} {...rest}>
      {wrapped}
    </Box>
  );
};

/** How many stagger steps child `index` of `count` waits, counted from `from`. */
export function staggerSteps(
  index: number,
  count: number,
  from: StackProps['staggerFrom'] = 'first',
): number {
  const origin =
    from === 'first' ? 0 : from === 'last' ? count - 1 : from === 'center' ? (count - 1) / 2 : from;
  return Math.abs(index - origin);
}

function wrapForStagger(
  children: ReactNode,
  stagger: number | undefined,
  from: StackProps['staggerFrom'],
): ReactNode {
  if (stagger === undefined || stagger === 0) return children;
  // Do NOT branch on a synchronous reduced-motion read here: it returns
  // `false` on the server and the live value on the client, so a
  // reduced-motion client would unwrap (delay absent) while the SSR HTML wrap
  // included the delay - a hydration mismatch. Always wrap; the per-child
  // BoxWithEnter collapses the stagger to 0 *after mount* when reduced motion
  // is on, which keeps the first client render byte-identical to the server.
  //
  // `React.Children.map` flattens fragments / iterables and yields a stable
  // index per direct child - exactly what stagger expects.
  const count = Children.count(children);
  return Children.map(children, (child, i) => (
    <StaggerContext.Provider value={staggerSteps(i, count, from) * stagger}>
      {child}
    </StaggerContext.Provider>
  ));
}

/** Horizontal stack - `<Stack direction="row">` shorthand. */
export const HStack: MotifComponent<Omit<StackProps, 'direction'>, ReactElement | null> = function (
  props: Omit<StackProps, 'direction'>,
) {
  return <Stack direction="row" {...props} />;
};

/** Vertical stack - `<Stack direction="column">` shorthand. The default. */
export const VStack: MotifComponent<Omit<StackProps, 'direction'>, ReactElement | null> = function (
  props: Omit<StackProps, 'direction'>,
) {
  return <Stack direction="column" {...props} />;
};
