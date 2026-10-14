'use client';

import type { MotifComponent } from '@usemotif/core';

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type UIEvent,
} from 'react';
import { checkEndReached } from './_end-reached.js';
import { Box, type BoxProps } from './Box.js';

/**
 * ScrollView - a styled container that scrolls when its content
 * overflows. Defaults to vertical scrolling. Pass `direction='horizontal'`
 * for a horizontal scroller, or `'both'` for two-axis.
 *
 * On web, this is `overflow: auto` plus a few quality-of-life
 * defaults: `WebkitOverflowScrolling: touch` (iOS Safari momentum)
 * and `overscrollBehavior: contain` (so scrolling inside the view
 * doesn't bubble up past the parent).
 */
export interface ScrollViewProps extends BoxProps {
  direction?: 'vertical' | 'horizontal' | 'both';
  /** Hide the scrollbar visually (still scrollable + accessible). */
  hideScrollbar?: boolean;
  children?: ReactNode;
  /**
   * Called when scrolling comes within `onEndReachedThreshold` of the end,
   * once per content length, so an infinite list loads its next page once.
   */
  onEndReached?: () => void;
  /** How near the end `onEndReached` fires, in visible lengths. Defaults to `0.5`. */
  onEndReachedThreshold?: number;
  /** Native-only pull to refresh. Accepted here so shared code typechecks; ignored on web. */
  onRefresh?: () => void;
  /** Native-only: whether the refresh indicator shows. Ignored on web. */
  refreshing?: boolean;
}
export const ScrollView: MotifComponent<ScrollViewProps, ReactElement | null> = function ({
  direction = 'vertical',
  hideScrollbar = false,
  children,
  style,
  onEndReached,
  onEndReachedThreshold = 0.5,
  onRefresh: _onRefresh,
  refreshing: _refreshing,
  ref,
  onScroll,
  ...rest
}: ScrollViewProps): ReactElement {
  const el = useRef<HTMLElement | null>(null);
  const lastEnd = useRef(-1);
  const check = (): void => {
    if (onEndReached !== undefined && el.current !== null) {
      checkEndReached(
        el.current,
        direction === 'horizontal',
        onEndReachedThreshold,
        lastEnd,
        onEndReached,
      );
    }
  };
  // After every render too: content that does not fill the view never scrolls.
  useEffect(check);

  const overflow: CSSProperties =
    direction === 'horizontal'
      ? { overflowX: 'auto', overflowY: 'hidden' }
      : direction === 'both'
        ? { overflow: 'auto' }
        : { overflowY: 'auto', overflowX: 'hidden' };

  const scrollbar: CSSProperties = hideScrollbar ? { scrollbarWidth: 'none' } : {};

  return (
    <Box
      style={
        {
          ...overflow,
          ...scrollbar,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          ...style,
        } as CSSProperties
      }
      ref={(node: HTMLElement | null) => {
        el.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref !== null && ref !== undefined) {
          (ref as { current: HTMLElement | null }).current = node;
        }
      }}
      onScroll={(e: UIEvent<HTMLElement>) => {
        check();
        onScroll?.(e);
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};

/**
 * Sticky - element that becomes `position: sticky` and pins to its
 * containing scroll context's edge. Defaults to top-pin (`top: 0`);
 * pass `bottom={0}` for a footer-style sticky.
 *
 * Sticky requires a containing scroll ancestor - wrap your
 * `<ScrollView>` (or any `overflow: auto` container) around it for
 * the effect to fire.
 */
export interface StickyProps extends BoxProps {
  /** Pin offset. Defaults to `0` (the top of the scroll container). */
  top?: number | string;
  bottom?: number | string;
  zIndex?: number;
  children?: ReactNode;
}
export const Sticky: MotifComponent<StickyProps, ReactElement | null> = function ({
  top = 0,
  bottom,
  zIndex = 1,
  children,
  style,
  ...rest
}: StickyProps): ReactElement {
  return (
    <Box
      position="sticky"
      style={
        {
          top,
          ...(bottom !== undefined ? { bottom } : {}),
          zIndex,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </Box>
  );
};

/**
 * VirtualList - list primitive with a virtualisation seam.
 *
 * Below a configurable threshold (default 50 items), `<VirtualList>`
 * renders every item directly - fast for small lists, no peer dep
 * required. Above the threshold, motif delegates to whatever
 * implementation has been registered via `registerVirtualListImpl`.
 *
 * The seam keeps motif's bundle dep-free while letting apps that
 * need real virtualisation wire it up once at startup:
 *
 * ```ts
 * import { Virtuoso } from 'react-virtuoso';
 * import { registerVirtualListImpl } from '@usemotif/react';
 *
 * registerVirtualListImpl(({ data, renderItem, keyOf }) => (
 *   <Virtuoso
 *     data={data}
 *     itemContent={(i, item) => renderItem(item, i)}
 *     computeItemKey={(i, item) => keyOf?.(item, i) ?? i}
 *   />
 * ));
 * ```
 */
export interface VirtualListProps<T> extends Omit<ScrollViewProps, 'children'> {
  data: readonly T[];
  /** Render fn. Called once per item; key is derived from `keyOf` or
   * the index. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Stable item-id extractor. Falls back to the index. */
  keyOf?: (item: T, index: number) => string | number;
  /** Approximate row height - used by virtualised implementations
   * to size the viewport. */
  itemHeight?: number;
}

/**
 * Custom virtualisation function. Receives the same props as
 * `<VirtualList>`; returns a React element that renders the list.
 * Most consumers wrap react-virtuoso here.
 */
export type VirtualListImpl = <T>(props: VirtualListProps<T>) => ReactElement;

interface VirtualListRegistry {
  impl: VirtualListImpl | null;
  threshold: number;
}
const virtualListRegistry: VirtualListRegistry = { impl: null, threshold: 50 };

/**
 * Register a custom virtualised renderer. The motif fallback path
 * remains for lists below `threshold` items - virtualisation has a
 * fixed cost that isn't worth paying for short lists.
 */
export function registerVirtualListImpl(
  impl: VirtualListImpl | null,
  options?: { threshold?: number },
): void {
  virtualListRegistry.impl = impl;
  if (options?.threshold !== undefined) virtualListRegistry.threshold = options.threshold;
}

/** Test-only: read the current registration. */
export function _getVirtualListRegistryForTesting(): Readonly<VirtualListRegistry> {
  return virtualListRegistry;
}

export function VirtualList<T>(props: VirtualListProps<T>): ReactElement {
  const { data, renderItem, keyOf, itemHeight: _itemHeight, ...rest } = props;
  const { impl, threshold } = virtualListRegistry;
  if (impl !== null && data.length >= threshold) {
    return impl(props);
  }
  return (
    <ScrollView {...rest}>
      {data.map((item, i) => (
        <Box key={keyOf?.(item, i) ?? i}>{renderItem(item, i)}</Box>
      ))}
    </ScrollView>
  );
}
