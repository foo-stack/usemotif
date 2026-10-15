'use client';

import type { ReactElement } from 'react';
import {
  areaPath,
  bars,
  type ChartPoint,
  describeSeries,
  linePath,
  plot,
  valueScale,
} from './_chart-geometry.js';
import { ChartSvg, useChartPaint, useChartPrimitives } from './_chart-surface.js';

export type { ChartPoint };

const DEFAULT_COLOR = '$components.chart.color ?? $colors.action.primary.bg ?? currentColor';
const GRID_COLOR = '$components.chart.grid ?? $colors.border.default ?? #e5e7eb';
const FORMAT = new Intl.NumberFormat();
const format = (value: number): string => FORMAT.format(value);

interface ChartBaseProps {
  /** Width in px. The chart scales down to its container on web. */
  readonly width?: number;
  /** Height in px. */
  readonly height?: number;
  /**
   * The series colour, a token reference or any colour. Defaults to
   * `$components.chart.color`, then `$colors.action.primary.bg`.
   */
  readonly color?: string;
  /** What the chart shows, read before the values by assistive technology. */
  readonly label: string;
  /** Formats values in the text alternative. Defaults to the locale's number format. */
  readonly formatValue?: (value: number) => string;
}

export interface SparklineProps extends ChartBaseProps {
  readonly data: readonly number[];
  /** Fill under the line. */
  readonly area?: boolean;
  readonly strokeWidth?: number;
}

export interface SeriesChartProps extends ChartBaseProps {
  readonly data: readonly ChartPoint[];
}

const paintOf = (color: string | undefined): string =>
  color === undefined ? DEFAULT_COLOR : color.startsWith('$') ? `${color} ?? currentColor` : color;

function altText(label: string, points: readonly ChartPoint[], fmt = format): string {
  return `${label}: ${describeSeries(points, fmt)}`;
}

/**
 * Sparkline - a small line with no axes, for a trend inline with text or in a table cell.
 *
 * @example
 * ```tsx
 * <Sparkline label="Weekly signups" data={[4, 6, 5, 9, 12]} area />
 * ```
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  color,
  label,
  formatValue,
  area = false,
  strokeWidth = 2,
}: SparklineProps): ReactElement {
  const prim = useChartPrimitives();
  const paint = useChartPaint();
  const stroke = paint(paintOf(color));
  const pad = strokeWidth;
  const scale = valueScale(data, height, pad, area);
  const points = plot(data, width, scale, pad);
  const alt = altText(
    label,
    data.map((value) => ({ label: '', value })),
    formatValue,
  );
  return (
    <ChartSvg width={width} height={height} label={alt}>
      {prim !== null && data.length > 0 ? (
        <>
          {area ? (
            <prim.Path
              d={areaPath(points, scale.zero)}
              fill={stroke}
              fillOpacity={0.15}
              stroke="none"
            />
          ) : null}
          <prim.Path
            d={linePath(points)}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </ChartSvg>
  );
}

const PAD = 8;
const GRID_LINES = 4;

function Grid({ width, height }: { width: number; height: number }): ReactElement | null {
  const prim = useChartPrimitives();
  const paint = useChartPaint();
  if (prim === null) return null;
  const step = (height - PAD * 2) / GRID_LINES;
  return (
    <>
      {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
        <prim.Line
          key={i}
          x1={PAD}
          x2={width - PAD}
          y1={PAD + i * step}
          y2={PAD + i * step}
          stroke={paint(GRID_COLOR)}
          strokeWidth={1}
        />
      ))}
    </>
  );
}

function LineOrArea({
  data,
  width = 320,
  height = 160,
  color,
  label,
  formatValue,
  fill,
}: SeriesChartProps & { fill: boolean }): ReactElement {
  const prim = useChartPrimitives();
  const paint = useChartPaint();
  const stroke = paint(paintOf(color));
  const values = data.map((p) => p.value);
  const scale = valueScale(values, height, PAD, fill);
  const points = plot(values, width, scale, PAD);
  return (
    <ChartSvg width={width} height={height} label={altText(label, data, formatValue)}>
      <Grid width={width} height={height} />
      {prim !== null && data.length > 0 ? (
        <>
          {fill ? (
            <prim.Path
              d={areaPath(points, scale.zero)}
              fill={stroke}
              fillOpacity={0.2}
              stroke="none"
            />
          ) : null}
          <prim.Path
            d={linePath(points)}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
    </ChartSvg>
  );
}

/**
 * LineChart - a series as a line over a light grid.
 *
 * @example
 * ```tsx
 * <LineChart label="Revenue by month" data={[{ label: 'Jan', value: 12 }, { label: 'Feb', value: 18 }]} />
 * ```
 */
export function LineChart(props: SeriesChartProps): ReactElement {
  return <LineOrArea {...props} fill={false} />;
}

/** AreaChart - a series as a filled line down to zero. */
export function AreaChart(props: SeriesChartProps): ReactElement {
  return <LineOrArea {...props} fill />;
}

/** BarChart - one bar per value, growing from zero, downward for a negative value. */
export function BarChart({
  data,
  width = 320,
  height = 160,
  color,
  label,
  formatValue,
}: SeriesChartProps): ReactElement {
  const prim = useChartPrimitives();
  const paint = useChartPaint();
  const fill = paint(paintOf(color));
  const values = data.map((p) => p.value);
  const scale = valueScale(values, height, PAD, true);
  return (
    <ChartSvg width={width} height={height} label={altText(label, data, formatValue)}>
      <Grid width={width} height={height} />
      {prim === null
        ? null
        : bars(values, width, scale, PAD, Math.min(8, width / Math.max(data.length, 1) / 4)).map(
            (bar, i) => <prim.Rect key={i} {...bar} rx={2} fill={fill} stroke="none" />,
          )}
    </ChartSvg>
  );
}
