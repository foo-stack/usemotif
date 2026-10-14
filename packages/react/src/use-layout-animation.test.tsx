/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { useLayoutAnimation } from './use-layout-animation.js';

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
 * jsdom doesn't lay out, so `getBoundingClientRect` returns zeroed
 * values. We override the prototype to read a per-test "current rect"
 * so tests can change the rect BEFORE each render - the hook's
 * useLayoutEffect runs synchronously during the render's act flush
 * and reads through the prototype at that moment.
 */
let pendingRect: { x: number; y: number; width: number; height: number };
const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  pendingRect = { x: 0, y: 0, width: 0, height: 0 };
  Element.prototype.getBoundingClientRect = function () {
    const r = pendingRect;
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      left: r.x,
      top: r.y,
      right: r.x + r.width,
      bottom: r.y + r.height,
      toJSON: () => null,
    } as DOMRect;
  };
});
afterEach(() => {
  Element.prototype.getBoundingClientRect = origGetBoundingClientRect;
});

function setRect(rect: { x: number; y: number; width: number; height: number }): void {
  pendingRect = rect;
}

/**
 * Polyfill rAF for synchronous, deterministic test execution. The
 * synchronous variant fires the callback immediately so tests can
 * observe the post-rAF transform clear. Individual tests that need
 * the inverse-transform to be visible BEFORE the rAF tick install a
 * queued variant inline.
 */
const originalRAF = window.requestAnimationFrame;
const originalCAF = window.cancelAnimationFrame;
beforeEach(() => {
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;
});
afterEach(() => {
  window.requestAnimationFrame = originalRAF;
  window.cancelAnimationFrame = originalCAF;
});

/** Install a queued rAF variant - returns an array of callbacks that
 * tests flush manually. Lets tests observe state BEFORE the rAF fires. */
function queueRaf(): Array<() => void> {
  const queued: Array<() => void> = [];
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    queued.push(() => cb(0));
    return queued.length;
  }) as typeof window.requestAnimationFrame;
  return queued;
}

