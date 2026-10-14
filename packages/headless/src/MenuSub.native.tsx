import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

/**
 * Native submenus, shared by Menu and ContextMenu. A phone menu is a sheet,
 * not a set of flyouts, so the trigger expands its content inline beneath it.
 * Items inside close the whole menu, as items anywhere else do.
 */

interface SubContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
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
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
}

export interface MenuSubTriggerProps {
  children?: ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

function SubTrigger({ children, disabled = false, style }: MenuSubTriggerProps): ReactElement {
  const sub = useSubContext('Menu.SubTrigger');
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ expanded: sub.open, disabled }}
      disabled={disabled}
      onPress={() => sub.setOpen(!sub.open)}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export interface MenuSubContentProps {
  children?: ReactNode;
  style?: ViewStyle;
}

function SubContent({ children, style }: MenuSubContentProps): ReactElement | null {
  const sub = useSubContext('Menu.SubContent');
  if (!sub.open) return null;
  return (
    <View accessibilityRole="menu" style={style}>
      {children}
    </View>
  );
}

export { Sub as MenuSub, SubTrigger as MenuSubTrigger, SubContent as MenuSubContent };
