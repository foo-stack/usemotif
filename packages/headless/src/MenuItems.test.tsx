import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextMenu, Menu } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function key(k: string): void {
  act(() => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
    );
  });
}

function byText(text: string): HTMLElement {
  const el = Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find(
    (e) => e.textContent === text,
  );
  if (el === undefined) throw new Error(`no item ${text}`);
  return el;
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

function ViewMenu({ onWrap }: { onWrap?: (v: boolean) => void }): React.ReactElement {
  const [sort, setSort] = useState('name');
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>
        <button data-testid="t">View</button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.CheckboxItem defaultChecked {...(onWrap ? { onCheckedChange: onWrap } : {})}>
          Wrap
        </Menu.CheckboxItem>
        <Menu.CheckboxItem closeOnSelect={false}>Minimap</Menu.CheckboxItem>
        <Menu.Label>Sort by</Menu.Label>
        <Menu.RadioGroup value={sort} onValueChange={setSort} label="Sort by">
          <Menu.RadioItem value="name" closeOnSelect={false}>
            Name
          </Menu.RadioItem>
          <Menu.RadioItem value="date" closeOnSelect={false}>
            Date
          </Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

describe('Menu checkbox, radio and label items', () => {
  it('exposes the roles, aria-checked and data-state', () => {
    render(<ViewMenu />);
    const wrap = byText('Wrap');
    expect(wrap.getAttribute('role')).toBe('menuitemcheckbox');
    expect(wrap.getAttribute('aria-checked')).toBe('true');
    expect(wrap.getAttribute('data-state')).toBe('checked');
    expect(byText('Minimap').getAttribute('aria-checked')).toBe('false');
    expect(byText('Name').getAttribute('role')).toBe('menuitemradio');
    expect(byText('Name').getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Sort by');
  });

  it('toggles a checkbox and closes the menu, as Menu.Item does', () => {
    const onWrap = vi.fn();
    render(<ViewMenu onWrap={onWrap} />);
    act(() => byText('Wrap').click());
    expect(onWrap).toHaveBeenCalledWith(false);
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('stays open with closeOnSelect={false}, and picks one radio in its group', () => {
    render(<ViewMenu />);
    act(() => byText('Minimap').click());
    expect(byText('Minimap').getAttribute('aria-checked')).toBe('true');
    act(() => byText('Date').click());
    expect(byText('Date').getAttribute('aria-checked')).toBe('true');
    expect(byText('Name').getAttribute('aria-checked')).toBe('false');
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('moves through the items with the arrow keys, skipping the label, and toggles with Space', () => {
    render(<ViewMenu />);
    expect(document.activeElement).toBe(byText('Wrap'));
    key('ArrowDown');
    expect(document.activeElement).toBe(byText('Minimap'));
    key('ArrowDown');
    expect(document.activeElement).toBe(byText('Name'));
    key('ArrowDown');
    key(' ');
    expect(byText('Date').getAttribute('aria-checked')).toBe('true');
  });

  it('serves ContextMenu with the same parts', () => {
    const onChecked = vi.fn();
    render(
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div data-testid="area">Area</div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.CheckboxItem onCheckedChange={onChecked}>Pin</ContextMenu.CheckboxItem>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    act(() => {
      container
        .querySelector('[data-testid="area"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    key('Enter');
    expect(onChecked).toHaveBeenCalledWith(true);
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});
