import { cloneElement, isValidElement, useMemo, type ReactElement, type ReactNode } from 'react';
import { Modal, Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { addMonths, isSameDay, nextRange, rangeFlags, type DateRange } from './_date-math.js';

export type { DateRange } from './_date-math.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native date/time family - Calendar / DatePicker / TimeInput.
 *
 * Calendar is a pure-JS month grid (no peer dep): same date math as
 * the web variant, View / Pressable in place of div / button.
 * DatePicker composes Calendar inside a Modal triggered by a
 * Pressable. TimeInput is a TextInput with `keyboardType="numbers-
 * and-punctuation"` and a basic HH:MM regex validator - apps that
 * need the iOS / Android native time picker should adopt
 * `@react-native-community/datetimepicker` and bypass this component.
 */

// ─────────── Calendar ─────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function buildMonthGrid(viewMonth: Date, weekStartsOn: number): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/** What a `renderDay` callback is told about one day cell. */
export interface CalendarDayInfo {
  date: Date;
  isSelected: boolean;
  isOutside: boolean;
  isDisabled: boolean;
  isToday: boolean;
  /** Range mode: the range's first day. Always `false` in single mode. */
  isRangeStart: boolean;
  /** Range mode: the range's last day, once picked. Always `false` in single mode. */
  isRangeEnd: boolean;
  /** Range mode: inside the range, ends included. Always `false` in single mode. */
  isInRange: boolean;
}

/** Props both selection modes share. */
export interface CalendarBaseProps {
  minDate?: Date;
  maxDate?: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  /** Controlled view-month (which month is on screen). */
  viewMonth?: Date;
  defaultViewMonth?: Date;
  onViewMonthChange?: (next: Date) => void;
  renderDay?: (info: CalendarDayInfo) => ReactNode;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export interface CalendarProps extends CalendarBaseProps {
  /** Picks one date. The default. */
  mode?: 'single';
  value?: Date | undefined;
  defaultValue?: Date;
  onValueChange?: (next: Date) => void;
}

/**
 * Picks a start and an end date. The first press starts the range (`end` is
 * `null`), the second finishes it, swapping the two if it is earlier.
 */
export interface RangeCalendarProps extends CalendarBaseProps {
  mode: 'range';
  value?: DateRange | undefined;
  defaultValue?: DateRange;
  /** Called on both presses; `end` is `null` after the first. */
  onValueChange?: (next: DateRange) => void;
}

const NO_RANGE = { isRangeStart: false, isRangeEnd: false, isInRange: false } as const;

/** A month grid. Pass `mode="range"` to pick a start and an end date. */
export function Calendar(props: CalendarProps | RangeCalendarProps): ReactElement {
  return props.mode === 'range' ? <RangeCalendar {...props} /> : <SingleCalendar {...props} />;
}

function SingleCalendar({
  value: controlledValue,
  defaultValue,
  onValueChange,
  mode: _mode,
  ...base
}: CalendarProps): ReactElement {
  const [value, commitValue] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <CalendarGrid
      {...base}
      initialMonth={value}
      select={commitValue}
      dayState={(d) => ({ isSelected: value !== undefined && isSameDay(d, value), ...NO_RANGE })}
    />
  );
}

function RangeCalendar({
  value: controlledValue,
  defaultValue,
  onValueChange,
  mode: _mode,
  ...base
}: RangeCalendarProps): ReactElement {
  const [range, commitRange] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <CalendarGrid
      {...base}
      initialMonth={range?.start}
      select={(d) => commitRange(nextRange(range, d))}
      dayState={(d) => {
        const flags = rangeFlags(range, d);
        return { isSelected: flags.isInRange, ...flags };
      }}
    />
  );
}

interface CalendarGridProps extends CalendarBaseProps {
  initialMonth: Date | undefined;
  select: (day: Date) => void;
  dayState: (
    day: Date,
  ) => Pick<CalendarDayInfo, 'isSelected' | 'isRangeStart' | 'isRangeEnd' | 'isInRange'>;
}

