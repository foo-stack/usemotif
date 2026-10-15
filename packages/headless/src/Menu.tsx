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
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { mergeRefs } from './_compose-refs.js';
import { inDomOrder } from './_dom-order.js';
import { MenuItem, MenuLevelContext, navigateMenu, type MenuLevel } from './_menu-level.js';
import { useClickOutside, useFloatingPosition, type Placement } from './positioning.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Menu - accessible dropdown menu with arrow-key navigation.
 *
 * Roles: trigger has `aria-haspopup="menu"` + `aria-expanded`; the
 * panel has `role="menu"`; each item has `role="menuitem"`. Arrow
 * keys move focus between items, Home / End jump to first / last,
 * Enter / Space activates, Escape closes and returns focus to the
 * trigger.
 *
 * Compose-time API:
 * ```tsx
 * <Menu.Root>
 *   <Menu.Trigger><Button>Actions</Button></Menu.Trigger>
 *   <Menu.Content>
 *     <Menu.Item onSelect={() => save()}>Save</Menu.Item>
 *     <Menu.Item onSelect={() => duplicate()}>Duplicate</Menu.Item>
 *     <Menu.Separator />
 *     <Menu.Item disabled onSelect={() => delete()}>Delete</Menu.Item>
 *   </Menu.Content>
 * </Menu.Root>
 * ```
 *
 * Submenus, checkbox / radio menu items, and section labels are
 * follow-up work (the most common roster ships in v0).
 */

interface MenuContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly contentId: string;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly itemsRef: RefObject<HTMLElement[]>;
  readonly activeIndex: number;
  readonly setActiveIndex: (i: number) => void;
}
const MenuContext = createContext<MenuContextValue | null>(null);
function useMenuContext(component: string): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (ctx === null) throw new Error(`${component} must be inside <Menu.Root>.`);
  return ctx;
}

export interface MenuRootProps {
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
}: MenuRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const reactId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const itemsRef = useRef<HTMLElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset focused item when re-opening.
  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  // Memoize the context value so its identity is stable across renders.
  // An inline object made `ctx` change every render, which (a) re-ran the
  // auto-focus effect in Content on every render - stealing focus back to
  // the first item and defeating Arrow-key navigation - and (b) forced
  // needless re-renders of every consumer.
  const value = useMemo<MenuContextValue>(
    () => ({
      open,
      setOpen,
      contentId: `${reactId}-menu`,
      triggerRef,
      itemsRef,
      activeIndex,
      setActiveIndex,
    }),
    [open, setOpen, reactId, activeIndex],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export interface MenuTriggerProps {
  children: ReactElement<{
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: string;
    'aria-controls'?: string | undefined;
    ref?: React.Ref<HTMLElement>;
  }>;
}
function Trigger({ children }: MenuTriggerProps): ReactElement {
  const ctx = useMenuContext('Menu.Trigger');
  if (!isValidElement(children)) throw new Error('Menu.Trigger expects a single element.');
  const childOnClick = children.props.onClick;
  const childOnKeyDown = children.props.onKeyDown;
  return cloneElement(children, {
    // Compose the consumer's ref rather than replacing it.
    ref: mergeRefs(children.props.ref, ctx.triggerRef),
    'aria-expanded': ctx.open,
    'aria-haspopup': 'menu',
    // Only reference the menu while it's mounted (open).
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.setOpen(!ctx.open);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      childOnKeyDown?.(e);
      if (!ctx.open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        ctx.setOpen(true);
      }
    },
  });
}

export interface MenuContentProps {
  placement?: Placement;
  offset?: number;
  style?: CSSProperties;
  children?: ReactNode;
}
function Content({
  placement = 'bottom',
  offset = 8,
  style,
  children,
}: MenuContentProps): ReactElement | null {
  const ctx = useMenuContext('Menu.Content');
  const dismiss = useCallback(() => {
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  }, [ctx]);
  const { style: floating, floatingRef } = useFloatingPosition(
    ctx.triggerRef,
    ctx.open,
    placement,
    offset,
  );
  // Route click-outside through `dismiss` (not a bare setOpen) so focus
  // returns to the trigger on close, matching Escape and the WAI-ARIA menu
  // pattern. useClickOutside fires on mousedown - before the browser's
  // default focus action - so clicking a focusable element still wins (it
  // re-focuses after), while clicking empty space rescues focus from being
  // lost to <body>.
  // Ignore the trigger so it can toggle the menu closed: otherwise the
  // mousedown dismiss races the trigger's click toggle and the menu reopens.
  // Open submenus are portalled outside this panel, so clicks in them are
  // not outside the menu either.
  const panels = useRef(new Set<HTMLElement>());
  const ignore = useMemo(
    () => [ctx.triggerRef, (target: Node) => [...panels.current].some((p) => p.contains(target))],
    [ctx.triggerRef],
  );
  useClickOutside(ctx.open, floatingRef, dismiss, ignore);
  const [openSub, setOpenSub] = useState<string | null>(null);
  useEffect(() => {
    if (!ctx.open) setOpenSub(null);
  }, [ctx.open]);
  const level = useMemo<MenuLevel>(
    () => ({
      itemsRef: ctx.itemsRef,
      activeIndex: ctx.activeIndex,
      setActiveIndex: ctx.setActiveIndex,
      closeTree: dismiss,
      openSub,
      setOpenSub,
      panels,
    }),
    [ctx.itemsRef, ctx.activeIndex, ctx.setActiveIndex, dismiss, openSub],
  );

  // Auto-focus the first enabled item on open. Destructure the stable
  // members (itemsRef is a ref, setActiveIndex is a state setter) so the
  // effect re-runs only when `open` flips - depending on the whole `ctx`
  // re-ran this on every render and kept yanking focus to the first item,
  // breaking Arrow-key navigation.
  const { open: ctxOpen, itemsRef: ctxItemsRef, setActiveIndex: ctxSetActiveIndex } = ctx;
  useEffect(() => {
    if (!ctxOpen) return;
    const firstEl = inDomOrder(ctxItemsRef.current).find(
      (el) => el.getAttribute('aria-disabled') !== 'true',
    );
    if (firstEl !== undefined) {
      ctxSetActiveIndex(ctxItemsRef.current.indexOf(firstEl));
      firstEl.focus();
    } else {
      // Every item is disabled - focus the menu container itself so its
      // onKeyDown still receives Escape (otherwise an all-disabled menu has
      // no key target and can't be closed with the keyboard).
      floatingRef.current?.focus();
    }
  }, [ctxOpen, ctxItemsRef, ctxSetActiveIndex, floatingRef]);

  if (!ctx.open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    // Escape (and dismissal) must work even when every item is disabled.
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
            ...floating,
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

export type { MenuItemProps } from './_menu-level.js';

function Separator({ style }: { style?: CSSProperties }): ReactElement {
  return (
    <div
      role="separator"
      style={{ height: 1, background: 'currentColor', opacity: 0.15, ...style }}
    />
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export {
  Root as MenuRoot,
  Trigger as MenuTrigger,
  Content as MenuContent,
  MenuItem,
  Separator as MenuSeparator,
};
