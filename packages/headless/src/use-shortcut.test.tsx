/** @vitest-environment jsdom */
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShortcut, type UseShortcutOptions } from './use-shortcut.js';

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

function press(target: EventTarget, key: string, mods: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods });
  act(() => {
    target.dispatchEvent(e);
  });
  return e;
}

function Harness({
  combo,
  onFire,
  scoped = false,
  options = {},
}: {
  combo: string;
  onFire: () => void;
  scoped?: boolean;
  options?: UseShortcutOptions;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const label = useShortcut(combo, onFire, scoped ? { ...options, target: ref } : options);
  return (
    <div>
      <output>{label}</output>
      <input data-testid="field" />
      <div ref={ref} tabIndex={-1} data-testid="panel">
        <span data-testid="inner" />
      </div>
    </div>
  );
}

const q = (id: string): HTMLElement => container.querySelector(`[data-testid="${id}"]`)!;

describe('useShortcut', () => {
  it('fires on the combo anywhere in the window, and prevents the default', () => {
    const onFire = vi.fn();
    act(() => root.render(<Harness combo="mod+k" onFire={onFire} />));
    const e = press(document.body, 'k', { ctrlKey: true });
    expect(onFire).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    press(document.body, 'k');
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('ignores typing in inputs unless allowInInputs is set', () => {
    const onFire = vi.fn();
    act(() => root.render(<Harness combo="/" onFire={onFire} />));
    press(q('field'), '/');
    expect(onFire).not.toHaveBeenCalled();
    act(() => root.render(<Harness combo="/" onFire={onFire} options={{ allowInInputs: true }} />));
    press(q('field'), '/');
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('listens only inside its target element when scoped', () => {
    const onFire = vi.fn();
    act(() => root.render(<Harness combo="shift+n" onFire={onFire} scoped />));
    press(document.body, 'N', { shiftKey: true });
    expect(onFire).not.toHaveBeenCalled();
    press(q('inner'), 'N', { shiftKey: true });
    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', () => {
    const onFire = vi.fn();
    act(() => root.render(<Harness combo="mod+k" onFire={onFire} options={{ enabled: false }} />));
    press(document.body, 'k', { ctrlKey: true });
    expect(onFire).not.toHaveBeenCalled();
  });

  it('returns the label for the platform, after mount', () => {
    act(() => root.render(<Harness combo="mod+shift+k" onFire={() => {}} />));
    expect(container.querySelector('output')!.textContent).toBe('Ctrl+Shift+K');
    act(() => root.unmount());
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    root = createRoot(container);
    act(() => root.render(<Harness combo="mod+shift+k" onFire={() => {}} />));
    expect(container.querySelector('output')!.textContent).toBe('⇧⌘K');
  });
});
