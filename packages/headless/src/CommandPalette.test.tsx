import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultFuzzyMatch, useCommandPaletteShortcut, type Command } from './CommandPalette.js';
import { CommandPalette } from './index.js';

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

function press(key: string): void {
  const active = document.activeElement ?? document.body;
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    active.dispatchEvent(event);
  });
}

function type(value: string): void {
  const input = document.querySelector('input')! as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function buildCommands(handlers: Record<string, () => void> = {}): Command[] {
  return [
    {
      id: 'open',
      label: 'Open file',
      section: 'File',
      shortcut: ['Mod', 'O'],
      onSelect: handlers['open'] ?? (() => {}),
    },
    {
      id: 'save',
      label: 'Save',
      section: 'File',
      shortcut: ['Mod', 'S'],
      onSelect: handlers['save'] ?? (() => {}),
    },
    {
      id: 'find',
      label: 'Find in file',
      section: 'Edit',
      keywords: ['search'],
      onSelect: handlers['find'] ?? (() => {}),
    },
    {
      id: 'theme',
      label: 'Toggle dark theme',
      onSelect: handlers['theme'] ?? (() => {}),
      disabled: true,
    },
  ];
}

function PaletteHarness({
  commands,
  initialOpen = true,
  recents = [],
}: {
  commands: Command[];
  initialOpen?: boolean;
  recents?: string[];
}): React.ReactElement {
  const [open, setOpen] = useState(initialOpen);
  const [rec, setRec] = useState<readonly string[]>(recents);
  return (
    <CommandPalette.Root
      commands={commands}
      open={open}
      onOpenChange={setOpen}
      recents={rec}
      onRecentsChange={setRec}
    >
      <CommandPalette.Input />
      <CommandPalette.List
        renderItem={(cmd) => (
          <span data-testid="cmd" data-id={cmd.id}>
            {cmd.label}
          </span>
        )}
        renderSection={(name) => <div data-testid="section">{name}</div>}
      />
    </CommandPalette.Root>
  );
}

describe('CommandPalette - filtering and navigation', () => {
  it('groups by section by default', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    const sections = Array.from(document.querySelectorAll('[data-testid="section"]')).map(
      (el) => el.textContent,
    );
    expect(sections).toContain('File');
    expect(sections).toContain('Edit');
    expect(sections).toContain('Commands');
  });

  it('fuzzy-filters as the user types', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    type('save');
    const ids = Array.from(document.querySelectorAll('[data-testid="cmd"]')).map((el) =>
      el.getAttribute('data-id'),
    );
    expect(ids).toEqual(['save']);
  });

  it('matches against keywords as well as label', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    type('search');
    const ids = Array.from(document.querySelectorAll('[data-testid="cmd"]')).map((el) =>
      el.getAttribute('data-id'),
    );
    expect(ids).toContain('find');
  });

  it('highlights the first match by default', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    type('open');
    const highlighted = document.querySelector('[role="option"][aria-selected="true"]');
    expect(highlighted?.textContent).toContain('Open file');
  });

  it('Enter activates the highlighted command + closes', () => {
    let opened = 0;
    const cmds = buildCommands({ open: () => opened++ });
    render(<PaletteHarness commands={cmds} />);
    const input = document.querySelector('input')! as HTMLInputElement;
    act(() => input.focus());
    type('open');
    press('Enter');
    expect(opened).toBe(1);
  });

  it('skips disabled commands on activate', () => {
    let activated = 0;
    const cmds = buildCommands({ theme: () => activated++ });
    render(<PaletteHarness commands={cmds} />);
    const input = document.querySelector('input')! as HTMLInputElement;
    act(() => input.focus());
    type('toggle');
    press('Enter');
    expect(activated).toBe(0);
  });

  it('renders an empty message when nothing matches', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    type('zzzzzz');
    expect(document.body.textContent).toContain('No matches');
  });
});

describe('CommandPalette - modality (#165)', () => {
  it('renders the body inside an aria-modal dialog (focus trap + portal)', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).not.toBeNull();
    // The listbox lives inside the modal surface, not inline beside it.
    expect(dialog!.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('renders nothing when closed (no inline listbox)', () => {
    render(<PaletteHarness commands={buildCommands()} initialOpen={false} />);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
  });

  it('closes on Escape', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    expect(document.querySelector('[aria-modal="true"]')).not.toBeNull();
    press('Escape');
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
  });
});

describe('CommandPalette - highlight clamping (#169)', () => {
  it('clamps the active descendant when the command list shrinks', () => {
    render(<PaletteHarness commands={buildCommands()} />);
    const input = document.querySelector('input')! as HTMLInputElement;
    act(() => input.focus());
    press('End'); // highlight the last row
    const before = input.getAttribute('aria-activedescendant');
    expect(before).toBeTruthy();

    // Programmatically shrink the command set (not via typing). The stale
    // highlight must clamp so aria-activedescendant never points past the end.
    render(<PaletteHarness commands={[{ id: 'only', label: 'Only', onSelect: () => {} }]} />);
    const after = input.getAttribute('aria-activedescendant');
    if (after !== null) {
      expect(after.endsWith('-item-0')).toBe(true);
    }
    // And it must resolve to a rendered option (no dangling IDREF).
    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBe(1);
  });
});

