/** @vitest-environment jsdom */
/** Native Listbox on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Listbox } from './listbox.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function press(label: string): void {
  act(() => {
    container.querySelector<HTMLElement>(`[accessibilityLabel="${label}"]`)!.click();
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

const FRUIT = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry' },
];

describe('native Listbox', () => {
  it('selects one in single mode and ignores disabled options', () => {
    const onValueChange = vi.fn();
    render(<Listbox options={FRUIT} onValueChange={onValueChange} />);
    press('Cherry');
    press('Banana');
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(['cherry']);
  });

  it('toggles several in multiple mode', () => {
    const onValueChange = vi.fn();
    render(<Listbox selectionMode="multiple" options={FRUIT} onValueChange={onValueChange} />);
    press('Apple');
    press('Cherry');
    press('Apple');
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual([
      ['apple'],
      ['apple', 'cherry'],
      ['cherry'],
    ]);
  });
});
