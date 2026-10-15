import { nativeStubWarn } from './_native-stub.js';
import type { DataTableProps } from './data-table.js';

export type { DataTableColumn, DataTableProps, SortDirection, SortState } from './data-table.js';

/** DataTable is web only for now: on native it warns once and renders nothing. */
export function DataTable<T>(_props: DataTableProps<T>): null {
  nativeStubWarn('DataTable');
  return null;
}
