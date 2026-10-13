/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useEffect, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useExitPresence, usePresence, type MotionPhase } from './presence-context.js';

let container: HTMLElement;
let root: Root;

// Module-scoped recorder + stable callback: an inline `onPhase={(p) => ...}` prop
// would trip react-perf's jsx-no-new-function-as-prop.
let recordedPhases: MotionPhase[] = [];
function recordPhase(p: MotionPhase): void {
  recordedPhases.push(p);
}

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  recordedPhases = [];
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
  vi.useRealTimers();
});

/** A child whose exit "animation" settles after `delayMs` via registerExit. */
function FakeExitingChild({ delayMs }: { delayMs: number }): ReactElement {
  const presence = usePresence();
  const isExiting = presence.phase === 'exiting';
  useEffect(() => {
    if (!isExiting) return undefined;
    const complete = presence.registerExit();
    const id = setTimeout(complete, delayMs);
    return () => clearTimeout(id);
  }, [isExiting, presence, delayMs]);
  return <span data-testid="child" data-phase={presence.phase} />;
}

interface HarnessProps {
  open: boolean;
  fallbackDurationMs?: number;
  onPhase: (phase: MotionPhase) => void;
  children?: ReactNode;
}
function Harness({ open, fallbackDurationMs, onPhase, children }: HarnessProps): ReactElement {
  const { shouldRender, phase, ExitBoundary } = useExitPresence(open, fallbackDurationMs);
  useEffect(() => {
    onPhase(phase);
  }, [onPhase, phase]);
  if (!shouldRender) return <span data-testid="closed" />;
  return <ExitBoundary>{children}</ExitBoundary>;
}

describe('useExitPresence (web presence-context)', () => {
  it('keeps the subtree mounted in the exiting phase until a registered exit completes', () => {
    render(
      <Harness open onPhase={recordPhase}>
        <FakeExitingChild delayMs={200} />
      </Harness>,
    );
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();

    // Close → exiting (still mounted), not closed yet.
    render(
      <Harness open={false} onPhase={recordPhase}>
        <FakeExitingChild delayMs={200} />
      </Harness>,
    );
    expect(container.querySelector('[data-testid="child"]')?.getAttribute('data-phase')).toBe(
      'exiting',
    );

    // The child's exit settles before the fallback → unmounts.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelector('[data-testid="closed"]')).not.toBeNull();
    expect(recordedPhases).toContain('exiting');
    expect(recordedPhases[recordedPhases.length - 1]).toBe('closed');
  });

  it('settles on the fallback timer when no descendant registers an exit', () => {
    render(<Harness open fallbackDurationMs={300} onPhase={recordPhase} />);
    render(<Harness open={false} fallbackDurationMs={300} onPhase={recordPhase} />);
    // No registered exit → still exiting until the fallback fires.
    expect(container.querySelector('[data-testid="closed"]')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector('[data-testid="closed"]')).not.toBeNull();
  });

  it('skips the exit phase entirely when fallbackDurationMs <= 0', () => {
    render(<Harness open fallbackDurationMs={0} onPhase={recordPhase} />);
    render(<Harness open={false} fallbackDurationMs={0} onPhase={recordPhase} />);
    // Instant unmount - no exiting window.
    expect(container.querySelector('[data-testid="closed"]')).not.toBeNull();
  });

  it('re-opening during the exiting phase returns to open (interrupted exit)', () => {
    render(
      <Harness open onPhase={recordPhase}>
        <FakeExitingChild delayMs={500} />
      </Harness>,
    );
    render(
      <Harness open={false} onPhase={recordPhase}>
        <FakeExitingChild delayMs={500} />
      </Harness>,
    );
    expect(recordedPhases).toContain('exiting');
    // Re-open before the exit settles → back to open, still mounted.
    render(
      <Harness open onPhase={recordPhase}>
        <FakeExitingChild delayMs={500} />
      </Harness>,
    );
    expect(recordedPhases[recordedPhases.length - 1]).toBe('open');
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it('settle() closes an exit before the fallback timer, once', () => {
    let settle: (() => void) | undefined;
    function Probe({ open }: { open: boolean }): ReactElement {
      const result = useExitPresence(open, 1000);
      settle = result.settle;
      useEffect(() => {
        recordPhase(result.phase);
      }, [result.phase]);
      return <span />;
    }
    render(<Probe open />);
    render(<Probe open={false} />);
    expect(recordedPhases[recordedPhases.length - 1]).toBe('exiting');

    act(() => settle?.());
    expect(recordedPhases[recordedPhases.length - 1]).toBe('closed');
    const settledAt = recordedPhases.length;

    act(() => settle?.());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(recordedPhases.length).toBe(settledAt);
  });

  it('usePresence is standalone (phase open, no-op registerExit) with no boundary', () => {
    let captured: MotionPhase | undefined;
    let registerResult: (() => void) | undefined;
    function Probe(): ReactElement {
      const p = usePresence();
      captured = p.phase;
      registerResult = p.registerExit();
      return <span />;
    }
    render(<Probe />);
    expect(captured).toBe('open');
    // No-op callback - calling it is harmless.
    expect(() => registerResult?.()).not.toThrow();
  });
});
