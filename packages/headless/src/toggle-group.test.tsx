import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toggle, ToggleGroup, ToggleGroupItem } from './index.js';

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

function button(label: string): HTMLButtonElement {
  return container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
}

function pressed(): string[] {
  return Array.from(container.querySelectorAll('[aria-pressed="true"]')).map(
    (b) => b.getAttribute('aria-label') ?? '',
  );
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

describe('Toggle', () => {
  it('flips aria-pressed and data-state when uncontrolled, and reports it', () => {
    const onPressedChange = vi.fn();
    render(<Toggle aria-label="Bold" onPressedChange={onPressedChange} />);
    const b = button('Bold');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.getAttribute('type')).toBe('button');
    act(() => b.click());
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(b.getAttribute('data-state')).toBe('on');
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it('keeps a controlled value authoritative', () => {
    render(<Toggle aria-label="Bold" pressed={false} />);
    act(() => button('Bold').click());
    expect(button('Bold').getAttribute('aria-pressed')).toBe('false');
  });
});

function Group(props: Partial<React.ComponentProps<typeof ToggleGroup>>): React.ReactElement {
  return (
    <ToggleGroup aria-label="Align" {...props}>
      <ToggleGroupItem value="left" aria-label="Left" />
      <ToggleGroupItem value="center" aria-label="Center" disabled />
      <ToggleGroupItem value="right" aria-label="Right" />
    </ToggleGroup>
  );
}

describe('ToggleGroup', () => {
  it('holds one value in single mode, and clears it when pressed again', () => {
    const onValueChange = vi.fn();
    render(<Group onValueChange={onValueChange} />);
    expect(container.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Align');
    act(() => button('Left').click());
    act(() => button('Right').click());
    expect(pressed()).toEqual(['Right']);
    act(() => button('Right').click());
    expect(pressed()).toEqual([]);
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual([['left'], ['right'], []]);
  });

  it('holds several values in multiple mode', () => {
    render(<Group type="multiple" defaultValue={['left']} />);
    act(() => button('Right').click());
    expect(pressed()).toEqual(['Left', 'Right']);
    act(() => button('Left').click());
    expect(pressed()).toEqual(['Right']);
  });

  it('disables items, or the whole group', () => {
    render(<Group />);
    expect(button('Center').disabled).toBe(true);
    render(<Group disabled />);
    expect(button('Left').disabled).toBe(true);
    expect(container.querySelector('[role="group"]')!.hasAttribute('tabindex')).toBe(false);
  });

  it('keeps one tab stop: the group hands focus on, then the focused item holds it', () => {
    render(<Group />);
    const group = container.querySelector<HTMLElement>('[role="group"]')!;
    expect(group.getAttribute('tabindex')).toBe('0');
    act(() => group.focus());
    expect(document.activeElement).toBe(button('Left'));
    expect(group.hasAttribute('tabindex')).toBe(false);
    expect(button('Left').tabIndex).toBe(0);
    expect(button('Right').tabIndex).toBe(-1);
  });

  it('starts the tab stop on the pressed item', () => {
    render(<Group defaultValue={['right']} />);
    expect(button('Right').tabIndex).toBe(0);
    expect(button('Left').tabIndex).toBe(-1);
  });

  it('roves with wrapping arrows, Home and End, skipping disabled items', () => {
    render(<Group />);
    act(() => button('Left').focus());
    key('ArrowRight');
    expect(document.activeElement).toBe(button('Right'));
    key('ArrowRight');
    expect(document.activeElement).toBe(button('Left'));
    key('ArrowLeft');
    expect(document.activeElement).toBe(button('Right'));
    key('Home');
    expect(document.activeElement).toBe(button('Left'));
    key('End');
    expect(document.activeElement).toBe(button('Right'));
    key('ArrowDown');
    expect(document.activeElement).toBe(button('Right'));
  });

  it('uses the vertical arrows when vertical', () => {
    render(<Group orientation="vertical" />);
    act(() => button('Left').focus());
    key('ArrowDown');
    expect(document.activeElement).toBe(button('Right'));
    key('ArrowUp');
    expect(document.activeElement).toBe(button('Left'));
  });
});
