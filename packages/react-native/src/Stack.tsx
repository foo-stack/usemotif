import type { MotifComponent } from '@usemotif/core';
import { type ReactElement, Children, type ReactNode } from 'react';
import { Box, type BoxProps } from './Box.js';
import { StaggerContext } from './_stagger-context.js';

export interface StackProps extends Omit<BoxProps, 'flexDirection'> {
  /**
   * Stack direction. Defaults to `'column'` for `Stack` / `VStack`,
   * `'row'` for `HStack`. Mirrors the web renderer's API.
   */
  direction?: BoxProps['flexDirection'];
  /**
   * Stagger entry-animation delay between direct children, in seconds.
   * Each direct child gets `index * stagger` added to its driver-side
   * `delayMs`, so children with `enterStyle` mount in a wave instead
   * of all-at-once. Composes with each child's own `transition` delay.
   *
   * Native reduced-motion handling stays consumer-side in v1: branch
   * on `useReducedMotion()` from `@usemotif/headless` and pass `0`
   * when reduced motion is on.
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
 * A flexbox container that stacks its children with consistent
 * spacing. Defaults to column-based; pass `direction="row"` (or use
 * `HStack`) for horizontal layouts. The `gap` style prop controls
 * spacing between items via RN's `gap` style - works the same with
 * column and row direction.
 *
 * Set `stagger` to orchestrate a per-child delay on entry animations.
 *
 * @example
 *
 * ```tsx
 * <Stack gap="$4" alignItems="center">
 *   <Text>Title</Text>
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
