'use client';

import { useReducedMotion } from '@usemotif/headless';
import type { CSSProperties, ReactElement } from 'react';
import { Box, keyframes } from 'usemotif';

export interface ProgressCircleProps {
  /** 0..`max`, or `null` for an indeterminate (unknown-duration) spinner. */
  readonly value: number | null;
  readonly max?: number;
  /** Diameter in px. Defaults to 40. */
  readonly size?: number;
  /** Ring width in px. Defaults to 4. */
  readonly thickness?: number;
  readonly 'aria-label'?: string;
}

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});
// Passed through Box's `animation` prop, which is what registers the rule. It
// is left off entirely under reduced motion, as Progress does with its sweep,
// rather than relying on a theme's opt-in guard.
const SPIN_ANIMATION = {
  name: spin,
  duration: '1s',
  easing: 'linear',
  iterationCount: 'infinite',
} as const;
// The svg carries the size, so the wrapper only shrink-wraps it.
const RING_BOX: CSSProperties = { display: 'inline-flex' };
const ARC_EASE: CSSProperties = { transition: 'stroke-dashoffset 240ms ease' };

// An indeterminate ring shows this much of its arc.
const INDETERMINATE_ARC = 0.25;

/**
 * Themed ring progress, the circular sibling of `Progress`. It carries the
 * same ARIA (`role="progressbar"`, with `aria-valuenow` only when the value is
 * known), and an indeterminate ring spins a quarter arc that holds still under
 * `prefers-reduced-motion`.
 *
 * ```tsx
 * <ProgressCircle value={70} aria-label="Uploading" />
 * <ProgressCircle value={null} size={24} aria-label="Loading" />
 * ```
 */
export function ProgressCircle({
  value,
  max = 100,
  size = 40,
  thickness = 4,
  'aria-label': ariaLabel,
}: ProgressCircleProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const determinate = value !== null;
  const fraction = determinate ? Math.min(1, Math.max(0, value / max)) : INDETERMINATE_ARC;
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="progressbar"
      {...(determinate ? { 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': max } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      style={RING_BOX}
    >
      <Box
        display="inline-flex"
        {...(!determinate && !reducedMotion && { animation: SPIN_ANIMATION })}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--colors-surface-muted, #e5e7eb)"
            strokeWidth={thickness}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--colors-action-primary-bg, #2563eb)"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            // Start the arc at 12 o'clock rather than 3.
            transform={`rotate(-90 ${center} ${center})`}
            style={ARC_EASE}
          />
        </svg>
      </Box>
    </div>
  );
}
