import type { ReactNode } from 'react';
import { statDeltaRecipe, statRecipe } from '@usemotif/recipes';
import { Box, Text } from 'usemotif';

export type StatTrend = 'up' | 'down' | 'neutral';

export interface StatProps {
  /** Metric name (muted, above the value). */
  readonly label: ReactNode;
  /** The headline figure. */
  readonly value: ReactNode;
  /** Optional change indicator shown beside the value. */
  readonly delta?: ReactNode;
  /** Colours the delta - `up` green, `down` red, `neutral` muted. Adds an arrow. */
  readonly trend?: StatTrend;
  /** Small caption under the value. */
  readonly helpText?: ReactNode;
}

/**
 * A themed metric display - a muted label, a bold headline value, and an
 * optional trend-coloured delta. Pure presentational (Box + Text, no headless),
 * so it hugs the display floor.
 *
 * ```tsx
 * <Stat label="Revenue" value="$48.2k" delta="12%" trend="up" helpText="vs last month" />
 * ```
 */
export function Stat({ label, value, delta, trend = 'neutral', helpText }: StatProps) {
  const arrow = trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : '';
  return (
    <Box {...statRecipe.base}>
      <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
        {label}
      </Text>
      <Box display="flex" flexDirection="row" alignItems="baseline" gap="$space.2">
        <Text fontSize="$fontSizes.xl" fontWeight="$fontWeights.bold" color="$colors.text.default">
          {value}
        </Text>
        {delta !== undefined ? (
          <Text {...statDeltaRecipe.base} {...statDeltaRecipe.variants.trend[trend]}>
            {arrow}
            {delta}
          </Text>
        ) : null}
      </Box>
      {helpText !== undefined ? (
        <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
          {helpText}
        </Text>
      ) : null}
    </Box>
  );
}
