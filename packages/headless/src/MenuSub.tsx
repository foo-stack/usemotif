'use client';

import { Portal } from '@usemotif/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  focusFirstItem,
  MenuLevelContext,
  navigateMenu,
  renderMenuItem,
  useMenuItemRegistration,
  useMenuLevel,
  type MenuLevel,
} from './_menu-level.js';
import { useFloatingPosition } from './positioning.js';

/**
 * Submenus, shared by Menu and ContextMenu: `Sub` groups a `SubTrigger`, an
 * item of the surrounding menu, with the `SubContent` it opens beside it.
 *
 * ```tsx
 * <Menu.Sub>
 *   <Menu.SubTrigger>Share</Menu.SubTrigger>
 *   <Menu.SubContent>
 *     <Menu.Item onSelect={email}>Email</Menu.Item>
 *   </Menu.SubContent>
 * </Menu.Sub>
 * ```
 */

interface SubContextValue {
  readonly contentId: string;
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly triggerRef: RefObject<HTMLElement | null>;
  /** The menu level the trigger sits in. */
  readonly parent: MenuLevel;
  /** Set when the keyboard opens the submenu, so its first item takes focus. */
  readonly focusOnOpen: RefObject<boolean>;
  readonly focusRequest: number;
  readonly requestFocus: () => void;
}

const SubContext = createContext<SubContextValue | null>(null);

function useSubContext(part: string): SubContextValue {
  const ctx = useContext(SubContext);
  if (ctx === null) throw new Error(`${part} must be inside Menu.Sub or ContextMenu.Sub.`);
  return ctx;
}

export interface MenuSubProps {
  children?: ReactNode;
}

function Sub({ children }: MenuSubProps): ReactElement {
  const parent = useMenuLevel('Menu.Sub');
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const focusOnOpen = useRef(false);
  const [focusRequest, setFocusRequest] = useState(0);
  // One submenu per level is open at a time, so the level owns which.
  const open = parent.openSub === id;
  const { setOpenSub } = parent;
  const setOpen = useCallback((next: boolean) => setOpenSub(next ? id : null), [setOpenSub, id]);
  const requestFocus = useCallback(() => {
    focusOnOpen.current = true;
    setFocusRequest((n) => n + 1);
  }, []);
  const value = useMemo<SubContextValue>(
    () => ({
      contentId: `${id}-submenu`,
      open,
      setOpen,
      triggerRef,
      parent,
      focusOnOpen,
      focusRequest,
      requestFocus,
    }),
    [id, open, setOpen, parent, focusRequest, requestFocus],
  );
  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
}

export interface MenuSubTriggerProps {
  disabled?: boolean;
  children?: ReactNode;
  /** Inline style passed straight through. */
  style?: CSSProperties;
  /** Project the trigger semantics onto a provided element instead of the
   * default `<div>`. */
  asChild?: boolean;
}

function SubTrigger({
  disabled = false,
  children,
  style,
  asChild = false,
}: MenuSubTriggerProps): ReactElement {
  const sub = useSubContext('Menu.SubTrigger');
  useMenuItemRegistration(sub.parent, sub.triggerRef);

  const itemProps = {
    role: 'menuitem',
    tabIndex: -1,
    'aria-haspopup': 'menu',
    'aria-expanded': sub.open,
    'aria-controls': sub.open ? sub.contentId : undefined,
    'aria-disabled': disabled || undefined,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      if (!disabled) sub.setOpen(true);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (disabled || !['ArrowRight', 'Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      sub.setOpen(true);
      sub.requestFocus();
    },
    onMouseEnter: () => {
      if (!disabled) sub.setOpen(true);
    },
  };
  const base: CSSProperties = { cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none' };
  return renderMenuItem(sub.triggerRef, itemProps, base, style, children, asChild);
}

export interface MenuSubContentProps {
  /** Gap between the trigger and the submenu, in px. Defaults to 0. */
  offset?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

function SubContent({ offset = 0, style, children }: MenuSubContentProps): ReactElement | null {
  const sub = useSubContext('Menu.SubContent');
  const { position, floatingRef } = useFloatingPosition(sub.triggerRef, sub.open, 'right', offset);
  const itemsRef = useRef<HTMLElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openSub, setOpenSub] = useState<string | null>(null);
  useEffect(() => {
    if (sub.open) return;
    setOpenSub(null);
    setActiveIndex(-1);
  }, [sub.open]);

  const { panels, closeTree } = sub.parent;
  const level = useMemo<MenuLevel>(
    () => ({ itemsRef, activeIndex, setActiveIndex, closeTree, openSub, setOpenSub, panels }),
    [activeIndex, closeTree, openSub, panels],
  );

  useEffect(() => {
    const el = floatingRef.current;
    if (!sub.open || el === null) return;
    const set = panels.current;
    set.add(el);
    return () => {
      set.delete(el);
    };
  }, [sub.open, panels, floatingRef]);

  const { focusOnOpen } = sub;
  useEffect(() => {
    if (!sub.open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    focusFirstItem({ itemsRef, setActiveIndex }, floatingRef.current);
  }, [sub.open, sub.focusRequest, focusOnOpen, floatingRef]);

  if (!sub.open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    // The panel is portalled, but React still bubbles its events through the
    // parent menu; keep them here so they only ever move this level.
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === 'ArrowLeft') {
      e.preventDefault();
      sub.setOpen(false);
      const trigger = sub.triggerRef.current;
      if (trigger !== null) {
        sub.parent.setActiveIndex(sub.parent.itemsRef.current.indexOf(trigger));
        trigger.focus();
      }
      return;
    }
    navigateMenu(e, level);
  }

  return (
    <Portal>
      <MenuLevelContext.Provider value={level}>
        <div
          ref={floatingRef}
          id={sub.contentId}
          role="menu"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
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
 * Parts exported flat so `src/index.ts` can assemble the Menu and ContextMenu
 * namespaces in the server graph. Internal: the barrel does not list these.
 */
export { Sub as MenuSub, SubTrigger as MenuSubTrigger, SubContent as MenuSubContent };
