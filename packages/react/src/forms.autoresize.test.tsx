/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextArea } from './forms.js';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  // jsdom has no layout: content is 60px tall and the borders take 2px.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(60);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(38);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('TextArea autoResize without field-sizing', () => {
  it('measures its height on mount and on input, and still calls onInput', () => {
    const onInput = vi.fn();
    act(() => root.render(<TextArea autoResize defaultValue="hi" onInput={onInput} />));
    const el = container.querySelector('textarea')!;
    expect(el.style.height).toBe('62px');
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(90);
    act(() => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(el.style.height).toBe('92px');
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('leaves the height alone without autoResize', () => {
    act(() => root.render(<TextArea />));
    act(() => {
      container.querySelector('textarea')!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('textarea')!.style.height).toBe('');
  });
});
