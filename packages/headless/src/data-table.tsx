'use client';

import { useMessages } from '@usemotif/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  clampWidth,
  nextSort,
  rowWindow,
  sortRows,
  toggleSelection,
  type SortDirection,
  type SortState,
} from './_data-table.js';
import { useControllableState } from './use-controllable-state.js';

export type { SortDirection, SortState };

export interface DataTableColumn<T> {
  /** Stable id: the key for sort state and column widths. */
  readonly id: string;
  /** The header content. */
  readonly header: ReactNode;
  /** The value this column shows and sorts by. */
  readonly value?: (row: T) => unknown;
  /** The cell content. Defaults to `value(row)` as text. */
  readonly cell?: (row: T) => ReactNode;
  /** Whether the header sorts the rows. Needs `value`. */
  readonly sortable?: boolean;
  /** Initial width in px. Defaults to 160. */
  readonly width?: number;
  /** Narrowest the column resizes to. Defaults to 60. */
  readonly minWidth?: number;
  /** Widest the column resizes to. Defaults to 800. */
  readonly maxWidth?: number;
  /** Show a resize handle on the header. Defaults to `true`. */
  readonly resizable?: boolean;
}

export interface DataTableProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly DataTableColumn<T>[];
  /** A stable id per row, for selection and React keys. */
  readonly getRowId: (row: T, index: number) => string;
  /** Sort, controlled. `null` keeps the data's order. */
  readonly sort?: SortState | null;
  readonly defaultSort?: SortState | null;
  readonly onSortChange?: (sort: SortState | null) => void;
  /** `'none'` (the default), `'single'` or `'multiple'`. */
  readonly selectionMode?: 'none' | 'single' | 'multiple';
  /** Selected row ids, controlled. */
  readonly selected?: readonly string[];
  readonly defaultSelected?: readonly string[];
  readonly onSelectedChange?: (ids: string[]) => void;
  /** Column widths by id, controlled. Columns without an entry use their `width`. */
  readonly columnWidths?: Readonly<Record<string, number>>;
  readonly onColumnWidthsChange?: (widths: Record<string, number>) => void;
  /** Height of the scrolling grid in px. Defaults to 400. */
  readonly height?: number;
  /** Height of every row, header included, in px. Rows are windowed against it. Defaults to 40. */
  readonly rowHeight?: number;
  /** Rows rendered beyond the viewport on each side. Defaults to 6. */
  readonly overscan?: number;
  readonly 'aria-label'?: string;
  /** Renders a header cell's content. Defaults to `column.header`. */
  readonly renderHeader?: (
    column: DataTableColumn<T>,
    info: { sort: SortDirection | undefined },
  ) => ReactNode;
  /** The scrolling grid. */
  readonly style?: CSSProperties;
  /** The header row. */
  readonly headerStyle?: CSSProperties;
  /** Each header cell. */
  readonly headerCellStyle?: CSSProperties;
  /** Each body row. */
  readonly rowStyle?: (info: { selected: boolean; index: number }) => CSSProperties;
  /** Each body cell. */
  readonly cellStyle?: CSSProperties;
  /** The resize handle at a header's trailing edge. */
  readonly resizeHandleStyle?: CSSProperties;
}

const EMPTY: readonly string[] = [];
const NO_WIDTHS: Readonly<Record<string, number>> = {};

interface Cell {
  /** 0 is the header row; 1.. are body rows in display order. */
  readonly row: number;
  readonly col: number;
}