function CalendarGrid({
  minDate,
  maxDate,
  weekStartsOn = 0,
  isDateDisabled,
  viewMonth: controlledViewMonth,
  defaultViewMonth,
  onViewMonthChange,
  renderDay,
  accessibilityLabel,
  style,
  initialMonth,
  select,
  dayState,
}: CalendarGridProps): ReactElement {
  const [viewMonth, setViewMonth] = useControllableState({
    value: controlledViewMonth,
    defaultValue: defaultViewMonth ?? initialMonth ?? new Date(),
    onChange: onViewMonthChange,
  });

  const days = useMemo(() => buildMonthGrid(viewMonth, weekStartsOn), [viewMonth, weekStartsOn]);
  const today = useMemo(() => startOfDay(new Date()), []);

  function dayDisabled(d: Date): boolean {
    const day = startOfDay(d);
    if (minDate !== undefined && day < startOfDay(minDate)) return true;
    if (maxDate !== undefined && day > startOfDay(maxDate)) return true;
    if (isDateDisabled !== undefined && isDateDisabled(day)) return true;
    return false;
  }

  return (
    <View
      accessibilityLabel={
        accessibilityLabel ?? `${viewMonth.getFullYear()}-${viewMonth.getMonth() + 1} calendar`
      }
      style={style}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setViewMonth(addMonths(viewMonth, -1))}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setViewMonth(addMonths(viewMonth, 1))}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((d, i) => {
          const state = dayState(d);
          const isOutside = d.getMonth() !== viewMonth.getMonth();
          const isToday = isSameDay(d, today);
          const isDisabled = dayDisabled(d);
          const child =
            renderDay !== undefined
              ? renderDay({ date: d, ...state, isOutside, isDisabled, isToday })
              : null;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: state.isSelected, disabled: isDisabled }}
              accessibilityLabel={d.toDateString()}
              disabled={isDisabled}
              onPress={() => select(startOfDay(d))}
              style={{ width: `${100 / 7}%` }}
            >
              {child}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─────────── DatePicker ───────────────────────────────────────────

/** Props the single and range date pickers share. */
export interface DatePickerOptions {
  format?: (d: Date) => string;
  placeholder?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderDay?: (info: CalendarDayInfo) => ReactNode;
  triggerStyle?: ViewStyle;
  modalStyle?: ViewStyle;
}

export interface DatePickerProps
  extends Omit<CalendarProps, 'style' | 'renderDay'>, DatePickerOptions {
  /** Render fn for the trigger button. Defaults to a Pressable
   * showing the formatted value or placeholder. */
  renderTrigger?: (info: { value: Date | undefined; open: () => void }) => ReactElement;
}

/** A range date picker: stays open after the first press, closes after the second. */
export interface RangeDatePickerProps
  extends Omit<RangeCalendarProps, 'style' | 'renderDay'>, DatePickerOptions {
  renderTrigger?: (info: { value: DateRange | undefined; open: () => void }) => ReactElement;
}

/**
 * A trigger that opens a `Calendar` in a modal. Pass `mode="range"` to pick a
 * start and an end date.
 */
export function DatePicker(props: DatePickerProps | RangeDatePickerProps): ReactElement {
  return props.mode === 'range' ? <RangeDatePicker {...props} /> : <SingleDatePicker {...props} />;
}

