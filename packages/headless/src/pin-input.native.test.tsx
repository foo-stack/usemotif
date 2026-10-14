/** @vitest-environment jsdom */
/**
 * Native PinInput on the `react-native` jsdom mock. The mock's TextInput is a
 * plain <input> that does not wire `onChangeText`, so the tests call the
 * handler React holds for each box.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinInput } from './pin-input.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function boxes(): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-motif-host="TextInput"]'));
}

function propsOf(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return (el as unknown as Record<string, Record<string, unknown>>)[key]!;
}

function changeText(index: number, text: string): void {
  act(() => {
    (propsOf(boxes()[index]!).onChangeText as (t: string) => void)(text);
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

describe('native PinInput', () => {
  it('offers SMS code autofill on the first box only', () => {
    render(<PinInput length={4} />);
    expect(boxes().length).toBe(4);
    expect(boxes()[0]!.getAttribute('textContentType')).toBe('oneTimeCode');
    expect(boxes()[1]!.hasAttribute('textContentType')).toBe(false);
  });

  it('builds the code as you type and completes once', () => {
    const onComplete = vi.fn();
    const onValueChange = vi.fn();
    render(<PinInput length={3} onComplete={onComplete} onValueChange={onValueChange} />);
    changeText(0, '4');
    changeText(1, 'x');
    changeText(1, '2');
    changeText(2, '9');
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(['4', '42', '429']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('429');
  });

  it('spreads a pasted or autofilled code across the boxes', () => {
    const onValueChange = vi.fn();
    render(<PinInput length={4} onValueChange={onValueChange} />);
    changeText(0, '8 8 1 2');
    expect(onValueChange).toHaveBeenLastCalledWith('8812');
  });
});
