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
 * Native HoverCard - same long-press pattern as Tooltip, but the
 * content is interactive (richer than a tooltip - links, buttons,
 * etc.). The Modal scrim doesn't dismiss on inner taps so users
 * can interact with the card body.
 */

interface HoverCardContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
}
const HoverCardContext = createContext<HoverCardContextValue | null>(null);
function useHoverCardContext(component: string): HoverCardContextValue {
  const ctx = useContext(HoverCardContext);
  if (ctx === null) throw new Error(`${component} must be inside <HoverCard.Root>.`);
  return ctx;
}

export interface HoverCardRootProps {
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
}: HoverCardRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>{children}</HoverCardContext.Provider>
  );
}

export interface HoverCardTriggerProps {
  children: ReactElement<{ onLongPress?: () => void }>;
}
function Trigger({ children }: HoverCardTriggerProps): ReactElement {
  const ctx = useHoverCardContext('HoverCard.Trigger');
  if (!isValidElement(children)) {
    throw new Error('HoverCard.Trigger expects a single React element child.');
  }
  const childOnLongPress = children.props.onLongPress;
  return cloneElement(children, {
    onLongPress: () => {
      childOnLongPress?.();
      ctx.setOpen(true);
    },
  });
}

export interface HoverCardContentProps {
  children?: ReactNode;
  style?: ViewStyle;
}
function Content({ children, style }: HoverCardContentProps): ReactElement | null {
  const ctx = useHoverCardContext('HoverCard.Content');
  if (!ctx.open) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable
        onPress={() => ctx.setOpen(false)}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Pressable
          // Inner Pressable absorbs taps so the card stays open while
          // the user interacts with its links / buttons.
          onPress={(e) => e.stopPropagation?.()}
          style={style}
        >
          <View>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export { Root as HoverCardRoot, Trigger as HoverCardTrigger, Content as HoverCardContent };