function SingleDatePicker({
  renderTrigger,
  placeholder = 'Pick a date',
  ...props
}: DatePickerProps): ReactElement {
  // Track the committed selection locally so the trigger label reflects an
  // *uncontrolled* Calendar's internal pick (the Calendar owns that state and
  // DatePicker can't otherwise read it). Controlled mode keeps `value`
  // authoritative; uncontrolled mode mirrors onValueChange into `committed`.
  const [current, commit] = useControllableState({
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: props.onValueChange,
    controlled: 'value' in props,
  });
  const format = props.format ?? ((d: Date) => d.toDateString());
  return (
    <DatePickerShell
      {...props}
      label={current !== undefined ? format(current) : placeholder}
      renderTrigger={
        renderTrigger === undefined ? undefined : (open) => renderTrigger({ value: current, open })
      }
    >
      {(calendarProps, close) => (
        <Calendar
          {...calendarProps}
          // Feed the committed selection back so the grid stays in sync
          // with the label across reopens (the modal may remount it).
          value={current}
          onValueChange={(d) => {
            commit(d);
            close();
          }}
        />
      )}
    </DatePickerShell>
  );
}

function RangeDatePicker({
  renderTrigger,
  placeholder = 'Pick dates',
  ...props
}: RangeDatePickerProps): ReactElement {
  const [current, commit] = useControllableState({
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: props.onValueChange,
    controlled: 'value' in props,
  });
  const format = props.format ?? ((d: Date) => d.toDateString());
  const label =
    current === undefined
      ? placeholder
      : current.end === null
        ? format(current.start)
        : `${format(current.start)} - ${format(current.end)}`;
  return (
    <DatePickerShell
      {...props}
      label={label}
      renderTrigger={
        renderTrigger === undefined ? undefined : (open) => renderTrigger({ value: current, open })
      }
    >
      {(calendarProps, close) => (
        <Calendar
          {...calendarProps}
          mode="range"
          value={current}
          onValueChange={(range) => {
            commit(range);
            if (range.end !== null) close();
          }}
        />
      )}
    </DatePickerShell>
  );
}

interface DatePickerShellProps extends Omit<CalendarBaseProps, 'style'>, DatePickerOptions {
  mode?: 'single' | 'range';
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: unknown;
  label: string;
  renderTrigger: ((open: () => void) => ReactElement) | undefined;
  children: (calendarProps: CalendarBaseProps, close: () => void) => ReactNode;
}

function DatePickerShell({
  label,
  renderTrigger,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  triggerStyle,
  modalStyle,
  format: _format,
  placeholder: _placeholder,
  mode: _mode,
  value: _value,
  defaultValue: _defaultValue,
  onValueChange: _onValueChange,
  children,
  ...calendarProps
}: DatePickerShellProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return (
    <View>
      {renderTrigger !== undefined ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={label}
          onPress={() => setOpen(true)}
          style={triggerStyle}
        />
      )}
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation?.()} style={modalStyle}>
            {children(calendarProps, () => setOpen(false))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────── TimeInput ────────────────────────────────────────────

export interface TimeInputProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (next: string) => void;
  step?: number;
  min?: string;
  max?: string;
  accessibilityLabel?: string;
  placeholder?: string;
  /** Pass a TextInput element to clone, or omit for a plain default. */
  children?: ReactElement<{
    value?: string;
    onChangeText?: (next: string) => void;
    keyboardType?: 'default' | 'numbers-and-punctuation' | 'numeric';
  }>;
}

const TIME_RE = /^([0-1]?\d|2[0-3]):[0-5]\d$/;

export function TimeInput({
  value: controlled,
  defaultValue = '',
  onValueChange,
  accessibilityLabel = 'Time',
  placeholder = 'HH:MM',
  children,
}: TimeInputProps): ReactElement {
  const [value, setValue] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const sharedProps = {
    accessibilityLabel,
    accessibilityRole: 'text' as const,
    value,
    onChangeText: (text: string) => {
      // Soft validation - accept anything; fire onChange so the
      // caller can do its own validation. The TIME_RE constant is
      // exported below for callers that want it.
      setValue(text);
    },
    placeholder,
    keyboardType: 'numbers-and-punctuation' as const,
  };
  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <TextInput {...sharedProps} />;
}

/** Convenience regex for `HH:MM` validation. */
export const TIME_RE_24H = TIME_RE;
