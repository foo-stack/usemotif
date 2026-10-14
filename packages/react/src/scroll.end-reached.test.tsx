/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollView } from './scroll.js';

let container: HTMLElement;
let root: Root;
// jsdom has no layout: a 100px view over `content` px of content.
let content = 1000;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  content = 1000;
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => content);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function scrollTo(top: number): void {
  const el = container.firstElementChild as HTMLElement;
  el.scrollTop = top;
  act(() => {
    el.dispatchEvent(new Event('scroll'));
  });
}

describe('ScrollView onEndReached', () => {
  it('fires once near the end, and again only after the content grows', () => {
    const onEndReached = vi.fn();
    const onScroll = vi.fn();
    act(() => root.render(<ScrollView h={100} onEndReached={onEndReached} onScroll={onScroll} />));
    scrollTo(500);
    expect(onEndReached).not.toHaveBeenCalled();
    scrollTo(860); // 40px from the end, inside half a view
    scrollTo(880);
    expect(onEndReached).toHaveBeenCalledTimes(1);
    expect(onScroll).toHaveBeenCalledTimes(3);
    content = 2000;
    scrollTo(1860);
    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it('honours the threshold, and fires for content that does not fill the view', () => {
    const near = vi.fn();
    act(() => root.render(<ScrollView onEndReached={near} onEndReachedThreshold={0.1} />));
    scrollTo(850); // 50px from the end, outside a tenth of a view
    expect(near).not.toHaveBeenCalled();
    act(() => root.unmount());
    root = createRoot(container);
    content = 80;
    const short = vi.fn();
    act(() => root.render(<ScrollView onEndReached={short} />));
    expect(short).toHaveBeenCalledTimes(1);
  });

  it('keeps onRefresh and refreshing off the DOM', () => {
    act(() => root.render(<ScrollView onRefresh={() => {}} refreshing />));
    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute('refreshing')).toBe(false);
  });
});
