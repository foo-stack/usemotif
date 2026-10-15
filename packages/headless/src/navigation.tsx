'use client';

import { Portal } from '@usemotif/react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { mergeRefs } from './_compose-refs.js';

/**
 * Tracks the set of currently-open submenu levels for one NavigationMenu tree
 * so that a single Escape collapses only the innermost open submenu (the
 * WAI-ARIA menu pattern), instead of every open level firing its own
 * `window` keydown listener at once. Each open submenu registers its level;
 * the deepest registered level owns the next Escape.
 */
interface SubmenuLevelRegistry {
  readonly open: Set<number>;
}
const SubmenuLevelContext = createContext<SubmenuLevelRegistry | null>(null);

function SubmenuLevelProvider({ children }: { children: ReactNode }): ReactElement {
  // One mutable Set per menu tree, held in a ref so registration is O(1) and
  // doesn't trigger re-renders. Read live at Escape time.
  const registryRef = useRef<SubmenuLevelRegistry | null>(null);
  registryRef.current ??= { open: new Set<number>() };
  const registry = useMemo(() => registryRef.current!, []);
  return <SubmenuLevelContext.Provider value={registry}>{children}</SubmenuLevelContext.Provider>;
}
import { useFloatingPosition } from './positioning.js';
import { pageWindow } from './_page-window.js';
import { activeStepIndex, canSelectStep } from './_steps.js';

/**
 * Navigation family - Pagination, Breadcrumb, Stepper,
 * NavigationMenu, Toolbar.
 *
 * Each is small but well-typed: ARIA roles and keyboard nav where
 * relevant. NavigationMenu accepts either a flat `children` set
 * (single-level horizontal nav) or a recursive `items` tree
 * (multi-level nav with hover / focus / arrow-key submenu activation).
 */

// ─────────── Pagination ───────────────────────────────────────────

export interface PaginationProps {
  page: number;
  total: number;
  /** Optional callback. Pagination is controlled-only. */
  onPageChange?: (next: number) => void;
  /** Number of sibling pages to show on each side of the current page. */
  siblings?: number;
  /** Render fn for each page button. */
  renderItem: (info: {
    type: 'page' | 'previous' | 'next' | 'ellipsis';
    page?: number;
    disabled: boolean;
    selected: boolean;
    onClick: () => void;
  }) => ReactElement;
  'aria-label'?: string;
  style?: CSSProperties;
}

export function Pagination({
  page,
  total,
  onPageChange,
  siblings = 1,
  renderItem,
  style,
  ...aria
}: PaginationProps): ReactElement {
  const goto = useCallback(
    (n: number) => onPageChange?.(Math.max(1, Math.min(total, n))),
    [onPageChange, total],
  );
  const window = pageWindow(page, total, siblings);
  return (
    <nav aria-label={aria['aria-label'] ?? 'Pagination'} style={style}>
      {renderItem({
        type: 'previous',
        disabled: page <= 1,
        selected: false,
        onClick: () => goto(page - 1),
      })}
      {window.map((w, i) =>
        w === 'ellipsis' ? (
          <span key={`e-${i}`}>
            {renderItem({ type: 'ellipsis', disabled: true, selected: false, onClick: () => {} })}
          </span>
        ) : (
          <span key={w}>
            {renderItem({
              type: 'page',
              page: w,
              disabled: false,
              selected: page === w,
              onClick: () => goto(w),
            })}
          </span>
        ),
      )}
      {renderItem({
        type: 'next',
        disabled: page >= total,
        selected: false,
        onClick: () => goto(page + 1),
      })}
    </nav>
  );
}

// ─────────── Breadcrumb ───────────────────────────────────────────

export interface BreadcrumbProps {
  /** A11y label for the nav landmark. Defaults to `'Breadcrumb'`. */
  'aria-label'?: string;
  /** Visual separator between items. */
  separator?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}
