'use client';

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { mergeRefs } from './_compose-refs.js';
import { inDomOrder } from './_dom-order.js';

/**
 * One list of menu items: a Menu's or ContextMenu's Content, or a submenu.
 * Items, submenu triggers and submenus read it, which is what lets the same
 * parts serve both menus at any depth.
 */
export interface MenuLevel {
  readonly itemsRef: RefObject<HTMLElement[]>;
  readonly activeIndex: number;
  readonly setActiveIndex: (index: number) => void;
  /** Closes the whole menu, submenus included, and restores focus. */
  readonly closeTree: () => void;
  /** The id of the submenu open at this level, if any. */
  readonly openSub: string | null;
  readonly setOpenSub: (id: string | null) => void;
  /** Every open submenu panel in the tree, so the root's outside-click check skips them. */
  readonly panels: RefObject<Set<HTMLElement>>;
}

export const MenuLevelContext = createContext<MenuLevel | null>(null);

export function useMenuLevel(part: string): MenuLevel {
  const level = useContext(MenuLevelContext);
  if (level === null) {
    throw new Error(`${part} must be inside Menu.Content or ContextMenu.Content.`);
  }
  return level;
}

function enabledItems(level: Pick<MenuLevel, 'itemsRef'>): { el: HTMLElement; i: number }[] {
  return inDomOrder(level.itemsRef.current)
    .map((el) => ({ el, i: level.itemsRef.current.indexOf(el) }))
    .filter((it) => it.el.getAttribute('aria-disabled') !== 'true');
}

/** Focuses the level's first enabled item, or `fallback` when every item is disabled. */
export function focusFirstItem(
  level: Pick<MenuLevel, 'itemsRef' | 'setActiveIndex'>,
  fallback: HTMLElement | null,
): void {
  const first = enabledItems(level)[0];
  if (first === undefined) {
    // Focus the panel itself so its onKeyDown still receives Escape.
    fallback?.focus();
    return;
  }
  level.setActiveIndex(first.i);
  first.el.focus();
}

/**
 * Arrow, Home and End over the level's enabled items, in DOM order so it
 * follows visual order even for conditionally rendered items. Moving closes
 * any submenu open at this level. Returns whether it handled the key.
 */
export function navigateMenu(e: KeyboardEvent<HTMLElement>, level: MenuLevel): boolean {
  const enabled = enabledItems(level);
  if (enabled.length === 0) return false;
  const current = enabled.findIndex((it) => it.i === level.activeIndex);
  let next: { el: HTMLElement; i: number } | undefined;
  switch (e.key) {
    case 'ArrowDown':
      next = enabled[(current + 1) % enabled.length];
      break;
    case 'ArrowUp':
      next = enabled[(current - 1 + enabled.length) % enabled.length];
      break;
    case 'Home':
      next = enabled[0];
      break;
    case 'End':
      next = enabled[enabled.length - 1];
      break;
    default:
      return false;
  }
  e.preventDefault();
  if (next !== undefined) {
    level.setActiveIndex(next.i);
    next.el.focus();
  }
  level.setOpenSub(null);
  return true;
}

/** Registers `ref`'s element as an item of `level` for as long as it is mounted. */
export function useMenuItemRegistration(
  level: MenuLevel,
  ref: RefObject<HTMLElement | null>,
): void {
  // Keyed on the stable itemsRef so it registers once rather than splicing
  // the item out and back in on every render.
  const { itemsRef } = level;
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const items = itemsRef.current;
    if (!items.includes(el)) items.push(el);
    return () => {
      const idx = items.indexOf(el);
      if (idx !== -1) items.splice(idx, 1);
    };
  }, [itemsRef, ref]);
}

export interface MenuItemChildProps {
  ref?: React.Ref<HTMLElement>;
  role?: string;
  tabIndex?: number;
  'aria-disabled'?: boolean | undefined;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  style?: CSSProperties;
}

/**
 * Renders `itemProps` on a `<div>`, or onto the single child when `asChild` is
 * set. Styles layer as base, then the child's own, then the `style` prop.
 */
export function renderMenuItem(
  ref: RefObject<HTMLElement | null>,
  itemProps: Omit<MenuItemChildProps, 'ref' | 'style'> & Record<string, unknown>,
  base: CSSProperties,
  style: CSSProperties | undefined,
  children: ReactNode,
  asChild: boolean,
): ReactElement {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<MenuItemChildProps>;
    return cloneElement(child, {
      ...itemProps,
      ref: mergeRefs(child.props.ref, ref),
      style: { ...base, ...child.props.style, ...style },
    });
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} {...itemProps} style={{ ...base, ...style }}>
      {children}
    </div>
  );
}

export interface MenuItemProps {
  onSelect?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  /** Inline style passed straight through. */
  style?: CSSProperties;
  /** Project the menu-item semantics onto a provided element instead of the
   * default `<div>` (so a styled wrapper can be the focusable item). */
  asChild?: boolean;
}

/** A menu item, shared by Menu, ContextMenu and their submenus. */
export function MenuItem({
  onSelect,
  disabled = false,
  children,
  style,
  asChild = false,
}: MenuItemProps): ReactElement {
  const level = useMenuLevel('A menu item');
  const ref = useRef<HTMLElement | null>(null);
  useMenuItemRegistration(level, ref);

  function activate(): void {
    if (disabled) return;
    onSelect?.();
    level.closeTree();
  }

  const itemProps = {
    role: 'menuitem',
    tabIndex: -1,
    'aria-disabled': disabled || undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      activate();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    },
    // Pointing at a plain item closes a sibling submenu.
    onMouseEnter: () => level.setOpenSub(null),
  };
  const base: CSSProperties = { cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none' };
  return renderMenuItem(ref, itemProps, base, style, children, asChild);
}
