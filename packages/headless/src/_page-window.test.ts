import { describe, expect, it } from 'vitest';
import { pageForSize, pageWindow } from './_page-window.js';

describe('pageWindow', () => {
  it('keeps one edge page each side by default', () => {
    expect(pageWindow(5, 10, 1)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
    expect(pageWindow(1, 10, 1)).toEqual([1, 2, 'ellipsis', 10]);
    expect(pageWindow(3, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows `boundaries` pages at each edge', () => {
    expect(pageWindow(10, 20, 1, 2)).toEqual([1, 2, 'ellipsis', 9, 10, 11, 'ellipsis', 19, 20]);
    expect(pageWindow(3, 20, 1, 2)).toEqual([1, 2, 3, 4, 'ellipsis', 19, 20]);
    expect(pageWindow(20, 20, 1, 2)).toEqual([1, 2, 'ellipsis', 19, 20]);
  });

  it('shows every page while they fit around the edges', () => {
    expect(pageWindow(5, 9, 1, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('drops the edge pages at zero boundaries', () => {
    expect(pageWindow(5, 10, 1, 0)).toEqual(['ellipsis', 4, 5, 6, 'ellipsis']);
  });
});

describe('pageForSize', () => {
  it('keeps the first item of the current page in view', () => {
    // Page 3 at 10 per page starts at item 21, which is on page 2 at 20 per page.
    expect(pageForSize(3, 10, 20)).toBe(2);
    // Page 2 at 50 starts at item 51, which is on page 6 at 10 per page.
    expect(pageForSize(2, 50, 10)).toBe(6);
    expect(pageForSize(1, 25, 100)).toBe(1);
  });
});