export function Breadcrumb({
  'aria-label': label = 'Breadcrumb',
  separator = '/',
  children,
  style,
}: BreadcrumbProps): ReactElement {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <nav aria-label={label} style={style}>
      <ol style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} aria-current={isLast ? 'page' : undefined}>
              {item}
              {!isLast ? <span aria-hidden="true">{separator}</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─────────── Stepper ──────────────────────────────────────────────

export interface StepperStep {
  readonly id: string;
  readonly label: ReactNode;
  readonly status?: 'pending' | 'active' | 'complete' | 'error';
}
export interface StepperProps {
  steps: ReadonlyArray<StepperStep>;
  /** Current active step id (overrides per-step `status === 'active'`). */
  current?: string;
  /** Render fn for each step. */
  renderStep: (info: {
    step: StepperStep;
    index: number;
    status: 'pending' | 'active' | 'complete' | 'error';
    isLast: boolean;
    /** Whether the step can be clicked to, with `onStepChange`. */
    selectable: boolean;
  }) => ReactElement;
  orientation?: 'horizontal' | 'vertical';
  /** Makes the steps buttons that report the id clicked. */
  onStepChange?: (id: string) => void;
  /** With `onStepChange`, allow going back to earlier steps but not skipping
   * ahead: only steps before the active one can be clicked. */
  linear?: boolean;
  style?: CSSProperties;
}

/** Strips a button's own chrome, keeping its focus ring, so a step looks as
 * `renderStep` draws it. */
const STEP_BUTTON: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'inherit',
};

