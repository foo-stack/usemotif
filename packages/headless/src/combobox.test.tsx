import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Combobox, MultiSelect, Search, Select } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
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

function press(el: HTMLElement, key: string): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

function type(el: HTMLInputElement, value: string): void {
  // React tracks the input's value via a property descriptor; setting
  // el.value directly bypasses React's internal change tracker. Use
  // the native setter so React picks up the change.
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const langs = [
  { value: 'ts', label: 'TypeScript' },
  { value: 'js', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'rs', label: 'Rust' },
  { value: 'py', label: 'Python', disabled: true },
];

function findOptions(): Element[] {
  // Listbox portals into document.body; query globally.
  return Array.from(document.body.querySelectorAll('[role="option"]'));
}

describe('Combobox - render shape', () => {
  it('input gets role=combobox + aria-expanded=false initially', () => {
    render(
      <Combobox.Root options={langs}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('focusing the input opens the list (role=listbox + role=option for each)', () => {
    render(
      <Combobox.Root options={langs}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    act(() => {
      input.focus();
    });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.querySelector('[role="listbox"]')).not.toBeNull();
    expect(findOptions().length).toBe(5);
  });
});

describe('Combobox - filtering', () => {
  it('default filter is case-insensitive substring on label', () => {
    render(
      <Combobox.Root options={langs} defaultOpen>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    type(input, 'sCRIPT');
    const labels = findOptions().map((o) => o.textContent);
    expect(labels).toContain('TypeScript');
    expect(labels).toContain('JavaScript');
    expect(labels).not.toContain('Go');
  });

  it('empty input shows all options', () => {
    render(
      <Combobox.Root options={langs} defaultOpen>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    expect(findOptions().length).toBe(5);
  });

  it('custom filter overrides the default', () => {
    render(
      <Combobox.Root
        options={langs}
        defaultOpen
        filter={(opt, input) => opt.value.startsWith(input)}
      >
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    type(input, 'r'); // values starting with 'r' → 'rs' (Rust)
    const labels = findOptions().map((o) => o.textContent);
    expect(labels).toEqual(['Rust']);
  });
});

describe('Combobox - keyboard navigation', () => {
  it('ArrowDown opens the list and moves the highlight', () => {
    render(
      <Combobox.Root options={langs}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    input.focus();
    // Open with ArrowDown - first press both opens AND highlights index 0.
    press(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
    expect(input.getAttribute('aria-activedescendant')!.endsWith('-option-0')).toBe(true);
    press(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')!.endsWith('-option-1')).toBe(true);
  });

  it('Enter on highlighted option selects it', () => {
    const onValueChange = vi.fn();
    render(
      <Combobox.Root options={langs} onValueChange={onValueChange}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    input.focus();
    press(input, 'ArrowDown'); // highlight 0 = TypeScript
    press(input, 'Enter');
    expect(onValueChange).toHaveBeenCalledWith('ts');
  });

  it('Escape closes the list', () => {
    render(
      <Combobox.Root options={langs} defaultOpen>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    expect(input.getAttribute('aria-expanded')).toBe('true');
    press(input, 'Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  // #257 - Enter while the list is closed must NOT select a stale highlight
  // (e.g. after ArrowDown then Escape, an Enter to submit a form).
  it('Enter does nothing once the list is closed', () => {
    const onValueChange = vi.fn();
    render(
      <Combobox.Root options={langs} onValueChange={onValueChange}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    input.focus();
    press(input, 'ArrowDown'); // open + highlight 0
    press(input, 'Escape'); // close (and reset highlight)
    press(input, 'Enter'); // must be a no-op now
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('disabled option does not select via Enter', () => {
    const onValueChange = vi.fn();
    render(
      <Combobox.Root options={langs} onValueChange={onValueChange}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    input.focus();
    // Cycle to the last item - Python (disabled).
    press(input, 'End');
    press(input, 'Enter');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // Regression: highlightedIndex wasn't clamped when typing narrowed the
  // list, so it could point past the end - dropping aria-activedescendant
  // and selecting nothing on Enter.
  it('clamps the highlight when the filtered list shrinks', () => {
    const onValueChange = vi.fn();
    render(
      <Combobox.Root options={langs} onValueChange={onValueChange}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
    input.focus();
    press(input, 'End'); // highlight the last option (index 4)
    expect(input.getAttribute('aria-activedescendant')!.endsWith('-option-4')).toBe(true);
    // Type to filter down to a single match (JavaScript) - index 4 is now
    // out of range and must clamp to 0.
    type(input, 'java');
    expect(findOptions()).toHaveLength(1);
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
    expect(input.getAttribute('aria-activedescendant')!.endsWith('-option-0')).toBe(true);
    // Enter now selects the (clamped) highlighted option, not nothing.
    press(input, 'Enter');
    expect(onValueChange).toHaveBeenCalledWith('js');
  });
});

describe('Select - button trigger', () => {
  it('Trigger button gets aria-haspopup="listbox" and aria-expanded toggles', () => {
    render(
      <Select.Root options={langs}>
        <Select.Trigger>
          <button>Pick</button>
        </Select.Trigger>
        <Select.List />
      </Select.Root>,
    );
    const trigger = container.querySelector('button')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      trigger.click();
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking an option selects it and closes the list', () => {
    const onValueChange = vi.fn();
    render(
      <Select.Root options={langs} onValueChange={onValueChange}>
        <Select.Trigger>
          <button>Pick</button>
        </Select.Trigger>
        <Select.List />
      </Select.Root>,
    );
    const trigger = container.querySelector('button')!;
    act(() => {
      trigger.click();
    });
    const option = findOptions().find((o) => o.textContent === 'Go')!;
    act(() => {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    expect(onValueChange).toHaveBeenCalledWith('go');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  // #224 - the open listbox used to be a keyboard dead end (arrows moved
  // nothing, Enter/Escape were swallowed).
  it('keyboard-navigates the open listbox and selects with Enter (#224)', () => {
    const onValueChange = vi.fn();
    render(
      <Select.Root options={langs} onValueChange={onValueChange}>
        <Select.Trigger>
          <button>Pick</button>
        </Select.Trigger>
        <Select.List />
      </Select.Root>,
    );
    const trigger = container.querySelector('button')!;
    act(() => trigger.focus());
    press(trigger, 'Enter'); // opens + seeds highlight to option 0
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-activedescendant')!.endsWith('-option-0')).toBe(true);
    press(trigger, 'ArrowDown'); // highlight 1 = JavaScript
    expect(trigger.getAttribute('aria-activedescendant')!.endsWith('-option-1')).toBe(true);
    press(trigger, 'Enter');
    expect(onValueChange).toHaveBeenCalledWith('js');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the open Select (#224)', () => {
    render(
      <Select.Root options={langs}>
        <Select.Trigger>
          <button>Pick</button>
        </Select.Trigger>
        <Select.List />
      </Select.Root>,
    );
    const trigger = container.querySelector('button')!;
    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    press(trigger, 'Escape');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Combobox - controlled value clearing', () => {
  function selectedLabels(): string[] {
    return findOptions()
      .filter((o) => o.getAttribute('aria-selected') === 'true')
      .map((o) => o.textContent ?? '');
  }

  it('clearing a controlled value to undefined clears the selection (no stale fallback)', () => {
    // defaultValue is what the buggy `!== undefined` path falls back to once
    // the controlled value goes undefined - it must NOT resurface.
    const view = (value: string | undefined): React.ReactElement => (
      <Combobox.Root options={langs} defaultValue="go" value={value}>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>
    );
    render(view('ts'));
    act(() => {
      container.querySelector<HTMLInputElement>('[role="combobox"]')!.focus();
    });
    expect(selectedLabels()).toEqual(['TypeScript']);

    // Clear: value -> undefined. Must show nothing selected, not 'Go'.
    render(view(undefined));
    expect(selectedLabels()).toEqual([]);
  });
});

describe('Search', () => {
  it('wraps the trigger in a role="search" landmark', () => {
    render(
      <Search.Root options={langs}>
        <Combobox.Input />
        <Combobox.List />
      </Search.Root>,
    );
    const search = container.querySelector('[role="search"]')!;
    expect(search.querySelector('[role="combobox"]')).not.toBeNull();
  });
});

describe('MultiSelect.SelectAll - keyboard activation (#170)', () => {
  it('is focusable (tabIndex=0) and toggles on Space/Enter for a non-button child', () => {
    render(
      <MultiSelect.Root options={langs} enableSelectAll>
        <MultiSelect.SelectAll>
          <span data-testid="all">All</span>
        </MultiSelect.SelectAll>
      </MultiSelect.Root>,
    );
    const all = container.querySelector('[data-testid="all"]') as HTMLElement;
    expect(all.getAttribute('role')).toBe('checkbox');
    expect(all.getAttribute('tabindex')).toBe('0');
    expect(all.getAttribute('aria-checked')).toBe('false');

    // Space selects all non-disabled options via the keyboard.
    press(all, ' ');
    expect(all.getAttribute('aria-checked')).toBe('true');
  });

  it('Enter also activates select-all', () => {
    render(
      <MultiSelect.Root options={langs} enableSelectAll>
        <MultiSelect.SelectAll>
          <span data-testid="all">All</span>
        </MultiSelect.SelectAll>
      </MultiSelect.Root>,
    );
    const all = container.querySelector('[data-testid="all"]') as HTMLElement;
    press(all, 'Enter');
    expect(all.getAttribute('aria-checked')).toBe('true');
  });
});

describe('MultiSelect - controlled value clearing (#190)', () => {
  // Mirrors the Combobox case: MultiSelect must detect control via
  // `'value' in props`, not `controlledValue !== undefined`, so clearing a
  // controlled value to undefined stays controlled-empty instead of falling
  // back to the stale uncontrolled defaultValue.
  it('clearing a controlled value to undefined clears the selection (no stale fallback)', () => {
    const all = ['ts', 'js', 'go', 'rs']; // every non-disabled option
    const view = (value: string[] | undefined): React.ReactElement => (
      <MultiSelect.Root options={langs} defaultValue={all} value={value} enableSelectAll>
        <MultiSelect.SelectAll>
          <span data-testid="all">All</span>
        </MultiSelect.SelectAll>
      </MultiSelect.Root>
    );
    const checkbox = (): HTMLElement =>
      container.querySelector('[data-testid="all"]') as HTMLElement;

    render(view(all));
    expect(checkbox().getAttribute('aria-checked')).toBe('true');

    // Clear: value -> undefined. Must show nothing selected, not the
    // defaultValue resurfacing.
    render(view(undefined));
    expect(checkbox().getAttribute('aria-checked')).toBe('false');
  });
});

describe('Combobox - async options', () => {
  const remote = [
    { value: 'a', label: 'Alpha (server match)' },
    { value: 'b', label: 'Beta (server match)' },
  ];

  function Async({
    options,
    loading,
    onInput,
  }: {
    options: typeof remote;
    loading: boolean;
    onInput?: (v: string) => void;
  }): React.ReactElement {
    return (
      <Search.Root
        options={options}
        loading={loading}
        filter={false}
        defaultOpen
        {...(onInput !== undefined ? { onInputValueChange: onInput } : {})}
      >
        <Search.Input />
        <Search.List loadingMessage="Fetching" emptyMessage="Nothing found" />
      </Search.Root>
    );
  }

  it('shows the loading message and aria-busy while loading with no options', () => {
    render(<Async options={[]} loading />);
    expect(findOptions().map((o) => o.textContent)).toEqual(['Fetching']);
    expect(document.body.querySelector('[role="listbox"]')!.getAttribute('aria-busy')).toBe('true');
  });

  it('keeps showing options while loading, and the empty message once loading ends', () => {
    render(<Async options={remote} loading />);
    expect(findOptions().length).toBe(2);
    expect(document.body.querySelector('[role="listbox"]')!.getAttribute('aria-busy')).toBe('true');
    render(<Async options={[]} loading={false} />);
    expect(findOptions().map((o) => o.textContent)).toEqual(['Nothing found']);
    expect(document.body.querySelector('[role="listbox"]')!.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows options the input does not match when filter is false, and reports each keystroke', () => {
    const onInput = vi.fn();
    render(<Async options={remote} loading={false} onInput={onInput} />);
    const input = container.querySelector('input')!;
    type(input, 'z');
    type(input, 'zq');
    expect(onInput.mock.calls.map((c) => c[0])).toEqual(['z', 'zq']);
    expect(findOptions().length).toBe(2);
  });

  it('still filters by default', () => {
    render(
      <Combobox.Root options={langs} defaultOpen>
        <Combobox.Input />
        <Combobox.List />
      </Combobox.Root>,
    );
    type(container.querySelector('input')!, 'ru');
    expect(findOptions().map((o) => o.textContent)).toEqual(['Rust']);
  });
});
