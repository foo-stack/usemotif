import {
  Children,
  isValidElement,
  useCallback,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import { nativeText } from './_native-text.js';
import { pageForSize, pageWindow } from './_page-window.js';
import { activeStepIndex, canSelectStep } from './_steps.js';

/**
 * Native navigation family - Pagination / Breadcrumb / Stepper /
 * NavigationMenu / Toolbar.
 *
 * The web variants render `<nav>` / `<ol>` / `<li>` / button; the
 * native variants use `<View>` / `<Pressable>` with the appropriate
 * `accessibilityRole`. Behaviour and prop shapes mirror the web
 * exports so cross-platform code typechecks.
 *
 * NavigationMenu's tree mode opens submenus inside an RN `<Modal>`
 * (no Portal needed on RN - the modal layer is already the
 * platform's overlay root).
 */

// ─────────── Pagination ───────────────────────────────────────────

export interface PaginationProps {
  page: number;
  total: number;
  onPageChange?: (next: number) => void;
  siblings?: number;
  /** Pages always shown at each end of the range. Defaults to 1. */
  boundaries?: number;
  /** Items per page. The page-size part renders only when this is set. */
  pageSize?: number;
  /** The sizes the page-size part offers. */
  pageSizeOptions?: readonly number[];
  /**
   * Called with the chosen size and the page that keeps the first item of the
   * current page in view. Update both, and recompute `total`, from here.
   */
  onPageSizeChange?: (size: number, page: number) => void;
  /** Renders the page-size part, after the next button. */
  renderPageSize?: (info: {
    pageSize: number;
    options: readonly number[];
    onChange: (size: number) => void;
  }) => ReactElement;
  renderItem: (info: {
    type: 'page' | 'previous' | 'next' | 'ellipsis';
    page?: number;
    disabled: boolean;
    selected: boolean;
    onClick: () => void;
  }) => ReactElement;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Pagination({
  page,
  total,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  renderPageSize,
  renderItem,
  accessibilityLabel,
  style,
}: PaginationProps): ReactElement {
  const goto = useCallback(
    (n: number) => onPageChange?.(Math.max(1, Math.min(total, n))),
    [onPageChange, total],
  );
  const win = pageWindow(page, total, siblings, boundaries);
  const sizePart =
    pageSize !== undefined && renderPageSize !== undefined
      ? renderPageSize({
          pageSize,
          options: pageSizeOptions ?? [pageSize],
          onChange: (size) => onPageSizeChange?.(size, pageForSize(page, pageSize, size)),
        })
      : null;
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? 'Pagination'}
      style={[{ flexDirection: 'row' }, style as ViewStyle]}
    >
      {renderItem({
        type: 'previous',
        disabled: page <= 1,
        selected: false,
        onClick: () => goto(page - 1),
      })}
      {win.map((w, i) =>
        w === 'ellipsis' ? (
          <View key={`e-${i}`}>
            {renderItem({ type: 'ellipsis', disabled: true, selected: false, onClick: () => {} })}
          </View>
        ) : (
          <View key={w}>
            {renderItem({
              type: 'page',
              page: w,
              disabled: false,
              selected: page === w,
              onClick: () => goto(w),
            })}
          </View>
        ),
      )}
      {renderItem({
        type: 'next',
        disabled: page >= total,
        selected: false,
        onClick: () => goto(page + 1),
      })}
      {sizePart}
    </View>
  );
}

// ─────────── Breadcrumb ───────────────────────────────────────────

export interface BreadcrumbProps {
  accessibilityLabel?: string;
  separator?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
}
export function Breadcrumb({
  accessibilityLabel = 'Breadcrumb',
  separator = '/',
  children,
  style,
}: BreadcrumbProps): ReactElement {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row', alignItems: 'center' }, style as ViewStyle]}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            {...(isLast ? { accessibilityState: { selected: true } } : {})}
          >
            {item}
            {!isLast ? <View accessibilityElementsHidden>{separator}</View> : null}
          </View>
        );
      })}
    </View>
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
  current?: string;
  renderStep: (info: {
    step: StepperStep;
    index: number;
    status: 'pending' | 'active' | 'complete' | 'error';
    isLast: boolean;
    /** Whether the step can be pressed to, with `onStepChange`. */
    selectable: boolean;
  }) => ReactElement;
  orientation?: 'horizontal' | 'vertical';
  /** Makes the steps pressable, reporting the id pressed. */
  onStepChange?: (id: string) => void;
  /** With `onStepChange`, only steps before the active one can be pressed. */
  linear?: boolean;
  style?: ViewStyle;
}
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
    <View
      style={[{ flexDirection: orientation === 'vertical' ? 'column' : 'row' }, style as ViewStyle]}
    >
      {steps.map((step, i) => {
        const status: StepperStep['status'] =
          current === step.id ? 'active' : (step.status ?? 'pending');
        return (
          <View
            key={step.id}
            {...(status === 'active' ? { accessibilityState: { selected: true } } : {})}
          >
            {onStepChange === undefined ? (
              renderStep({
                step,
                index: i,
                status: status ?? 'pending',
                isLast: i === steps.length - 1,
                selectable: false,
              })
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSelectStep(i, active, linear) }}
                disabled={!canSelectStep(i, active, linear)}
                onPress={() => onStepChange(step.id)}
              >
                {renderStep({
                  step,
                  index: i,
                  status: status ?? 'pending',
                  isLast: i === steps.length - 1,
                  selectable: canSelectStep(i, active, linear),
                })}
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─────────── NavigationMenu ───────────────────────────────────────

export interface NavigationMenuItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly href?: string;
  readonly disabled?: boolean;
  readonly children?: ReadonlyArray<NavigationMenuItem>;
  readonly render?: (info: {
    readonly label: ReactNode;
    readonly isOpen: boolean;
    readonly isCurrent: boolean;
    readonly hasChildren: boolean;
    readonly toggleOpen: () => void;
  }) => ReactNode;
}

export interface NavigationMenuProps {
  accessibilityLabel?: string;
  current?: string;
  items?: ReadonlyArray<NavigationMenuItem>;
  children?: ReactNode;
  style?: ViewStyle;
}
export function NavigationMenu({
  accessibilityLabel = 'Primary',
  current,
  items,
  children,
  style,
}: NavigationMenuProps): ReactElement {
  if (items !== undefined) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        style={[{ flexDirection: 'row' }, style as ViewStyle]}
      >
        {items.map((item) => (
          <NavigationMenuTopItem key={item.id} item={item} current={current} />
        ))}
      </View>
    );
  }
  // Flat-mode children - wrap each in a View flagging the active one.
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row' }, style as ViewStyle]}
    >
      {Children.toArray(children).map((child, i) => {
        if (!isValidElement(child)) return null;
        const id = (child.props as { id?: string }).id;
        const isCurrent = id !== undefined && id === current;
        return (
          <View key={i} {...(isCurrent ? { accessibilityState: { selected: true } } : {})}>
            {child}
          </View>
        );
      })}
    </View>
  );
}

