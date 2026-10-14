import type { MotifComponent } from '@usemotif/core';
import {
  Children,
  isValidElement,
  useImperativeHandle,
  useRef,
  type Ref,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  RefreshControl,
  ScrollView as RNScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Box, useResolvedBoxStyleObject, type BoxProps } from './Box.js';

/**
 * Snapshot of a `ScrollView`'s scroll geometry. All measurements are
 * in unscaled DIPs (RN's native scroll-event units).
 */
export interface ScrollState {
  scrollX: number;
  scrollY: number;
  contentWidth: number;
  contentHeight: number;
  layoutWidth: number;
  layoutHeight: number;
}

/**
 * Internal scroll publisher held by `ScrollView`. The `useScroll` hook
 * subscribes via `ref.current.__publisher.subscribe(...)` and reads
 * `getState()` on every notification.
 *
 * Not part of the public surface - the field is underscore-prefixed
 * to flag it as motif-internal.
 */
export interface ScrollPublisher {
  getState(): ScrollState;
  subscribe(cb: () => void): () => void;
}

/**
 * Ref shape exposed by motif's native `ScrollView`. Carries the
 * scroll publisher used by `useScroll`. Future ergonomics (e.g.,
 * imperative `scrollTo`) hang off this interface.
 */
export interface MotifScrollViewRef {
  __publisher: ScrollPublisher;
}

interface MutableScrollPublisher extends ScrollPublisher {
  __push(next: ScrollState): void;
}

function createScrollPublisher(): MutableScrollPublisher {
  let state: ScrollState = {
    scrollX: 0,
    scrollY: 0,
    contentWidth: 0,
    contentHeight: 0,
    layoutWidth: 0,
    layoutHeight: 0,
  };
  const subscribers = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(cb: () => void): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    __push(next: ScrollState): void {
      state = next;
      for (const cb of subscribers) cb();
    },
  };
}

/** RN-native scroll event shape we depend on. Typed structurally so
 * the mock in tests (which fires a plain object, not a real synthetic
 * event) satisfies the contract without a full `react-native` type
 * import. */
interface NativeScrollEventLike {
  nativeEvent: {
    contentOffset: { x: number; y: number };
    contentSize: { width: number; height: number };
    layoutMeasurement: { width: number; height: number };
  };
}

/**
 * ScrollView - wraps RN's ScrollView with motif's prop schema. Box-
 * level style props resolve into RN's `contentContainerStyle` so the
 * scrollable region is styled directly without an extra View wrapper;
 * children are direct children of the RN ScrollView so any `<Sticky>`
 * descendants surface as `stickyHeaderIndices` for free.
 *
 * Pass a `ref` to bind a {@link useScroll} hook to this container -
 * the ref's `__publisher` exposes scroll state as motion values via
 * the hook.
 */
