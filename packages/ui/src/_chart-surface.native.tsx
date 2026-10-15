import { resolveValue } from '@usemotif/core';
import type { ReactElement } from 'react';
import { Box, Svg, SVG_PRIMITIVES, useTheme } from 'usemotif';
import type { ChartPrimitives, ChartSvgProps } from './_chart-surface.js';

/** React Native: the `react-native-svg` elements, or `null` when it isn't installed. */
export function useChartPrimitives(): ChartPrimitives | null {
  return SVG_PRIMITIVES;
}

/** React Native: the chain resolved against the theme, since there are no CSS variables. */
export function useChartPaint(): (chain: string) => string {
  const theme = useTheme();
  return (chain) => {
    const resolved = theme === undefined ? undefined : resolveValue(chain as `$${string}`, theme);
    return typeof resolved === 'string' ? resolved : 'transparent';
  };
}

export function ChartSvg({ width, height, label, children }: ChartSvgProps): ReactElement {
  return (
    <Box role="img" aria-label={label} width={width} height={height}>
      {SVG_PRIMITIVES === null ? null : (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {children}
        </Svg>
      )}
    </Box>
  );
}
