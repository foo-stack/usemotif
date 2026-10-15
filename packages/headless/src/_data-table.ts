export type SortDirection = 'ascending' | 'descending';

export interface SortState {
  readonly columnId: string;
  readonly direction: SortDirection;
}

/** The sort after activating `columnId`'s header: unsorted, then ascending, then descending. */
export function nextSort(current: SortState | null, columnId: string): SortState | null {
  if (current === null || current.columnId !== columnId)
    return { columnId, direction: 'ascending' };
  return current.direction === 'ascending' ? { columnId, direction: 'descending' } : null;
}

/**
 * The rows ordered by `value`, stably. Numbers compare as numbers, everything
 * else as text with numeric runs in order (`file2` before `file10`), and
 * empty values (`null`, `undefined`, `''`) always last.
 */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => unknown,
  direction: SortDirection,
): T[] {
  const sign = direction === 'ascending' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, key: value(row) }))
    .sort((a, b) => {
      const emptyA = isEmpty(a.key);
      const emptyB = isEmpty(b.key);
      if (emptyA || emptyB) return emptyA === emptyB ? a.index - b.index : emptyA ? 1 : -1;
      const order =
        typeof a.key === 'number' && typeof b.key === 'number'
          ? a.key - b.key
          : String(a.key).localeCompare(String(b.key), undefined, { numeric: true });
      return order === 0 ? a.index - b.index : order * sign;
    })
    .map((entry) => entry.row);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * The rows to render for a scroll position: those in view plus `overscan` on
 * each side, as `[start, end)` indexes into the row list.
 */
export function rowWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  count: number,
  overscan: number,
): { start: number; end: number } {
  if (rowHeight <= 0 || viewportHeight <= 0) return { start: 0, end: count };
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visible = Math.ceil(viewportHeight / rowHeight) + 1;
  return {
    start: Math.max(0, first - overscan),
    end: Math.min(count, first + visible + overscan),
  };
}

/** The selection after toggling `id`: only that row in single mode, added or removed in multiple. */
export function toggleSelection(
  selected: ReadonlySet<string>,
  id: string,
  mode: 'single' | 'multiple',
): Set<string> {
  if (mode === 'single') return selected.has(id) && selected.size === 1 ? new Set() : new Set([id]);
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** A column width kept within its bounds. */
export function clampWidth(width: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(width)));
}
