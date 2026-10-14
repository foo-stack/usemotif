/**
 * Calls `onEndReached` once the scroll position is within `threshold` visible
 * lengths of the end, once per content length, as React Native's FlatList
 * does. A container whose content does not fill it counts as at the end, so
 * an infinite list keeps loading until it scrolls.
 */
export function checkEndReached(
  el: HTMLElement,
  horizontal: boolean,
  threshold: number,
  last: { current: number },
  onEndReached: () => void,
): void {
  const visible = horizontal ? el.clientWidth : el.clientHeight;
  if (visible === 0) return;
  const size = horizontal ? el.scrollWidth : el.scrollHeight;
  const offset = horizontal ? el.scrollLeft : el.scrollTop;
  if (size - offset - visible <= visible * threshold && size !== last.current) {
    last.current = size;
    onEndReached();
  }
}
