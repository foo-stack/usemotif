/** @vitest-environment jsdom */
/**
 * Native TagsInput on the `react-native` jsdom mock. The mock's TextInput does
 * not wire its handlers to DOM events, so the tests call the ones React holds.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TagsInput } from './tags-input.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function handler(name: string): (...args: unknown[]) => void {
  const el = container.querySelector('[data-motif-host="TextInput"]')!;
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return (el as unknown as Record<string, Record<string, (...args: unknown[]) => void>>)[key]![
    name
  ]!;
}

function call(name: string, ...args: unknown[]): void {
  act(() => {
    handler(name)(...args);
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

describe('native TagsInput', () => {
  it('adds on submit and on a typed delimiter, and removes with Backspace', () => {
    const onValueChange = vi.fn();
    render(<TagsInput accessibilityLabel="Topics" onValueChange={onValueChange} />);
    call('onChangeText', 'react');
    call('onSubmitEditing');
    call('onChangeText', 'vue,');
    expect(onValueChange).toHaveBeenLastCalledWith(['react', 'vue']);
    call('onKeyPress', { nativeEvent: { key: 'Backspace' } });
    expect(onValueChange).toHaveBeenLastCalledWith(['react']);
  });

  it('adds a pressed suggestion', () => {
    const onValueChange = vi.fn();
    render(
      <TagsInput
        accessibilityLabel="Topics"
        suggestions={['react', 'vue']}
        onValueChange={onValueChange}
      />,
    );
    call('onChangeText', 'vu');
    act(() => {
      container.querySelector<HTMLElement>('[accessibilityLabel="vue"]')!.click();
    });
    expect(onValueChange).toHaveBeenLastCalledWith(['vue']);
  });
});
