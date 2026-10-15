/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoverCard, Popover, Tooltip } from './index.js';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

/** A 100x40 trigger at (300, 200), so an arrow can point at its centre. */
function placeTrigger(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const r = { left: 300, top: 200, width: 100, height: 40 };
      return this.tagName === 'BUTTON'
        ? ({ ...r, right: 400, bottom: 240, x: 300, y: 200, toJSON: () => ({}) } as DOMRect)
        : ({
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect);
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
}

function arrow(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-side]');
}

describe('overlay Arrow', () => {
  it('sits on the edge facing the trigger, pointing at its centre', () => {
    placeTrigger();
    act(() =>
      root.render(
        <Popover.Root defaultOpen>
          <Popover.Trigger>
            <button type="button">open</button>
          </Popover.Trigger>
          <Popover.Content placement="bottom">
            <Popover.Arrow size={10} borderColor="#ccc" />
            body
          </Popover.Content>
        </Popover.Root>,
      ),
    );
    const el = arrow()!;
    expect(el.getAttribute('data-side')).toBe('top');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.style.top).toBe('-5px');
    // Trigger centre x 350, box left 250: 100px along, minus half the arrow.
    expect(el.style.left).toBe('95px');
    expect(el.style.borderTop).toBe('1px solid rgb(204, 204, 204)');
    expect(el.style.borderLeft).toBe('1px solid rgb(204, 204, 204)');
    expect(el.style.borderBottom).toBe('');
  });

  it('moves to the other edge when the surface flips', () => {
    placeTrigger();
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(300);
    act(() =>
      root.render(
        <Popover.Root defaultOpen>
          <Popover.Trigger>
            <button type="button">open</button>
          </Popover.Trigger>
          <Popover.Content placement="bottom">
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>,
      ),
    );
    expect(arrow()!.getAttribute('data-side')).toBe('bottom');
  });

  it('renders nothing outside a floating content', () => {
    act(() => root.render(<Popover.Arrow />));
    expect(arrow()).toBeNull();
  });

  it('works in HoverCard and Tooltip, on the side they land on', () => {
    placeTrigger();
    vi.useFakeTimers();
    act(() =>
      root.render(
        <HoverCard.Root openDelay={0} placement="right">
          <HoverCard.Trigger>
            <button type="button">card</button>
          </HoverCard.Trigger>
          <HoverCard.Content>
            <HoverCard.Arrow />
          </HoverCard.Content>
        </HoverCard.Root>,
      ),
    );
    act(() => {
      container
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(1);
    });
    expect(arrow()!.getAttribute('data-side')).toBe('left');
    act(() => root.unmount());
    root = createRoot(container);
    act(() =>
      root.render(
        <Tooltip.Root openDelay={0} placement="top">
          <Tooltip.Trigger>
            <button type="button">tip</button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Tooltip.Arrow />
            hint
          </Tooltip.Content>
        </Tooltip.Root>,
      ),
    );
    act(() => {
      container
        .querySelector('button')!
        .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      vi.advanceTimersByTime(1);
    });
    expect(arrow()!.getAttribute('data-side')).toBe('bottom');
    vi.useRealTimers();
  });
});