/**
 * A data grid: sortable columns, row selection, resizable columns, and the
 * WAI-ARIA grid keyboard model, with body rows windowed so a long list renders
 * only what is in view. Unstyled; the kit's DataTable themes it.
 *
 * Keyboard: the arrow keys move between cells (the header is the first row),
 * Home and End go to a row's ends, Ctrl+Home and Ctrl+End to the grid's,
 * PageUp and PageDown move a viewport. Enter or Space on a sortable header
 * sorts; Space on a row selects it.
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={people}
 *   getRowId={(p) => p.id}
 *   columns={[
 *     { id: 'name', header: 'Name', value: (p) => p.name, sortable: true },
 *     { id: 'age', header: 'Age', value: (p) => p.age, sortable: true, width: 80 },
 *   ]}
 *   selectionMode="multiple"
 *   aria-label="People"
 * />
 * ```
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  sort: controlledSort,
  defaultSort = null,
  onSortChange,
  selectionMode = 'none',
  selected: controlledSelected,
  defaultSelected = EMPTY,
  onSelectedChange,
  columnWidths: controlledWidths,
  onColumnWidthsChange,
  height = 400,
  rowHeight = 40,
  overscan = 6,
  renderHeader,
  style,
  headerStyle,
  headerCellStyle,
  rowStyle,
  cellStyle,
  resizeHandleStyle,
  ...aria
}: DataTableProps<T>): ReactElement {
  const messages = useMessages();
  const [sortValue, setSort] = useControllableState<SortState | null>({
    value: controlledSort,
    defaultValue: defaultSort,
    onChange: onSortChange,
    controlled: controlledSort !== undefined,
  });
  const sort = sortValue ?? null;
  const [selectedList, setSelectedList] = useControllableState<readonly string[]>({
    value: controlledSelected,
    defaultValue: defaultSelected,
    onChange: onSelectedChange as ((ids: readonly string[]) => void) | undefined,
  });
  const [widthOverrides, setWidthOverrides] = useControllableState<
    Readonly<Record<string, number>>
  >({
    value: controlledWidths,
    defaultValue: NO_WIDTHS,
    onChange: onColumnWidthsChange as ((w: Readonly<Record<string, number>>) => void) | undefined,
  });
  const selected = useMemo(() => new Set(selectedList), [selectedList]);

  const rows = useMemo(() => {
    const column = sort === null ? undefined : columns.find((c) => c.id === sort.columnId);
    return sort === null || column?.value === undefined
      ? data
      : sortRows(data, column.value, sort.direction);
  }, [data, columns, sort]);

  const widthOf = (column: DataTableColumn<T>): number =>
    widthOverrides[column.id] ?? column.width ?? 160;
  const totalWidth = columns.reduce((sum, c) => sum + widthOf(c), 0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const viewport = height - rowHeight;
  const { start, end } = rowWindow(scrollTop, viewport, rowHeight, rows.length, overscan);

  const [focus, setFocus] = useState<Cell>({ row: 0, col: 0 });
  const moved = useRef(false);

  // Keep the focused cell rendered and in view, then move DOM focus to it.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const el = scrollRef.current;
    if (el === null) return;
    if (focus.row > 0) {
      const top = (focus.row - 1) * rowHeight;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (top + rowHeight > el.scrollTop + viewport) el.scrollTop = top + rowHeight - viewport;
      setScrollTop(el.scrollTop);
    }
    // The row may only render after the scroll above; look it up next frame.
    requestAnimationFrame(() =>
      el.querySelector<HTMLElement>(`[data-cell="${focus.row}:${focus.col}"]`)?.focus(),
    );
  }, [focus, rowHeight, viewport]);

  const moveTo = useCallback(
    (row: number, col: number) => {
      moved.current = true;
      setFocus({
        row: Math.max(0, Math.min(rows.length, row)),
        col: Math.max(0, Math.min(columns.length - 1, col)),
      });
    },
    [rows.length, columns.length],
  );

  const sortBy = (column: DataTableColumn<T>): void => {
    if (column.sortable === true && column.value !== undefined) setSort(nextSort(sort, column.id));
  };
  const selectRow = (id: string): void => {
    if (selectionMode !== 'none')
      setSelectedList([...toggleSelection(selected, id, selectionMode)]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).getAttribute('role') === 'separator') return;
    const { row, col } = focus;
    const page = Math.max(1, Math.floor(viewport / rowHeight));
    const keys: Record<string, () => void> = {
      ArrowDown: () => moveTo(row + 1, col),
      ArrowUp: () => moveTo(row - 1, col),
      ArrowRight: () => moveTo(row, col + 1),
      ArrowLeft: () => moveTo(row, col - 1),
      Home: () => (e.ctrlKey ? moveTo(0, 0) : moveTo(row, 0)),
      End: () =>
        e.ctrlKey ? moveTo(rows.length, columns.length - 1) : moveTo(row, columns.length - 1),
      PageDown: () => moveTo(row + page, col),
      PageUp: () => moveTo(row - page, col),
      Enter: () => (row === 0 ? sortBy(columns[col]!) : undefined),
      ' ': () => {
        if (row === 0) sortBy(columns[col]!);
        else {
          const target = rows[row - 1];
          if (target !== undefined) selectRow(getRowId(target, row - 1));
        }
      },
    };
    const action = keys[e.key];
    if (action === undefined) return;
    e.preventDefault();
    action();
  };

  const resize = (column: DataTableColumn<T>, width: number): void => {
    setWidthOverrides({
      ...widthOverrides,
      [column.id]: clampWidth(width, column.minWidth ?? 60, column.maxWidth ?? 800),
    });
  };

  const startResize = (column: DataTableColumn<T>, e: PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    const from = e.clientX;
    const initial = widthOf(column);
    const onMove = (move: globalThis.PointerEvent): void =>
      resize(column, initial + move.clientX - from);
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const tabIndexOf = (row: number, col: number): 0 | -1 =>
    focus.row === row && focus.col === col ? 0 : -1;

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length}
      {...(selectionMode === 'multiple' ? { 'aria-multiselectable': true } : {})}
      {...(aria['aria-label'] !== undefined ? { 'aria-label': aria['aria-label'] } : {})}
      onKeyDown={onKeyDown}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height, overflow: 'auto', position: 'relative', ...style }}
    >
      <div
        role="row"
        aria-rowindex={1}
        style={{
          display: 'flex',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: totalWidth,
          height: rowHeight,
          ...headerStyle,
        }}
      >
        {columns.map((column, c) => {
          const direction = sort?.columnId === column.id ? sort.direction : undefined;
          const width = widthOf(column);
          return (
            // Keyboard sorting is the grid's onKeyDown (Enter / Space on a header).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              key={column.id}
              role="columnheader"
              aria-colindex={c + 1}
              {...(column.sortable === true ? { 'aria-sort': direction ?? 'none' } : {})}
              data-cell={`0:${c}`}
              tabIndex={tabIndexOf(0, c)}
              onClick={() => {
                setFocus({ row: 0, col: c });
                sortBy(column);
              }}
              style={{
                position: 'relative',
                flex: `0 0 ${width}px`,
                cursor: column.sortable === true ? 'pointer' : undefined,
                ...headerCellStyle,
              }}
            >
              {renderHeader !== undefined
                ? renderHeader(column, { sort: direction })
                : column.header}
              {column.resizable !== false ? (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-valuenow={width}
                  aria-valuemin={column.minWidth ?? 60}
                  aria-valuemax={column.maxWidth ?? 800}
                  aria-label={messages.resizeColumn}
                  tabIndex={-1}
                  onPointerDown={(e) => startResize(column, e)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    const step = e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0;
                    if (step === 0) return;
                    e.preventDefault();
                    resize(column, width + step);
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 6,
                    cursor: 'col-resize',
                    touchAction: 'none',
                    ...resizeHandleStyle,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div style={{ width: totalWidth }}>
        <div aria-hidden style={{ height: start * rowHeight }} />
        {rows.slice(start, end).map((row, offset) => {
          const index = start + offset;
          const id = getRowId(row, index);
          const isSelected = selected.has(id);
          return (
            // Keyboard selection is the grid's onKeyDown (Space on a row).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              key={id}
              role="row"
              aria-rowindex={index + 2}
              {...(selectionMode !== 'none' ? { 'aria-selected': isSelected } : {})}
              onClick={() => selectRow(id)}
              style={{
                display: 'flex',
                height: rowHeight,
                ...rowStyle?.({ selected: isSelected, index }),
              }}
            >
              {columns.map((column, c) => (
                <div
                  key={column.id}
                  role="gridcell"
                  aria-colindex={c + 1}
                  data-cell={`${index + 1}:${c}`}
                  tabIndex={tabIndexOf(index + 1, c)}
                  onFocus={() => setFocus({ row: index + 1, col: c })}
                  style={{ flex: `0 0 ${widthOf(column)}px`, overflow: 'hidden', ...cellStyle }}
                >
                  {column.cell !== undefined ? column.cell(row) : String(column.value?.(row) ?? '')}
                </div>
              ))}
            </div>
          );
        })}
        <div aria-hidden style={{ height: (rows.length - end) * rowHeight }} />
      </div>
    </div>
  );
}
