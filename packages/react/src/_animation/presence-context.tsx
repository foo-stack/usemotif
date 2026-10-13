'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * Motion phases for an element managed by an exit-aware presence boundary.
 * The web mirror of `@usemotif/react-native`'s `presence-context` - same
 * `registerExit` contract, so web and native exit orchestration stay aligned.
 *
 * - `'closed'` - the element should not be rendered.
 * - `'entering'` - reserved for future symmetry with `enterStyle` orchestration.
 * - `'open'` - steady-state open.
 * - `'exiting'` - `open` flipped to `false` but the subtree is still rendered
 *   so a descendant `<Box exitStyle={...}>` can drive its exit (via the active
 *   motion driver's `useExit`) before the boundary unmounts it.
 */
export type MotionPhase = 'closed' | 'entering' | 'open' | 'exiting';

/**
 * Context value descendants read to discover the current motion phase and
 * register a "pending exit" with the parent boundary.
 *
 * On the default CSS driver, web exit runs through the cascade - the boundary
 * toggles `data-motif-state="exiting"` and motif's `[data-motif-state="exiting"]`
 * rules apply. The off-thread WAAPI driver has no cascade hook for exit, so it
 * plumbs the same signal through this context instead (mirroring native): a
 * descendant registers its pending exit and calls back when its driver settles.
 */
export interface PresenceContextValue {
  readonly phase: MotionPhase;
  /**
   * Register a pending exit at this descendant. Returns a callback the
   * descendant calls when its exit animation settles. The boundary settles to
   * `'closed'` when every registered exit calls its complete callback OR the
   * fallback timer fires (whichever comes first). Calling outside the
   * `'exiting'` phase returns a no-op callback.
   */
  registerExit(): () => void;
}

/**
 * Default context value when no parent presence boundary is in scope. Phase is
 * always `'open'`; `registerExit` is a no-op, so descendants pay zero overhead
 * in the common case (no exit animation requested / no boundary).
 */
const STANDALONE_PRESENCE: PresenceContextValue = {
  phase: 'open',
  registerExit: () => () => {},
};

export const PresenceContext = createContext<PresenceContextValue | null>(null);

/** Read the active presence-context value, falling back to standalone. */
export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext) ?? STANDALONE_PRESENCE;
}

/** Result returned by {@link useExitPresence}. */
export interface UseExitPresenceResult {
  /** True while the subtree should render (`'open'` or `'exiting'`). */
  readonly shouldRender: boolean;
  /** Current motion phase. */
  readonly phase: MotionPhase;
  /**
   * Settle the current exit now, as if every registered exit had completed.
   * Idempotent within one exit window. Lets a wrapper add its own completion
   * signal, such as a `transitionend` listener.
   */
  readonly settle: () => void;
  /**
   * Boundary component to wrap exit-aware children in. Provides the
   * `PresenceContext` so descendants like `<Box exitStyle={...}>` see the phase
   * and can register their pending exit animations.
   */
  readonly ExitBoundary: (props: { children: ReactNode }) => ReactElement;
}

/**
 * Web exit-presence boundary - delays unmount until either every descendant
 * exit animation settles via `registerExit`'s complete callback OR the
 * `fallbackDurationMs` timer fires (whichever comes first). The off-thread
 * WAAPI driver settles precisely (its `finished` promise → the complete
 * callback); other drivers fall back to the timer.
 *
 * The web mirror of native's `useExitTransitionNative` - same shape, so a
 * component can wire exit identically on both renderers. Pass
 * `fallbackDurationMs <= 0` to skip the exit phase (instant unmount).
 *
 * ```tsx
 * function MyOverlay({ open, children }) {
 *   const { shouldRender, ExitBoundary } = useExitPresence(open);
 *   if (!shouldRender) return null;
 *   return (
 *     <ExitBoundary>
 *       <Box exitStyle={{ opacity: 0 }} transition={{ duration: '200ms' }}>
 *         {children}
 *       </Box>
 *     </ExitBoundary>
 *   );
 * }
 * ```
 */
export function useExitPresence(open: boolean, fallbackDurationMs = 400): UseExitPresenceResult {
  const [phase, setPhase] = useState<MotionPhase>(open ? 'open' : 'closed');
  const previousOpenRef = useRef<boolean>(open);
  const pendingExits = useRef<Set<symbol>>(new Set());
  const settledRef = useRef<boolean>(false);

  // Settle the exit phase to `'closed'`. Idempotent; first caller wins. Both
  // the descendant-completion and fallback-timer routes funnel through here.
  const settle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    pendingExits.current.clear();
    setPhase('closed');
  }, []);

  const registerExit = useCallback((): (() => void) => {
    // No exits to register outside the exiting phase. Returning a no-op keeps
    // the descendant's call-site shape uniform.
    if (phase !== 'exiting') return () => {};
    const id = Symbol('motif-pending-exit');
    pendingExits.current.add(id);
    let signalled = false;
    return () => {
      if (signalled) return;
      signalled = true;
      pendingExits.current.delete(id);
      // Settle as soon as the last pending exit completes - a single exit that
      // finishes faster than the fallback shouldn't be padded to the timer.
      if (pendingExits.current.size === 0) settle();
    };
  }, [phase, settle]);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;

    if (open && !wasOpen) {
      pendingExits.current.clear();
      settledRef.current = false;
      setPhase('open');
      return undefined;
    }
    if (!open && wasOpen) {
      // Closing without an exit window - flip straight to closed.
      if (fallbackDurationMs <= 0) {
        settle();
        return undefined;
      }
      pendingExits.current.clear();
      settledRef.current = false;
      setPhase('exiting');
      const timeoutId = setTimeout(() => {
        // Fallback fired before all descendants signalled - assume something
        // didn't wire its exit. Settle anyway so the tree always unmounts.
        settle();
      }, fallbackDurationMs);
      return () => clearTimeout(timeoutId);
    }
    // Steady state - sync phase to `open` in case nothing flipped but a remount
    // happened.
    setPhase(open ? 'open' : 'closed');
    return undefined;
  }, [fallbackDurationMs, open, settle]);

  const value = useMemo<PresenceContextValue>(
    () => ({ phase, registerExit }),
    [phase, registerExit],
  );

  // The boundary reads the latest value through a ref so its own identity can
  // stay stable: keying the component on `value` would give it a new function
  // identity each phase flip, and React tears down + recreates a changed
  // component type - wiping descendant state and replaying entry animations.
  // Phase changes reach descendants through the Provider value instead.
  const valueRef = useRef(value);
  valueRef.current = value;

  const ExitBoundary = useCallback(
    ({ children }: { children: ReactNode }): ReactElement => (
      <PresenceContext.Provider value={valueRef.current}>{children}</PresenceContext.Provider>
    ),
    [],
  );

  return {
    shouldRender: phase === 'open' || phase === 'exiting' || phase === 'entering',
    phase,
    settle,
    ExitBoundary,
  };
}
