import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import type { VirtualListImpl, VirtualListProps } from '../scroll.js';

/**
 * `@shopify/flash-list`-backed `VirtualListImpl` for motif's
 * `<VirtualList>` on native. Opt-in: install `@shopify/flash-list`
 * in your app and register this impl once at startup.
 *
 * ```tsx
 * import { registerVirtualListImpl } from '@usemotif/react-native';
 * import { flashListImpl } from '@usemotif/react-native/flash-list';
 *
 * registerVirtualListImpl(flashListImpl);
 * ```
 *
 * Adapter shape:
 *
 * - `data` flows through unchanged.
 * - `renderItem` receives `(item, index)` from motif; FlashList passes
 *   `{ item, index }` - the wrapper unwraps that shape so motif's
 *   per-item closure stays consistent across renderers.
 * - `keyOf` becomes FlashList's `keyExtractor`.
 * - `itemHeight` is currently ignored - FlashList v2 auto-measures
 *   item sizes and dropped the `estimatedItemSize` prop. Kept on
 *   motif's API surface for cross-renderer parity (Tanstack on web
 *   still needs it).
 *
 * Other motif `<ScrollView>` props (style, ref, etc.) are dropped
 * here - FlashList has its own scroll surface and most ScrollView
 * props don't have a 1:1 equivalent. Apps wiring this impl typically
 * style the parent screen instead.
 */
function FlashListVirtualList<T>(props: VirtualListProps<T>): ReactElement {
  const {
    data,
    renderItem,
    keyOf,
    itemHeight,
    onEndReached,
    onEndReachedThreshold,
    onRefresh,
    refreshing,
  } = props;
  void itemHeight; // Reserved for parity; FlashList v2 auto-measures.
  // FlashList is generic on `<T>`; using JSX (rather than
  // createElement) lets TS infer the type parameter from `data`.
  // The cast on `data` strips `readonly` since FlashList's typings
  // expect a mutable array signature, but it never mutates.
  return (
    <FlashList<T>
      data={data as T[]}
      renderItem={
        ((info: ListRenderItemInfo<T>) => renderItem(info.item, info.index)) as (
          info: ListRenderItemInfo<T>,
        ) => ReactElement | null
      }
      keyExtractor={(item: T, index: number) => String(keyOf?.(item, index) ?? index)}
      {...(onEndReached !== undefined ? { onEndReached } : {})}
      {...(onEndReachedThreshold !== undefined ? { onEndReachedThreshold } : {})}
      {...(onRefresh !== undefined ? { onRefresh, refreshing: refreshing ?? false } : {})}
    />
  );
}

export const flashListImpl: VirtualListImpl = FlashListVirtualList;
