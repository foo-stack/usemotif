/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ComponentType, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { tanstackVirtualImpl } from './tanstack.js';
import type { VirtualListProps } from '../scroll.js';

interface Row {
  id: string;
  label: string;
}

// `tanstackVirtualImpl` is a React component typed as
// `VirtualListImpl` (a generic function over `T`). The cast below
// fixes `T` so JSX can pin it.
const Impl = tanstackVirtualImpl as ComponentType<VirtualListProps<Row>>;

let container: HTMLElement;
let root: Root;

function render(node: ReactElement): void {
  act(() => {
    root.render(node);
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

const ROWS: Row[] = Array.from({ length: 100 }, (_, i) => ({
  id: `row-${i}`,
  label: `Row ${i}`,
}));

describe('tanstackVirtualImpl', () => {
  it('renders a self-scrolling outer container', () => {
    render(
      <Impl data={ROWS} renderItem={(item: Row) => <span>{item.label}</span>} itemHeight={32} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer).not.toBeNull();
    expect(outer.style.overflowY).toBe('auto');
  });

  it('sizes the inner spacer to count × itemHeight', () => {
    render(
      <Impl data={ROWS} renderItem={(item: Row) => <span>{item.label}</span>} itemHeight={40} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    const spacer = outer.firstElementChild as HTMLElement;
    // 100 items × 40px = 4000px total height.
    expect(spacer.style.height).toBe('4000px');
    expect(spacer.style.position).toBe('relative');
  });

  it('renders the windowed subset rather than every item', () => {
    render(
      <Impl
        data={ROWS}
        renderItem={(item: Row) => <span data-row={item.id}>{item.label}</span>}
        itemHeight={32}
      />,
    );
    // jsdom has no real layout; useVirtualizer measures the parent
    // and falls back to a small initial window. The exact number
    // depends on the lib's defaults, but it should NOT be all 100.
    const rendered = container.querySelectorAll('[data-row]');
    expect(rendered.length).toBeLessThan(ROWS.length);
  });

  it('uses keyOf when provided to derive react keys without warnings', () => {
    render(
      <Impl
        data={ROWS}
        renderItem={(item: Row) => <span data-row={item.id}>{item.label}</span>}
        keyOf={(item: Row) => `k-${item.id}`}
        itemHeight={32}
      />,
    );
    // Indirect verification: render completes without throwing on
    // the React reconciliation pass (jsdom doesn't expose React's
    // key-warnings cleanly).
    expect(container.firstElementChild).not.toBeNull();
  });

  it('falls back to a 32px item-height default when omitted', () => {
    render(<Impl data={ROWS} renderItem={(item: Row) => <span>{item.label}</span>} />);
    const outer = container.firstElementChild as HTMLElement;
    const spacer = outer.firstElementChild as HTMLElement;
    expect(spacer.style.height).toBe(`${100 * 32}px`);
  });
});

describe('tanstackVirtualImpl - onEndReached', () => {
  it('fires as the scroll nears the end of the list', () => {
    const clientHeight = vi
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(100);
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(3200);
    const onEndReached = vi.fn();
    render(
      <Impl
        data={ROWS}
        renderItem={(r) => <span>{r.label}</span>}
        itemHeight={32}
        onEndReached={onEndReached}
      />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(onEndReached).not.toHaveBeenCalled();
    el.scrollTop = 3080;
    act(() => {
      el.dispatchEvent(new Event('scroll'));
    });
    expect(onEndReached).toHaveBeenCalledTimes(1);
    clientHeight.mockRestore();
    scrollHeight.mockRestore();
  });
});
