'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { PopoverContent, PopoverRoot, PopoverTrigger } from './Popover.js';
import { addMonths, isSameDay, nextRange, rangeFlags, type DateRange } from './_date-math.js';

export type { DateRange } from './_date-math.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Date / time family - Calendar, DatePicker, TimeInput.
 *
 * v0 ships:
 * - Calendar: a focusable month grid with full keyboard nav
 *   (Arrow keys move day-by-day, PageUp/Down jump month, Home/End
 *   jump start/end of week, Enter selects).
 * - DatePicker: thin Popover-around-Calendar composition.
 * - TimeInput: native `<input type="time">` wrapper.
 *
 * Date math uses the platform `Date` directly. A v1.x patch will
 * likely move to `Temporal` (Stage 4 since 2024) or
 * `@js-temporal/polyfill` for cleaner timezone semantics. Today's
 * implementation is locale-aware via `Intl.DateTimeFormat` for
 * weekday / month labels.
 */

// ─────────── Calendar helpers ─────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─────────── Calendar ─────────────────────────────────────────────

// Built-in month layout. Without these, the grid's rows and cells are
// bare block divs and the whole month collapses into a vertical line.
// Each row lays its cells out horizontally and every cell takes an equal
// 1/7 column (`flex: 1 1 0`), so the 7-column month works out of the box.
// They establish layout only - no colours, borders, or fixed sizing - so
// they stay visually neutral and compose with the grid `style` prop and
// `renderDay` cell content. Rows/cells stay real boxes (not
// `display: contents`) to keep the ARIA grid intact in the a11y tree.
const CAL_ROW_STYLE: CSSProperties = { display: 'flex' };
const CAL_CELL_STYLE: CSSProperties = { flex: '1 1 0', minWidth: 0 };

/** What a `renderDay` callback is told about one day cell. */
export interface CalendarDayInfo {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isOutsideMonth: boolean;
  isDisabled: boolean;
  /** Range mode: the range's first day. Always `false` in single mode. */
  isRangeStart: boolean;
  /** Range mode: the range's last day, once picked. Always `false` in single mode. */
  isRangeEnd: boolean;
  /** Range mode: inside the range, ends included. Always `false` in single mode. */
  isInRange: boolean;
}

/** Props both selection modes share. */
export interface CalendarBaseProps {
  /** Locale used for weekday + month labels. Defaults to navigator
   * locale. */
  locale?: string;
  /** Marks days disabled. */
  isDisabled?: (date: Date) => boolean;
  /** First day of week, 0=Sunday..6=Saturday. Defaults to 0. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Inline style for the grid. */
  style?: CSSProperties;
  /** Override how each day cell renders. */
  renderDay?: (info: CalendarDayInfo) => ReactNode;
  /** Earliest selectable day. Earlier days are disabled, and focus stops here. */
  minDate?: Date;
  /** Latest selectable day. Later days are disabled, and focus stops here. */
  maxDate?: Date;
  /** Consecutive months shown side by side. Defaults to 1. */
  numberOfMonths?: number;
}

export interface CalendarProps extends CalendarBaseProps {
  /** Picks one date. The default. */
  mode?: 'single';
  value?: Date | undefined;
  defaultValue?: Date;
  onValueChange?: (next: Date) => void;
}

/**
 * Picks a start and an end date. The first pick starts the range (`end` is
 * `null`), the second finishes it, swapping the two if it is earlier.
 */
export interface RangeCalendarProps extends CalendarBaseProps {
  mode: 'range';
  value?: DateRange | undefined;
  defaultValue?: DateRange;
  /** Called on both picks; `end` is `null` after the first. */
  onValueChange?: (next: DateRange) => void;
}

const NO_RANGE = { isRangeStart: false, isRangeEnd: false, isInRange: false } as const;

/**
 * A month grid with keyboard navigation. Pass `mode="range"` to pick a start
 * and an end date.
 */
export function Calendar(props: CalendarProps | RangeCalendarProps): ReactElement {
  return props.mode === 'range' ? <RangeCalendar {...props} /> : <SingleCalendar {...props} />;
}

function SingleCalendar(props: CalendarProps): ReactElement {
  const { value, defaultValue, onValueChange, mode: _mode, ...base } = props;
  // Prop-presence detection so a controlled Calendar cleared to
  // `value={undefined}` stays controlled (no selection), not stale.
  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  return (
    <CalendarGrid
      {...base}
      initialFocus={selected}
      select={setSelected}
      dayState={(d) => ({
        isSelected: selected !== undefined && isSameDay(d, selected),
        ...NO_RANGE,
      })}
    />
  );
}

