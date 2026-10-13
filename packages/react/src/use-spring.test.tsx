/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createTheme, isMotionValue, type MotionValue } from '@usemotif/core';
import { ThemeContext } from './theme-context.js';
import { useSpring, type SpringConfig } from './use-spring.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
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

/**
 * rAF / performance.now mock so tests can step the integrator
 * deterministically. Each `advanceFrame(ms)` advances time by `ms`
 * (default 16) and flushes any queued rAF callbacks.
 */
let rafCallbacks: Array<(time: number) => void>;
let currentTime: number;
let nextRafId: number;

beforeEach(() => {
  rafCallbacks = [];
  currentTime = 0;
  nextRafId = 1;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = nextRafId++;
    rafCallbacks.push(cb);
    return id;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;
  Object.defineProperty(window, 'performance', {
    value: { now: () => currentTime },
    configurable: true,
  });
});

function advanceFrame(ms = 16): void {
  currentTime += ms;
  const cbs = rafCallbacks;
  rafCallbacks = [];
  act(() => {
    for (const cb of cbs) cb(currentTime);
  });
}

/** Run frames until the spring stops queuing new ones, capped to keep
 * a divergent test from hanging the suite. */
function runToSettle(maxFrames = 600): number {
  let frames = 0;
  while (rafCallbacks.length > 0 && frames < maxFrames) {
    advanceFrame(16);
    frames++;
  }
  return frames;
}

function Probe({
  initial,
  config,
  onValue,
}: {
  initial: number;
  config?: SpringConfig | string;
  onValue: (v: MotionValue<number>) => void;
}): null {
  const v = useSpring(initial, config);
  onValue(v);
  return null;
}

