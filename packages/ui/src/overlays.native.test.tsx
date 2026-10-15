/** @vitest-environment jsdom */
import { lightTheme } from '@usemotif/tokens';
import { act, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Pressable, Text, ThemeProvider } from 'usemotif';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  ContextMenu,
  Drawer,
  HoverCard,
  Menu,
  Modal,
  Popover,
  Toaster,
  Tooltip,
  useToast,
} from './index.native.js';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(node: ReactNode): void {
  act(() =>
    root.render(
      <ThemeProvider themes={[lightTheme]} active={lightTheme.name}>
        {node}
      </ThemeProvider>,
    ),
  );
}

const hosts = (name: string): HTMLElement[] =>
  Array.from(document.querySelectorAll(`[data-motif-host="${name}"]`));

/** Every bare string sits inside a Text host, or React Native would throw. */
function strayText(): string[] {
  const stray: string[] = [];
  const walk = (el: Element): void => {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '') {
        if (el.getAttribute('data-motif-host') !== 'Text') stray.push(node.textContent!);
      } else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element);
    }
  };
  walk(document.body);
  return stray;
}

// Native roots take `open`; the web types these tests compile against don't
// declare it for Tooltip, HoverCard and ContextMenu, which are uncontrolled there.
const OPEN = { open: true } as object;

const trigger = (label: string) => (
  <Pressable>
    <Text>{label}</Text>
  </Pressable>
);

describe('@usemotif/ui overlays on React Native', () => {
  it('renders open dialogs with their text in Text', () => {
    render(
      <>
        <Modal.Root open>
          <Modal.Content>
            <Modal.Title>Delete file</Modal.Title>
            <Modal.Description>This cannot be undone.</Modal.Description>
          </Modal.Content>
        </Modal.Root>
        <AlertDialog.Root open>
          <AlertDialog.Content>
            <AlertDialog.Title>Sure?</AlertDialog.Title>
          </AlertDialog.Content>
        </AlertDialog.Root>
        <Drawer.Root open>
          <Drawer.Content>
            <Drawer.Title>Filters</Drawer.Title>
          </Drawer.Content>
        </Drawer.Root>
      </>,
    );
    expect(document.body.textContent).toContain('Delete file');
    expect(document.body.textContent).toContain('Sure?');
    expect(document.body.textContent).toContain('Filters');
    expect(strayText()).toEqual([]);
  });

  it('renders open floating surfaces with their text in Text', () => {
    render(
      <>
        <Popover.Root open>
          <Popover.Trigger>{trigger('Open')}</Popover.Trigger>
          <Popover.Content>Popover body</Popover.Content>
        </Popover.Root>
        <Tooltip.Root {...OPEN}>
          <Tooltip.Trigger>{trigger('Hint')}</Tooltip.Trigger>
          <Tooltip.Content>Tooltip body</Tooltip.Content>
        </Tooltip.Root>
        <HoverCard.Root {...OPEN}>
          <HoverCard.Trigger>{trigger('Card')}</HoverCard.Trigger>
          <HoverCard.Content>Card body</HoverCard.Content>
        </HoverCard.Root>
      </>,
    );
    for (const text of ['Popover body', 'Tooltip body', 'Card body']) {
      expect(document.body.textContent).toContain(text);
    }
    expect(strayText()).toEqual([]);
  });

  it('renders open menus whose items select', () => {
    const onSelect = vi.fn();
    render(
      <>
        <Menu.Root open>
          <Menu.Trigger>{trigger('Actions')}</Menu.Trigger>
          <Menu.Content>
            <Menu.Item onSelect={onSelect}>Rename</Menu.Item>
            <Menu.Separator />
            <Menu.Label>More</Menu.Label>
            <Menu.CheckboxItem defaultChecked>Pinned</Menu.CheckboxItem>
          </Menu.Content>
        </Menu.Root>
        <ContextMenu.Root {...OPEN}>
          <ContextMenu.Trigger>{trigger('Row')}</ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item>Copy</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </>,
    );
    expect(strayText()).toEqual([]);
    const rename = hosts('Pressable').find((el) => el.textContent === 'Rename')!;
    act(() => rename.click());
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows a toast raised through useToast', () => {
    function Raise(): null {
      const { toast } = useToast();
      useEffect(() => {
        toast({ title: 'Saved', description: 'Your changes are live.' });
      }, [toast]);
      return null;
    }
    render(
      <Toaster>
        <Raise />
      </Toaster>,
    );
    expect(document.body.textContent).toContain('Saved');
    expect(strayText()).toEqual([]);
  });
});
