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
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { inDomOrder } from './_dom-order.js';
import { MenuItem, MenuLevelContext, navigateMenu, type MenuLevel } from './_menu-level.js';
import { useClickOutside } from './positioning.js';
import { MenuSeparator } from './Menu.js';

/**
 * ContextMenu - Menu opened by right-click (or long-press, in
 * future). Same a11y model as Menu (role="menu" + role="menuitem"
 * + arrow-key nav), but the trigger is a region rather than a
 * button, and the menu opens at the pointer coordinates.
 *
 * ```tsx
 * <ContextMenu.Root>
 *   <ContextMenu.Trigger>
 *     <Box>Right-click me</Box>
 *   </ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item onSelect={cut}>Cut</ContextMenu.Item>
 *     <ContextMenu.Item onSelect={copy}>Copy</ContextMenu.Item>
 *     <ContextMenu.Item onSelect={paste}>Paste</ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu.Root>
 * ```
 */

interface ContextMenuContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly contentId: string;
  readonly position: { x: number; y: number };
  readonly setPosition: (p: { x: number; y: number }) => void;
}
const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);
function useContextMenuContext(component: string): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (ctx === null) throw new Error(`${component} must be inside <ContextMenu.Root>.`);
  return ctx;
}

export interface ContextMenuRootProps {
  children?: ReactNode;
}
function Root({ children }: ContextMenuRootProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const reactId = useId();
  // Memoized so consumers don't re-render on every provider render (parity
  // with Menu/Dialog/Popover). setOpen/setPosition are stable useState setters.
  const value = useMemo(
    () => ({ open, setOpen, contentId: `${reactId}-contextmenu`, position, setPosition }),
    [open, position, reactId],
  );
  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
}

export interface ContextMenuTriggerProps {
  children: ReactElement<{
    onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
    onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove?: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp?: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel?: (e: PointerEvent<HTMLElement>) => void;
    onClick?: (e: MouseEvent<HTMLElement>) => void;
  }>;
  /** How long a touch must be held to open the menu, in ms. Defaults to 500,
   * React Native's long-press delay. */
  longPressDelay?: number;
}

/** How far a held touch may drift, in px, before it counts as a scroll. */
const LONG_PRESS_TOLERANCE = 10;

function Trigger({ children, longPressDelay = 500 }: ContextMenuTriggerProps): ReactElement {
  const ctx = useContextMenuContext('ContextMenu.Trigger');
  const pressRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  // A long-press can be followed by a click on release; swallow that one so
  // opening the menu does not also activate what the trigger wraps.
  const swallowClickRef = useRef(false);
  const cancelPress = useCallback(() => {
    if (pressRef.current !== null) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }, []);
  useEffect(() => cancelPress, [cancelPress]);

  if (!isValidElement(children)) throw new Error('ContextMenu.Trigger expects a single element.');
  const props = children.props;
  // Content is portaled to <body> as position:absolute, so store document
  // coordinates: clientX/Y are viewport-relative, and without the scroll
  // offset the menu lands `scrollY` px above the pointer on a scrolled page.
  const openAt = (clientX: number, clientY: number): void => {
    ctx.setPosition({ x: clientX + window.scrollX, y: clientY + window.scrollY });
    ctx.setOpen(true);
  };
  const endPress = (
    e: PointerEvent<HTMLElement>,
    own: ((e: PointerEvent<HTMLElement>) => void) | undefined,
  ): void => {
    own?.(e);
    cancelPress();
  };

  return cloneElement(children, {
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      props.onContextMenu?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      openAt(e.clientX, e.clientY);
    },
    // Touch screens have no right-click; a held touch opens the menu instead.
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      props.onPointerDown?.(e);
      swallowClickRef.current = false;
      if (e.pointerType !== 'touch' || e.defaultPrevented) return;
      cancelPress();
      const { clientX, clientY } = e;
      pressRef.current = {
        x: clientX,
        y: clientY,
        timer: setTimeout(() => {
          pressRef.current = null;
          swallowClickRef.current = true;
          openAt(clientX, clientY);
        }, longPressDelay),
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      props.onPointerMove?.(e);
      const press = pressRef.current;
      if (press === null) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > LONG_PRESS_TOLERANCE) {
        cancelPress();
      }
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => endPress(e, props.onPointerUp),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => endPress(e, props.onPointerCancel),
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (swallowClickRef.current) {
        swallowClickRef.current = false;
        e.preventDefault();
        return;
      }
      props.onClick?.(e);
    },
  });
}

export interface ContextMenuContentProps {
  style?: CSSProperties;
  children?: ReactNode;
}
function Content({ style, children }: ContextMenuContentProps): ReactElement | null {
  const ctx = useContextMenuContext('ContextMenu.Content');
  const itemsRef = useRef<HTMLElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  // Remember the element focused before the menu opened so focus can return
  // to it on close. A context menu has no single trigger button (it opens
  // wherever the user right-clicks), so the previously-focused element is
  // the correct restore target per the WAI-ARIA menu pattern. Without this,
  // closing the menu (Escape or click-outside) dropped focus to <body>.
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const dismiss = useCallback(() => {
    ctx.setOpen(false);
    restoreFocusRef.current?.focus();
  }, [ctx]);
  // Open submenus are portalled outside this panel, so clicks in them are
  // not outside the menu either.
  const panels = useRef(new Set<HTMLElement>());
  const ignore = useMemo(
    () => (target: Node) => [...panels.current].some((p) => p.contains(target)),
    [],
  );
  useClickOutside(ctx.open, floatingRef, dismiss, ignore);
  const [openSub, setOpenSub] = useState<string | null>(null);
  useEffect(() => {
    if (!ctx.open) setOpenSub(null);
  }, [ctx.open]);
  // Memoized (above the early-return so the hook order is stable) so item
  // consumers don't re-render on every Content render.
  const level = useMemo<MenuLevel>(
    () => ({
      itemsRef,
      activeIndex,
      setActiveIndex,
      closeTree: dismiss,
      openSub,
      setOpenSub,
      panels,
    }),
    [activeIndex, dismiss, openSub],
  );

  // Auto-focus first item on open (after capturing the prior focus owner).
  useEffect(() => {
    if (!ctx.open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const firstEl = inDomOrder(itemsRef.current).find(
      (el) => el.getAttribute('aria-disabled') !== 'true',
    );
    if (firstEl !== undefined) {
      setActiveIndex(itemsRef.current.indexOf(firstEl));
      firstEl.focus();
    } else {
      // All items disabled - focus the menu container so Escape still closes.
      floatingRef.current?.focus();
    }
  }, [ctx.open]);

  if (!ctx.open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    // Escape works even with every item disabled.
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
      return;
    }
    navigateMenu(e, level);
  }

  return (
    <Portal>
      <MenuLevelContext.Provider value={level}>
        <div
          ref={floatingRef}
          id={ctx.contentId}
          role="menu"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={{
            position: 'absolute',
            top: ctx.position.y,
            left: ctx.position.x,
            zIndex: 1000,
            ...style,
          }}
        >
          {children}
        </div>
      </MenuLevelContext.Provider>
    </Portal>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export { Root as ContextMenuRoot, Trigger as ContextMenuTrigger, Content as ContextMenuContent };

export const ContextMenuItem = MenuItem;

export const ContextMenuSeparator = MenuSeparator;
