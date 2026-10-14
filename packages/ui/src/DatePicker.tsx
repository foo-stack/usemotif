'use client';

import {
  DatePicker as HeadlessDatePicker,
  type CalendarDayInfo,
  type DatePickerProps as HeadlessDatePickerProps,
  type RangeDatePickerProps as HeadlessRangeDatePickerProps,
} from '@usemotif/headless';
import { type CSSProperties, type ReactNode } from 'react';
import { Box } from 'usemotif';

export type DatePickerProps = HeadlessDatePickerProps;
export type RangeDatePickerProps = HeadlessRangeDatePickerProps;

const DAY_HOVER = { bg: '$colors.surface.interactive' } as const;

/**
 * Stable `renderDay` reference (lint: no-new-fn-as-prop). Duplicated from
 * `Calendar` rather than imported so each kit entry stays an independent
 * code-split chunk. The headless DatePicker forwards it into its inner Calendar.
 */
function renderThemedDay(info: CalendarDayInfo): ReactNode {
  const { date, isToday, isOutsideMonth, isDisabled } = info;
  // Days between a range's ends take a soft tint; the ends paint as selected.
  const isBetween = info.isInRange && !info.isRangeStart && !info.isRangeEnd;
  const isSelected = info.isSelected && !isBetween;
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      height={36}
      m={2}
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      borderWidth="$borderWidths.thin"
      borderColor={isToday && !isSelected ? '$colors.action.primary.bg' : 'transparent'}
      bg={
        isSelected
          ? '$colors.action.primary.bg'
          : isBetween
            ? '$colors.status.info.tint'
            : 'transparent'
      }
      color={
        isSelected
          ? '$colors.text.inverse'
          : isBetween
            ? '$colors.status.info.fg'
            : isDisabled || isOutsideMonth
              ? '$colors.text.muted'
              : '$colors.text.default'
      }
      opacity={isDisabled ? 0.5 : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      {...(isSelected || isBetween || isDisabled ? {} : { _hover: DAY_HOVER })}
    >
      {date.getDate()}
    </Box>
  );
}

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
