import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster, useToast, type ToasterProps } from './Toast.js';

let container: HTMLElement;
let root: Root;
let push: ReturnType<typeof useToast>['toast'] | null = null;

function Api(): null {
  push = useToast().toast;
  return null;
}

function render(props: Omit<ToasterProps, 'children'> = {}): void {
  act(() =>
    root.render(
      <Toaster {...props}>
        <Api />
      </Toaster>,
    ),
  );
}

function toasts(): Element[] {
  return Array.from(document.body.querySelectorAll('[role="status"], [role="alert"]'));
}

/** Each toast's title: the default content also holds a "×" dismiss button. */
function titles(): string[] {
  return toasts().map((t) => t.firstElementChild?.textContent ?? '');
}

/** The default list: the fixed container the toasts sit in. */
function list(): HTMLElement {
  return toasts()[0]!.parentElement as HTMLElement;
}

function add(input: Parameters<NonNullable<typeof push>>[0]): void {
  act(() => {
    push!(input);
  });
}

function tick(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

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

describe('Toaster - pause on hover and focus', () => {
  it('stops every timer while hovered, then resumes each with its remaining time', () => {
    render();
    add({ title: 'A', duration: 1000 });
    tick(600);
    add({ title: 'B', duration: 1000 });
    act(() => {
      list().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    tick(5000);
    expect(toasts()).toHaveLength(2);
    act(() => {
      list().dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
      );
    });
    tick(399);
    expect(titles()).toEqual(['A', 'B']);
    tick(1);
    expect(titles()).toEqual(['B']);
    tick(600);
    expect(toasts()).toHaveLength(0);
  });

  it('pauses while focus is inside, and a toast added meanwhile waits too', () => {
    render({
      renderToast: (item, { dismiss }) => (
        <button type="button" onClick={dismiss}>
          {item.title as ReactNode}
        </button>
      ),
    });
    add({ title: 'A', duration: 1000 });
    const button = document.body.querySelector('[role="status"] button') as HTMLButtonElement;
    act(() => button.focus());
    add({ title: 'B', duration: 1000 });
    tick(5000);
    expect(toasts()).toHaveLength(2);
    act(() => button.blur());
    tick(1000);
    expect(toasts()).toHaveLength(0);
  });
});

describe('Toaster - placement and renderToast', () => {
  it('pins the default list where asked, bottom-end by default', () => {
    render();
    add({ title: 'A' });
    expect(list().style.bottom).toBe('16px');
    expect(list().style.insetInlineEnd).toBe('16px');
    act(() => root.unmount());
    root = createRoot(container);
    render({ placement: 'top' });
    add({ title: 'B' });
    expect(list().style.top).toBe('16px');
    expect(list().style.left).toBe('50%');
  });

  it('renders each toast through renderToast inside the default list', () => {
    render({ renderToast: (item) => <strong>{item.title as ReactNode}</strong> });
    add({ title: 'Saved' });
    expect(toasts()[0]!.innerHTML).toBe('<strong>Saved</strong>');
  });
});
