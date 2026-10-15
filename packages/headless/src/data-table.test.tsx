/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './data-table.js';

interface Person {
  readonly id: string;
  readonly name: string;
  readonly age: number;
}

const PEOPLE: Person[] = [
  { id: 'a', name: 'Cara', age: 41 },
  { id: 'b', name: 'Abe', age: 29 },
  { id: 'c', name: 'Bo', age: 35 },
];

const COLUMNS: DataTableColumn<Person>[] = [
  { id: 'name', header: 'Name', value: (p) => p.name, sortable: true },
  { id: 'age', header: 'Age', value: (p) => p.age, sortable: true, width: 80 },
];

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const names = (): string[] =>
  Array.from(container.querySelectorAll('[role="row"][aria-rowindex]'))
    .slice(1)
    .map((row) => row.querySelector('[role="gridcell"]')!.textContent!);
const header = (label: string): HTMLElement =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="columnheader"]')).find((h) =>
    h.textContent!.includes(label),
  )!;

async function press(key: string, init: KeyboardEventInit = {}): Promise<void> {
  await act(async () => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
    await frame();
  });
}

describe('DataTable', () => {
  it('is a labelled grid with a header row and every cell', () => {
    act(() =>
      root.render(
        <DataTable data={PEOPLE} columns={COLUMNS} getRowId={(p) => p.id} aria-label="People" />,
      ),
    );
    const grid = container.querySelector('[role="grid"]')!;
    expect(grid.getAttribute('aria-label')).toBe('People');
    expect(grid.getAttribute('aria-rowcount')).toBe('4');
    expect(grid.getAttribute('aria-colcount')).toBe('2');
    expect(names()).toEqual(['Cara', 'Abe', 'Bo']);
    expect(header('Name').getAttribute('aria-sort')).toBe('none');
  });

  it('cycles a sortable column through ascending, descending and unsorted', () => {
    const onSortChange = vi.fn();
    act(() =>
      root.render(
        <DataTable
          data={PEOPLE}
          columns={COLUMNS}
          getRowId={(p) => p.id}
          onSortChange={onSortChange}
        />,
      ),
    );
    act(() => header('Age').click());
    expect(header('Age').getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['Abe', 'Bo', 'Cara']);
    act(() => header('Age').click());
    expect(names()).toEqual(['Cara', 'Bo', 'Abe']);
    act(() => header('Age').click());
    expect(header('Age').getAttribute('aria-sort')).toBe('none');
    expect(names()).toEqual(['Cara', 'Abe', 'Bo']);
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  it('moves a roving focus through the grid and selects rows with Space', async () => {
    const onSelectedChange = vi.fn();
    act(() =>
      root.render(
        <DataTable
          data={PEOPLE}
          columns={COLUMNS}
          getRowId={(p) => p.id}
          selectionMode="multiple"
          onSelectedChange={onSelectedChange}
        />,
      ),
    );
    const cell = (r: number, c: number): HTMLElement =>
      container.querySelector(`[data-cell="${r}:${c}"]`)!;
    expect(cell(0, 0).tabIndex).toBe(0);
    act(() => cell(0, 0).focus());
    await press('ArrowDown');
    expect(document.activeElement).toBe(cell(1, 0));
    expect(cell(1, 0).tabIndex).toBe(0);
    expect(cell(0, 0).tabIndex).toBe(-1);
    await press(' ');
    expect(onSelectedChange).toHaveBeenLastCalledWith(['a']);
    expect(container.querySelector('[aria-rowindex="2"]')!.getAttribute('aria-selected')).toBe(
      'true',
    );
    await press('End', { ctrlKey: true });
    expect(document.activeElement).toBe(cell(3, 1));
    await press(' ');
    expect(onSelectedChange).toHaveBeenLastCalledWith(['a', 'c']);
    await press('Enter');
    await press('Home', { ctrlKey: true });
    expect(document.activeElement).toBe(cell(0, 0));
    await press('Enter');
    expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
  });

  it('renders only the rows in view of a long list', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
      age: i,
    }));
    act(() =>
      root.render(
        <DataTable
          data={many}
          columns={COLUMNS}
          getRowId={(p) => p.id}
          height={220}
          rowHeight={20}
          overscan={2}
        />,
      ),
    );
    const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
    expect(grid.getAttribute('aria-rowcount')).toBe('1001');
    expect(names().length).toBeLessThan(20);
    expect(names()[0]).toBe('Row 0');
    act(() => {
      grid.scrollTop = 10_000;
      grid.dispatchEvent(new Event('scroll'));
    });
    expect(names()).toContain('Row 500');
    expect(names()).not.toContain('Row 0');
  });

  it('resizes a column from its handle, by keyboard and by pointer, within bounds', () => {
    const onColumnWidthsChange = vi.fn();
    act(() =>
      root.render(
        <DataTable
          data={PEOPLE}
          columns={COLUMNS}
          getRowId={(p) => p.id}
          onColumnWidthsChange={onColumnWidthsChange}
        />,
      ),
    );
    const handle = header('Age').querySelector<HTMLElement>('[role="separator"]')!;
    expect(handle.getAttribute('aria-valuenow')).toBe('80');
    act(() =>
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    );
    expect(handle.getAttribute('aria-valuenow')).toBe('90');
    expect(onColumnWidthsChange).toHaveBeenLastCalledWith({ age: 90 });
    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 40 }));
      window.dispatchEvent(new PointerEvent('pointerup', {}));
    });
    // 90 - 60 = 30, clamped to the 60px minimum.
    expect(handle.getAttribute('aria-valuenow')).toBe('60');
  });
});