export interface ScrollViewProps extends BoxProps {
  direction?: 'vertical' | 'horizontal' | 'both';
  hideScrollbar?: boolean;
  children?: ReactNode;
  /** Forwarded onScroll handler. Fires on every scroll event the
   * underlying RN ScrollView emits; motif also reads each event to
   * publish to any registered {@link useScroll} subscribers. */
  onScroll?: (event: NativeScrollEventLike) => void;
  /** Throttle for RN's native scroll events, in ms. Defaults to `16`
   * (≈60fps) so `useScroll` motion values update once per frame. */
  scrollEventThrottle?: number;
  /** Ref to motif's scroll publisher. Pass a `useRef<MotifScrollViewRef>(null)`
   * and hand the same ref to `useScroll({ container: ref })`. */
  ref?: Ref<MotifScrollViewRef>;
  /**
   * Called when scrolling comes within `onEndReachedThreshold` of the end,
   * once per content length, so an infinite list loads its next page once.
   */
  onEndReached?: () => void;
  /** How near the end `onEndReached` fires, in visible lengths. Defaults to `0.5`. */
  onEndReachedThreshold?: number;
  /** Pull to refresh: shows the platform's refresh control and calls this on a pull. */
  onRefresh?: () => void;
  /** Whether the refresh indicator shows. Set it while the refresh runs. */
  refreshing?: boolean;
}
export const ScrollView: MotifComponent<ScrollViewProps, ReactElement | null> = function ({
  direction = 'vertical',
  hideScrollbar = false,
  children,
  style: userStyle,
  onScroll: consumerOnScroll,
  scrollEventThrottle = 16,
  ref,
  onEndReached,
  onEndReachedThreshold = 0.5,
  onRefresh,
  refreshing = false,
  ...rest
}: ScrollViewProps): ReactElement {
  // Box style props split across two RN slots: sizing/flex/positioning
  // bound the scroll *frame* (web's scrolling element), while inner
  // layout (padding, gap, alignment, background) belongs on the content
  // container. Routing everything to `contentContainerStyle` mistranslates
  // `<ScrollView h={300}>` - on web it caps the viewport; on native it
  // would pin the inner content height and break scrolling.
  const { resolved, passThrough } = useResolvedBoxStyleObject(rest);
  const { frame, content } = splitScrollStyle(resolved);
  const sheet = StyleSheet.create({ frame: frame as ViewStyle, content: content as ViewStyle });
  const frameStyle: ViewStyle[] =
    userStyle === undefined
      ? [sheet.frame]
      : Array.isArray(userStyle)
        ? [sheet.frame, ...(userStyle as ViewStyle[])]
        : [sheet.frame, userStyle as ViewStyle];
  const stickyIndices = collectStickyIndices(children);

  // Publisher singleton for this component's lifetime. Held in a ref
  // so reads are stable; the imperative handle below exposes it as
  // the consumer-facing `__publisher` slot.
  const publisherRef = useRef<MutableScrollPublisher | null>(null);
  if (publisherRef.current === null) {
    publisherRef.current = createScrollPublisher();
  }
  const publisher = publisherRef.current;

  useImperativeHandle(ref, (): MotifScrollViewRef => ({ __publisher: publisher }), [publisher]);

  // Mirrors FlatList: once per content length, and for content that does not
  // fill the view, which is only known once both sizes have been reported.
  const horizontal = direction === 'horizontal';
  const metrics = useRef({ offset: 0, size: -1, visible: 0, lastEnd: -1 });
  const checkEnd = (): void => {
    const m = metrics.current;
    if (onEndReached === undefined || m.visible === 0 || m.size < 0) return;
    if (
      m.size - m.offset - m.visible <= m.visible * onEndReachedThreshold &&
      m.size !== m.lastEnd
    ) {
      m.lastEnd = m.size;
      onEndReached();
    }
  };

  const onScroll = (event: NativeScrollEventLike): void => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    metrics.current.offset = horizontal ? contentOffset.x : contentOffset.y;
    metrics.current.size = horizontal ? contentSize.width : contentSize.height;
    metrics.current.visible = horizontal ? layoutMeasurement.width : layoutMeasurement.height;
    checkEnd();
    publisher.__push({
      scrollX: contentOffset.x,
      scrollY: contentOffset.y,
      contentWidth: contentSize.width,
      contentHeight: contentSize.height,
      layoutWidth: layoutMeasurement.width,
      layoutHeight: layoutMeasurement.height,
    });
    consumerOnScroll?.(event);
  };

  return (
    <RNScrollView
      {...(passThrough as Record<string, unknown>)}
      horizontal={direction === 'horizontal'}
      showsVerticalScrollIndicator={!hideScrollbar && direction !== 'horizontal'}
      showsHorizontalScrollIndicator={!hideScrollbar && direction !== 'vertical'}
      style={frameStyle}
      contentContainerStyle={sheet.content}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      {...(onEndReached !== undefined
        ? {
            onLayout: (e: LayoutChangeEvent) => {
              const { width, height } = e.nativeEvent.layout;
              metrics.current.visible = horizontal ? width : height;
              checkEnd();
              (passThrough.onLayout as ((ev: LayoutChangeEvent) => void) | undefined)?.(e);
            },
            onContentSizeChange: (width: number, height: number) => {
              metrics.current.size = horizontal ? width : height;
              checkEnd();
              (passThrough.onContentSizeChange as ((w: number, h: number) => void) | undefined)?.(
                width,
                height,
              );
            },
          }
        : {})}
      {...(onRefresh !== undefined
        ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> }
        : {})}
      {...(stickyIndices.length > 0 ? { stickyHeaderIndices: stickyIndices } : {})}
    >
      {children}
    </RNScrollView>
  );
};

/**
 * Resolved-style keys that describe how the scroll view lays out its
 * *children* - these belong on RN's `contentContainerStyle`. Everything
 * else (size, flex, position, margin, border, background-frame chrome)
 * bounds the scroll frame itself and goes on `style`.
 */
