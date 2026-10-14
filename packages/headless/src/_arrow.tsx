'use client';

import { createContext, useContext, type CSSProperties, type ReactElement } from 'react';
import type { Placement } from './positioning.js';

/** Where a floating element landed, for its Arrow: the side, and how far
 * along that edge the trigger's centre sits. */
export interface ArrowAnchor {
  readonly placement: Placement;
  readonly offset: number;
}
export const ArrowContext = createContext<ArrowAnchor | null>(null);

export interface FloatingArrowProps {
  /** Width of the square the arrow is cut from, in px. Defaults to 8. */
  size?: number;
  /** Draws the two outer edges in this colour, to continue a bordered surface. */
  borderColor?: string;
  /** Border width with `borderColor`, in px. Defaults to 1. */
  borderWidth?: number;
  /** Style for the arrow, such as its `background`. */
  style?: CSSProperties;
}

/** The edge the arrow sits on, by the side the surface landed on. */
const EDGE: Readonly<Record<Placement, 'top' | 'bottom' | 'left' | 'right'>> = {
  bottom: 'top',
  top: 'bottom',
  right: 'left',
  left: 'right',
};

/** The two edges of the rotated square that face out, by the edge it sits on. */
const OUTER: Readonly<Record<Placement, readonly [string, string]>> = {
  top: ['borderTop', 'borderLeft'],
  bottom: ['borderBottom', 'borderRight'],
  left: ['borderBottom', 'borderLeft'],
  right: ['borderTop', 'borderRight'],
};

/**
 * An arrow on the edge of a Popover, Tooltip, or HoverCard that points at the
 * trigger, and follows the surface when it flips or shifts. It is a square
 * turned 45 degrees, straddling the edge; render it first inside the content,
 * with the surface's background, so the surface covers its inner half.
 *
 * ```tsx
 * <Popover.Content>
 *   <Popover.Arrow style={{ background: 'white' }} borderColor="#ddd" />
 *   Settings
 * </Popover.Content>
 * ```
 */
export function FloatingArrow({
  size = 8,
  borderColor,
  borderWidth = 1,
  style,
}: FloatingArrowProps): ReactElement | null {
  const anchor = useContext(ArrowContext);
  if (anchor === null) return null;
  const edge = EDGE[anchor.placement];
  const vertical = edge === 'top' || edge === 'bottom';
  const border =
    borderColor === undefined
      ? {}
      : Object.fromEntries(
          OUTER[edge].map((side) => [side, `${borderWidth}px solid ${borderColor}`]),
        );
  return (
    <div
      aria-hidden="true"
      data-side={edge}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        boxSizing: 'border-box',
        transform: 'rotate(45deg)',
        [edge]: -size / 2,
        [vertical ? 'left' : 'top']: anchor.offset - size / 2,
        ...border,
        ...style,
      }}
    />
  );
}
