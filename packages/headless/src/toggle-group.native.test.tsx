/** @vitest-environment jsdom */
/** Native Toggle and ToggleGroup on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toggle, ToggleGroup, ToggleGroupItem } from './toggle-group.native.js';

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

describe('native Toggle and ToggleGroup', () => {
  it('toggles a Toggle', () => {
    const onPressedChange = vi.fn();
    render(<Toggle accessibilityLabel="Bold" onPressedChange={onPressedChange} />);
    press('Bold');
    press('Bold');
    expect(onPressedChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('holds one value in single mode and several in multiple mode', () => {
    const onSingle = vi.fn();
    render(
      <ToggleGroup onValueChange={onSingle}>
        <ToggleGroupItem value="left" accessibilityLabel="Left" />
        <ToggleGroupItem value="right" accessibilityLabel="Right" />
      </ToggleGroup>,
    );
    press('Left');
    press('Right');
    press('Right');
    expect(onSingle.mock.calls.map((c) => c[0])).toEqual([['left'], ['right'], []]);

    const onMulti = vi.fn();
    render(
      <ToggleGroup type="multiple" onValueChange={onMulti}>
        <ToggleGroupItem value="left" accessibilityLabel="Left" />
        <ToggleGroupItem value="right" accessibilityLabel="Right" />
      </ToggleGroup>,
    );
    press('Left');
    press('Right');
    expect(onMulti).toHaveBeenLastCalledWith(['left', 'right']);
  });

  it('ignores presses on a disabled group', () => {
    const onValueChange = vi.fn();
    render(
      <ToggleGroup disabled onValueChange={onValueChange}>
        <ToggleGroupItem value="left" accessibilityLabel="Left" />
      </ToggleGroup>,
    );
    press('Left');
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
