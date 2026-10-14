/** @vitest-environment jsdom */
/**
 * Native submenus on the `react-native` jsdom mock: the trigger expands its
 * content inline, and an item inside closes the whole menu.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuTrigger,
} from './ContextMenu.native.js';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from './Menu.native.js';
import { MenuSub, MenuSubContent, MenuSubTrigger } from './MenuSub.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function press(label: string): void {
  const host = Array.from(
    container.querySelectorAll<HTMLElement>('[accessibilityRole="menuitem"]'),
  ).find((el) => el.textContent === label);
  if (host === undefined) throw new Error(`no item ${label}`);
  act(() => {
    host.click();
  });
}

function menuItems(): string[] {
  return Array.from(container.querySelectorAll('[accessibilityRole="menuitem"]')).map(
    (el) => el.textContent ?? '',
  );
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

describe('native Menu.Sub', () => {
  it('expands inline, collapses on a second press, and an item inside closes the menu', () => {
    const onEmail = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MenuRoot defaultOpen onOpenChange={onOpenChange}>
        <MenuTrigger>
          <Text>Actions</Text>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>
            <Text>Copy</Text>
          </MenuItem>
          <MenuSub>
            <MenuSubTrigger>
              <Text>Share</Text>
            </MenuSubTrigger>
            <MenuSubContent>
              <MenuItem onSelect={onEmail}>
                <Text>Email</Text>
              </MenuItem>
            </MenuSubContent>
          </MenuSub>
        </MenuContent>
      </MenuRoot>,
    );
    expect(menuItems()).toEqual(['Copy', 'Share']);
    press('Share');
    expect(menuItems()).toEqual(['Copy', 'Share', 'Email']);
    press('Share');
    expect(menuItems()).toEqual(['Copy', 'Share']);
    press('Share');
    press('Email');
    expect(onEmail).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(menuItems()).toEqual([]);
  });

  it('serves ContextMenu the same way', () => {
    const onArchive = vi.fn();
    render(
      <ContextMenuRoot defaultOpen>
        <ContextMenuTrigger>
          <Text>Row</Text>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <MenuSub>
            <MenuSubTrigger>
              <Text>Move to</Text>
            </MenuSubTrigger>
            <MenuSubContent>
              <ContextMenuItem onSelect={onArchive}>
                <Text>Archive</Text>
              </ContextMenuItem>
            </MenuSubContent>
          </MenuSub>
        </ContextMenuContent>
      </ContextMenuRoot>,
    );
    press('Move to');
    press('Archive');
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(menuItems()).toEqual([]);
  });
});
