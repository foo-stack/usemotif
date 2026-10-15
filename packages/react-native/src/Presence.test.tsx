/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { Presence, type PresenceProps } from './Presence.js';
import { noopDriver } from './_animation/noop.js';
import { registerMotionDriver } from './_animation/index.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactElement): void {
  act(() => {
    root.render(node);
  });
}

function Items({
  ids,
  exit = false,
  ...props
}: { ids: string[]; exit?: boolean } & Omit<PresenceProps, 'children'>) {
  return (
    <Presence {...props}>
      {ids.map((id) => (
        <Box key={id} testID={id} {...(exit ? { exitStyle: { opacity: 0 } } : {})} />
      ))}
    </Presence>
  );
}

const ids = (): string[] =>
  [...container.querySelectorAll('[testid]')].map((el) => el.getAttribute('testid')!);

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  registerMotionDriver(null);
  vi.useRealTimers();
});

describe('Presence (native)', () => {
  it('keeps a removed child mounted until its exit window ends', () => {
    const onExitComplete = vi.fn();
    render(<Items ids={['a', 'b']} onExitComplete={onExitComplete} />);
    render(<Items ids={['a']} onExitComplete={onExitComplete} />);
    expect(ids()).toEqual(['a', 'b']);
    act(() => vi.advanceTimersByTime(400));
    expect(ids()).toEqual(['a']);
    expect(onExitComplete).toHaveBeenCalledTimes(1);
  });

  it("unmounts when the child's exitStyle animation completes", () => {
    // The noop driver finishes an exit at once, so the child settles before the timer.
    registerMotionDriver(noopDriver);
    render(<Items ids={['a']} exit />);
    render(<Items ids={[]} exit />);
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
    act(() => vi.advanceTimersByTime(400));
    expect(ids()).toEqual(['b']);
  });
});
