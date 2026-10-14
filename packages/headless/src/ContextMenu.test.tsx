import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextMenu } from './index.js';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function pointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
  pointerType = 'touch',
): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    area().dispatchEvent(event);
  });
}

function area(): HTMLElement {
  return container.querySelector('[data-testid="area"]')!;
}

function menu(): HTMLElement | null {
  return document.querySelector('[role="menu"]');
}

function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const onAreaClick = vi.fn();
const onAreaDown = vi.fn();

function render(delay?: number): void {
  act(() =>
    root.render(
      <ContextMenu.Root>
        <ContextMenu.Trigger {...(delay !== undefined ? { longPressDelay: delay } : {})}>
          <button type="button" data-testid="area" onClick={onAreaClick} onPointerDown={onAreaDown}>
            Area
          </button>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    ),
  );
}

describe('ContextMenu long-press on touch', () => {
  it('opens at the touch point after the delay, and still runs the child handler', () => {
    render();
    pointer('pointerdown', 40, 60);
    expect(onAreaDown).toHaveBeenCalled();
    wait(499);
    expect(menu()).toBeNull();
    wait(1);
    expect(menu()).not.toBeNull();
    expect(menu()!.style.top).toBe('60px');
    expect(menu()!.style.left).toBe('40px');
  });

  it('honours a custom delay', () => {
    render(200);
    pointer('pointerdown', 0, 0);
    wait(200);
    expect(menu()).not.toBeNull();
  });

  it('is cancelled by moving past the tolerance, lifting early, or a pointercancel', () => {
    render();
    pointer('pointerdown', 0, 0);
    pointer('pointermove', 6, 6);
    pointer('pointermove', 12, 0);
    wait(600);
    expect(menu()).toBeNull();
    pointer('pointerdown', 0, 0);
    pointer('pointerup', 0, 0);
    wait(600);
    expect(menu()).toBeNull();
    pointer('pointerdown', 0, 0);
    pointer('pointercancel', 0, 0);
    wait(600);
    expect(menu()).toBeNull();
  });

  it('never opens for a held mouse button', () => {
    render();
    pointer('pointerdown', 0, 0, 'mouse');
    wait(1000);
    expect(menu()).toBeNull();
  });

  it('swallows only the click that follows the long-press', () => {
    onAreaClick.mockClear();
    render();
    pointer('pointerdown', 0, 0);
    wait(500);
    act(() => area().click());
    expect(onAreaClick).not.toHaveBeenCalled();
    pointer('pointerdown', 0, 0, 'mouse');
    act(() => area().click());
    expect(onAreaClick).toHaveBeenCalledTimes(1);
  });
});