describe('useLayoutAnimation', () => {
  it('returns a ref that consumers attach to an element', () => {
    function Probe(): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>();
      return <div ref={ref} data-testid="target" />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;
    expect(el).toBeDefined();
  });

  it('does not apply a transform on first commit', () => {
    function Probe(): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>();
      return <div ref={ref} data-testid="target" />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;
    expect(el.style.transform).toBe('');
  });

  it('applies the inverse transform when position changes (held under queued rAF)', () => {
    function Probe({ trigger }: { trigger: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>();
      return <div ref={ref} data-testid="target" data-trigger={trigger} />;
    }

    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe trigger={0} />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;

    const queued = queueRaf();
    setRect({ x: 50, y: 30, width: 100, height: 100 });
    render(<Probe trigger={1} />);

    // Inverse delta: prev - next = (0-50, 0-30) = (-50, -30). The
    // hook applies that translation synchronously inside the layout
    // effect, before the rAF tick clears it.
    expect(el.style.transform).toContain('translate(-50px, -30px)');
    expect(el.style.transformOrigin.length).toBeGreaterThan(0);

    // Flushing rAF clears the transform and installs the transition.
    queued[0]?.();
    expect(el.style.transform).toBe('');
    expect(el.style.transition).toContain('transform 300ms ease-in-out');
  });

  it('applies a scale component when size changes', () => {
    function Probe({ trigger }: { trigger: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>();
      return <div ref={ref} data-testid="target" data-trigger={trigger} />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe trigger={0} />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;

    queueRaf();
    setRect({ x: 0, y: 0, width: 200, height: 50 });
    render(<Probe trigger={1} />);

    // sx = prev.width / next.width = 100/200 = 0.5
    // sy = prev.height / next.height = 100/50 = 2
    expect(el.style.transform).toContain('scale(0.5, 2)');
  });

  it('respects the `kind: "position"` option (no scale component)', () => {
    function Probe({ trigger }: { trigger: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>({ kind: 'position' });
      return <div ref={ref} data-testid="target" data-trigger={trigger} />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe trigger={0} />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;

    queueRaf();
    setRect({ x: 50, y: 30, width: 200, height: 200 });
    render(<Probe trigger={1} />);

    expect(el.style.transform).toContain('translate(-50px, -30px)');
    expect(el.style.transform).toContain('scale(1, 1)');
  });

  it('respects the `kind: "size"` option (no translate component)', () => {
    function Probe({ trigger }: { trigger: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>({ kind: 'size' });
      return <div ref={ref} data-testid="target" data-trigger={trigger} />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe trigger={0} />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;

    queueRaf();
    setRect({ x: 50, y: 30, width: 50, height: 50 });
    render(<Probe trigger={1} />);

    expect(el.style.transform).toContain('translate(0px, 0px)');
    expect(el.style.transform).toContain('scale(2, 2)');
  });

  it('uses the custom duration / easing when provided', () => {
    function Probe({ trigger }: { trigger: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>({ duration: 0.6, easing: 'linear' });
      return <div ref={ref} data-testid="target" data-trigger={trigger} />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe trigger={0} />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;

    setRect({ x: 10, y: 0, width: 100, height: 100 });
    render(<Probe trigger={1} />);

    expect(el.style.transition).toContain('transform 600ms linear');
  });

  it('skips work when the rect does not change', () => {
    function Probe({ trigger }: { trigger: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>();
      return <div ref={ref} data-testid="target" data-trigger={trigger} />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe trigger={0} />);
    const el = container.querySelector('[data-testid="target"]') as HTMLElement;

    const transitionSpy = vi.spyOn(el.style, 'transition', 'set');
    // Same rect - no diff, no animation, no transition write.
    render(<Probe trigger={1} />);
    expect(transitionSpy).not.toHaveBeenCalled();
    transitionSpy.mockRestore();
  });

  it('updates the recorded rect across multiple commits', () => {
    function Probe({ x }: { x: number }): ReactNode {
      const { ref } = useLayoutAnimation<HTMLDivElement>();
      return <div ref={ref} data-testid="target" data-x={x} />;
    }
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(<Probe x={0} />);

    setRect({ x: 10, y: 0, width: 100, height: 100 });
    render(<Probe x={1} />);

    setRect({ x: 30, y: 0, width: 100, height: 100 });
    render(<Probe x={2} />);

    const el = container.querySelector('[data-testid="target"]') as HTMLElement;
    // After the synchronous rAF tick, transform is cleared.
    expect(el.style.transform).toBe('');
  });

  // Regression: the effect cleanup only cancelled the rAF - it never
  // removed the transitionend listener, so an unmount (or an interrupting
  // layout change) mid-animation leaked it.
  it('removes the transitionend listener on unmount and on interrupt', () => {
    const added: EventTarget[] = [];
    const removed: EventTarget[] = [];
    const origAdd = Element.prototype.addEventListener;
    const origRemove = Element.prototype.removeEventListener;
    Element.prototype.addEventListener = function (
      this: Element,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === 'transitionend') added.push(this);
      origAdd.call(this, type, listener, options);
    };
    Element.prototype.removeEventListener = function (
      this: Element,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) {
      if (type === 'transitionend') removed.push(this);
      origRemove.call(this, type, listener, options);
    };
    try {
      function Probe(): ReactNode {
        const { ref } = useLayoutAnimation<HTMLDivElement>();
        return <div ref={ref} data-testid="target" />;
      }
      setRect({ x: 0, y: 0, width: 100, height: 100 });
      render(<Probe />); // first commit - no animation
      setRect({ x: 100, y: 0, width: 100, height: 100 });
      render(<Probe />); // position change → animation 1 (sync rAF adds listener)
      expect(added.length).toBe(1);

      // Interrupt with another layout change: cleanup must remove the
      // animation-1 listener before animation 2 attaches its own.
      setRect({ x: 200, y: 0, width: 100, height: 100 });
      render(<Probe />);
      expect(removed.length).toBe(1);
      expect(added.length).toBe(2);

      // Unmount mid-animation: the live listener must be removed.
      act(() => root.unmount());
      expect(removed.length).toBe(2);
      root = createRoot(container); // keep the shared afterEach unmount safe
    } finally {
      Element.prototype.addEventListener = origAdd;
      Element.prototype.removeEventListener = origRemove;
    }
  });
});

describe('Box layoutTransition', () => {
  function moveBox(node: (trigger: number) => ReactNode): HTMLElement {
    setRect({ x: 0, y: 0, width: 100, height: 100 });
    render(node(0));
    const el = container.firstElementChild as HTMLElement;
    const queued = queueRaf();
    setRect({ x: 40, y: 0, width: 100, height: 100 });
    render(node(1));
    queued[0]?.();
    return el;
  }

  it('times the layout animation with token CSS variables', () => {
    const el = moveBox((t) => (
      <Box
        layout
        layoutTransition={{ duration: '$durations.5', easing: '$easings.decelerate' }}
        data-trigger={t}
      />
    ));
    expect(el.style.transition).toBe('transform var(--durations-5) var(--easings-decelerate)');
    expect(el.hasAttribute('layoutTransition')).toBe(false);
  });

  it('takes literal values, and keeps the default for a part left out', () => {
    const el = moveBox((t) => (
      <Box layout layoutTransition={{ duration: '120ms' }} data-trigger={t} />
    ));
    expect(el.style.transition).toBe('transform 120ms ease-in-out');
  });

  it('defaults to 300ms ease-in-out', () => {
    const el = moveBox((t) => <Box layout data-trigger={t} />);
    expect(el.style.transition).toBe('transform 300ms ease-in-out');
  });
});
