/** @vitest-environment jsdom */
/** Native checkbox and radio menu items on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextMenuContent, ContextMenuRoot, ContextMenuTrigger } from './ContextMenu.native.js';
import { MenuContent, MenuRoot, MenuTrigger } from './Menu.native.js';
import { MenuCheckboxItem, MenuLabel, MenuRadioGroup, MenuRadioItem } from './MenuItems.native.js';

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

function open(): boolean {
  return container.querySelector('[accessibilityRole="menu"]') !== null;
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

describe('native Menu checkbox and radio items', () => {
  it('toggles a checkbox and picks a radio, closing unless closeOnSelect is false', () => {
    const onWrap = vi.fn();
    const onSort = vi.fn();
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Text>View</Text>
        </MenuTrigger>
        <MenuContent>
          <MenuCheckboxItem onCheckedChange={onWrap} closeOnSelect={false}>
            <Text>Wrap</Text>
          </MenuCheckboxItem>
          <MenuLabel>
            <Text>Sort by</Text>
          </MenuLabel>
          <MenuRadioGroup defaultValue="name" onValueChange={onSort}>
            <MenuRadioItem value="name">
              <Text>Name</Text>
            </MenuRadioItem>
            <MenuRadioItem value="date">
              <Text>Date</Text>
            </MenuRadioItem>
          </MenuRadioGroup>
        </MenuContent>
      </MenuRoot>,
    );
    expect(container.querySelector('[accessibilityRole="header"]')!.textContent).toBe('Sort by');
    press('Wrap');
    expect(onWrap).toHaveBeenLastCalledWith(true);
    press('Wrap');
    expect(onWrap).toHaveBeenLastCalledWith(false);
    expect(open()).toBe(true);
    press('Date');
    expect(onSort).toHaveBeenCalledWith('date');
    expect(open()).toBe(false);
  });

  it('closes a ContextMenu the same way', () => {
    const onPin = vi.fn();
    render(
      <ContextMenuRoot defaultOpen>
        <ContextMenuTrigger>
          <Text>Row</Text>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <MenuCheckboxItem onCheckedChange={onPin}>
            <Text>Pin</Text>
          </MenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenuRoot>,
    );
    press('Pin');
    expect(onPin).toHaveBeenCalledWith(true);
    expect(open()).toBe(false);
  });
});
