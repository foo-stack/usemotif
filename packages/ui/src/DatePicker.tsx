'use client';

import {
  DatePicker as HeadlessDatePicker,
  type DatePickerProps as HeadlessDatePickerProps,
  type RangeDatePickerProps as HeadlessRangeDatePickerProps,
} from '@usemotif/headless';
import type { CSSProperties } from 'react';
import { renderThemedDay } from './_themed-day.js';

export type DatePickerProps = HeadlessDatePickerProps;
export type RangeDatePickerProps = HeadlessRangeDatePickerProps;

// The inner grid lives inside the themed popover, so it carries no chrome of its
// own (no border/bg) - just layout. The popover provides the raised surface.
const CALENDAR_BARE_STYLE: CSSProperties = {
  width: 252,
  color: 'var(--colors-text-default, #111)',
  font: 'inherit',
};
const TRIGGER_STYLE: CSSProperties = {
  minWidth: 180,
  padding: '8px 12px',
  textAlign: 'left',
  borderRadius: 'var(--radii-lg, 12px)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  background: 'var(--colors-surface-default, #fff)',
  color: 'var(--colors-text-default, #111)',
  font: 'inherit',
  cursor: 'pointer',
};
const POPOVER_STYLE: CSSProperties = {
  padding: '12px',
  borderRadius: 'var(--radii-lg, 12px)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  background: 'var(--colors-surface-raised, #fff)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
};

/**
 * Themed date picker over the accessible headless `DatePicker` - a themed
 * trigger button that opens a `Popover` holding the themed `Calendar`. Defaults
 * theme the trigger, the popover surface, and each day; override any of
 * `triggerStyle` / `popoverStyle` / `style` (the grid) / `renderTrigger` /
 * `renderDay`. Controlled (`value` + `onValueChange`) or uncontrolled.
 * `mode="range"` picks a start and an end date, closing after the second.
 *
 * ```tsx
 * <DatePicker placeholder="Pick a date" onValueChange={setDate} />
 * <DatePicker mode="range" onValueChange={setRange} />
 * ```
 */
export function DatePicker({
  style,
  renderDay,
  triggerStyle,
  popoverStyle,
  ...rest
}: DatePickerProps | RangeDatePickerProps) {
  return (
    <HeadlessDatePicker
      {...rest}
      style={style ?? CALENDAR_BARE_STYLE}
      renderDay={renderDay ?? renderThemedDay}
      triggerStyle={triggerStyle ?? TRIGGER_STYLE}
      popoverStyle={popoverStyle ?? POPOVER_STYLE}
    />
  );
}
