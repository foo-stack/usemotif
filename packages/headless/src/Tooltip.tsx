'use client';

import { Portal } from '@usemotif/react';
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { mergeRefs } from './_compose-refs.js';
import { useExitTransition } from './_use-exit-transition.js';
import { computePosition } from './positioning.js';

/**
 * Tooltip - text affordance shown on hover or keyboard focus.
 * Headless: no styling, no positioning library - just the wiring.
 *
 * Behaviour:
 * - Opens on `mouseenter` / `focus` after `openDelay` (default
 *   500ms; matches the WCAG-friendly delay).
 * - Closes on `mouseleave` / `blur` after `closeDelay` (default
 *   200ms; small grace period to let the user move the cursor
 *   into the tooltip body if they want).
 * - Closes on Escape.
 * - Sets `aria-describedby` on the trigger so screen readers
 *   announce the tooltip alongside the trigger's accessible name.
 *
 * Positioning: `placement` (`'top' | 'bottom' | 'left' | 'right'`) is the
 * preferred side; like every overlay here, the tooltip flips to the
 * opposite side and shifts along the edge to stay in the viewport.
 *
 * Tooltips are NOT for interactive content. If the content needs
 * interaction (links, buttons), use `<HoverCard>` or `<Popover>`
 * instead - those are accessible to keyboard users.
 *
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger><IconButton aria-label="Save">💾</IconButton></Tooltip.Trigger>
 *   <Tooltip.Content>Save (⌘S)</Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */

interface TooltipContextValue {
  readonly open: boolean;
  readonly contentId: string;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly placement: 'top' | 'bottom' | 'left' | 'right';
  readonly handlers: {
    readonly onTriggerEnter: () => void;
    readonly onTriggerLeave: () => void;
  };
}
const TooltipContext = createContext<TooltipContextValue | null>(null);
function useTooltipContext(component: string): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (ctx === null) {
    throw new Error(`${component} must be rendered inside <Tooltip.Root>.`);
  }
  return ctx;
}

export interface TooltipRootProps {
  /** Delay before showing, in ms. Defaults to 500. */
  openDelay?: number;
  /** Delay before hiding, in ms. Defaults to 200. */
  closeDelay?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
}
function Root({
  openDelay = 500,
  closeDelay = 200,
  placement = 'bottom',
  children,
}: TooltipRootProps): ReactElement {
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    openTimerRef.current = null;
    closeTimerRef.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimerRef.current = setTimeout(() => setOpen(true), openDelay);
  }, [openDelay, clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay, clearTimers]);

  // Escape closes immediately.
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        clearTimers();
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Memoized so consumers don't re-render on every provider render (parity
  // with Menu/Dialog/Popover). The handlers are useCallback-stable.
  const value = useMemo(
    () => ({
      open,
      contentId: `${reactId}-tooltip`,
      triggerRef,
      placement,
      handlers: {
        onTriggerEnter: scheduleOpen,
        onTriggerLeave: scheduleClose,
      },
    }),
    [open, reactId, triggerRef, placement, scheduleOpen, scheduleClose],
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

export interface TooltipTriggerProps {
  children: ReactElement<{
    onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
    onFocus?: (e: FocusEvent<HTMLElement>) => void;
    onBlur?: (e: FocusEvent<HTMLElement>) => void;
    'aria-describedby'?: string;
    ref?: React.Ref<HTMLElement>;
  }>;
}
function Trigger({ children }: TooltipTriggerProps): ReactElement {
  const ctx = useTooltipContext('Tooltip.Trigger');
  if (!isValidElement(children)) {
    throw new Error('Tooltip.Trigger expects a single React element child.');
  }
  const { onMouseEnter, onMouseLeave, onFocus, onBlur } = children.props;
  return cloneElement(children, {
    ref: mergeRefs(children.props.ref, ctx.triggerRef),
    ...(ctx.open ? { 'aria-describedby': ctx.contentId } : {}),
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      onMouseEnter?.(e);
      ctx.handlers.onTriggerEnter();
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      onMouseLeave?.(e);
      ctx.handlers.onTriggerLeave();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      onFocus?.(e);
      ctx.handlers.onTriggerEnter();
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      onBlur?.(e);
      ctx.handlers.onTriggerLeave();
    },
  });
}

export interface TooltipContentProps {
  /** Pixel offset from the trigger's edge. Defaults to 8. */
  offset?: number;
  /**
   * Fallback timeout (ms) for the exit transition. **Defaults to `0`** -
   * the tip unmounts instantly when it closes. Set a positive value to keep
   * it mounted with `data-motif-state="exiting"` until a `transitionend`
   * fires, a WAAPI-driven descendant's exit completes, or this timeout
   * expires (whichever comes first). Pair with `exitStyle` on a child
   * `<Box>` to see the fade.
   */
  exitDurationMs?: number;
  /** Custom inline style merged on top of computed positioning. */
  style?: CSSProperties;
  children?: ReactNode;
}
function Content({
  offset = 8,
  exitDurationMs = 0,
  style: userStyle,
  children,
}: TooltipContentProps): ReactElement | null {
  const ctx = useTooltipContext('Tooltip.Content');
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const { shouldRender, phase, elementRef, ExitBoundary } = useExitTransition(
    ctx.open,
    exitDurationMs,
  );
  // Stable merged ref - positioning measures the node, and the exit transition
  // reads its `transitionend`. Both target refs are stable.
  const setSurfaceRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      elementRef.current = node;
    },
    [elementRef],
  );

  useEffect(() => {
    if (!ctx.open) return;
    const trigger = ctx.triggerRef.current;
    const content = contentRef.current;
    if (trigger === null || content === null) return;
    const { top, left } = computePosition(
      trigger.getBoundingClientRect(),
      { width: content.offsetWidth, height: content.offsetHeight },
      ctx.placement,
      offset,
    );
    setPosition({ top, left });
  }, [ctx.open, ctx.placement, ctx.triggerRef, offset]);

  if (!shouldRender) return null;
  return (
    <Portal>
      <div
        ref={setSurfaceRef}
        id={ctx.contentId}
        role="tooltip"
        data-motif-state={phase === 'exiting' ? 'exiting' : undefined}
        // A role="tooltip" is not an interactive hover target (WAI-ARIA APG):
        // it must not keep itself open when the cursor moves onto it, and it
        // shouldn't intercept pointer events from the content beneath. No
        // content hover-keepalive, and pointerEvents:none - the tooltip
        // closes on trigger mouseleave/blur regardless of cursor position
        // over the tip. (Keepalive-on-hover belongs to HoverCard.)
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1100,
          pointerEvents: 'none',
          ...userStyle,
        }}
      >
        {/* Publish the presence phase so a WAAPI-driven descendant surface
            registers + plays its exit off-thread; the CSS path rides
            `data-motif-state` + `transitionend` on this element. */}
        <ExitBoundary>{children}</ExitBoundary>
      </div>
    </Portal>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export { Root as TooltipRoot, Trigger as TooltipTrigger, Content as TooltipContent };
