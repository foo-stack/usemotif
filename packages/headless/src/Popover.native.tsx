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
 * Native Popover - RN Modal with a transparent backdrop. The
 * trigger toggles open on press; the scrim Pressable dismisses on
 * tap-outside. The inner content absorbs taps so users can
 * interact with the popover body.
 */

interface PopoverContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
}
const PopoverContext = createContext<PopoverContextValue | null>(null);
function usePopoverContext(component: string): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (ctx === null) throw new Error(`${component} must be inside <Popover.Root>.`);
  return ctx;
}

export interface PopoverRootProps {
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
}: PopoverRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return <PopoverContext.Provider value={{ open, setOpen }}>{children}</PopoverContext.Provider>;
}

export interface PopoverTriggerProps {
  children: ReactElement<{
    onPress?: () => void;
    accessibilityState?: { expanded?: boolean };
  }>;
}
function Trigger({ children }: PopoverTriggerProps): ReactElement {
  const ctx = usePopoverContext('Popover.Trigger');
  if (!isValidElement(children)) {
    throw new Error('Popover.Trigger expects a single React element child.');
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

export interface PopoverContentProps {
  children?: ReactNode;
  style?: ViewStyle;
  /** Where the popover surface sits inside the screen. Defaults to
   * `'center'` (centered both axes). On phones a `'bottom'` value
   * gives a familiar bottom-sheet look. */
  placement?: 'center' | 'bottom' | 'top';
}
function Content({
  children,
  style,
  placement = 'center',
}: PopoverContentProps): ReactElement | null {
  const ctx = usePopoverContext('Popover.Content');
  if (!ctx.open) return null;
  const justify =
    placement === 'top' ? 'flex-start' : placement === 'bottom' ? 'flex-end' : 'center';
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable
        onPress={() => ctx.setOpen(false)}
        style={{ flex: 1, justifyContent: justify, alignItems: 'center' }}
      >
        <Pressable onPress={(e) => e.stopPropagation?.()} style={style}>
          <View accessibilityViewIsModal>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface PopoverCloseProps {
  children: ReactElement<{ onPress?: () => void }>;
}
function Close({ children }: PopoverCloseProps): ReactElement {
  const ctx = usePopoverContext('Popover.Close');
  if (!isValidElement(children)) {
    throw new Error('Popover.Close expects a single React element child.');
  }
  const childOnPress = children.props.onPress;
  return cloneElement(children, {
    onPress: () => {
      childOnPress?.();
      ctx.setOpen(false);
    },
  });
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export {
  Root as PopoverRoot,
  Trigger as PopoverTrigger,
  Content as PopoverContent,
  Close as PopoverClose,
};
