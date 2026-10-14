'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

/** The measured widths of the enclosing `<Container>`s, in the native shape. */
export interface ContainerContextValue {
  /** Width of the innermost measured `<Container>`, or `null` before one is measured. */
  readonly nearestWidth: number | null;
  /** Width of each measured named ancestor `<Container>`; inner names shadow outer ones. */
  readonly named: ReadonlyMap<string, number>;
}

/**
 * One `<Container>`'s width, measured lazily: the `ResizeObserver` starts with
 * the first subscriber and stops with the last, so a Container nobody reads
 * never observes anything.
 */
export interface ContainerStore {
  readonly name: string | undefined;
  readonly parent: ContainerStore | null;
  attach(element: HTMLElement | null): void;
  subscribe(listener: () => void): () => void;
  getWidth(): number | null;
}

export function createContainerStore(
  name: string | undefined,
  parent: ContainerStore | null,
): ContainerStore {
  const listeners = new Set<() => void>();
  let element: HTMLElement | null = null;
  let observer: ResizeObserver | null = null;
  let width: number | null = null;

  const observe = (): void => {
    if (element === null || observer !== null || typeof ResizeObserver === 'undefined') return;
    // Content box, the same box the browser's own container queries measure.
    observer = new ResizeObserver((entries) => {
      const next = entries.at(-1)?.contentRect.width;
      if (next === undefined || next === width) return;
      width = next;
      for (const listener of listeners) listener();
    });
    observer.observe(element);
  };
  const disconnect = (): void => {
    observer?.disconnect();
    observer = null;
  };

  return {
    name,
    parent,
    attach(next) {
      if (next === element) return;
      disconnect();
      element = next;
      if (listeners.size > 0) observe();
    },
    subscribe(listener) {
      listeners.add(listener);
      observe();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) disconnect();
      };
    },
    getWidth: () => width,
  };
}

export const ContainerStoreContext = createContext<ContainerStore | null>(null);

const EMPTY: ContainerContextValue = { nearestWidth: null, named: new Map() };

function chainOf(store: ContainerStore | null): ContainerStore[] {
  const chain: ContainerStore[] = [];
  for (let s = store; s !== null; s = s.parent) chain.push(s);
  return chain;
}

/**
 * The measured widths of the enclosing `<Container>`s: `nearestWidth` for the
 * innermost one, `named` for each named ancestor. Calling it is what turns
 * measurement on; before the first measurement, and during server rendering,
 * widths are absent.
 *
 * @example
 * ```tsx
 * function Card() {
 *   const { named } = useContainerInfo();
 *   return (named.get('card') ?? 0) > 480 ? <WideCard /> : <NarrowCard />;
 * }
 * ```
 */
export function useContainerInfo(): ContainerContextValue {
  const store = useContext(ContainerStoreContext);
  const chain = useMemo(() => chainOf(store), [store]);

  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribers = chain.map((s) => s.subscribe(listener));
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
    [chain],
  );
  // A string snapshot is stable across calls while no width changes.
  const snapshot = useSyncExternalStore(
    subscribe,
    () => chain.map((s) => s.getWidth() ?? '').join('|'),
    () => '',
  );

  return useMemo(() => {
    const widths = snapshot.split('|');
    let nearestWidth: number | null = null;
    const named = new Map<string, number>();
    // Outermost first, so inner containers win both slots.
    for (let i = chain.length - 1; i >= 0; i--) {
      if (widths[i] === undefined || widths[i] === '') continue;
      nearestWidth = Number(widths[i]);
      const name = chain[i]!.name;
      if (name !== undefined) named.set(name, nearestWidth);
    }
    return nearestWidth === null ? EMPTY : { nearestWidth, named };
  }, [snapshot, chain]);
}
