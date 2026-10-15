import { Calendar as HeadlessCalendar } from '@usemotif/headless';
import type { ReactElement } from 'react';
import type { CalendarProps, RangeCalendarProps } from './Calendar.js';
import { renderThemedDay } from './_themed-day.js';

export type { CalendarProps, RangeCalendarProps };

/**
 * Native Calendar: the headless native calendar painting the kit's days. The
 * web grid's surface styles are CSS (`var()` colours, a `border` shorthand),
 * which a React Native view cannot take, so they are left out.
 */
export function Calendar({
  renderDay,
  style: _style,
  ...rest
}: CalendarProps | RangeCalendarProps): ReactElement {
  return <HeadlessCalendar {...rest} renderDay={renderDay ?? renderThemedDay} />;
}
