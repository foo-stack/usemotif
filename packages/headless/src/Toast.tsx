'use client';

import { Portal, useDrag } from '@usemotif/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { withPromise, type ToastFn } from './_toast-promise.js';
import { isSwipeDismiss, swipeOpacity } from './_toast-swipe.js';
import { useExitTransition } from './_use-exit-transition.js';

export type { ToastContent, ToastFn, ToastPromiseMessages } from './_toast-promise.js';

/**
 * Toast / Toaster - transient notifications announced via an
 * `aria-live` region.
 *
 * `<Toaster>` mounts once near the root of the app. Inside, call
 * `useToast()` to get a `toast({...})` function that pushes
 * notifications onto the queue. Each toast auto-dismisses after
 * `duration` ms (default 5000); the user can dismiss earlier via
 * the Close action.
 *
 * **Motion**: pass `exitDurationMs` to the `<Toaster>` to animate
 * dismissals. Each dismissed toast is held mounted in an exiting phase
 * (flagged `data-motif-state="exiting"`) until its exit settles, then
 * removed from the queue - the same `exitStyle` / `data-motif-state`
 * contract Dialog uses, applied per toast. Defaults to `0` (dismissed
 * toasts unmount instantly, the original behaviour). With the off-thread
 * WAAPI driver a descendant `<Box exitStyle>` registers + plays its exit
 * and settles the removal precisely. Only the default toast list animates;
 * a custom `renderToasts` owns its own removal, so dismissals there are
 * immediate.
 *
 * ```tsx
 * function App() {
 *   return (
 *     <Toaster>
 *       <MyAppRoot />
 *     </Toaster>
 *   );
 * }
 *
 * function SaveButton() {
 *   const { toast } = useToast();
 *   return <Button onClick={() => toast({ title: 'Saved!' })}>Save</Button>;
 * }
 * ```
 */

export interface ToastItem {
  readonly id: string;
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  /** ms before auto-dismiss. Pass `Infinity` to disable. */
  readonly duration?: number;
  /** `'foreground'` (assertive) for errors, `'background'` (polite)
   * for confirmations. Defaults to `'background'`. */
  readonly type?: 'foreground' | 'background';
}

type ToastInput = Omit<ToastItem, 'id'> & { id?: string };

interface ToasterContextValue {
  readonly toast: ToastFn;
  readonly dismiss: (id: string) => void;
  readonly toasts: ToastItem[];
}
const ToasterContext = createContext<ToasterContextValue | null>(null);

export function useToast(): ToasterContextValue {
  const ctx = useContext(ToasterContext);
  if (ctx === null) throw new Error('useToast() must be called inside <Toaster>.');
  return ctx;
}

/**
 * Render the toast list itself. Default implementation: a stacked
 * column at the bottom-right of the viewport. Callers wanting a
 * different layout can pass `renderToasts` to override.
 */
export interface ToasterProps {
  /** Children - the rest of your app. */
  children?: ReactNode;
  /** Override how the toast list renders. Receives the active
   * toasts + the dismiss handler. Default: bottom-right column. */
  renderToasts?: (toasts: ToastItem[], dismiss: (id: string) => void) => ReactNode;
  /** Default duration in ms for new toasts. Defaults to 5000. */
  defaultDuration?: number;
  /** Most toasts shown at once; past it the oldest are dropped, as on native.
   * Defaults to no limit. */
  maxVisible?: number;
  /**
   * Fallback exit duration (ms) for dismissals. **Defaults to `0`** -
   * dismissed toasts unmount instantly. With a positive value the default
   * list holds each dismissed toast mounted with `data-motif-state="exiting"`
   * until a `transitionend`, a WAAPI-driven descendant's exit, or this
   * timeout settles it, then removes it. Pair with `exitStyle` on a child
   * `<Box>` to see the animation. Ignored when `renderToasts` is provided
   * (a custom list owns its own removal).
   */
  exitDurationMs?: number;
  /** Let a sideways swipe dismiss a toast in the default list. Defaults to
   * `true`. */
  swipeToDismiss?: boolean;
  /** Inline style for the default container - only used when
   * `renderToasts` is not provided. */
  style?: CSSProperties;
}

let nextId = 0;

const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"]';

