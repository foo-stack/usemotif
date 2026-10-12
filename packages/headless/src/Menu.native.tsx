import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Modal, Pressable, View, type ViewStyle } from 'react-native';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native Menu - Modal-presented menu surface with `role="menu"` and
 * Pressable items as `role="menuitem"`. Tap a non-disabled item to
 * fire its `onSelect` and auto-dismiss; tap the scrim to dismiss
 * without selecting. Hardware back / ESC route through Modal's
 * onRequestClose.
 */

interface MenuContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
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
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>;
}

export interface MenuTriggerProps {
  children: ReactElement<{
    onPress?: () => void;
    accessibilityState?: { expanded?: boolean };
  }>;
}
function Trigger({ children }: MenuTriggerProps): ReactElement {
  const ctx = useMenuContext('Menu.Trigger');
  if (!isValidElement(children)) {
    throw new Error('Menu.Trigger expects a single React element child.');
  }
  const childOnPress = children.props.onPress;
  return cloneElement(children, {
    accessibilityState: { expanded: ctx.open },
    onPress: () => {
      childOnPress?.();
      ctx.setOpen(!ctx.open);
    },
  });
}

export interface MenuContentProps {
  children?: ReactNode;
  style?: ViewStyle;
  /** Where the menu surface sits on screen. `'bottom'` gives a
   * platform-correct bottom-sheet look on phones. */
  placement?: 'center' | 'bottom' | 'top';
}
function Content({ children, style, placement = 'bottom' }: MenuContentProps): ReactElement | null {
  const ctx = useMenuContext('Menu.Content');
  if (!ctx.open) return null;
  const justify =
    placement === 'top' ? 'flex-start' : placement === 'bottom' ? 'flex-end' : 'center';
  return (
    <Modal transparent visible animationType="slide" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable
        onPress={() => ctx.setOpen(false)}
        style={{ flex: 1, justifyContent: justify, backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable onPress={(e) => e.stopPropagation?.()} style={style}>
          <View accessibilityRole="menu">{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface MenuItemProps {
  children?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}
function Item({ children, onSelect, disabled = false, style }: MenuItemProps): ReactElement {
  const ctx = useMenuContext('Menu.Item');
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        onSelect?.();
        ctx.setOpen(false);
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}

function Separator({ style }: { style?: ViewStyle }): ReactElement {
  return (
    <View
      accessibilityRole="none"
      style={[{ height: 1, backgroundColor: 'rgba(0,0,0,0.15)' }, style as ViewStyle]}
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
  Item as MenuItem,
  Separator as MenuSeparator,
};
