import { describe, expect, it } from 'vitest';
import { clampWidth, nextSort, rowWindow, sortRows, toggleSelection } from './_data-table.js';

describe('nextSort', () => {
  it('cycles ascending, descending, unsorted, and restarts on another column', () => {
    const asc = nextSort(null, 'name');
    expect(asc).toEqual({ columnId: 'name', direction: 'ascending' });
    const desc = nextSort(asc, 'name');
    expect(desc).toEqual({ columnId: 'name', direction: 'descending' });
    expect(nextSort(desc, 'name')).toBeNull();
    expect(nextSort(desc, 'age')).toEqual({ columnId: 'age', direction: 'ascending' });
  });
});

describe('sortRows', () => {
  const rows = [
    { n: 'file10', v: 3 },
    { n: 'file2', v: null },
    { n: 'File1', v: 3 },
    { n: '', v: 1 },
  ];
  it('orders numbers numerically and keeps ties in their original order', () => {
    expect(sortRows(rows, (r) => r.v, 'ascending').map((r) => r.n)).toEqual([
      '',
      'file10',
      'File1',
      'file2',
    ]);
    expect(sortRows(rows, (r) => r.v, 'descending').map((r) => r.n)).toEqual([
      'file10',
      'File1',
      '',
      'file2',
    ]);
  });
  it('orders text with numeric runs, empty values last either way', () => {
    expect(sortRows(rows, (r) => r.n, 'ascending').map((r) => r.n)).toEqual([
      'File1',
      'file2',
      'file10',
      '',
    ]);
    expect(sortRows(rows, (r) => r.n, 'descending').map((r) => r.n)).toEqual([
      'file10',
      'file2',
      'File1',
      '',
    ]);
  });
});

describe('rowWindow', () => {
  it('covers the rows in view plus overscan, clamped to the list', () => {
    expect(rowWindow(0, 100, 20, 1000, 2)).toEqual({ start: 0, end: 8 });
    expect(rowWindow(400, 100, 20, 1000, 2)).toEqual({ start: 18, end: 28 });
    expect(rowWindow(19_990, 100, 20, 1000, 2)).toEqual({ start: 997, end: 1000 });
  });
  it('renders every row until there is a viewport to measure', () => {
    expect(rowWindow(0, 0, 20, 30, 2)).toEqual({ start: 0, end: 30 });
  });
});

describe('toggleSelection', () => {
  it('keeps one row in single mode and toggles rows in multiple mode', () => {
    expect([...toggleSelection(new Set(['a']), 'b', 'single')]).toEqual(['b']);
    expect([...toggleSelection(new Set(['a']), 'a', 'single')]).toEqual([]);
    expect([...toggleSelection(new Set(['a']), 'b', 'multiple')]).toEqual(['a', 'b']);
    expect([...toggleSelection(new Set(['a', 'b']), 'a', 'multiple')]).toEqual(['b']);
  });
});

describe('clampWidth', () => {
  it('keeps a width within its bounds, in whole pixels', () => {
    expect(clampWidth(30.4, 60, 400)).toBe(60);
    expect(clampWidth(120.6, 60, 400)).toBe(121);
    expect(clampWidth(900, 60, 400)).toBe(400);
  });
});
