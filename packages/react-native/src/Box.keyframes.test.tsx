/** @vitest-environment jsdom */
import { makeKeyframe, type AnimationObject } from '@usemotif/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box } from './Box.js';

let container: HTMLElement;
let root: Root;

const fade = makeKeyframe({ from: { opacity: 0 }, '50%': { opacity: 1 }, to: { opacity: 0.5 } });

function render(animation: AnimationObject | string | undefined): void {
  act(() => {
    root.render(<Box testID="b" p={4} {...(animation === undefined ? {} : { animation })} />);
  });
}

function style(): Record<string, unknown> {
  const raw = container.querySelector('[data-motif-host="View"]')?.getAttribute('data-motif-style');
  const flat = (s: unknown): Record<string, unknown> =>
    Array.isArray(s)
      ? s.reduce<Record<string, unknown>>((acc, x) => Object.assign(acc, flat(x)), {})
      : ((s ?? {}) as Record<string, unknown>);
  return flat(raw === null || raw === undefined ? null : JSON.parse(raw));
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
  vi.useRealTimers();
});

describe('Box keyframes (native)', () => {
  it('runs the stops over the duration, then drops them without a forwards fill', () => {
    render({ name: fade, duration: '1000ms', easing: 'linear' });
    expect(style()).toMatchObject({ padding: 4, opacity: 0 });
    advance(250);
    expect(style().opacity).toBeCloseTo(0.5, 1);
    advance(250);
    expect(style().opacity).toBeCloseTo(1, 1);
    advance(600);
    expect(style()).not.toHaveProperty('opacity');
    expect(style().padding).toBe(4);
  });

  it('holds the last frame with fillMode forwards', () => {
    render({ name: fade, duration: '100ms', easing: 'linear', fillMode: 'forwards' });
    advance(500);
    expect(style().opacity).toBe(0.5);
  });

  it('repeats for each iteration', () => {
    render({ name: fade, duration: '100ms', easing: 'linear', iterationCount: 'infinite' });
    advance(1025);
    expect(style().opacity).toBeCloseTo(0.5, 1);
  });

  it('freezes while paused and resumes from the same point', () => {
    render({ name: fade, duration: '1000ms', easing: 'linear' });
    advance(250);
    render({ name: fade, duration: '1000ms', easing: 'linear', playState: 'paused' });
    const frozen = style().opacity as number;
    advance(500);
    expect(style().opacity).toBe(frozen);
    render({ name: fade, duration: '1000ms', easing: 'linear' });
    advance(250);
    expect(style().opacity).toBeCloseTo(1, 1);
  });

  it('renders exactly as before for a string animation or none', () => {
    render(undefined);
    const plain = container.innerHTML;
    render('quick');
    expect(container.innerHTML).toBe(plain);
    render({ name: 'spin', duration: '1s' });
    expect(container.innerHTML).toBe(plain);
  });
});
