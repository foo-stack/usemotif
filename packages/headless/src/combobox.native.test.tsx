/** @vitest-environment jsdom */
/**
 * Native Combobox on the `react-native` jsdom mock: the loading and empty
 * states, and options shown as given when `filter` is `false`.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ComboboxList, ComboboxRoot } from './combobox.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
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

const remote = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

function list(): string {
  return container.querySelector('[accessibilityRole="list"]')?.textContent ?? '';
}

describe('native Combobox async options', () => {
  it('shows the loading message while loading with no options, then the empty message', () => {
    render(
      <ComboboxRoot options={[]} loading defaultOpen>
        <ComboboxList loadingMessage="Fetching" emptyMessage="Nothing found" />
      </ComboboxRoot>,
    );
    expect(list()).toBe('Fetching');
    render(
      <ComboboxRoot options={[]} defaultOpen>
        <ComboboxList loadingMessage="Fetching" emptyMessage="Nothing found" />
      </ComboboxRoot>,
    );
    expect(list()).toBe('Nothing found');
  });

  it('shows options as given when filter is false', () => {
    render(
      <ComboboxRoot options={remote} filter={false} inputValue="zzz" defaultOpen>
        <ComboboxList />
      </ComboboxRoot>,
    );
    expect(list()).toBe('AlphaBeta');
    render(
      <ComboboxRoot options={remote} inputValue="zzz" defaultOpen>
        <ComboboxList />
      </ComboboxRoot>,
    );
    expect(list()).toBe('No options');
  });
});