function NavigationMenuTopItem({
  item,
  current,
}: {
  item: NavigationMenuItem;
  current: string | undefined;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children !== undefined && item.children.length > 0;
  const isCurrent = item.id === current;
  const toggleOpen = useCallback(() => {
    if (!hasChildren || item.disabled === true) return;
    setOpen((prev) => !prev);
  }, [hasChildren, item.disabled]);

  const onPress = (): void => {
    if (item.disabled === true) return;
    if (hasChildren) toggleOpen();
  };

  let trigger: ReactNode;
  if (item.render !== undefined) {
    trigger = item.render({
      label: item.label,
      isOpen: open,
      isCurrent,
      hasChildren,
      toggleOpen,
    });
  } else {
    trigger = (
      <Pressable
        accessibilityRole={hasChildren ? 'button' : 'link'}
        accessibilityState={{ expanded: hasChildren ? open : undefined, selected: isCurrent }}
        disabled={item.disabled}
        onPress={onPress}
      >
        {nativeText(item.label)}
      </Pressable>
    );
  }

  return (
    <View>
      {trigger}
      {hasChildren && open ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            onPress={() => setOpen(false)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <Pressable
              onPress={(e: GestureResponderEvent) => e.stopPropagation?.()}
              style={{ marginTop: 60 }}
            >
              <View accessibilityRole="menu" style={{ backgroundColor: 'white', padding: 8 }}>
                {item.children!.map((sub) => (
                  <NavigationMenuSubItem
                    key={sub.id}
                    item={sub}
                    current={current}
                    onSelect={() => setOpen(false)}
                  />
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function NavigationMenuSubItem({
  item,
  current,
  onSelect,
}: {
  item: NavigationMenuItem;
  current: string | undefined;
  onSelect: () => void;
}): ReactElement {
  const isCurrent = item.id === current;
  const childItems = item.children ?? [];
  const hasChildren = childItems.length > 0;
  // Nested sub-items, rendered indented below this row so a multi-level
  // `items` tree survives on native instead of flattening to dead taps -
  // matching the web's arbitrary-depth recursion.
  const nested = hasChildren ? (
    <View style={{ paddingLeft: 12 }}>
      {childItems.map((sub) => (
        <NavigationMenuSubItem key={sub.id} item={sub} current={current} onSelect={onSelect} />
      ))}
    </View>
  ) : null;

  if (item.render !== undefined) {
    return (
      <View>
        {item.render({
          label: item.label,
          isOpen: false,
          isCurrent,
          hasChildren,
          toggleOpen: () => {},
        })}
        {nested}
      </View>
    );
  }
  const handlePress = (): void => {
    // Open the link the same way the web `<a href>` does, then close.
    if (item.href !== undefined) void Linking.openURL(item.href);
    onSelect();
  };
  return (
    <View>
      <Pressable
        accessibilityRole="menuitem"
        accessibilityState={{ selected: isCurrent }}
        disabled={item.disabled}
        onPress={handlePress}
      >
        {nativeText(item.label)}
      </Pressable>
      {nested}
    </View>
  );
}

// ─────────── Toolbar ──────────────────────────────────────────────

export interface ToolbarProps {
  orientation?: 'horizontal' | 'vertical';
  accessibilityLabel?: string;
  children?: ReactNode;
  style?: ViewStyle;
}
export function Toolbar({
  orientation = 'horizontal',
  accessibilityLabel,
  children,
  style,
}: ToolbarProps): ReactElement {
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: orientation === 'vertical' ? 'column' : 'row' }, style as ViewStyle]}
    >
      {children}
    </View>
  );
}

// ─────────── ScrollView placeholder ───────────────────────────────
// Used by NavigationMenu submenus below if we ever need to overflow.
// Re-export so consumers can ignore.
export { ScrollView };