describe('useSpring', () => {
  it('returns a motion value (brand-checked)', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    expect(isMotionValue(mv)).toBe(true);
  });

  it('seeds the initial value on .get() before any .set()', () => {
    const captured = vi.fn();
    render(<Probe initial={42} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    expect(mv.get()).toBe(42);
  });

  it('progresses toward the target across frames after .set()', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(100));

    // Step a few frames - should be moving toward 100 but not there yet.
    advanceFrame(16);
    const v1 = mv.get();
    expect(v1).toBeGreaterThan(0);
    expect(v1).toBeLessThan(100);

    advanceFrame(16);
    advanceFrame(16);
    const v2 = mv.get();
    expect(v2).toBeGreaterThan(v1);
  });

  it('settles exactly on the target after enough frames', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(100));

    runToSettle();
    expect(mv.get()).toBe(100);
    // After settling no more frames should be queued.
    expect(rafCallbacks.length).toBe(0);
  });

  it('notifies subscribers each frame the value changes', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;

    const onChange = vi.fn();
    const unsubscribe = mv.on('change', onChange);

    act(() => mv.set(100));
    advanceFrame(16);
    advanceFrame(16);
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });

  it('mid-flight .set() redirects without resetting velocity', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(100));

    // Build up some velocity heading toward 100.
    advanceFrame(16);
    advanceFrame(16);
    advanceFrame(16);
    const valueBeforeRetarget = mv.get();
    expect(valueBeforeRetarget).toBeGreaterThan(0);

    // Retarget to 0 - value should keep moving forward briefly from
    // residual velocity, then reverse and approach 0. This is the
    // "drop the panel" feel that motivates the hook.
    act(() => mv.set(0));
    advanceFrame(16);
    const oneFrameAfterRetarget = mv.get();
    // With residual positive velocity, the value should still be moving
    // forward or only barely reversing - strictly less than start-velocity
    // catapult, but not snapped back to 0.
    expect(oneFrameAfterRetarget).toBeGreaterThan(0);

    runToSettle();
    expect(mv.get()).toBe(0);
  });

  it('seeds the configured velocity on the first .set() only', () => {
    const plain = vi.fn();
    const seeded = vi.fn();
    render(
      <>
        <Probe initial={0} onValue={plain} />
        <Probe initial={0} config={{ velocity: 500 }} onValue={seeded} />
      </>,
    );
    const a = plain.mock.calls[0]![0] as MotionValue<number>;
    const b = seeded.mock.calls[0]![0] as MotionValue<number>;
    act(() => {
      a.set(100);
      b.set(100);
    });
    advanceFrame(16);
    expect(b.get()).toBeGreaterThan(a.get());

    runToSettle();
    expect(b.get()).toBe(100);
    // Velocity is 0 again after the settle. Re-applying the seed here would push
    // the first frame away from the new target instead of toward it.
    act(() => b.set(0));
    advanceFrame(16);
    expect(b.get()).toBeLessThan(100);
  });

  it('.set(currentTarget) after settle is a no-op (no new rAF queued)', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(50));
    runToSettle();
    expect(mv.get()).toBe(50);
    expect(rafCallbacks.length).toBe(0);

    act(() => mv.set(50));
    expect(rafCallbacks.length).toBe(0);
  });

  it('respects a custom config (stiffer = settles in fewer frames)', () => {
    const capturedSoft = vi.fn();
    render(
      <Probe
        initial={0}
        config={{ stiffness: 50, damping: 14, restSpeed: 0.1, restDistance: 0.1 }}
        onValue={capturedSoft}
      />,
    );
    const soft = capturedSoft.mock.calls[0]![0] as MotionValue<number>;
    act(() => soft.set(100));
    const softFrames = runToSettle();
    act(() => root.unmount());

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    rafCallbacks = [];
    currentTime = 0;

    const capturedStiff = vi.fn();
    render(
      <Probe
        initial={0}
        config={{ stiffness: 400, damping: 40, restSpeed: 0.1, restDistance: 0.1 }}
        onValue={capturedStiff}
      />,
    );
    const stiff = capturedStiff.mock.calls[0]![0] as MotionValue<number>;
    act(() => stiff.set(100));
    const stiffFrames = runToSettle();

    expect(stiffFrames).toBeLessThan(softFrames);
  });

  it('resolves a spring token from the theme', () => {
    const theme = createTheme({
      name: 'test',
      tokens: {
        animations: {
          fast: { type: 'spring', stiffness: 400, damping: 40 },
        },
      },
    });
    const captured = vi.fn();
    render(
      <ThemeContext.Provider value={{ themes: [theme], active: theme.name, chain: [theme.name] }}>
        <Probe initial={0} config="$animations.fast" onValue={captured} />
      </ThemeContext.Provider>,
    );
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(100));
    runToSettle();
    expect(mv.get()).toBe(100);
  });

  it('falls back to default spring on an unknown token name', () => {
    const theme = createTheme({ name: 'test', tokens: { animations: {} } });
    const captured = vi.fn();
    render(
      <ThemeContext.Provider value={{ themes: [theme], active: theme.name, chain: [theme.name] }}>
        <Probe initial={0} config="nope" onValue={captured} />
      </ThemeContext.Provider>,
    );
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(100));
    runToSettle();
    // Still converges, on default-spring timing.
    expect(mv.get()).toBe(100);
  });

  it('accepts the bare token name (no $animations. prefix)', () => {
    const theme = createTheme({
      name: 'test',
      tokens: {
        animations: {
          quick: { type: 'spring', stiffness: 400, damping: 40 },
        },
      },
    });
    const captured = vi.fn();
    render(
      <ThemeContext.Provider value={{ themes: [theme], active: theme.name, chain: [theme.name] }}>
        <Probe initial={0} config="quick" onValue={captured} />
      </ThemeContext.Provider>,
    );
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(50));
    runToSettle();
    expect(mv.get()).toBe(50);
  });

  it('cancels the rAF loop on unmount', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    act(() => mv.set(100));
    expect(rafCallbacks.length).toBeGreaterThan(0);

    act(() => root.unmount());
    // After unmount, flushing any pending frames must not throw and
    // must not requeue further frames. (The unmount effect calls
    // cancelAnimationFrame; even if the queued frame still fires from
    // the mock, the spring closure can run safely.)
    advanceFrame(16);
    advanceFrame(16);
    // No assertion on the value - once the harness unmounted, the
    // spring's behaviour is unobservable to consumers. The test passes
    // if it didn't throw.
  });

  it('motion-value updates do not trigger React renders', () => {
    const captured = vi.fn();
    render(<Probe initial={0} onValue={captured} />);
    const mv = captured.mock.calls[0]![0] as MotionValue<number>;
    const renderCountAfterMount = captured.mock.calls.length;

    act(() => mv.set(100));
    advanceFrame(16);
    advanceFrame(16);
    advanceFrame(16);
    runToSettle();

    expect(captured.mock.calls.length).toBe(renderCountAfterMount);
  });
});
