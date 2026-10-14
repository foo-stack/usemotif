/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Popover, Tooltip } from './index.js';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  // A 100x40 trigger at (300, 200); floating content 200x100.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return (
        this.tagName === 'BUTTON'
          ? { left: 300, top: 200, width: 100, height: 40, right: 400, bottom: 240 }
          : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }
      ) as DOMRect;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

// The surface used to mount a render after `open` turned true, so the
// positioning that runs when it opens found nothing to measure and left it
// at the page's top-left corner.
describe('floating content opened after mount is positioned', () => {
  it('places a Popover opened by a click under its trigger', () => {
    act(() =>
      root.render(
        <Popover.Root>
          <Popover.Trigger>
            <button type="button">open</button>
          </Popover.Trigger>
          <Popover.Content>body</Popover.Content>
        </Popover.Root>,
      ),
    );
    act(() => container.querySelector('button')!.click());
    const surface = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(surface.style.top).toBe('248px');
    expect(surface.style.left).toBe('250px');
  });

  it('places a Tooltip opened by focus beside its trigger', () => {
    vi.useFakeTimers();
    act(() =>
      root.render(
        <Tooltip.Root openDelay={0}>
          <Tooltip.Trigger>
            <button type="button">tip</button>
          </Tooltip.Trigger>
          <Tooltip.Content>hint</Tooltip.Content>
        </Tooltip.Root>,
      ),
    );
    act(() => {
      container
        .querySelector('button')!
        .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      vi.advanceTimersByTime(1);
    });
    const tip = document.body.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tip.style.top).toBe('248px');
    vi.useRealTimers();
  });
});