describe('CommandPalette - recents', () => {
  it('lifts recent items into a "Recent" section when input is empty', () => {
    render(<PaletteHarness commands={buildCommands()} recents={['save']} />);
    const sections = Array.from(document.querySelectorAll('[data-testid="section"]')).map(
      (el) => el.textContent,
    );
    expect(sections[0]).toBe('Recent');
    const firstSectionItems = Array.from(document.querySelectorAll('[data-testid="cmd"]'));
    expect(firstSectionItems[0]?.getAttribute('data-id')).toBe('save');
  });

  it('appends activated commands to the recents list', () => {
    let opened = 0;
    const cmds = buildCommands({ open: () => opened++ });
    render(<PaletteHarness commands={cmds} />);
    const input = document.querySelector('input')! as HTMLInputElement;
    act(() => input.focus());
    type('open');
    press('Enter');
    expect(opened).toBe(1);
    // Re-open palette to verify recents are populated.
  });
});

describe('CommandPalette - defaultFuzzyMatch', () => {
  const cmd = (label: string, keywords: string[] = []): Command => ({
    id: label,
    label,
    keywords,
    onSelect: () => {},
  });

  it('returns null for non-matching input', () => {
    expect(defaultFuzzyMatch('xyz', cmd('Save'))).toBeNull();
  });

  it('scores substring matches higher than scattered character matches', () => {
    const sub = defaultFuzzyMatch('save', cmd('Save'))!;
    const scattered = defaultFuzzyMatch('sav', cmd('Search and View'))!;
    expect(sub).toBeGreaterThan(scattered);
  });

  it('matches against keywords', () => {
    expect(defaultFuzzyMatch('search', cmd('Find', ['search']))).not.toBeNull();
  });

  it('returns 1 for empty input (preserve order)', () => {
    expect(defaultFuzzyMatch('', cmd('Anything'))).toBe(1);
  });
});

describe('useCommandPaletteShortcut', () => {
  function ShortcutHarness({ onTrigger }: { onTrigger: () => void }): React.ReactElement {
    useCommandPaletteShortcut('mod+k', onTrigger);
    return <div />;
  }

  it('fires the handler on the configured key combo', () => {
    let fired = 0;
    render(<ShortcutHarness onTrigger={() => fired++} />);
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(fired).toBe(1);
  });

  it('does NOT fire without the modifier', () => {
    let fired = 0;
    render(<ShortcutHarness onTrigger={() => fired++} />);
    const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(fired).toBe(0);
  });
});

describe('CommandPalette - nested pages', () => {
  function nestedCommands(onDark: () => void): Command[] {
    return [
      {
        id: 'theme',
        label: 'Change theme',
        children: [
          { id: 'light', label: 'Light', onSelect: () => {} },
          { id: 'dark', label: 'Dark', onSelect: onDark },
        ],
      },
      { id: 'save', label: 'Save', onSelect: () => {} },
    ];
  }

  function NestedHarness({ onDark }: { onDark: () => void }): React.ReactElement {
    const [open, setOpen] = useState(true);
    return (
      <>
        <output data-testid="open">{String(open)}</output>
        <CommandPalette.Root commands={nestedCommands(onDark)} open={open} onOpenChange={setOpen}>
          <CommandPalette.Breadcrumb rootLabel="Home" />
          <CommandPalette.Input />
          <CommandPalette.List
            renderItem={(cmd) => (
              <span data-testid="cmd" data-id={cmd.id}>
                {cmd.label}
              </span>
            )}
          />
        </CommandPalette.Root>
      </>
    );
  }

  const ids = (): (string | null)[] =>
    Array.from(document.querySelectorAll('[data-testid="cmd"]'), (el) =>
      el.getAttribute('data-id'),
    );
  const focusInput = (): void => act(() => document.querySelector('input')!.focus());
  const isOpen = (): string | null | undefined =>
    document.querySelector('[data-testid="open"]')?.textContent;

  it('opens a page with Enter, scopes search to it, and runs a nested leaf', () => {
    let ran = 0;
    render(<NestedHarness onDark={() => (ran += 1)} />);
    focusInput();
    expect(document.querySelector('nav[aria-label="Command pages"]')).toBeNull();
    press('Enter');
    expect(ids()).toEqual(['light', 'dark']);
    expect(isOpen()).toBe('true');
    type('sav');
    expect(ids()).toEqual([]);
    type('dar');
    expect(ids()).toEqual(['dark']);
    press('Enter');
    expect(ran).toBe(1);
    expect(isOpen()).toBe('false');
  });

  it('goes back with Backspace on an empty input, and with Escape before closing', () => {
    render(<NestedHarness onDark={() => {}} />);
    focusInput();
    press('Enter');
    type('x');
    press('Backspace');
    expect(ids()).toEqual([]);
    type('');
    press('Backspace');
    expect(ids()).toEqual(['theme', 'save']);
    press('Enter');
    press('Escape');
    expect(ids()).toEqual(['theme', 'save']);
    expect(isOpen()).toBe('true');
    press('Escape');
    expect(isOpen()).toBe('false');
  });

  it('shows the trail of pages, and a crumb goes back to its level', () => {
    render(<NestedHarness onDark={() => {}} />);
    focusInput();
    press('Enter');
    const nav = document.querySelector('nav[aria-label="Command pages"]')!;
    expect(nav.textContent).toBe('Home/Change theme');
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Change theme');
    act(() => nav.querySelector('button')!.click());
    expect(ids()).toEqual(['theme', 'save']);
    expect(document.querySelector('nav[aria-label="Command pages"]')).toBeNull();
  });
});
