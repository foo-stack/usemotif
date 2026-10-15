'use client';

import { Box, keyframes, type BoxProps } from 'usemotif';

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.4 },
});

// Hoisted so the prop is a stable reference (lint: no-new-object). Box's
// `animation` runs through motif's reduced-motion guard, so the pulse collapses
// automatically under `prefers-reduced-motion` (same as Spinner).
const PULSE_ANIMATION = {
  name: pulse,
  duration: '1.5s',
  easing: 'ease-in-out',
  iterationCount: 'infinite',
} as const;

export interface SkeletonProps extends Omit<BoxProps, 'children' | 'width' | 'height'> {
  /** Width (number → px). Default `100%`. */
  readonly width?: number | string;
  /** Height (number → px). Default 16. Ignored when `circle` (height = width). */
  readonly height?: number | string;
  /** Render a circle (height tracks width, fully rounded) - e.g. an avatar placeholder. */
  readonly circle?: boolean;
  /**
   * Render this many stacked text-line bars instead of one block. Each is one
   * `em` of the `fontSize` (default `$fontSizes.md`) tall, and the last is shorter,
   * like the end of a paragraph. `width` sizes the whole stack.
   */
  readonly lines?: number;
}

/**
 * A themed loading placeholder - a muted block that gently pulses. Decorative
 * (`aria-hidden`); the pulse honors `prefers-reduced-motion` automatically.
 *
 * ```tsx
 * <Skeleton width={240} height={20} />
 * <Skeleton circle width={40} />
 * <Skeleton lines={3} width={320} />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = 16,
  circle = false,
  lines,
  ...rest
}: SkeletonProps) {
  if (lines !== undefined) {
    return (
      <Box
        aria-hidden
        display="flex"
        flexDirection="column"
        gap="0.5em"
        width={width}
        fontSize="$fontSizes.md"
        {...rest}
      >
        {Array.from({ length: Math.max(1, lines) }, (_, i) => (
          <Box
            key={i}
            width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
            height="1em"
            bg="$colors.surface.muted"
            borderRadius="$radii.sm"
            animation={PULSE_ANIMATION}
          />
        ))}
      </Box>
    );
  }
  return (
    <Box
      aria-hidden
      width={width}
      height={circle ? width : height}
      bg="$colors.surface.muted"
      borderRadius={circle ? '$radii.full' : '$radii.md'}
      animation={PULSE_ANIMATION}
      {...rest}
    />
  );
}
