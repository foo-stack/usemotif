'use client';

import {
  Calendar as HeadlessCalendar,
  type CalendarProps as HeadlessCalendarProps,
  type RangeCalendarProps as HeadlessRangeCalendarProps,
} from '@usemotif/headless';
import { useMemo, type CSSProperties } from 'react';
import { renderThemedDay } from './_themed-day.js';

export type CalendarProps = HeadlessCalendarProps;
export type RangeCalendarProps = HeadlessRangeCalendarProps;

// The headless Calendar applies this `style` to its role="grid" container. Themed
// via token CSS vars (hex fallbacks), like TimeInput - `style` here is raw
// CSSProperties, not Box style-props.
const CALENDAR_GRID_STYLE: CSSProperties = {
  width: 280,
  padding: '12px',
  borderRadius: 'var(--radii-lg, 12px)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  background: 'var(--colors-surface-raised, #fff)',
  color: 'var(--colors-text-default, #111)',
  font: 'inherit',
};

/**
 * Themed month calendar over the accessible headless `Calendar` - a focusable
 * `role="grid"` with full keyboard nav (arrows day-by-day, PageUp/Down month,
 * Home/End week, Enter/Space select), locale-aware labels, controlled or
 * uncontrolled. The kit themes the grid surface and paints each day (selected,
 * today ring, outside-month + disabled muted, range ends solid and the days
 * between tinted) through `renderDay`; pass your own `renderDay` to fully
 * override the cell. `mode="range"` picks a start and an end date.
 *
 * ```tsx
 * <Calendar defaultValue={new Date()} onValueChange={setDate} />
 * <Calendar mode="range" onValueChange={setRange} />
 * ```
 */
export function Calendar({ style, renderDay, ...rest }: CalendarProps | RangeCalendarProps) {
  const mergedStyle = useMemo<CSSProperties>(
    () => (style !== undefined ? { ...CALENDAR_GRID_STYLE, ...style } : CALENDAR_GRID_STYLE),
    [style],
  );
  return (
    <HeadlessCalendar {...rest} style={mergedStyle} renderDay={renderDay ?? renderThemedDay} />
  );
}
