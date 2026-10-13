import {
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Modal, Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { addMonths, isSameDay } from './_date-math.js';
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

export interface CalendarProps {
  value?: Date | undefined;
  defaultValue?: Date;
  onValueChange?: (next: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  /** Controlled view-month (which month is on screen). */
  viewMonth?: Date;
  defaultViewMonth?: Date;
  onViewMonthChange?: (next: Date) => void;
  renderDay?: (info: {
    date: Date;
    isSelected: boolean;
    isOutside: boolean;
    isDisabled: boolean;
    isToday: boolean;
  }) => ReactNode;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Calendar({
  value: controlledValue,
  defaultValue,
  onValueChange,
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
}: CalendarProps): ReactElement {
  const [value, commitValue] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });

  const [viewMonth, setViewMonth] = useControllableState({
    value: controlledViewMonth,
    defaultValue: defaultViewMonth ?? value ?? new Date(),
    onChange: onViewMonthChange,
  });

  const select = useCallback(
    (d: Date) => {
      const day = startOfDay(d);
      commitValue(day);
    },
    [commitValue],
  );

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
          const isOutside = d.getMonth() !== viewMonth.getMonth();
          const isSelected = value !== undefined && isSameDay(d, value);
          const isToday = isSameDay(d, today);
          const isDisabled = dayDisabled(d);
          const child =
            renderDay !== undefined
              ? renderDay({ date: d, isSelected, isOutside, isDisabled, isToday })
              : null;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              accessibilityLabel={d.toDateString()}
              disabled={isDisabled}
              onPress={() => select(d)}
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

export interface DatePickerProps extends Omit<CalendarProps, 'style' | 'renderDay'> {
  format?: (d: Date) => string;
  placeholder?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render fn for the trigger button. Defaults to a Pressable
   * showing the formatted value or placeholder. */
  renderTrigger?: (info: { value: Date | undefined; open: () => void }) => ReactElement;
  renderDay?: CalendarProps['renderDay'];
  triggerStyle?: ViewStyle;
  modalStyle?: ViewStyle;
}

export function DatePicker({
  format,
  placeholder = 'Pick a date',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  renderTrigger,
  renderDay,
  triggerStyle,
  modalStyle,
  ...calendarProps
}: DatePickerProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  // Track the committed selection locally so the trigger label reflects an
  // *uncontrolled* Calendar's internal pick (the Calendar owns that state and
  // DatePicker can't otherwise read it). Controlled mode keeps `value`
  // authoritative; uncontrolled mode mirrors onValueChange into `committed`.
  const [current, commit] = useControllableState({
    value: calendarProps.value,
    defaultValue: calendarProps.defaultValue,
    onChange: calendarProps.onValueChange,
    controlled: 'value' in calendarProps,
  });
  const formatted =
    current !== undefined ? (format?.(current) ?? current.toDateString()) : placeholder;

  return (
    <View>
      {renderTrigger !== undefined ? (
        renderTrigger({ value: current, open: () => setOpen(true) })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={formatted}
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
            <Calendar
              {...calendarProps}
              // Feed the committed selection back so the grid stays in sync
              // with the label across reopens (the modal may remount it).
              value={current}
              {...(renderDay !== undefined ? { renderDay } : {})}
              onValueChange={(d) => {
                commit(d);
                setOpen(false);
              }}
            />
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