export function Toaster({
  children,
  renderToasts,
  defaultDuration = 5000,
  maxVisible = Infinity,
  exitDurationMs = 0,
  swipeToDismiss = true,
  style,
}: ToasterProps): ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Ids whose exit is in flight: still in `toasts` (so they stay on screen and
  // can animate) but flagged so each Toast renders `open={false}`.
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  // Actually drop a toast from the queue - runs immediately for an instant
  // dismiss, or once a held toast's exit settles (its `onExited`).
  const remove = useCallback(
    (id: string) => {
      setToasts((current) => current.filter((t) => t.id !== id));
      setLeaving((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      clearTimer(id);
    },
    [clearTimer],
  );

  // Animate dismissals only for the default list; a custom `renderToasts` owns
  // its own removal, so holding toasts mounted there would leak them.
  const animateExit = exitDurationMs > 0 && renderToasts === undefined;

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      if (!animateExit) {
        setToasts((current) => current.filter((t) => t.id !== id));
        return;
      }
      // Hold it mounted; the Toast plays its exit and settles removal via
      // `onExited`.
      setLeaving((current) => {
        if (current.has(id)) return current;
        const next = new Set(current);
        next.add(id);
        return next;
      });
    },
    [animateExit, clearTimer],
  );

  const toast = useCallback(
    (input: ToastInput): string => {
      nextId += 1;
      const id = input.id ?? `toast-${nextId}`;
      const item: ToastItem = {
        ...input,
        id,
        duration: input.duration ?? defaultDuration,
        type: input.type ?? 'background',
      };
      // Reusing an id updates the toast in place rather than appending a
      // duplicate; clear the prior timer first so the orphaned one can't fire
      // dismiss(id) and filter out the replacement early.
      clearTimer(id);
      // Re-pushing an id whose exit is mid-flight revives it (cancel the leave).
      setLeaving((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setToasts((current) => {
        const idx = current.findIndex((t) => t.id === id);
        if (idx === -1) return [...current, item].slice(-maxVisible);
        const next = current.slice();
        next[idx] = item;
        return next;
      });
      if (item.duration !== Infinity && (item.duration ?? 0) > 0) {
        const timer = setTimeout(() => dismiss(id), item.duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [defaultDuration, dismiss, clearTimer, maxVisible],
  );

  // A toast dropped past `maxVisible` must not keep a timer that could later
  // dismiss (or, mid-exit, re-flag) an id that is no longer queued.
  useEffect(() => {
    for (const id of timersRef.current.keys()) {
      if (!toasts.some((t) => t.id === id)) clearTimer(id);
    }
  }, [toasts, clearTimer]);

  const toastFn = useMemo(() => withPromise(toast), [toast]);

  // Clear pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  // Memoized so consumers don't re-render on every provider render (parity
  // with Menu/Dialog/Popover). toast/dismiss are useCallback-stable.
  const value = useMemo(() => ({ toast: toastFn, dismiss, toasts }), [toastFn, dismiss, toasts]);
  return (
    <ToasterContext.Provider value={value}>
      {children}
      <Portal>
        {renderToasts !== undefined ? (
          renderToasts(toasts, dismiss)
        ) : (
          <DefaultToasterList
            toasts={toasts}
            leaving={leaving}
            dismiss={dismiss}
            remove={remove}
            exitDurationMs={exitDurationMs}
            swipeToDismiss={swipeToDismiss}
            {...(style !== undefined ? { style } : {})}
          />
        )}
      </Portal>
    </ToasterContext.Provider>
  );
}

function DefaultToasterList({
  toasts,
  leaving,
  dismiss,
  remove,
  exitDurationMs,
  swipeToDismiss,
  style,
}: {
  toasts: ToastItem[];
  leaving: ReadonlySet<string>;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  exitDurationMs: number;
  swipeToDismiss: boolean;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div
      // NOT a live region. Each toast carries its own role="alert"/"status"
      // (itself a live region), so marking the container `aria-live` too would
      // nest live regions and double-announce every toast on NVDA/JAWS. The
      // container is purely the positioning/stacking wrapper.
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1200,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          item={t}
          open={!leaving.has(t.id)}
          exitDurationMs={exitDurationMs}
          onExited={remove}
          onDismiss={() => dismiss(t.id)}
          swipeToDismiss={swipeToDismiss}
        />
      ))}
    </div>
  );
}

/**
 * Renders a single toast with the right `aria-live` semantics.
 * Foreground toasts use `role="alert"` (interrupts); background
 * toasts use `role="status"` (polite).
 *
 * The default `<Toaster>` list drives `open` / `exitDurationMs` /
 * `onExited` so dismissed toasts can animate out before removal; a
 * standalone caller managing its own list can drive them the same way,
 * or omit them entirely (the toast just renders, the original behaviour).
 */
export function Toast({
  item,
  onDismiss,
  open = true,
  exitDurationMs = 0,
  onExited,
  swipeToDismiss = true,
  style,
  children,
}: {
  item: ToastItem;
  /** Dismisses this toast. Also enables swiping it away, unless
   * `swipeToDismiss` is `false`. */
  onDismiss?: () => void;
  /** Let a sideways swipe dismiss the toast when it has an `onDismiss`.
   * Defaults to `true`. */
  swipeToDismiss?: boolean;
  /** When `false`, the toast plays its exit (held mounted in the exiting
   * phase) instead of rendering normally. Defaults to `true`. */
  open?: boolean;
  /** Fallback exit duration (ms) once `open` is `false`. Defaults to `0`
   * (no exit window - the toast unmounts as soon as `open` flips). */
  exitDurationMs?: number;
  /** Called with the toast id once its exit settles, so the owner can drop
   * it from its list. */
  onExited?: (id: string) => void;
  style?: CSSProperties;
  children?: ReactNode;
}): ReactElement | null {
  const { shouldRender, phase, elementRef, ExitBoundary } = useExitTransition(open, exitDurationMs);
  // Attach the exit element ref (its `transitionend` settles the CSS route)
  // without clobbering - memoized so it isn't a fresh ref each render.
  const setSurfaceRef = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node;
    },
    [elementRef],
  );
  // Notify the owner exactly when the exit settles so it removes this toast.
  const { id } = item;
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  useEffect(() => {
    if (!shouldRender) onExitedRef.current?.(id);
  }, [shouldRender, id]);

  const swipe = swipeToDismiss && onDismiss !== undefined;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  // Bounded at 0 with full elasticity: the toast follows the finger freely and
  // springs back to rest when a release does not dismiss it.
  const { dragProps, x } = useDrag({
    axis: 'x',
    constraints: { left: 0, right: 0 },
    dragElastic: 1,
    onDragEnd: (info) => {
      if (isSwipeDismiss(info)) onDismissRef.current?.();
    },
  });
  useEffect(
    () =>
      x.on('change', (offset) => {
        const el = elementRef.current;
        if (el === null) return;
        el.style.transform = offset === 0 ? '' : `translateX(${offset}px)`;
        el.style.opacity = offset === 0 ? '' : String(swipeOpacity(offset));
      }),
    [x, elementRef],
  );

  // The drag captures the pointer, which would retarget a click meant for the
  // toast's own button or link; presses that start on one are left alone.
  const startSwipe = (e: PointerEvent<HTMLElement>): void => {
    if (e.target !== e.currentTarget && (e.target as Element).closest(INTERACTIVE) !== null) return;
    dragProps.onPointerDown(e);
  };

  if (!shouldRender) return null;
  return (
    <div
      // Each toast owns its announcement: role="alert" (foreground, interrupts)
      // or role="status" (background, polite). Both imply a live region, so the
      // container must NOT also be a live region - a live region nested inside
      // another makes NVDA/JAWS announce each toast twice (see
      // DefaultToasterList).
      ref={setSurfaceRef}
      role={item.type === 'foreground' ? 'alert' : 'status'}
      aria-atomic="true"
      data-motif-state={phase === 'exiting' ? 'exiting' : undefined}
      {...(swipe ? { onPointerDown: startSwipe } : {})}
      // pan-y keeps vertical page scrolling on touch while horizontal moves
      // reach the swipe.
      style={{ pointerEvents: 'auto', ...(swipe ? { touchAction: 'pan-y' } : {}), ...style }}
    >
      {/* Publish the presence phase so a WAAPI-driven descendant surface
          registers + plays its exit off-thread; the CSS path rides
          `data-motif-state` + `transitionend` on this element. */}
      <ExitBoundary>
        {children ?? (
          <>
            {item.title !== undefined && item.title !== null ? <div>{item.title}</div> : null}
            {item.description !== undefined && item.description !== null ? (
              <div>{item.description}</div>
            ) : null}
            {item.action !== undefined && item.action !== null ? <div>{item.action}</div> : null}
            {onDismiss !== undefined ? (
              <button type="button" onClick={onDismiss} aria-label="Dismiss">
                ×
              </button>
            ) : null}
          </>
        )}
      </ExitBoundary>
    </div>
  );
}
