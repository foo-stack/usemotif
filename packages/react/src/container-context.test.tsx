/** @vitest-environment jsdom */
import { act, createRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Container } from './Container.js';
import { useContainerInfo, type ContainerContextValue } from './container-context.js';

class StubResizeObserver {
  static live = new Set<StubResizeObserver>();
  target: Element | null = null;
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element): void {
    this.target = target;
    StubResizeObserver.live.add(this);
  }
  unobserve(): void {}
  disconnect(): void {
    StubResizeObserver.live.delete(this);
  }
  fire(width: number): void {
    const entry = { contentRect: { width } } as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

function resize(el: Element | null, width: number): void {
  act(() => {
    for (const ro of StubResizeObserver.live) if (ro.target === el) ro.fire(width);
  });
}

let container: HTMLElement;
let root: Root;
let seen: ContainerContextValue | undefined;

function Probe(): null {
  seen = useContainerInfo();
  return null;
}

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function byId(id: string): Element | null {
  return container.querySelector(`[data-id="${id}"]`);
}

beforeEach(() => {
  StubResizeObserver.live.clear();
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  seen = undefined;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

describe('useContainerInfo (web)', () => {
  it('is empty outside any Container', () => {
    render(<Probe />);
    expect(seen).toEqual({ nearestWidth: null, named: new Map() });
  });

  it('measures nothing when no descendant reads it', () => {
    render(
      <Container name="card">
        <span />
      </Container>,
    );
    expect(StubResizeObserver.live.size).toBe(0);
  });

  it('is null until measured, then reports and follows the width', () => {
    render(
      <Container data-id="c">
        <Probe />
      </Container>,
    );
    expect(seen?.nearestWidth).toBeNull();
    resize(byId('c'), 320);
    expect(seen).toEqual({ nearestWidth: 320, named: new Map() });
    resize(byId('c'), 800);
    expect(seen?.nearestWidth).toBe(800);
  });

  it('reports nested named and anonymous containers, inner names shadowing outer', () => {
    render(
      <Container data-id="page" name="page">
        <Container data-id="outer-card" name="card">
          <Container data-id="anon">
            <Container data-id="inner-card" name="card">
              <Probe />
            </Container>
          </Container>
        </Container>
      </Container>,
    );
    resize(byId('page'), 1200);
    resize(byId('outer-card'), 600);
    resize(byId('anon'), 500);
    expect(seen?.nearestWidth).toBe(500);
    expect(seen?.named).toEqual(
      new Map([
        ['page', 1200],
        ['card', 600],
      ]),
    );
    resize(byId('inner-card'), 400);
    expect(seen?.nearestWidth).toBe(400);
    expect(seen?.named.get('card')).toBe(400);
  });

  it('disconnects when the reader unmounts and still hands the element to a user ref', () => {
    const ref = createRef<HTMLElement | null>();
    render(
      <Container data-id="c" ref={ref}>
        <Probe />
      </Container>,
    );
    expect(ref.current).toBe(byId('c'));
    expect(StubResizeObserver.live.size).toBe(1);
    render(<Container data-id="c" ref={ref} />);
    expect(StubResizeObserver.live.size).toBe(0);
    expect(ref.current).toBe(byId('c'));
  });
});
