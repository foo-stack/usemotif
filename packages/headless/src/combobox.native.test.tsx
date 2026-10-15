/** @vitest-environment jsdom */
/**
 * Native Combobox on the `react-native` jsdom mock: the loading and empty
 * states, and options shown as given when `filter` is `false`.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ComboboxList, ComboboxRoot, MultiSelectList, MultiSelectRoot } from './combobox.native.js';

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

describe('native option lists', () => {
  it('render through FlatList, which renders only the rows near the view', () => {
    render(
      <ComboboxRoot options={remote} defaultOpen>
        <ComboboxList />
      </ComboboxRoot>,
    );
    const flat = container.querySelector('[data-motif-host="FlatList"]');
    expect(flat?.textContent).toBe('AlphaBeta');
  });

  it('MultiSelect too, with its empty message when nothing matches', () => {
    render(
      <MultiSelectRoot options={[]} defaultOpen>
        <MultiSelectList emptyMessage="None" />
      </MultiSelectRoot>,
    );
    expect(container.querySelector('[data-motif-host="FlatList"]')?.textContent).toBe('None');
  });
});

describe('native option groups', () => {
  it('puts a heading above the first option of each group', () => {
    render(
      <ComboboxRoot
        options={[
          { value: 'a', label: 'Alpha', group: 'Greek' },
          { value: 'b', label: 'Beta', group: 'Greek' },
          { value: 'c', label: 'Cyan', group: 'Colour' },
        ]}
        defaultOpen
      >
        <ComboboxList />
      </ComboboxRoot>,
    );
    const headers = Array.from(container.querySelectorAll('[accessibilityRole="header"]'));
    expect(headers.map((h) => h.textContent)).toEqual(['Greek', 'Colour']);
  });
});
