/** @vitest-environment jsdom */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollView } from './scroll.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => root.render(node));
}

function host(): HTMLElement {
  return container.querySelector('[data-motif-host="ScrollView"]')!;
}

/** The props React gave the RN ScrollView host. */
function hostProps(): Record<string, unknown> {
  const el = host() as unknown as Record<string, unknown>;
  const fiber = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))!] as {
    return: { memoizedProps: Record<string, unknown> };
  };
  return fiber.return.memoizedProps;
}

function scroll(y: number, contentHeight: number): void {
  act(() => {
    host().dispatchEvent(
      new CustomEvent('motif:scroll', {
        detail: {
          contentOffset: { x: 0, y },
          contentSize: { width: 300, height: contentHeight },
          layoutMeasurement: { width: 300, height: 100 },
        },
      }),
    );
  });
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

describe('native ScrollView onEndReached', () => {
  it('fires once near the end, and again only after the content grows', () => {
    const onEndReached = vi.fn();
    render(<ScrollView onEndReached={onEndReached} />);
    scroll(500, 1000);
    expect(onEndReached).not.toHaveBeenCalled();
    scroll(860, 1000);
    scroll(880, 1000);
    expect(onEndReached).toHaveBeenCalledTimes(1);
    scroll(1860, 2000);
    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it('fires for content that does not fill the view, once both sizes are known', () => {
    const onEndReached = vi.fn();
    const onLayout = vi.fn();
    render(<ScrollView onEndReached={onEndReached} onLayout={onLayout} />);
    const props = hostProps();
    act(() =>
      (props.onLayout as (e: unknown) => void)({
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } },
      }),
    );
    expect(onEndReached).not.toHaveBeenCalled();
    expect(onLayout).toHaveBeenCalledTimes(1);
    act(() => (props.onContentSizeChange as (w: number, h: number) => void)(300, 80));
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });
});

describe('native ScrollView pull to refresh', () => {
  it('passes a RefreshControl only when onRefresh is set', () => {
    const onRefresh = vi.fn();
    render(<ScrollView onRefresh={onRefresh} refreshing />);
    const control = hostProps().refreshControl as { props: Record<string, unknown> };
    expect(control.props).toMatchObject({ refreshing: true, onRefresh });
    render(<ScrollView key="plain" />);
    expect(hostProps().refreshControl).toBeUndefined();
  });
});
