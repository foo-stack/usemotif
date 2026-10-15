'use client';

import {
  DataTable as HeadlessDataTable,
  type DataTableColumn,
  type DataTableProps as HeadlessDataTableProps,
  type SortDirection,
} from '@usemotif/headless';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

export type { DataTableColumn, SortDirection };
export type DataTableProps<T> = Omit<
  HeadlessDataTableProps<T>,
  | 'style'
  | 'headerStyle'
  | 'headerCellStyle'
  | 'rowStyle'
  | 'cellStyle'
  | 'resizeHandleStyle'
  | 'renderHeader'
>;

// The headless grid takes raw style objects, so the kit reaches the theme
// through motif's token CSS variables, with fallbacks for the first paint.
const GRID_STYLE: CSSProperties = {
  border: '1px solid var(--colors-border-default, #d1d5db)',
  borderRadius: 'var(--radii-lg, 12px)',
  background: 'var(--colors-surface-raised, #fff)',
  color: 'var(--colors-text-default, #111)',
  fontSize: 'var(--fontSizes-sm, 14px)',
};
const HEADER_STYLE: CSSProperties = {
  background: 'var(--colors-surface-muted, #f4f4f5)',
  borderBottom: '1px solid var(--colors-border-default, #d1d5db)',
  fontWeight: 600,
};
const CELL: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  outlineOffset: -2,
};
const HANDLE_STYLE: CSSProperties = { borderRight: '2px solid transparent' };
const ROW: CSSProperties = { borderBottom: '1px solid var(--colors-border-muted, #f4f4f5)' };
const ROW_SELECTED: CSSProperties = {
  ...ROW,
  background: 'var(--colors-status-info-tint, #eff6ff)',
};

function rowStyle(info: { selected: boolean }): CSSProperties {
  return info.selected ? ROW_SELECTED : ROW;
}

// Module-scoped so it's a stable `renderHeader` reference (lint: no-new-fn-as-prop).
function renderHeader<T>(
  column: DataTableColumn<T>,
  info: { sort: SortDirection | undefined },
): ReactNode {
  const arrow = info.sort === 'ascending' ? ' ▲' : info.sort === 'descending' ? ' ▼' : '';
  return (
    <>
      {column.header}
      {arrow !== '' ? <span aria-hidden="true">{arrow}</span> : null}
    </>
  );
}

/**
 * Themed data grid over the headless `DataTable`: a bordered surface, a muted
 * header row with a sort arrow on the sorted column, padded cells, and a
 * tinted fill on selected rows. Sorting, selection, column resizing, row
 * windowing and the grid keyboard model all come from headless. Web only.
 *
 * ```tsx
 * <DataTable
 *   data={invoices}
 *   getRowId={(i) => i.id}
 *   columns={[
 *     { id: 'number', header: 'Invoice', value: (i) => i.number, sortable: true },
 *     { id: 'total', header: 'Total', value: (i) => i.total, sortable: true, width: 120 },
 *   ]}
 *   selectionMode="multiple"
 *   aria-label="Invoices"
 * />
 * ```
 */
export function DataTable<T>(props: DataTableProps<T>): ReactElement {
  return (
    <HeadlessDataTable<T>
      {...props}
      style={GRID_STYLE}
      headerStyle={HEADER_STYLE}
      headerCellStyle={CELL}
      cellStyle={CELL}
      rowStyle={rowStyle}
      resizeHandleStyle={HANDLE_STYLE}
      renderHeader={renderHeader}
    />
  );
}
