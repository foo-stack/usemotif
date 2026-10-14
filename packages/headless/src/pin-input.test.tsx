import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinInput } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function boxes(): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input'));
}

function type(el: HTMLInputElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function key(el: HTMLInputElement, k: string): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

function paste(el: HTMLInputElement, text: string): void {
  const ev = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } });
  act(() => {
    el.dispatchEvent(ev);
  });
}

const code = (): string =>
  boxes()
    .map((b) => b.value)
    .join('');

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('PinInput', () => {
  it('renders a labelled group of boxes with one-time-code autofill on the first', () => {
    render(<PinInput length={4} aria-label="Code" />);
    expect(container.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Code');
    expect(boxes().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Character 1 of 4',
      'Character 2 of 4',
      'Character 3 of 4',
      'Character 4 of 4',
    ]);
    expect(boxes().map((b) => b.autocomplete)).toEqual(['one-time-code', 'off', 'off', 'off']);
    expect(boxes()[0]!.inputMode).toBe('numeric');
  });

  it('advances as you type, drops rejected characters, and completes once', () => {
    const onComplete = vi.fn();
    render(<PinInput length={4} onComplete={onComplete} />);
    act(() => boxes()[0]!.focus());
    type(boxes()[0]!, '1');
    expect(document.activeElement).toBe(boxes()[1]);
    type(boxes()[1]!, 'x');
    expect(code()).toBe('1');
    type(boxes()[1]!, '2');
    type(boxes()[2]!, '3');
    type(boxes()[3]!, '4');
    expect(code()).toBe('1234');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('fills every box from a paste or an autofilled code', () => {
    const onValueChange = vi.fn();
    render(<PinInput length={4} onValueChange={onValueChange} />);
    paste(boxes()[0]!, '98-76');
    expect(code()).toBe('9876');
    expect(onValueChange).toHaveBeenLastCalledWith('9876');
    render(<PinInput key="autofill" length={4} />);
    type(boxes()[0]!, '5555');
    expect(code()).toBe('5555');
  });

  it('steps back with Backspace and moves with the arrow keys', () => {
    render(<PinInput length={4} defaultValue="12" />);
    act(() => boxes()[2]!.focus());
    key(boxes()[2]!, 'Backspace');
    expect(code()).toBe('1');
    expect(document.activeElement).toBe(boxes()[1]);
    key(boxes()[1]!, 'ArrowLeft');
    expect(document.activeElement).toBe(boxes()[0]);
    key(boxes()[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('masks the characters and keeps a controlled value authoritative', () => {
    render(<PinInput length={4} value="12" mask />);
    expect(boxes()[0]!.type).toBe('password');
    type(boxes()[2]!, '3');
    expect(code()).toBe('12');
  });

  it('accepts letters when alphanumeric', () => {
    render(<PinInput length={4} type="alphanumeric" />);
    paste(boxes()[0]!, 'ab12');
    expect(code()).toBe('ab12');
    expect(boxes()[0]!.inputMode).toBe('text');
  });
});
