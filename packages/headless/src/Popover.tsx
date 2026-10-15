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
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { mergeRefs } from './_compose-refs.js';
import { useClickOutside, useFloatingPosition, type Placement } from './positioning.js';
import { useExitTransition } from './_use-exit-transition.js';
import { useControllableState } from './use-controllable-state.js';
import { ArrowContext } from './_arrow.js';

/**
 * Popover - non-modal floating panel anchored to a trigger.
 *
 * Distinct from Dialog (modal, takes focus, blocks scroll, scrim)
 * - Popover is non-modal: focus stays with the trigger, the page
 * keeps interacting, no scrim. Use for filter dropdowns, simple
 * info cards, etc. For modal patterns use Dialog; for purely
 * descriptive overlays use Tooltip.
 *
 * **Motion**: pass `exitDurationMs` to keep the surface mounted while
 * its exit plays. Defaults to `0` (instant unmount, the original
 * behaviour). With the CSS driver the leaving surface carries
 * `data-motif-state="exiting"` so its `exitStyle` rule + `transitionend`
 * drive it; with the off-thread WAAPI driver a descendant `<Box exitStyle>`
 * reads the published `PresenceContext`, registers its exit, and settles
 * the unmount exactly when the animation finishes - the same contract
 * Dialog uses.
 *
 * Compose-time API:
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger><Button>Filter</Button></Popover.Trigger>
 *   <Popover.Content placement="bottom">
 *     <FilterControls />
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 *
 * Dismiss behaviour: Escape closes; click-outside closes (opt-out
 * via `dismissOnClickOutside={false}`).
 */

interface PopoverContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly contentId: string;
  readonly triggerRef: React.RefObject<HTMLElement | null>;
}
const PopoverContext = createContext<PopoverContextValue | null>(null);
function usePopoverContext(component: string): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (ctx === null) throw new Error(`${component} must be inside <Popover.Root>.`);
  return ctx;
}

export interface PopoverRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}
function Root({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const reactId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentId = `${reactId}-popover`;
  // Memoize so Root re-renders don't hand consumers a fresh context object
  // every time - Trigger/Content would otherwise re-render needlessly and any
  // effect keyed on the context value would re-run each render (matching the
  // fix already applied to Menu/Dialog). triggerRef is stable.
  const value = useMemo<PopoverContextValue>(
    () => ({ open, setOpen, contentId, triggerRef }),
    [open, setOpen, contentId],
  );
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export interface PopoverTriggerProps {
  children: ReactElement<{
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    'aria-expanded'?: boolean;
    'aria-controls'?: string | undefined;
    'aria-haspopup'?: string;
    ref?: React.Ref<HTMLElement>;
  }>;
}
function Trigger({ children }: PopoverTriggerProps): ReactElement {
  const ctx = usePopoverContext('Popover.Trigger');
  if (!isValidElement(children)) throw new Error('Popover.Trigger expects a single React element.');
  const childOnClick = children.props.onClick;
  return cloneElement(children, {
    // Compose the consumer's ref instead of clobbering it.
    ref: mergeRefs(children.props.ref, ctx.triggerRef),
    'aria-expanded': ctx.open,
    // Only reference the content while it exists (open) - a dangling
    // `aria-controls` points at a nonexistent id.
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    'aria-haspopup': 'dialog',
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.setOpen(!ctx.open);
    },
  });
}

export interface PopoverContentProps {
  placement?: Placement;
  offset?: number;
  dismissOnClickOutside?: boolean;
  dismissOnEscape?: boolean;
  /**
   * Fallback timeout (ms) for the exit transition. **Defaults to `0`** -
   * the popover unmounts instantly on close. Set a positive value to keep
   * it mounted with `data-motif-state="exiting"` until a `transitionend`
   * fires, a WAAPI-driven descendant's exit completes, or this timeout
   * expires (whichever comes first). Pair with `exitStyle` on a child
   * `<Box>` to see the animation.
   */
  exitDurationMs?: number;
  style?: CSSProperties;
  children?: ReactNode;
}
function Content({
  placement = 'bottom',
  offset = 8,
  dismissOnClickOutside = true,
  dismissOnEscape = true,
  exitDurationMs = 0,
  style,
  children,
}: PopoverContentProps): ReactElement | null {
  const ctx = usePopoverContext('Popover.Content');
  const dismiss = useCallback(() => ctx.setOpen(false), [ctx]);
  const {
    style: floating,
    placement: side,
    arrow,
    floatingRef,
  } = useFloatingPosition(ctx.triggerRef, ctx.open, placement, offset);
  const anchor = useMemo(() => ({ placement: side, offset: arrow }), [side, arrow]);
  const { shouldRender, phase, elementRef, ExitBoundary } = useExitTransition(
    ctx.open,
    exitDurationMs,
  );
  // Stable merged ref - floating positioning needs the node, and the exit
  // transition reads its `transitionend`. Both target refs are stable.
  const setSurfaceRef = useCallback(
    (node: HTMLDivElement | null) => {
      floatingRef.current = node;
      elementRef.current = node;
    },
    [floatingRef, elementRef],
  );
  // Ignore the trigger: it owns the open/close toggle. Without this a
  // click on the trigger while open dismisses on mousedown and then the
  // trigger's click re-opens, so the popover never closes from its trigger.
  useClickOutside(ctx.open && dismissOnClickOutside, floatingRef, dismiss, ctx.triggerRef);

  // Listen on the document, not the portaled Content div. Popover is
  // non-modal and never moves focus into the content, so focus normally
  // stays on the trigger - a keydown handler bound to the Content subtree
  // never sees the Escape. Tooltip/HoverCard already listen at the document
  // level for the same reason.
  useEffect(() => {
    if (!ctx.open || !dismissOnEscape) return;
    function handle(e: globalThis.KeyboardEvent): void {
      if (e.key === 'Escape') {
        dismiss();
        ctx.triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [ctx.open, dismissOnEscape, dismiss, ctx.triggerRef]);

  if (!shouldRender) return null;
  return (
    <Portal>
      <div
        ref={setSurfaceRef}
        id={ctx.contentId}
        role="dialog"
        data-motif-state={phase === 'exiting' ? 'exiting' : undefined}
        style={{
          ...floating,
          zIndex: 1000,
          ...style,
        }}
      >
        {/* Publish the presence phase so a WAAPI-driven descendant surface
            registers + plays its exit off-thread; the CSS path rides
            `data-motif-state` + `transitionend` on this element. */}
        <ArrowContext.Provider value={anchor}>
          <ExitBoundary>{children}</ExitBoundary>
        </ArrowContext.Provider>
      </div>
    </Portal>
  );
}

export interface PopoverCloseProps {
  children: ReactElement<{ onClick?: (e: MouseEvent<HTMLElement>) => void }>;
}
function Close({ children }: PopoverCloseProps): ReactElement {
  const ctx = usePopoverContext('Popover.Close');
  if (!isValidElement(children)) throw new Error('Popover.Close expects a single React element.');
  const childOnClick = children.props.onClick;
  return cloneElement(children, {
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.setOpen(false);
    },
  });
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export {
  Root as PopoverRoot,
  Trigger as PopoverTrigger,
  Content as PopoverContent,
  Close as PopoverClose,
};
