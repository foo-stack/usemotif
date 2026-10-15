import { DatePicker as HeadlessDatePicker } from '@usemotif/headless';
import type { ReactElement } from 'react';
import type { DatePickerProps, RangeDatePickerProps } from './DatePicker.js';
import { renderThemedDay } from './_themed-day.js';

export type { DatePickerProps, RangeDatePickerProps };

/**
 * Native DatePicker: the headless native picker painting the kit's days,
 * without the web trigger and popover styles, which are CSS.
 */
export function DatePicker({
  renderDay,
  style: _style,
  triggerStyle: _triggerStyle,
  popoverStyle: _popoverStyle,
  ...rest
}: DatePickerProps | RangeDatePickerProps): ReactElement {
  return <HeadlessDatePicker {...rest} renderDay={renderDay ?? renderThemedDay} />;
}
