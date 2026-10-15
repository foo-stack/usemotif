import { useReducedMotion } from '@usemotif/headless';
import type { ReactElement } from 'react';
import { Box, keyframes } from 'usemotif';
import type { ProgressProps } from './Progress.js';

export type { ProgressProps };

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.4 },
});
const PULSE_ANIMATION = {
  name: pulse,
  duration: '1.2s',
  easing: 'ease-in-out',
  iterationCount: 'infinite',
} as const;

/**
 * Native Progress: the same `progressbar` semantics as web on a token-styled
 * track and fill. An indeterminate bar is a pulsing 30% fill, held still under
 * reduced motion.
 */
export function Progress({
  value,
  max = 100,
  'aria-label': ariaLabel,
}: ProgressProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const determinate = value !== null;
  const percent = determinate ? Math.min(100, Math.max(0, (value / max) * 100)) : 30;
  return (
    <Box
      role="progressbar"
      {...(determinate ? { 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': max } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      width="100%"
      height={8}
      borderRadius="$radii.full"
      bg="$colors.surface.muted"
      overflow="hidden"
    >
      <Box
        height="100%"
        width={`${percent}%`}
        borderRadius="$radii.full"
        bg="$colors.action.primary.bg"
        {...(!determinate && !reducedMotion && { animation: PULSE_ANIMATION })}
      />
    </Box>
  );
}
