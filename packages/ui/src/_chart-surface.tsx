import { tokenRefToCssVar } from '@usemotif/core';
import type { ElementType, ReactElement, ReactNode } from 'react';

export interface ChartPrimitives {
  readonly Path: ElementType;
  readonly Rect: ElementType;
  readonly Line: ElementType;
}

const PRIMITIVES: ChartPrimitives = { Path: 'path', Rect: 'rect', Line: 'line' };

/** The SVG elements to draw with: plain tags on web. */
export function useChartPrimitives(): ChartPrimitives | null {
  return PRIMITIVES;
}

/** A colour for a token chain: on web, a `var()` the theme fills in. */
export function useChartPaint(): (chain: string) => string {
  return paint;
}

function paint(chain: string): string {
  return tokenRefToCssVar(chain as `$${string}`) ?? chain;
}

export interface ChartSvgProps {
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly children: ReactNode;
}

/** The chart's drawing surface, announced as one image carrying the text alternative. */
export function ChartSvg({ width, height, label, children }: ChartSvgProps): ReactElement {
  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', overflow: 'visible' }}
    >
      {children}
    </svg>
  );
}
