import { Box, type BoxProps, keyframes, useMessages } from 'usemotif';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

// Hoisted so the prop is a stable reference across renders (lint: no-new-object).
const SPIN_ANIMATION = {
  name: spin,
  duration: '0.7s',
  easing: 'linear',
  iterationCount: 'infinite',
} as const;

export interface SpinnerProps extends Omit<BoxProps, 'children'> {
  /** Diameter in px. Default 20. */
  readonly size?: number;
}

/**
 * An indeterminate loading spinner - a themed ring with one accented edge,
 * rotating continuously. Honors `prefers-reduced-motion` automatically (motif's
 * reduced-motion guard collapses the animation), and announces itself to
 * assistive tech via `role="status"`.
 *
 * ```tsx
 * <Spinner size={24} />
 * ```
 */
export function Spinner({ size = 20, ...rest }: SpinnerProps) {
  const messages = useMessages();
  return (
    <Box
      role="status"
      aria-label={messages.loading}
      display="inline-block"
      width={size}
      height={size}
      borderRadius="$radii.full"
      borderWidth="$borderWidths.thick"
      borderColor="$colors.border.muted"
      borderTopColor="$colors.action.primary.bg"
      animation={SPIN_ANIMATION}
      {...rest}
    />
  );
}
