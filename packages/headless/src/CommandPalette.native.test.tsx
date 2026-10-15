/** @vitest-environment jsdom */
import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CommandPaletteBreadcrumb,
  CommandPaletteInput,
  CommandPaletteList,
  CommandPaletteRoot,
  type Command,
} from './CommandPalette.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => root.render(node));
}

function propsOf(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return (el as unknown as Record<string, Record<string, unknown>>)[key]!;
}

function host(name: string): HTMLElement {
  return container.querySelector(`[data-motif-host="${name}"]`)!;
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

const commands: Command[] = [
  {
    id: 'theme',
    label: 'Change theme',
    children: [
      { id: 'light', label: 'Light', onSelect: () => {} },
      { id: 'dark', label: 'Dark', onSelect: () => {} },
    ],
  },
  { id: 'save', label: 'Save', onSelect: () => {} },
];

function Harness(): React.ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Text testID="open">{String(open)}</Text>
      <CommandPaletteRoot commands={commands} open={open} onOpenChange={setOpen}>
        <CommandPaletteBreadcrumb rootLabel="Home" />
        <CommandPaletteInput />
        <CommandPaletteList
          renderItem={(cmd) => <Text testID={`cmd-${cmd.id}`}>{cmd.label}</Text>}
        />
      </CommandPaletteRoot>
    </>
  );
}

const ids = (): string[] =>
  Array.from(container.querySelectorAll('[testID^="cmd-"]'), (el) =>
    el.getAttribute('testID')!.slice(4),
  );

describe('CommandPalette (native) - nested pages', () => {
  it('opens a page, then goes back with Backspace, a crumb, and the back button', () => {
    render(<Harness />);
    const open = (): void =>
      act(() =>
        (container.querySelector('[testID="cmd-theme"]')!.parentElement as HTMLElement).click(),
      );
    const backspace = (): void =>
      act(() =>
        (propsOf(host('TextInput')).onKeyPress as (e: { nativeEvent: { key: string } }) => void)({
          nativeEvent: { key: 'Backspace' },
        }),
      );
    const requestClose = (): void =>
      act(() => (propsOf(host('Modal')).onRequestClose as () => void)());

    open();
    expect(ids()).toEqual(['light', 'dark']);
    expect(container.textContent).toContain('Home/Change theme');
    backspace();
    expect(ids()).toEqual(['theme', 'save']);

    open();
    act(() => (container.querySelector('[accessibilityRole="button"]') as HTMLElement).click());
    expect(ids()).toEqual(['theme', 'save']);

    open();
    requestClose();
    expect(ids()).toEqual(['theme', 'save']);
    expect(container.querySelector('[testID="open"]')!.textContent).toBe('true');
    requestClose();
    expect(container.querySelector('[testID="open"]')!.textContent).toBe('false');
  });
});
