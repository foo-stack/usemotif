/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { Presence, type PresenceProps } from './Presence.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactElement): void {
  act(() => {
    root.render(node);
  });
}

function Items({ ids, ...props }: { ids: string[] } & Omit<PresenceProps, 'children'>) {
  return (
    <Presence {...props}>
      {ids.map((id) => (
        <Box key={id} data-testid={id} exitStyle={{ opacity: 0 }} transition="opacity 200ms ease">
          {id}
        </Box>
      ))}
    </Presence>
  );
}

const ids = (): string[] =>
  [...container.querySelectorAll('[data-testid]')].map((el) => el.getAttribute('data-testid')!);
const byId = (id: string): HTMLElement | null =>
  container.querySelector<HTMLElement>(`[data-testid="${id}"]`);

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('Presence', () => {
  it('keeps a removed child in place, marked exiting, until its exit window ends', () => {
    const onExitComplete = vi.fn();
    render(<Items ids={['a', 'b', 'c']} onExitComplete={onExitComplete} />);
    render(<Items ids={['a', 'c']} onExitComplete={onExitComplete} />);
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(byId('b')!.getAttribute('data-motif-state')).toBe('exiting');
    expect(byId('a')!.hasAttribute('data-motif-state')).toBe(false);
    expect(onExitComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(400));
    expect(ids()).toEqual(['a', 'c']);
    expect(onExitComplete).toHaveBeenCalledTimes(1);
  });

  it('unmounts as soon as the exiting element finishes its transition', () => {
    render(<Items ids={['a']} />);
    render(<Items ids={[]} />);
    act(() => {
      byId('a')!.dispatchEvent(new Event('transitionend', { bubbles: true }));
    });
    expect(ids()).toEqual([]);
  });

  it('enters a new child alongside the exiting one in sync mode', () => {
    render(<Items ids={['a']} />);
    render(<Items ids={['b']} />);
    expect(ids()).toEqual(['a', 'b']);
  });

  it('holds a new child back until the old one has exited in wait mode', () => {
    render(<Items ids={['a']} mode="wait" />);
    render(<Items ids={['b']} mode="wait" />);
    expect(ids()).toEqual(['a']);
    expect(byId('a')!.getAttribute('data-motif-state')).toBe('exiting');

    act(() => vi.advanceTimersByTime(400));
    expect(ids()).toEqual(['b']);
    expect(byId('b')!.hasAttribute('data-motif-state')).toBe(false);
  });

  it('cancels the exit when a removed child comes back', () => {
    render(<Items ids={['a']} />);
    render(<Items ids={[]} />);
    render(<Items ids={['a']} />);
    act(() => vi.advanceTimersByTime(400));
    expect(ids()).toEqual(['a']);
    expect(byId('a')!.hasAttribute('data-motif-state')).toBe(false);
  });

  it('unmounts at once with exitDuration 0', () => {
    render(<Items ids={['a']} exitDuration={0} />);
    render(<Items ids={[]} exitDuration={0} />);
    expect(ids()).toEqual([]);
  });
});
