import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControllableState, type UseControllableStateOptions } from './index.js';

let container: HTMLElement;
let root: Root;
let result: [unknown, (next: unknown) => void];

function Probe(props: UseControllableStateOptions<unknown>): null {
  result = useControllableState(props);
  return null;
}

function render(props: UseControllableStateOptions<unknown>): void {
  act(() => root.render(<Probe {...props} />));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useControllableState', () => {
  it('holds the value itself while uncontrolled', () => {
    const onChange = vi.fn();
    render({ value: undefined, defaultValue: 'a', onChange });
    expect(result[0]).toBe('a');
    act(() => result[1]('b'));
    expect(result[0]).toBe('b');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('follows the controlled value and only reports changes', () => {
    const onChange = vi.fn();
    render({ value: 'x', defaultValue: 'a', onChange });
    act(() => result[1]('b'));
    expect(result[0]).toBe('x');
    expect(onChange).toHaveBeenCalledWith('b');
    render({ value: 'y', defaultValue: 'a', onChange });
    expect(result[0]).toBe('y');
  });

  it('keeps an undefined value controlled when told to', () => {
    render({ value: undefined, defaultValue: 'a', controlled: true });
    expect(result[0]).toBeUndefined();
    act(() => result[1]('b'));
    expect(result[0]).toBeUndefined();
  });

  it('keeps the setter identity across re-renders', () => {
    const onChange = vi.fn();
    render({ value: undefined, defaultValue: 'a', onChange });
    const first = result[1];
    act(() => first('b'));
    render({ value: undefined, defaultValue: 'a', onChange });
    expect(result[1]).toBe(first);
  });
});