function RangeCalendar(props: RangeCalendarProps): ReactElement {
  const { value, defaultValue, onValueChange, mode: _mode, ...base } = props;
  const [range, setRange] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  return (
    <CalendarGrid
      {...base}
      initialFocus={range?.start}
      select={(d) => setRange(nextRange(range, d))}
      dayState={(d) => {
        const flags = rangeFlags(range, d);
        return { isSelected: flags.isInRange, ...flags };
      }}
    />
  );
}

interface CalendarGridProps extends CalendarBaseProps {
  initialFocus: Date | undefined;
  select: (day: Date) => void;
  dayState: (
    day: Date,
  ) => Pick<CalendarDayInfo, 'isSelected' | 'isRangeStart' | 'isRangeEnd' | 'isInRange'>;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `day` moved inside `[min, max]`, compared by calendar day. */
function clampDay(day: Date, min: Date | undefined, max: Date | undefined): Date {
  if (min !== undefined && startOfDay(day) < startOfDay(min)) return startOfDay(min);
  if (max !== undefined && startOfDay(day) > startOfDay(max)) return startOfDay(max);
  return day;
}

/** Whole months from `a`'s month to `b`'s. */
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
}

function CalendarGrid(props: CalendarGridProps): ReactElement {
  const {
    locale,
    isDisabled,
    weekStartsOn = 0,
    style,
    renderDay,
    initialFocus,
    select,
    dayState,
    minDate,
    maxDate,
    numberOfMonths = 1,
  } = props;
  const months = Math.max(1, Math.floor(numberOfMonths));
  const [focusedDay, setFocusedDay] = useState<Date>(() =>
    clampDay(initialFocus ?? new Date(), minDate, maxDate),
  );
  // The first month on screen. It only moves when focus leaves the visible
  // window, so moving between months already shown does not shift the view.
  const [firstMonth, setFirstMonth] = useState<Date>(() => startOfMonth(focusedDay));
  const offset = monthsBetween(firstMonth, focusedDay);
  if (offset < 0 || offset >= months) {
    setFirstMonth(addMonths(startOfMonth(focusedDay), offset < 0 ? 0 : 1 - months));
  }

  // Roving focus: move real DOM focus to the focused cell when it changes,
  // but only while focus is already inside the grid (i.e. the user is
  // navigating with the keyboard) - otherwise this would steal focus on
  // every render. Without this, arrow keys only update `focusedDay` state
  // and the `tabIndex` roving is cosmetic: focus stays on the container and
  // assistive tech never announces the newly focused day.
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedCellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rootRef.current?.contains(document.activeElement)) {
      focusedCellRef.current?.focus();
    }
  }, [focusedDay]);

  const dayDisabled = (d: Date): boolean =>
    isDisabled?.(d) === true ||
    (minDate !== undefined && startOfDay(d) < startOfDay(minDate)) ||
    (maxDate !== undefined && startOfDay(d) > startOfDay(maxDate));

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    let next: Date | null = null;
    switch (e.key) {
      case 'ArrowLeft':
        next = addDays(focusedDay, -1);
        break;
      case 'ArrowRight':
        next = addDays(focusedDay, 1);
        break;
      case 'ArrowUp':
        next = addDays(focusedDay, -7);
        break;
      case 'ArrowDown':
        next = addDays(focusedDay, 7);
        break;
      case 'PageUp':
        next = addMonths(focusedDay, -1);
        break;
      case 'PageDown':
        next = addMonths(focusedDay, 1);
        break;
      case 'Home':
      case 'End': {
        // Days since the start of the current week, normalised modulo 7 so
        // it stays in [0, 6] for any weekStartsOn. The previous
        // `-getDay() + weekStartsOn` math wasn't normalised, so e.g. a
        // Sunday (getDay()===0) with weekStartsOn=1 moved +1 day forward
        // instead of back to the week start.
        const sinceWeekStart = (focusedDay.getDay() - weekStartsOn + 7) % 7;
        next = addDays(focusedDay, e.key === 'Home' ? -sinceWeekStart : 6 - sinceWeekStart);
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!dayDisabled(focusedDay)) select(focusedDay);
        return;
      default:
        return;
    }
    e.preventDefault();
    setFocusedDay(clampDay(next, minDate, maxDate));
  }

  const month = (i: number, gridRef?: Ref<HTMLDivElement>): ReactElement => (
    <MonthGrid
      key={i}
      gridRef={gridRef}
      monthStart={addMonths(firstMonth, i)}
      locale={locale}
      weekStartsOn={weekStartsOn}
      style={style}
      renderDay={renderDay}
      focusedDay={focusedDay}
      focusedCellRef={focusedCellRef}
      hideOutsideDays={months > 1}
      dayDisabled={dayDisabled}
      dayState={dayState}
      onKeyDown={onKeyDown}
      onPick={(d) => {
        setFocusedDay(d);
        select(d);
      }}
    />
  );
  // One month renders its grid alone, exactly as before multi-month support.
  if (months === 1) return month(0, rootRef);
  return (
    <div ref={rootRef} style={MONTHS_ROW_STYLE}>
      {Array.from({ length: months }, (_, i) => month(i))}
    </div>
  );
}

