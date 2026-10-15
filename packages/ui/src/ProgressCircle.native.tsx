import { resolveValue } from '@usemotif/core';
import { useReducedMotion } from '@usemotif/headless';
import type { ReactElement } from 'react';
import { Box, keyframes, Svg, SVG_PRIMITIVES, useTheme } from 'usemotif';
import type { ProgressCircleProps } from './ProgressCircle.js';

export type { ProgressCircleProps };

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});
const SPIN_ANIMATION = {
  name: spin,
  duration: '1s',
  easing: 'linear',
  iterationCount: 'infinite',
} as const;

const INDETERMINATE_ARC = 0.25;

/**
 * Native ProgressCircle: the web ring drawn with react-native-svg, its track
 * and arc colours resolved from the theme because an SVG stroke cannot read a
 * token. Without react-native-svg it keeps its `progressbar` semantics and
 * draws nothing.
 */
export function ProgressCircle({
  value,
  max = 100,
  size = 40,
  thickness = 4,
  'aria-label': ariaLabel,
}: ProgressCircleProps): ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const determinate = value !== null;
  const fraction = determinate ? Math.min(1, Math.max(0, value / max)) : INDETERMINATE_ARC;
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = (token: string, fallback: string): string => {
    const resolved = theme === undefined ? undefined : resolveValue(token, theme);
    return typeof resolved === 'string' ? resolved : fallback;
  };
  const Circle = SVG_PRIMITIVES?.Circle;
  return (
    <Box
      role="progressbar"
      {...(determinate ? { 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': max } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      width={size}
      height={size}
      {...(!determinate && !reducedMotion && { animation: SPIN_ANIMATION })}
    >
      {Circle !== undefined ? (
        <Svg size={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color('$colors.surface.muted', '#e5e7eb')}
            strokeWidth={thickness}
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color('$colors.action.primary.bg', '#2563eb')}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
      ) : null}
    </Box>
  );
}
