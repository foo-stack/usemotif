import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Listbox } from './index.js';

let container: HTMLElement;
let root: Root;

const FRUIT = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry' },
];

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function list(): HTMLElement {
  return container.querySelector<HTMLElement>('[role="listbox"]')!;
}

function key(k: string): void {
  act(() => {
    list().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

function active(): string {
  const id = list().getAttribute('aria-activedescendant');
  return id === null ? '' : (document.getElementById(id)?.textContent ?? '');
}

function selected(): string[] {
  return Array.from(container.querySelectorAll('[role="option"][aria-selected="true"]')).map(
    (o) => o.textContent ?? '',
  );
}

function option(label: string): HTMLElement {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (o) => o.textContent === label,
  )!;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('Listbox', () => {
  it('is a focusable listbox whose active option follows the arrows, skipping disabled ones', () => {
    render(<Listbox aria-label="Fruit" options={FRUIT} />);
    expect(list().tabIndex).toBe(0);
    act(() => list().focus());
    expect(active()).toBe('Apple');
    key('ArrowDown');
    key('ArrowDown');
    expect(active()).toBe('Blueberry');
    key('End');
    expect(active()).toBe('Cherry');
    key('ArrowDown');
    expect(active()).toBe('Cherry');
    key('ArrowUp');
    key('ArrowUp');
    expect(active()).toBe('Apricot');
    key('Home');
    expect(active()).toBe('Apple');
  });

  it('jumps by type-ahead, cycles on a repeated letter, and resets after a pause', () => {
    vi.useFakeTimers();
    render(<Listbox aria-label="Fruit" options={FRUIT} />);
    act(() => list().focus());
    key('c');
    expect(active()).toBe('Cherry');
    key('a');
    expect(active()).toBe('Cherry');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    key('a');
    expect(active()).toBe('Apple');
    key('a');
    expect(active()).toBe('Apricot');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    key('b');
    expect(active()).toBe('Blueberry');
  });

  it('selects with Enter, Space and click in single mode', () => {
    const onValueChange = vi.fn();
    render(<Listbox aria-label="Fruit" options={FRUIT} onValueChange={onValueChange} />);
    act(() => list().focus());
    key('ArrowDown');
    key('Enter');
    expect(selected()).toEqual(['Apricot']);
    act(() => {
      option('Cherry').dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
    });
    expect(selected()).toEqual(['Cherry']);
    expect(document.activeElement).toBe(list());
    act(() => {
      option('Banana').dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
    });
    expect(selected()).toEqual(['Cherry']);
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(['apricot', 'cherry']);
  });

  it('toggles several in multiple mode, with aria-multiselectable', () => {
    render(
      <Listbox
        aria-label="Fruit"
        selectionMode="multiple"
        options={FRUIT}
        defaultValue={['apple']}
      />,
    );
    expect(list().getAttribute('aria-multiselectable')).toBe('true');
    act(() => list().focus());
    key('ArrowDown');
    key(' ');
    expect(selected()).toEqual(['Apple', 'Apricot']);
    key('Home');
    key(' ');
    expect(selected()).toEqual(['Apricot']);
  });

  it('keeps controlled values authoritative', () => {
    render(<Listbox aria-label="Fruit" options={FRUIT} value="apple" />);
    act(() => list().focus());
    key('ArrowDown');
    key('Enter');
    expect(selected()).toEqual(['Apple']);
  });
});