const MONTHS_ROW_STYLE: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 24 };

function MonthGrid({
  gridRef,
  monthStart,
  locale,
  weekStartsOn,
  style,
  renderDay,
  focusedDay,
  focusedCellRef,
  hideOutsideDays,
  dayDisabled,
  dayState,
  onKeyDown,
  onPick,
}: {
  gridRef: Ref<HTMLDivElement> | undefined;
  monthStart: Date;
  locale: string | undefined;
  weekStartsOn: number;
  style: CSSProperties | undefined;
  renderDay: CalendarBaseProps['renderDay'];
  focusedDay: Date;
  focusedCellRef: Ref<HTMLDivElement>;
  hideOutsideDays: boolean;
  dayDisabled: (d: Date) => boolean;
  dayState: CalendarGridProps['dayState'];
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onPick: (d: Date) => void;
}): ReactElement {
  const today = new Date();
  const dayLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, ((weekStartsOn + i) % 7) + 7); // arbitrary week with known weekday alignment
    return weekdayFmt.format(d);
  });

  // Build the grid: pad start with previous-month days, fill 6 weeks (42 cells).
  const lead = (monthStart.getDay() - weekStartsOn + 7) % 7;
  const gridStart = addDays(monthStart, -lead);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div
      ref={gridRef}
      role="grid"
      onKeyDown={onKeyDown}
      aria-label={new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        monthStart,
      )}
      style={style}
    >
      <div role="row" style={CAL_ROW_STYLE}>
        {weekdayHeaders.map((w, i) => (
          <div key={i} role="columnheader" aria-label={w} style={CAL_CELL_STYLE}>
            {w}
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, weekIdx) => (
        <div role="row" key={weekIdx} style={CAL_ROW_STYLE}>
          {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((d, i) => {
            const isOutsideMonth = d.getMonth() !== monthStart.getMonth();
            // Beside another month the day belongs to that one; leave a gap.
            if (isOutsideMonth && hideOutsideDays) {
              return <div key={i} role="gridcell" style={CAL_CELL_STYLE} />;
            }
            const state = dayState(d);
            const disabled = dayDisabled(d);
            const isFocused = !isOutsideMonth && isSameDay(d, focusedDay);
            return (
              // Keyboard activation lives on the parent grid (Enter / Space
              // on the focused cell triggers the same select). The
              // jsx-a11y rule can't see the parent listener, so disable it
              // here; the cell is fully keyboard-accessible via the grid.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                key={i}
                ref={isFocused ? focusedCellRef : undefined}
                role="gridcell"
                aria-selected={state.isSelected}
                aria-disabled={disabled || undefined}
                tabIndex={isFocused ? 0 : -1}
                aria-label={dayLabel.format(d)}
                style={CAL_CELL_STYLE}
                onClick={() => {
                  if (!disabled) onPick(d);
                }}
              >
                {renderDay !== undefined
                  ? renderDay({
                      date: d,
                      ...state,
                      isToday: isSameDay(d, today),
                      isOutsideMonth,
                      isDisabled: disabled,
                    })
                  : d.getDate()}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────── DatePicker ───────────────────────────────────────────

/** Props the single and range date pickers share. */
export interface DatePickerOptions {
  /** What renders as the trigger. Receives the formatted current
   * value + an `onClick` to open the calendar. */
  renderTrigger?: (info: { label: string; onClick: () => void }) => ReactNode;
  placeholder?: string;
  popoverStyle?: CSSProperties;
  triggerStyle?: CSSProperties;
}

export interface DatePickerProps extends CalendarProps, DatePickerOptions {}

/** A range date picker: stays open after the first pick, closes after the second. */
export interface RangeDatePickerProps extends RangeCalendarProps, DatePickerOptions {}

/**
 * A trigger that opens a `Calendar` in a popover. Pass `mode="range"` to pick a
 * start and an end date.
 */
export function DatePicker(props: DatePickerProps | RangeDatePickerProps): ReactElement {
  return props.mode === 'range' ? <RangeDatePicker {...props} /> : <SingleDatePicker {...props} />;
}

function SingleDatePicker(props: DatePickerProps): ReactElement {
  const { value, defaultValue, onValueChange, placeholder = 'Pick a date', ...rest } = props;
  const [open, setOpen] = useState(false);
  // Track the committed selection locally so the trigger label reflects what
  // the (uncontrolled) Calendar holds internally - the Calendar owns its own
  // state, which DatePicker cannot otherwise read. In controlled mode `value`
  // stays authoritative; in uncontrolled mode we mirror Calendar's
  // onValueChange into `committed`.
  const [current, commit] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const label =
    current === undefined
      ? placeholder
      : new Intl.DateTimeFormat(rest.locale, { dateStyle: 'medium' }).format(current);
  return (
    <DatePickerShell {...rest} label={label} open={open} setOpen={setOpen}>
      {(calendarProps) => (
        <Calendar
          {...calendarProps}
          // Feed the committed selection back in: Popover.Content unmounts on
          // close, so the Calendar remounts on reopen - passing the original
          // defaultValue would resurrect the stale default and lose the pick.
          // `current` (controlled value or mirrored committed pick) keeps the
          // reopened grid in sync with the trigger label.
          value={current}
          onValueChange={(d) => {
            commit(d);
            setOpen(false);
          }}
        />
      )}
    </DatePickerShell>
  );
}

function RangeDatePicker(props: RangeDatePickerProps): ReactElement {
  const { value, defaultValue, onValueChange, placeholder = 'Pick dates', ...rest } = props;
  const [open, setOpen] = useState(false);
  const [current, commit] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const fmt = new Intl.DateTimeFormat(rest.locale, { dateStyle: 'medium' });
  const label =
    current === undefined
      ? placeholder
      : current.end === null
        ? fmt.format(current.start)
        : fmt.formatRange(current.start, current.end);
  return (
    <DatePickerShell {...rest} label={label} open={open} setOpen={setOpen}>
      {(calendarProps) => (
        <Calendar
          {...calendarProps}
          mode="range"
          value={current}
          onValueChange={(range) => {
            commit(range);
            if (range.end !== null) setOpen(false);
          }}
        />
      )}
    </DatePickerShell>
  );
}

interface DatePickerShellProps extends CalendarBaseProps, DatePickerOptions {
  mode?: 'single' | 'range';
  label: string;
  open: boolean;
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  children: (calendarProps: CalendarBaseProps) => ReactNode;
}

function DatePickerShell({
  label,
  open,
  setOpen,
  renderTrigger,
  popoverStyle,
  triggerStyle,
  placeholder: _placeholder,
  mode: _mode,
  children,
  ...calendarProps
}: DatePickerShellProps): ReactElement {
  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        {renderTrigger !== undefined ? (
          (renderTrigger({ label, onClick: () => setOpen((v) => !v) }) as ReactElement)
        ) : (
          <button type="button" style={triggerStyle}>
            {label}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent {...(popoverStyle !== undefined ? { style: popoverStyle } : {})}>
        {children(calendarProps)}
      </PopoverContent>
    </PopoverRoot>
  );
}

// ─────────── TimeInput ────────────────────────────────────────────

export interface TimeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** `'HH:mm'` or `'HH:mm:ss'`. Defaults to `'HH:mm'`. */
  precision?: 'minute' | 'second';
}

export const TimeInput = forwardRef(function TimeInput(
  { precision = 'minute', step, ...rest }: TimeInputProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const id = useId();
  return (
    <input
      ref={ref}
      type="time"
      id={id}
      step={step ?? (precision === 'second' ? 1 : undefined)}
      {...rest}
    />
  );
});
