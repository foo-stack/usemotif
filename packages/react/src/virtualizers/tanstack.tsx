'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { checkEndReached } from '../_end-reached.js';
import type { VirtualListImpl, VirtualListProps } from '../scroll.js';

/**
 * `@tanstack/react-virtual`-backed `VirtualListImpl` for motif's
 * `<VirtualList>`. Opt-in: install `@tanstack/react-virtual` in your
 * app and register this impl once at startup.
 *
 * ```tsx
 * import { registerVirtualListImpl } from '@usemotif/react';
 * import { tanstackVirtualImpl } from '@usemotif/react/tanstack-virtual';
 *
 * registerVirtualListImpl(tanstackVirtualImpl);
 * ```
 *
 * Renders a self-scrolling `<div>` (rather than going through motif's
 * `<ScrollView>`) because Tanstack's `useVirtualizer` measures the
 * scroll container via a ref - motif's ScrollView is a plain
 * function component that doesn't forward refs in v1, so the wrapper
 * inlines the equivalent overflow styles instead.
 *
 * - Outer container: `overflow: auto` + iOS momentum defaults.
 * - Inner spacer sized to `getTotalSize()` so the scrollbar reflects
 *   the full list extent.
 * - Renders only the virtualized window (`virtualItems()`); each item
 *   is positioned absolutely via `top: virtualRow.start`.
 *
 * `itemHeight` should be a reasonable estimate. Tanstack supports
 * dynamic heights via `measureElement`; this wrapper assumes
 * uniform-height rows for v1. Apps that need dynamic row sizing can
 * register a custom impl following the same shape.
 */
const SCROLL_STYLE: CSSProperties = {
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
};

function TanstackVirtualList<T>(props: VirtualListProps<T>): ReactElement {
  const {
    data,
    renderItem,
    keyOf,
    itemHeight = 32,
    style,
    onEndReached,
    onEndReachedThreshold = 0.5,
    ...rest
  } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const lastEnd = useRef(-1);
  const check = (): void => {
    if (onEndReached !== undefined && parentRef.current !== null) {
      checkEndReached(parentRef.current, false, onEndReachedThreshold, lastEnd, onEndReached);
    }
  };
  useEffect(check);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  const totalSize = rowVirtualizer.getTotalSize();
  const virtualItems = rowVirtualizer.getVirtualItems();

  // Strip non-DOM motif style-prop bag from `rest`; Tanstack's wrapper
  // is performance-critical so we avoid the responsive resolver round-
  // trip. Any styling that needs to land here goes through `style`.
  void rest;

  return (
    <div ref={parentRef} onScroll={check} style={{ ...SCROLL_STYLE, ...style }}>
      <div style={{ height: totalSize, width: '100%', position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const item = data[virtualRow.index]!;
          const k = keyOf?.(item, virtualRow.index) ?? virtualRow.index;
          return (
            <div
              key={k}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                width: '100%',
                height: virtualRow.size,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const tanstackVirtualImpl: VirtualListImpl = TanstackVirtualList;
