export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  // Clamp the day to the target month's last day before shifting, so paging
  // from a 31st doesn't overflow into the next month (Jan 31 + 1 → Mar 3) and
  // skip/repeat months. Set day to 1, change the month, then restore the day
  // clamped to that month's length.
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** A picked date range. `end` is `null` while the second date is still to be picked. */
export interface DateRange {
  readonly start: Date;
  readonly end: Date | null;
}

function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

/**
 * The range after picking `day`: no range or a finished one starts a new range,
 * an open one finishes, with the two dates swapped when `day` comes first.
 */
export function nextRange(range: DateRange | undefined, day: Date): DateRange {
  if (range === undefined || range.end !== null) return { start: day, end: null };
  return dayKey(day) < dayKey(range.start)
    ? { start: day, end: range.start }
    : { start: range.start, end: day };
}

/** Where `day` sits in `range`, compared by calendar day. */
export function rangeFlags(
  range: DateRange | undefined,
  day: Date,
): { isRangeStart: boolean; isRangeEnd: boolean; isInRange: boolean } {
  if (range === undefined) return { isRangeStart: false, isRangeEnd: false, isInRange: false };
  const key = dayKey(day);
  const start = dayKey(range.start);
  const end = range.end === null ? start : dayKey(range.end);
  return {
    isRangeStart: key === start,
    isRangeEnd: range.end !== null && key === end,
    isInRange: key >= start && key <= end,
  };
}
