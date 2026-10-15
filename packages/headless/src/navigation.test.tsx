import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationMenu, Pagination, type NavigationMenuItem } from './navigation.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function menuitemByText(text: string): HTMLElement {
  const all = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  const found = all.find((el) => el.textContent === text);
  if (found === undefined) throw new Error(`no menuitem labelled "${text}"`);
  return found;
}

function openSubmenuCount(): number {
  return document.body.querySelectorAll('[role="menu"]').length;
}

const nestedItems: ReadonlyArray<NavigationMenuItem> = [
  {
    id: 'file',
    label: 'File',
    children: [
      {
        id: 'recent',
        label: 'Recent',
        children: [{ id: 'doc', label: 'Doc' }],
      },
    ],
  },
];

describe('NavigationMenu - nested submenu Escape (#198)', () => {
  it('a single Escape collapses only the innermost open submenu', () => {
    render(<NavigationMenu items={nestedItems} />);

    // Open level 1 (File → its menu), then level 2 (Recent → its menu).
    act(() => menuitemByText('File').click());
    act(() => menuitemByText('Recent').click());
    expect(openSubmenuCount()).toBe(2);

    // One Escape on the document (not a focused menuitem, so only the
    // submenu-level window listeners run). Only the deepest submenu closes.
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(openSubmenuCount()).toBe(1);

    // A second Escape closes the remaining level.
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(openSubmenuCount()).toBe(0);
  });
});

describe('Pagination - boundaries and page size', () => {
  function renderPageItem(info: { type: string; page?: number }): React.ReactElement {
    return <i>{info.type === 'page' ? info.page : info.type === 'ellipsis' ? '_' : ''}</i>;
  }

  it('shows `boundaries` pages at each end', () => {
    render(<Pagination page={10} total={20} boundaries={2} renderItem={renderPageItem} />);
    const labels = Array.from(container.querySelectorAll('i'), (el) => el.textContent);
    expect(labels.filter((t) => t !== '')).toEqual([
      '1',
      '2',
      '_',
      '9',
      '10',
      '11',
      '_',
      '19',
      '20',
    ]);
  });

  it('renders the page-size part and reports the page that keeps the first item in view', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={3}
        total={10}
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        onPageSizeChange={onPageSizeChange}
        renderItem={renderPageItem}
        renderPageSize={({ pageSize, options, onChange }) => (
          <select
            aria-label="Items per page"
            value={pageSize}
            onChange={(e) => onChange(Number(e.currentTarget.value))}
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
      />,
    );
    const select = container.querySelector('select')!;
    expect(Array.from(select.options, (o) => o.value)).toEqual(['10', '20', '50']);
    act(() => {
      select.value = '20';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(20, 2);
  });

  it('renders no page-size part without a pageSize', () => {
    const renderPageSize = vi.fn(() => <select />);
    render(
      <Pagination page={1} total={5} renderItem={renderPageItem} renderPageSize={renderPageSize} />,
    );
    expect(renderPageSize).not.toHaveBeenCalled();
  });
});
