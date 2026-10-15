import type { CalendarDayInfo } from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box } from 'usemotif';
import { platformText } from './_platform-text.js';

const DAY_HOVER = { bg: '$colors.surface.interactive' } as const;

/**
 * Module-scoped so it's a stable `renderDay` reference (lint: no-new-fn-as-prop).
 * The headless Calendar owns each cell's `gridcell` role, `aria-selected`, and
 * click/focus wiring + computes its state; the kit just paints the day. Selected
 * uses `action.primary` (the cell is the headless `<div>`, not this Box, so the
 * selected paint is JS-driven from `info`, not the `_selected` pseudo).
 */
export function renderThemedDay(info: CalendarDayInfo): ReactNode {
  const { date, isToday, isOutsideMonth, isDisabled } = info;
  // Days between a range's ends take a soft tint; the ends paint as selected.
  const isBetween = info.isInRange && !info.isRangeStart && !info.isRangeEnd;
  const isSelected = info.isSelected && !isBetween;
  const color = isSelected
    ? '$colors.text.inverse'
    : isBetween
      ? '$colors.status.info.fg'
      : isDisabled || isOutsideMonth
        ? '$colors.text.muted'
        : '$colors.text.default';
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
      color={color}
      opacity={isDisabled ? 0.5 : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      {...(isSelected || isBetween || isDisabled ? {} : { _hover: DAY_HOVER })}
    >
      {platformText(date.getDate(), { color, fontSize: '$fontSizes.sm' })}
    </Box>
  );
}
