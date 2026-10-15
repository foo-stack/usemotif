/** One labelled value in a chart's series. */
export interface ChartPoint {
  readonly label: string;
  readonly value: number;
}

export interface Plotted {
  readonly x: number;
  readonly y: number;
}

export interface Bar {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Maps values onto the vertical extent of a chart box. */
export interface ValueScale {
  readonly y: (value: number) => number;
  /** Where zero sits, clamped into the box. */
  readonly zero: number;
}

/**
 * A linear scale from the data's range onto `[pad, height - pad]`, inverted so larger values sit
 * higher. `includeZero` widens the range to zero, as bars and areas need a baseline. A flat
 * series sits in the middle.
 */
export function valueScale(
  values: readonly number[],
  height: number,
  pad: number,
  includeZero: boolean,
): ValueScale {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  const span = max - min;
  const inner = height - pad * 2;
  const y = (value: number): number =>
    span === 0 ? height / 2 : pad + inner - ((value - min) / span) * inner;
  return { y, zero: Math.min(Math.max(y(0), pad), height - pad) };
}

/** Evenly spaced points across `[pad, width - pad]`. */
export function plot(
  values: readonly number[],
  width: number,
  scale: ValueScale,
  pad: number,
): Plotted[] {
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((value, i) => ({
    x: values.length > 1 ? pad + i * step : width / 2,
    y: scale.y(value),
  }));
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** An SVG path through the points. */
export function linePath(points: readonly Plotted[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');
}

/** The line closed down to the baseline, for filling. */
export function areaPath(points: readonly Plotted[], baseline: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath(points)} L${round(last.x)} ${round(baseline)} L${round(first.x)} ${round(baseline)} Z`;
}

/** One bar per value, growing up from zero (or down, for a negative value). */
export function bars(
  values: readonly number[],
  width: number,
  scale: ValueScale,
  pad: number,
  gap: number,
): Bar[] {
  const slot = (width - pad * 2) / Math.max(values.length, 1);
  const barWidth = Math.max(slot - gap, 1);
  return values.map((value, i) => {
    const top = Math.min(scale.y(value), scale.zero);
    return {
      x: round(pad + i * slot + (slot - barWidth) / 2),
      y: round(top),
      width: round(barWidth),
      height: round(Math.abs(scale.zero - scale.y(value))),
    };
  });
}

/**
 * The text alternative for a chart: every value when there are a dozen or fewer, otherwise the
 * range and the ends, which is what a reader of the drawing takes from it.
 */
export function describeSeries(
  points: readonly ChartPoint[],
  format: (value: number) => string,
): string {
  if (points.length === 0) return 'No data';
  const point = (p: ChartPoint): string => `${p.label} ${format(p.value)}`.trim();
  if (points.length <= 12) return points.map(point).join(', ');
  const values = points.map((p) => p.value);
  return (
    `${points.length} values from ${format(Math.min(...values))} to ${format(Math.max(...values))}, ` +
    `starting at ${point(points[0]!)} and ending at ${point(points[points.length - 1]!)}`
  );
}