const CONTENT_CONTAINER_KEYS: ReadonlySet<string> = new Set([
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'gap',
  'rowGap',
  'columnGap',
  'alignItems',
  'justifyContent',
  'alignContent',
  'flexDirection',
  'flexWrap',
  'backgroundColor',
  'direction',
]);

/**
 * Partition a resolved Box style into the scroll *frame* style and the
 * inner *content-container* style. See {@link CONTENT_CONTAINER_KEYS}.
 */
function splitScrollStyle(resolved: Record<string, unknown>): {
  frame: Record<string, unknown>;
  content: Record<string, unknown>;
} {
  const frame: Record<string, unknown> = {};
  const content: Record<string, unknown> = {};
  for (const key in resolved) {
    (CONTENT_CONTAINER_KEYS.has(key) ? content : frame)[key] = resolved[key];
  }
  return { frame, content };
}

/**
 * Walk the direct children of `<ScrollView>` and collect the indices of
 * any `<Sticky>` instances. The result feeds `stickyHeaderIndices` on
 * the underlying RN ScrollView. Only direct children are scanned - RN's
 * sticky machinery doesn't see deeper.
 */
function collectStickyIndices(children: ReactNode): number[] {
  const indices: number[] = [];
  Children.toArray(children).forEach((child, i) => {
    if (isValidElement(child) && child.type === Sticky) indices.push(i);
  });
  return indices;
}

/**
 * Sticky on native - RN doesn't have CSS `position: sticky`. Instead,
 * RN's `<ScrollView stickyHeaderIndices={[...]}>` pins the listed
 * direct children to the top of the scroll area while they're in view.
 *
 * Motif's `<Sticky>` is a marker: when used as a **direct child** of
 * `<ScrollView>`, the parent collects its index and forwards it via
 * `stickyHeaderIndices`. Nesting Sticky deeper than that doesn't
 * sticky-pin (RN's machinery only sees direct children); document and
 * accept that limitation rather than building a competing
 * polyfill.
 *
 * The children render inside a styled Box so Box-level style props
 * (background, padding, etc.) still apply - this lets the sticky
 * header carry its own visual style and not bleed through the scroll
 * content above it.
 */
export interface StickyProps extends BoxProps {
  /**
   * Reserved for parity with the web `position: sticky` API. Not used
   * by RN's `stickyHeaderIndices` mechanism; kept on the prop surface
   * so cross-platform code compiles.
   */
  top?: number | string;
  bottom?: number | string;
  zIndex?: number;
  children?: ReactNode;
}
export const Sticky: MotifComponent<StickyProps, ReactElement | null> = function ({
  top: _top,
  bottom: _bottom,
  zIndex: _zIndex,
  children,
  ...rest
}: StickyProps): ReactElement {
  return <Box {...rest}>{children}</Box>;
};

export interface VirtualListProps<T> extends Omit<ScrollViewProps, 'children'> {
  data: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyOf?: (item: T, index: number) => string | number;
  itemHeight?: number;
}

/**
 * Custom virtualisation function. Receives the same props as
 * `<VirtualList>`; returns a React element that renders the list.
 * Native consumers usually wrap `@shopify/flash-list`.
 */
export type VirtualListImpl = <T>(props: VirtualListProps<T>) => ReactElement;

interface VirtualListRegistry {
  impl: VirtualListImpl | null;
  threshold: number;
}
const virtualListRegistry: VirtualListRegistry = { impl: null, threshold: 50 };

/**
 * Register a custom virtualised renderer. Below `threshold` items
 * (default 50), motif renders every row directly; above, it
 * delegates to the registered impl. Pass `null` to clear.
 *
 * ```ts
 * import { FlashList } from '@shopify/flash-list';
 * import { registerVirtualListImpl } from '@usemotif/react-native';
 *
 * registerVirtualListImpl(({ data, renderItem, keyOf, itemHeight }) => (
 *   <FlashList
 *     data={data}
 *     renderItem={({ item, index }) => renderItem(item, index)}
 *     keyExtractor={(item, i) => String(keyOf?.(item, i) ?? i)}
 *     estimatedItemSize={itemHeight}
 *   />
 * ));
 * ```
 */
export function registerVirtualListImpl(
  impl: VirtualListImpl | null,
  options?: { threshold?: number },
): void {
  virtualListRegistry.impl = impl;
  if (options?.threshold !== undefined) virtualListRegistry.threshold = options.threshold;
}

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
