/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useScroll, useScrollTarget } from './use-scroll.js';
import { Box } from './Box.js';
import type { MotionValue } from '@usemotif/core';

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
 * jsdom doesn't lay out elements, so the scroll geometry properties
 * are zeroed by default. Stub the relevant getters / setters per-test
 * to simulate a scrollable container.
 */
function defineScrollGeometry(
  el: HTMLElement,
  geometry: {
    scrollWidth: number;
    scrollHeight: number;
    clientWidth: number;
    clientHeight: number;
  },
): void {
  Object.defineProperty(el, 'scrollWidth', { value: geometry.scrollWidth, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: geometry.scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: geometry.clientWidth, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: geometry.clientHeight, configurable: true });
}

function defineWindowGeometry(geometry: {
  innerWidth: number;
  innerHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}): void {
  Object.defineProperty(window, 'innerWidth', { value: geometry.innerWidth, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: geometry.innerHeight, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollWidth', {
    value: geometry.scrollWidth,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: geometry.scrollHeight,
    configurable: true,
  });
}

/**
 * Polyfill rAF to fire synchronously so tests don't need to schedule
 * animation frames manually. (jsdom's setTimeout-based rAF is slow and
 * brittle when interleaved with React act().)
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

type Captured = {
  scrollX: MotionValue<number>;
  scrollY: MotionValue<number>;
  scrollXProgress: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
};

function Probe({ onValues }: { onValues: (v: Captured) => void }): null {
  const values = useScroll();
  onValues(values);
  return null;
}

function ProbeWithContainer({
  onValues,
  elRef,
}: {
  onValues: (v: Captured) => void;
  elRef: { current: HTMLDivElement | null };
}): ReactNode {
  const values = useScroll({ container: elRef });
  onValues(values);
  return null;
}

describe('useScroll - window form', () => {
  it('returns four motion values', () => {
    const onValues = vi.fn();
    render(<Probe onValues={onValues} />);
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(typeof v.scrollX.get()).toBe('number');
    expect(typeof v.scrollY.get()).toBe('number');
    expect(typeof v.scrollXProgress.get()).toBe('number');
    expect(typeof v.scrollYProgress.get()).toBe('number');
  });

  it('seeds initial values from current window scroll on mount', () => {
    Object.defineProperty(window, 'scrollX', { value: 50, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1500,
      scrollHeight: 2800,
    });

    const onValues = vi.fn();
    render(<Probe onValues={onValues} />);
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollX.get()).toBe(50);
    expect(v.scrollY.get()).toBe(200);
    // maxX = 1500 - 1000 = 500 → 50/500 = 0.1
    expect(v.scrollXProgress.get()).toBeCloseTo(0.1);
    // maxY = 2800 - 800 = 2000 → 200/2000 = 0.1
    expect(v.scrollYProgress.get()).toBeCloseTo(0.1);
  });

  it('updates motion values when a window scroll event fires', () => {
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1000,
      scrollHeight: 1800,
    });

    const onValues = vi.fn();
    render(<Probe onValues={onValues} />);
    const v = onValues.mock.calls[0]![0] as Captured;

    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(v.scrollY.get()).toBe(500);
    // maxY = 1800 - 800 = 1000 → 500/1000 = 0.5
    expect(v.scrollYProgress.get()).toBeCloseTo(0.5);
  });

  it('clamps progress to 0 when the document is not scrollable on an axis', () => {
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      // Same as viewport - nothing to scroll.
      scrollWidth: 1000,
      scrollHeight: 800,
    });

    const onValues = vi.fn();
    render(<Probe onValues={onValues} />);
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollXProgress.get()).toBe(0);
    expect(v.scrollYProgress.get()).toBe(0);
  });

  it('motion-value updates do not re-render the component', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1000,
      scrollHeight: 1800,
    });

    const onValues = vi.fn();
    render(<Probe onValues={onValues} />);
    const renderCountAfterMount = onValues.mock.calls.length;

    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(onValues.mock.calls.length).toBe(renderCountAfterMount);
  });
});

describe('useScroll - container form', () => {
  function Harness({ onValues }: { onValues: (v: Captured) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    return (
      <div ref={ref} data-testid="scroll-container">
        <ProbeWithContainer onValues={onValues} elRef={ref} />
      </div>
    );
  }

  it('reads scroll values from the container element', () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    const el = container.querySelector('[data-testid="scroll-container"]') as HTMLDivElement;

    defineScrollGeometry(el, {
      scrollWidth: 2000,
      scrollHeight: 3000,
      clientWidth: 1000,
      clientHeight: 800,
    });
    Object.defineProperty(el, 'scrollLeft', { value: 250, configurable: true, writable: true });
    Object.defineProperty(el, 'scrollTop', { value: 500, configurable: true, writable: true });

    act(() => {
      el.dispatchEvent(new Event('scroll'));
    });

    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollX.get()).toBe(250);
    expect(v.scrollY.get()).toBe(500);
    // maxX = 2000 - 1000 = 1000 → 250/1000 = 0.25
    expect(v.scrollXProgress.get()).toBeCloseTo(0.25);
    // maxY = 3000 - 800 = 2200 → 500/2200 ≈ 0.227
    expect(v.scrollYProgress.get()).toBeCloseTo(500 / 2200);
  });

  it('attaches the listener to the container, not the window', () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    const el = container.querySelector('[data-testid="scroll-container"]') as HTMLDivElement;

    defineScrollGeometry(el, {
      scrollWidth: 1000,
      scrollHeight: 1000,
      clientWidth: 500,
      clientHeight: 500,
    });
    Object.defineProperty(el, 'scrollTop', { value: 100, configurable: true, writable: true });

    // Dispatching window scroll should NOT update the values when a
    // container is supplied.
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollY.get()).toBe(0);

    // Dispatching on the container should.
    act(() => {
      el.dispatchEvent(new Event('scroll'));
    });
    expect(v.scrollY.get()).toBe(100);
  });
});

describe('useScroll - target + offset (window scroll)', () => {
  function TargetHarness({
    onValues,
    elRef,
  }: {
    onValues: (v: Captured) => void;
    elRef: { current: HTMLDivElement | null };
  }): ReactNode {
    const values = useScroll({ target: elRef });
    onValues(values);
    return null;
  }

  it('reports progress=0 when the element top sits at the viewport bottom', () => {
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1000,
      scrollHeight: 3000,
    });
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });

    const targetEl = document.createElement('div');
    targetEl.getBoundingClientRect = () => ({
      x: 0,
      y: 800, // top aligns with viewport bottom
      width: 1000,
      height: 400,
      top: 800,
      left: 0,
      bottom: 1200,
      right: 1000,
      toJSON: () => ({}),
    });
    const elRef = { current: targetEl };

    const onValues = vi.fn();
    render(<TargetHarness onValues={onValues} elRef={elRef} />);
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollYProgress.get()).toBe(0);
  });

  it('reports progress=1 when the element bottom sits at the viewport top', () => {
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1000,
      scrollHeight: 3000,
    });
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 1200, configurable: true });

    const targetEl = document.createElement('div');
    targetEl.getBoundingClientRect = () => ({
      // element bottom (rect.bottom) = viewport top (0) ⇒ rect.top = -height
      x: 0,
      y: -400,
      width: 1000,
      height: 400,
      top: -400,
      left: 0,
      bottom: 0,
      right: 1000,
      toJSON: () => ({}),
    });
    const elRef = { current: targetEl };

    const onValues = vi.fn();
    render(<TargetHarness onValues={onValues} elRef={elRef} />);
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollYProgress.get()).toBe(1);
  });

  it('lerps progress between the offset anchors', () => {
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1000,
      scrollHeight: 3000,
    });
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    // Element content-Y = 800 (anchor at scroll=0 ⇒ progress=0). Need
    // progress=0.5 at scroll=600 (anchor1=0, anchor2=1200, midway=600).
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });

    const targetEl = document.createElement('div');
    targetEl.getBoundingClientRect = () => ({
      x: 0,
      y: 200, // top in viewport = contentY (800) - scroll (600) = 200
      width: 1000,
      height: 400,
      top: 200,
      left: 0,
      bottom: 600,
      right: 1000,
      toJSON: () => ({}),
    });
    const elRef = { current: targetEl };

    const onValues = vi.fn();
    render(<TargetHarness onValues={onValues} elRef={elRef} />);
    const v = onValues.mock.calls[0]![0] as Captured;
    expect(v.scrollYProgress.get()).toBeCloseTo(0.5, 5);
  });

  // Regression: the effect depended on `offset` by identity, so an inline
  // array literal (new identity each render) tore down and re-subscribed
  // the scroll listener every render. The offset is now stabilised by value.
  it('does not re-subscribe the scroll listener when offset is an inline array', () => {
    const scrollAdds: unknown[] = [];
    const origAdd = window.addEventListener.bind(window);
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, opts) => {
      if (type === 'scroll') scrollAdds.push(listener);
      return origAdd(type, listener as EventListener, opts);
    });
    try {
      const elRef = { current: document.createElement('div') };
      // A NEW inline offset array each render, but the same value.
      function Harness({ tick }: { tick: number }): ReactNode {
        useScroll({ target: elRef, offset: ['start end', 'end start'] });
        return <span>{tick}</span>;
      }
      render(<Harness tick={0} />);
      const afterFirst = scrollAdds.length;
      expect(afterFirst).toBe(1);
      // Re-render several times - the offset value is unchanged.
      render(<Harness tick={1} />);
      render(<Harness tick={2} />);
      expect(scrollAdds.length).toBe(afterFirst); // no re-subscription
    } finally {
      spy.mockRestore();
    }
  });
});

describe('useScrollTarget', () => {
  function rectAt(top: number): () => DOMRect {
    return () =>
      ({
        x: 0,
        y: top,
        width: 1000,
        height: 400,
        top,
        left: 0,
        bottom: top + 400,
        right: 1000,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  it('reports the same progress through the handle as through a plain ref', () => {
    defineWindowGeometry({
      innerWidth: 1000,
      innerHeight: 800,
      scrollWidth: 1000,
      scrollHeight: 3000,
    });
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });

    const viaHandle = vi.fn();
    const viaRef = vi.fn();
    function Harness(): ReactNode {
      const target = useScrollTarget();
      const plain = useRef<HTMLDivElement | null>(null);
      viaHandle(useScroll({ target }));
      viaRef(useScroll({ target: plain }));
      return (
        <>
          <Box ref={target.ref} onLayout={target.onLayout} data-testid="handle" />
          <div ref={plain} data-testid="plain" />
        </>
      );
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      HTMLElement.prototype.getBoundingClientRect = rectAt(200);
      render(<Harness />);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      const handleValues = viaHandle.mock.lastCall![0] as Captured;
      const refValues = viaRef.mock.lastCall![0] as Captured;
      expect(handleValues.scrollYProgress.get()).toBeGreaterThan(0);
      expect(handleValues.scrollYProgress.get()).toBe(refValues.scrollYProgress.get());
      const unknownProp = spy.mock.calls.some((c) => String(c[0]).includes('Unknown'));
      expect(unknownProp).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('returns the same handle on every render', () => {
    const seen: unknown[] = [];
    function Harness({ n }: { n: number }): ReactNode {
      seen.push(useScrollTarget());
      return <span>{n}</span>;
    }
    render(<Harness n={1} />);
    render(<Harness n={2} />);
    expect(seen.length).toBe(2);
    expect(seen[0]).toBe(seen[1]);
  });
});
