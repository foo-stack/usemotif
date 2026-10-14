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
} from 'react';
import { mergeRefs } from './_compose-refs.js';
import { useFloatingPosition, type Placement } from './positioning.js';
import { ArrowContext } from './_arrow.js';

/**
 * HoverCard - Tooltip-shaped, but for interactive content. Opens
 * on hover or focus like Tooltip; **unlike** Tooltip, the content
 * can hold links, buttons, anything tabbable. The hover-bridge
 * grace period lets users move from trigger to content without
 * the card disappearing.
 *
 * Best for: profile previews on a user mention, link previews,
 * "more info" cards. Don't use for critical actions - keyboard /
 * touch users can't trigger hover.
 *
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger><a href="/u/jane">@jane</a></HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <Profile id="jane" />
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */

interface HoverCardContextValue {
  readonly open: boolean;
  readonly contentId: string;
  readonly triggerRef: React.RefObject<HTMLElement | null>;
  readonly handlers: {
    readonly onTriggerEnter: () => void;
    readonly onTriggerLeave: () => void;
    readonly onContentEnter: () => void;
    readonly onContentLeave: () => void;
  };
  readonly placement: Placement;
}
const HoverCardContext = createContext<HoverCardContextValue | null>(null);
function useHoverCardContext(component: string): HoverCardContextValue {
  const ctx = useContext(HoverCardContext);
  if (ctx === null) throw new Error(`${component} must be inside <HoverCard.Root>.`);
  return ctx;
}

export interface HoverCardRootProps {
  /** Open delay in ms. Defaults to 700 (longer than Tooltip - hover
   * cards open less aggressively). */
  openDelay?: number;
  /** Close delay in ms. Defaults to 300. */
  closeDelay?: number;
  placement?: Placement;
  children?: ReactNode;
}
function Root({
  openDelay = 700,
  closeDelay = 300,
  placement = 'bottom',
  children,
}: HoverCardRootProps): ReactElement {
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);
  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), openDelay);
  }, [openDelay, clearTimers]);
  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);
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

  // Memoized so consumers don't re-render on every provider render (parity
  // with Menu/Dialog/Popover). The handlers are useCallback-stable.
  const value = useMemo(
    () => ({
      open,
      contentId: `${reactId}-hovercard`,
      triggerRef,
      placement,
      handlers: {
        onTriggerEnter: scheduleOpen,
        onTriggerLeave: scheduleClose,
        onContentEnter: clearTimers,
        onContentLeave: scheduleClose,
      },
    }),
    [open, reactId, triggerRef, placement, scheduleOpen, scheduleClose, clearTimers],
  );

  return <HoverCardContext.Provider value={value}>{children}</HoverCardContext.Provider>;
}

export interface HoverCardTriggerProps {
  children: ReactElement<{
    onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
    onFocus?: (e: FocusEvent<HTMLElement>) => void;
    onBlur?: (e: FocusEvent<HTMLElement>) => void;
    ref?: React.Ref<HTMLElement>;
    'aria-haspopup'?: string | undefined;
    'aria-expanded'?: boolean | undefined;
    'aria-controls'?: string | undefined;
  }>;
}
function Trigger({ children }: HoverCardTriggerProps): ReactElement {
  const ctx = useHoverCardContext('HoverCard.Trigger');
  if (!isValidElement(children)) throw new Error('HoverCard.Trigger expects a single element.');
  const { onMouseEnter, onMouseLeave, onFocus, onBlur } = children.props;
  return cloneElement(children, {
    ref: mergeRefs(children.props.ref, ctx.triggerRef),
    // Associate the trigger with the card so AT exposes the relationship.
    // aria-controls only references the content while it's mounted (a
    // reference to a non-existent id is an ARIA error).
    'aria-haspopup': 'dialog',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
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

export interface HoverCardContentProps {
  offset?: number;
  style?: CSSProperties;
  /** Accessible name for the card. The content is a non-modal
   * `role="dialog"`; pass a label so screen readers announce it. */
  'aria-label'?: string;
  children?: ReactNode;
}
function Content({
  offset = 8,
  style,
  'aria-label': ariaLabel,
  children,
}: HoverCardContentProps): ReactElement | null {
  const ctx = useHoverCardContext('HoverCard.Content');
  const {
    position,
    placement: side,
    arrow,
    floatingRef,
  } = useFloatingPosition(ctx.triggerRef, ctx.open, ctx.placement, offset);
  const anchor = useMemo(() => ({ placement: side, offset: arrow }), [side, arrow]);
  if (!ctx.open) return null;
  return (
    <Portal>
      <div
        ref={floatingRef}
        id={ctx.contentId}
        // Interactive supplementary content → non-modal dialog (unlike a
        // Tooltip, which may not contain focusable content).
        role="dialog"
        aria-label={ariaLabel}
        onMouseEnter={ctx.handlers.onContentEnter}
        onMouseLeave={ctx.handlers.onContentLeave}
        // Focus-within keepalive: a keyboard user whose focus moves into the
        // card (it holds interactive content) must not have it closed by the
        // trigger's blur. `onFocus`/`onBlur` bubble from descendants, so
        // entering cancels the pending close and leaving reschedules it -
        // mirroring the mouse keepalive above.
        onFocus={ctx.handlers.onContentEnter}
        onBlur={ctx.handlers.onContentLeave}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          ...style,
        }}
      >
        <ArrowContext.Provider value={anchor}>{children}</ArrowContext.Provider>
      </div>
    </Portal>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export { Root as HoverCardRoot, Trigger as HoverCardTrigger, Content as HoverCardContent };
