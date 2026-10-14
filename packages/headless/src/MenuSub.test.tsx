import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextMenu, Menu } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function key(k: string, target: Element | null = document.activeElement): void {
  act(() => {
    target?.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
    );
  });
}

function item(name: string): HTMLElement {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (el) => el.textContent === name,
  );
  if (found === undefined) throw new Error(`no item ${name}`);
  return found;
}

function menus(): number {
  return document.querySelectorAll('[role="menu"]').length;
}

function mouse(type: 'mousedown' | 'mouseover', el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  });
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

const onEmail = vi.fn();
const onPrint = vi.fn();

function ShareMenu(): React.ReactElement {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>
        <button data-testid="t">Actions</button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Copy</Menu.Item>
        <Menu.Sub>
          <Menu.SubTrigger>Share</Menu.SubTrigger>
          <Menu.SubContent>
            <Menu.Item onSelect={onEmail}>Email</Menu.Item>
            <Menu.Sub>
              <Menu.SubTrigger>More</Menu.SubTrigger>
              <Menu.SubContent>
                <Menu.Item onSelect={onPrint}>Print</Menu.Item>
              </Menu.SubContent>
            </Menu.Sub>
          </Menu.SubContent>
        </Menu.Sub>
        <Menu.Item>Delete</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}

describe('Menu.Sub', () => {
  it('marks the trigger as opening a menu, closed until asked', () => {
    render(<ShareMenu />);
    const trigger = item('Share');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(menus()).toBe(1);
  });

  it('opens with ArrowRight, focuses its first item, and closes back with ArrowLeft', () => {
    render(<ShareMenu />);
    key('ArrowDown');
    expect(document.activeElement).toBe(item('Share'));
    key('ArrowRight');
    expect(menus()).toBe(2);
    expect(item('Share').getAttribute('aria-expanded')).toBe('true');
    expect(item('Share').getAttribute('aria-controls')).toBe(
      document.querySelectorAll('[role="menu"]')[1]!.id,
    );
    expect(document.activeElement).toBe(item('Email'));
    key('ArrowLeft');
    expect(menus()).toBe(1);
    expect(document.activeElement).toBe(item('Share'));
    key('ArrowDown');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('closes only the submenu on Escape, and keeps arrows inside it', () => {
    render(<ShareMenu />);
    key('ArrowDown');
    key('Enter');
    expect(document.activeElement).toBe(item('Email'));
    key('ArrowDown');
    expect(document.activeElement).toBe(item('More'));
    key('ArrowDown');
    expect(document.activeElement).toBe(item('Email'));
    key('Escape');
    expect(menus()).toBe(1);
    expect(document.activeElement).toBe(item('Share'));
    key('Escape');
    expect(menus()).toBe(0);
  });

  it('nests, and choosing an item at depth closes the whole menu and refocuses the trigger', () => {
    render(<ShareMenu />);
    key('ArrowDown');
    key('ArrowRight');
    key('ArrowDown');
    key('ArrowRight');
    expect(menus()).toBe(3);
    expect(document.activeElement).toBe(item('Print'));
    key('Enter');
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(menus()).toBe(0);
    expect(document.activeElement).toBe(container.querySelector('[data-testid="t"]'));
  });

  it('opens on hover without moving focus, and a hovered sibling item closes it', () => {
    render(<ShareMenu />);
    const focused = document.activeElement;
    mouse('mouseover', item('Share'));
    expect(menus()).toBe(2);
    expect(document.activeElement).toBe(focused);
    mouse('mouseover', item('Delete'));
    expect(menus()).toBe(1);
  });

  it('treats a click inside an open submenu as inside the menu', () => {
    render(<ShareMenu />);
    act(() => item('Share').click());
    mouse('mousedown', item('Email'));
    expect(menus()).toBe(2);
    act(() => item('Email').click());
    expect(onEmail).toHaveBeenCalled();
    expect(menus()).toBe(0);
  });

  it('serves ContextMenu with the same parts', () => {
    const onPick = vi.fn();
    render(
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div data-testid="area">Area</div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Cut</ContextMenu.Item>
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>Move to</ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
              <ContextMenu.Item onSelect={onPick}>Archive</ContextMenu.Item>
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    act(() => {
      container
        .querySelector('[data-testid="area"]')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(item('Cut'));
    key('ArrowDown');
    key('ArrowRight');
    expect(document.activeElement).toBe(item('Archive'));
    key('Escape');
    expect(document.activeElement).toBe(item('Move to'));
    key('Enter');
    key('Enter');
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(menus()).toBe(0);
  });
});
