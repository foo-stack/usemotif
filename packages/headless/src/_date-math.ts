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