export function Stepper({
  steps,
  current,
  renderStep,
  orientation = 'horizontal',
  onStepChange,
  linear = false,
  style,
}: StepperProps): ReactElement {
  const active = activeStepIndex(steps, current);
  return (
    <ol
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        ...style,
      }}
    >
      {steps.map((step, i) => {
        const status: StepperStep['status'] =
          current === step.id ? 'active' : (step.status ?? 'pending');
        const selectable = onStepChange !== undefined && canSelectStep(i, active, linear);
        const content = renderStep({
          step,
          index: i,
          status: status ?? 'pending',
          isLast: i === steps.length - 1,
          selectable,
        });
        return (
          <li key={step.id} aria-current={status === 'active' ? 'step' : undefined}>
            {onStepChange === undefined ? (
              content
            ) : (
              <button
                type="button"
                disabled={!selectable}
                onClick={() => onStepChange(step.id)}
                style={{ ...STEP_BUTTON, cursor: selectable ? 'pointer' : 'default' }}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─────────── NavigationMenu ───────────────────────────────────────

/**
 * Recursive item shape for the multi-level NavigationMenu mode.
 * Items with `children` render as buttons that open a submenu;
 * leaf items render as anchors when `href` is set, otherwise as
 * buttons. The `render` slot lets callers swap out either form.
 */
export interface NavigationMenuItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly href?: string;
  readonly disabled?: boolean;
  readonly children?: ReadonlyArray<NavigationMenuItem>;
  /** Custom render override. Receives the computed item state. */
  readonly render?: (info: {
    readonly label: ReactNode;
    readonly isOpen: boolean;
    readonly isCurrent: boolean;
    readonly hasChildren: boolean;
    readonly toggleOpen: () => void;
  }) => ReactNode;
}

/**
 * NavigationMenu - top-level horizontal nav.
 *
 * **Flat mode** (default): pass `children` for a single-level
 * horizontal list of links / buttons.
 *
 * **Tree mode**: pass `items={[...]}` for a recursive structure
 * with submenus. Items with `children` open a popover on hover or
 * keyboard activation; ArrowRight opens a focused submenu, ArrowLeft
 * closes it. Submenus are positioned via `useFloatingPosition`.
 */
export interface NavigationMenuProps {
  /** A11y label. */
  'aria-label'?: string;
  /** id of the active item, applied via `aria-current="page"`. */
  current?: string;
  /** Recursive item tree - when provided, renders the multi-level mode. */
  items?: ReadonlyArray<NavigationMenuItem>;
  /** Flat-mode children (legacy / single-level). Ignored when `items` is set. */
  children?: ReactNode;
  style?: CSSProperties;
}
export function NavigationMenu({
  'aria-label': label = 'Primary',
  current,
  items,
  children,
  style,
}: NavigationMenuProps): ReactElement {
  if (items !== undefined) {
    return (
      <nav aria-label={label} style={style}>
        <SubmenuLevelProvider>
          <NavigationMenuList items={items} current={current} level={0} />
        </SubmenuLevelProvider>
      </nav>
    );
  }
  return (
    <nav aria-label={label} style={style}>
      <ul style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0 }}>
        {Children.toArray(children).map((child, i) => {
          if (!isValidElement(child)) return null;
          const id = (child.props as { id?: string }).id;
          const isCurrent = id !== undefined && id === current;
          return (
            <li key={i} aria-current={isCurrent ? 'page' : undefined}>
              {child}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavigationMenuList({
  items,
  current,
  level,
  onCloseParent,
}: {
  items: ReadonlyArray<NavigationMenuItem>;
  current: string | undefined;
  level: number;
  /** Close the submenu containing this list and focus its parent trigger.
   * Provided only for submenu lists (level > 0); lets ArrowLeft/Escape on
   * any item - including leaves - collapse a level. */
  onCloseParent?: (() => void) | undefined;
}): ReactElement {
  // Submenus (level > 0) are vertical `menu`s with roving focus: exactly
  // one item is in the tab sequence and Up/Down move between siblings. The
  // top-level `menubar` keeps every item tabbable because its Left/Right
  // arrows are reserved for opening/closing submenus (disclosure model).
  const isMenu = level > 0;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // Single-open coordination: at most one submenu in this list is open at a
  // time. Lifting the open flag out of the node lets opening one item (via
  // hover or click) close its siblings, instead of leaving a trail of open
  // submenus across the menubar.
  const [openId, setOpenId] = useState<string | null>(null);
  const focusItem = useCallback(
    (i: number) => {
      const n = items.length;
      if (n === 0) return;
      // Home/End pass ±Infinity → first/last (no wrap); Up/Down wrap.
      const clamped = !Number.isFinite(i) ? (i < 0 ? 0 : n - 1) : ((i % n) + n) % n;
      setFocusedIndex(clamped);
      itemRefs.current[clamped]?.focus();
    },
    [items.length],
  );

  return (
    <ul
      role={level === 0 ? 'menubar' : 'menu'}
      style={{ display: level === 0 ? 'flex' : 'block', listStyle: 'none', margin: 0, padding: 0 }}
    >
      {items.map((item, index) => (
        <NavigationMenuNode
          key={item.id}
          item={item}
          current={current}
          level={level}
          tabbable={isMenu ? index === focusedIndex : true}
          rove={isMenu ? (dir) => focusItem(focusedIndex + dir) : undefined}
          onFocusSelf={isMenu ? () => setFocusedIndex(index) : undefined}
          onCloseParent={onCloseParent}
          open={openId === item.id}
          setOpen={(next) =>
            setOpenId((cur) => {
              const want = typeof next === 'function' ? next(cur === item.id) : next;
              return want ? item.id : cur === item.id ? null : cur;
            })
          }
          registerRef={
            isMenu
              ? (el) => {
                  itemRefs.current[index] = el;
                }
              : undefined
          }
        />
      ))}
    </ul>
  );
}

function NavigationMenuNode({
  item,
  current,
  level,
  tabbable = true,
  rove,
  onFocusSelf,
  onCloseParent,
  open,
  setOpen,
  registerRef,
}: {
  item: NavigationMenuItem;
  current: string | undefined;
  level: number;
  /** Whether this item is in the tab sequence (roving tabindex). */
  tabbable?: boolean | undefined;
  /** Move roving focus by `dir` siblings (submenus only). */
  rove?: ((dir: number) => void) | undefined;
  /** Mark this item as the roving-focused one when it receives focus. */
  onFocusSelf?: (() => void) | undefined;
  /** Collapse to the parent menu: close the containing submenu and focus
   * the parent trigger. Provided for submenu items (level > 0). */
  onCloseParent?: (() => void) | undefined;
  /** Whether this item's submenu is open. Owned by the parent list so only
   * one sibling can be open at once. */
  open: boolean;
  /** Open/close this item's submenu (closes any open sibling). */
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  /** Register the trigger element with the parent list (for roving focus). */
  registerRef?: ((el: HTMLElement | null) => void) | undefined;
}): ReactElement {
  const triggerRef = useRef<HTMLElement | null>(null);
  const isCurrent = item.id === current;
  const hasChildren = item.children !== undefined && item.children.length > 0;

  // Compose the internal trigger ref with the parent list's roving-focus
  // registration so both observe the same element.
  const setTriggerRef = useCallback(
    (el: HTMLElement | null) => {
      triggerRef.current = el;
      registerRef?.(el);
    },
    [registerRef],
  );

  const toggleOpen = useCallback(() => {
    if (!hasChildren || item.disabled === true) return;
    setOpen((prev) => !prev);
  }, [hasChildren, item.disabled, setOpen]);

  // The submenu is rendered through a Portal, so it is NOT a DOM
  // descendant of this <li>. closeOnBlur must treat focus landing inside
  // the portaled submenu as "still within" this node - otherwise moving
  // focus from the trigger into a submenu item blurs the <li>, sees a
  // relatedTarget outside it, and closes the menu before focus can land.
  const submenuRef = useRef<HTMLElement | null>(null);

  // Close when focus leaves both this <li> and its portaled submenu.
  const closeOnBlur = useCallback(
    (e: FocusEvent<HTMLLIElement>) => {
      const related = e.relatedTarget as Node | null;
      if (e.currentTarget.contains(related)) return;
      if (related !== null && submenuRef.current?.contains(related) === true) return;
      setOpen(false);
    },
    [setOpen],
  );

  // Close when the pointer leaves both this <li> and its portaled submenu -
  // hovering across a menubar shouldn't leave a trail of open submenus. The
  // submenu is portaled (not a DOM descendant), so moving the pointer into it
  // must count as "still within", mirroring closeOnBlur.
  const closeOnMouseLeave = useCallback(
    (e: MouseEvent<HTMLLIElement>) => {
      if (!hasChildren) return;
      const related = e.relatedTarget as Node | null;
      if (related !== null && e.currentTarget.contains(related)) return;
      if (related !== null && submenuRef.current?.contains(related) === true) return;
      setOpen(false);
    },
    [hasChildren, setOpen],
  );

  // Keyboard activation on the trigger.
  const onTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (item.disabled === true) return;
      // Vertical sibling navigation inside a submenu (rove is only provided
      // for level > 0). Up/Down are free there - the menubar reserves its
      // horizontal arrows for opening/closing submenus.
      if (rove !== undefined) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          rove(1);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          rove(-1);
          return;
        }
        if (e.key === 'Home') {
          e.preventDefault();
          rove(Number.NEGATIVE_INFINITY);
          return;
        }
        if (e.key === 'End') {
          e.preventDefault();
          rove(Number.POSITIVE_INFINITY);
          return;
        }
      }
      if (hasChildren) {
        if (e.key === 'ArrowRight' || (level === 0 && e.key === 'ArrowDown')) {
          e.preventDefault();
          setOpen(true);
        } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
          if (open) {
            e.preventDefault();
            setOpen(false);
          } else if (onCloseParent !== undefined) {
            // Submenu is already closed → collapse a level to the parent.
            e.preventDefault();
            onCloseParent();
          }
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleOpen();
        }
      } else if ((e.key === 'ArrowLeft' || e.key === 'Escape') && onCloseParent !== undefined) {
        // Leaf item inside a submenu: ArrowLeft/Escape closes the submenu
        // and returns focus to the parent trigger (WAI-ARIA menu pattern).
        // Without this a leaf can't collapse back to its parent level.
        e.preventDefault();
        onCloseParent();
      }
    },
    [hasChildren, level, open, toggleOpen, item.disabled, rove, onCloseParent, setOpen],
  );

  const sharedTriggerProps = {
    role: 'menuitem' as const,
    tabIndex: tabbable ? 0 : -1,
    'aria-current': isCurrent ? ('page' as const) : undefined,
    'aria-haspopup': hasChildren ? ('menu' as const) : undefined,
    'aria-expanded': hasChildren ? open : undefined,
    'aria-disabled': item.disabled === true ? true : undefined,
    onFocus: onFocusSelf,
    onMouseEnter: () => hasChildren && !item.disabled && setOpen(true),
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (item.disabled === true) {
        e.preventDefault();
        return;
      }
      if (hasChildren) {
        e.preventDefault();
        toggleOpen();
      }
    },
    onKeyDown: onTriggerKeyDown,
  };

  let trigger: ReactNode;
  if (item.render !== undefined) {
    const rendered = item.render({
      label: item.label,
      isOpen: open,
      isCurrent,
      hasChildren,
      toggleOpen,
    });
    // Attach the same wiring the built-in triggers get - roving ref +
    // menuitem semantics + handlers - onto the custom element. Without this
    // triggerRef stays null (submenu renders at 0,0) and roving no-ops on
    // this item. Consumer-defined handlers are composed, not dropped.
    if (isValidElement(rendered)) {
      const childProps = (rendered.props ?? {}) as Record<string, unknown> & {
        ref?: React.Ref<HTMLElement>;
      };
      trigger = cloneElement(rendered as ReactElement<Record<string, unknown>>, {
        ...sharedTriggerProps,
        ref: mergeRefs(childProps.ref, setTriggerRef),
        onFocus: (e: FocusEvent<HTMLElement>) => {
          (childProps.onFocus as ((e: FocusEvent<HTMLElement>) => void) | undefined)?.(e);
          sharedTriggerProps.onFocus?.();
        },
        onMouseEnter: (e: MouseEvent<HTMLElement>) => {
          (childProps.onMouseEnter as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(e);
          sharedTriggerProps.onMouseEnter();
        },
        onClick: (e: MouseEvent<HTMLElement>) => {
          (childProps.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(e);
          sharedTriggerProps.onClick(e);
        },
        onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
          (childProps.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(e);
          sharedTriggerProps.onKeyDown(e);
        },
      });
    } else {
      trigger = rendered;
    }
  } else if (item.href !== undefined && !hasChildren) {
    trigger = (
      <a
        ref={setTriggerRef as React.Ref<HTMLAnchorElement>}
        href={item.href}
        {...sharedTriggerProps}
      >
        {item.label}
      </a>
    );
  } else {
    trigger = (
      <button
        ref={setTriggerRef as React.Ref<HTMLButtonElement>}
        type="button"
        {...sharedTriggerProps}
      >
        {item.label}
      </button>
    );
  }

  return (
    // role="none" so the menubar/menu only exposes menuitem-role children;
    // aria-current lives on the trigger (above), not duplicated here.
    <li
      role="none"
      onBlur={closeOnBlur}
      onMouseLeave={closeOnMouseLeave}
      style={{ position: 'relative' }}
    >
      {trigger}
      {hasChildren && open ? (
        <NavigationMenuSubmenu
          items={item.children!}
          current={current}
          level={level + 1}
          anchorRef={triggerRef}
          contentRef={submenuRef}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </li>
  );
}

function NavigationMenuSubmenu({
  items,
  current,
  level,
  anchorRef,
  contentRef,
  onClose,
}: {
  items: ReadonlyArray<NavigationMenuItem>;
  current: string | undefined;
  level: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Mirror of the floating element, exposed to the parent node so its
   * closeOnBlur can recognise focus inside this portaled subtree. */
  contentRef?: React.MutableRefObject<HTMLElement | null>;
  onClose: () => void;
}): ReactElement {
  const { position, floatingRef } = useFloatingPosition(
    anchorRef,
    true,
    level === 1 ? 'bottom' : 'right',
    4,
  );

  // Populate both the positioning hook's ref and the parent's content ref
  // from the single floating element.
  const setFloating = useCallback(
    (el: HTMLDivElement | null) => {
      floatingRef.current = el;
      if (contentRef !== undefined) contentRef.current = el;
    },
    [floatingRef, contentRef],
  );

  // Collapse this submenu and return focus to the parent trigger - the
  // WAI-ARIA menu pattern requires Escape/ArrowLeft to do both. Leaving
  // focus on the now-unmounted item drops it to <body>.
  const closeToParent = useCallback(() => {
    onClose();
    anchorRef.current?.focus();
  }, [onClose, anchorRef]);

  // Register this open submenu's level so only the innermost one handles
  // Escape. Without this, every open level installs its own window listener
  // and a single Escape collapses them all at once (and lands focus on the
  // wrong, outer trigger) - the WAI-ARIA menu pattern is one level per press.
  const levelRegistry = useContext(SubmenuLevelContext);
  useEffect(() => {
    levelRegistry?.open.add(level);
    return () => {
      levelRegistry?.open.delete(level);
    };
  }, [levelRegistry, level]);

  // Close on Escape anywhere inside the submenu - but only when this is the
  // deepest open submenu. The next press then collapses the new innermost.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent): void {
      if (e.key !== 'Escape') return;
      if (levelRegistry !== null) {
        let deepest = -Infinity;
        for (const lvl of levelRegistry.open) if (lvl > deepest) deepest = lvl;
        if (level !== deepest) return;
      }
      closeToParent();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeToParent, levelRegistry, level]);

  return (
    <Portal>
      <div
        ref={setFloating}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1000,
        }}
      >
        <NavigationMenuList
          items={items}
          current={current}
          level={level}
          onCloseParent={closeToParent}
        />
      </div>
    </Portal>
  );
}

// ─────────── Toolbar ──────────────────────────────────────────────

/**
 * Toolbar - `role="toolbar"` with arrow-key roving focus across
 * its children. Each child should be focusable; the toolbar
 * captures Arrow keys and moves focus among them.
 */
export interface ToolbarProps {
  orientation?: 'horizontal' | 'vertical';
  'aria-label'?: string;
  children?: ReactNode;
  style?: CSSProperties;
}
export function Toolbar({
  orientation = 'horizontal',
  'aria-label': label,
  children,
  style,
}: ToolbarProps): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);

  function focusableButtons(): HTMLElement[] {
    if (ref.current === null) return [];
    return Array.from(
      ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
      ),
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    const incKeys = orientation === 'horizontal' ? ['ArrowRight'] : ['ArrowDown'];
    const decKeys = orientation === 'horizontal' ? ['ArrowLeft'] : ['ArrowUp'];
    const buttons = focusableButtons();
    if (buttons.length === 0) return;
    const cur = buttons.indexOf(document.activeElement as HTMLElement);
    if (incKeys.includes(e.key)) {
      e.preventDefault();
      buttons[(cur + 1) % buttons.length]?.focus();
    } else if (decKeys.includes(e.key)) {
      e.preventDefault();
      buttons[(cur - 1 + buttons.length) % buttons.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      buttons[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  }

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-orientation={orientation}
      aria-label={label}
      onKeyDown={onKeyDown}
      style={style}
    >
      {children}
    </div>
  );
}
