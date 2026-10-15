import type { ReactElement } from 'react';
import { Box, keyframes } from 'usemotif';
import type { SkeletonProps } from './Skeleton.js';

export type { SkeletonProps };

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.4 },
});
const PULSE_ANIMATION = {
  name: pulse,
  duration: '1.5s',
  easing: 'ease-in-out',
  iterationCount: 'infinite',
} as const;

/**
 * Native Skeleton. `lines` bars are the height of the `fontSize` token
 * (`$fontSizes.md` by default) rather than `1em`, which native has no unit for.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  circle = false,
  lines,
  fontSize = '$fontSizes.md',
  ...rest
}: SkeletonProps): ReactElement {
  if (lines !== undefined) {
    return (
      <Box aria-hidden width={width} gap="$space.2" {...rest}>
        {Array.from({ length: Math.max(1, lines) }, (_, i) => (
          <Box
            key={i}
            width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
            height={fontSize}
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
