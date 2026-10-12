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
 * Native ContextMenu - long-press to open. Touch devices have no
 * portable right-click affordance, so the trigger uses RN's
 * `Pressable.onLongPress` instead. Surface is a Modal sheet (matches
 * `<Menu>` on native); items are Pressable rows with
 * `accessibilityRole="menuitem"`. Tap an item to fire its `onSelect`
 * + auto-dismiss; tap the scrim to dismiss without selecting; press
 * hardware back / ESC to dismiss via Modal's `onRequestClose`.
 *
 * The web `<ContextMenu>` opens at pointer coordinates; on native we
 * present at the `placement` position (default `'center'`) since
 * touch coordinates aren't a useful anchor for a Modal.
 *
 * ```tsx
 * <ContextMenu.Root>
 *   <ContextMenu.Trigger>
 *     <Pressable><Text>Long-press me</Text></Pressable>
 *   </ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item onSelect={cut}>Cut</ContextMenu.Item>
 *     <ContextMenu.Item onSelect={copy}>Copy</ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu.Root>
 * ```
 */

interface ContextMenuContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
}
const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);
function useContextMenuContext(component: string): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (ctx === null) throw new Error(`${component} must be inside <ContextMenu.Root>.`);
  return ctx;
}

export interface ContextMenuRootProps {
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
}: ContextMenuRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return (
    <ContextMenuContext.Provider value={{ open, setOpen }}>{children}</ContextMenuContext.Provider>
  );
}

export interface ContextMenuTriggerProps {
  children: ReactElement<{
    onLongPress?: () => void;
  }>;
}
function Trigger({ children }: ContextMenuTriggerProps): ReactElement {
  const ctx = useContextMenuContext('ContextMenu.Trigger');
  if (!isValidElement(children)) {
    throw new Error('ContextMenu.Trigger expects a single React element child.');
  }
  const childOnLongPress = children.props.onLongPress;
  return cloneElement(children, {
    onLongPress: () => {
      childOnLongPress?.();
      ctx.setOpen(true);
    },
  });
}

export interface ContextMenuContentProps {
  children?: ReactNode;
  style?: ViewStyle;
  /** Where the menu surface sits on screen. Native touch contexts
   * have no useful pointer coordinate, so the surface is positioned
   * via this enum rather than the web's `(x, y)`. Defaults to
   * `'center'` - closer to a confirmation-style sheet feel for
   * actions that came from a long-press. */
  placement?: 'center' | 'bottom' | 'top';
}
function Content({
  children,
  style,
  placement = 'center',
}: ContextMenuContentProps): ReactElement | null {
  const ctx = useContextMenuContext('ContextMenu.Content');
  if (!ctx.open) return null;
  const justify =
    placement === 'top' ? 'flex-start' : placement === 'bottom' ? 'flex-end' : 'center';
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => ctx.setOpen(false)}>
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

export interface ContextMenuItemProps {
  children?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}
function Item({ children, onSelect, disabled = false, style }: ContextMenuItemProps): ReactElement {
  const ctx = useContextMenuContext('ContextMenu.Item');
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
  Root as ContextMenuRoot,
  Trigger as ContextMenuTrigger,
  Content as ContextMenuContent,
  Item as ContextMenuItem,
  Separator as ContextMenuSeparator,
};
