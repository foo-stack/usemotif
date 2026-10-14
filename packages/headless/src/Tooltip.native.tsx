import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Modal, Pressable, View, type ViewStyle } from 'react-native';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native Tooltip - hover doesn't exist on touch, so the
 * platform-correct activation is a long-press. The trigger sets
 * `onLongPress` to open and dismisses on tap-anywhere via the
 * scrim Pressable inside the Modal.
 */

interface TooltipContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly contentId: string;
  /** Resolved tooltip *text* (not its id) for the trigger's accessibilityHint. */
  readonly hint: string | undefined;
  readonly setHint: (text: string | undefined) => void;
}
const TooltipContext = createContext<TooltipContextValue | null>(null);
function useTooltipContext(component: string): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (ctx === null) throw new Error(`${component} must be inside <Tooltip.Root>.`);
  return ctx;
}

export interface TooltipRootProps {
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
}: TooltipRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const id = useId();
  const [hint, setHint] = useState<string | undefined>(undefined);
  return (
    <TooltipContext.Provider value={{ open, setOpen, contentId: `${id}-tooltip`, hint, setHint }}>
      {children}
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps {
  children: ReactElement<{
    onLongPress?: () => void;
    accessibilityHint?: string | undefined;
  }>;
}
function Trigger({ children }: TooltipTriggerProps): ReactElement {
  const ctx = useTooltipContext('Tooltip.Trigger');
  if (!isValidElement(children)) {
    throw new Error('Tooltip.Trigger expects a single React element child.');
  }
  const childOnLongPress = children.props.onLongPress;
  return cloneElement(children, {
    // Human-readable text, not the internal element id (which TalkBack
    // would announce verbatim, e.g. ":r1:-tooltip").
    accessibilityHint: ctx.hint,
    onLongPress: () => {
      childOnLongPress?.();
      ctx.setOpen(true);
    },
  });
}

export interface TooltipContentProps {
  children?: ReactNode;
  style?: ViewStyle;
}
function Content({ children, style }: TooltipContentProps): ReactElement | null {
  const ctx = useTooltipContext('Tooltip.Content');
  // Publish the tooltip text so the trigger can describe itself even before
  // first open. The effect runs whether or not the content is visible.
  const { setHint } = ctx;
  useEffect(() => {
    setHint(typeof children === 'string' ? children : undefined);
    return () => setHint(undefined);
  }, [children, setHint]);
  if (!ctx.open) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable
        onPress={() => ctx.setOpen(false)}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <View nativeID={ctx.contentId} accessibilityRole="text" style={style}>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export interface TooltipProviderProps {
  /** Web only: how long after one tooltip closes the next opens at once.
   * Native tooltips open on press, so the group has no delay to skip. */
  skipDelayDuration?: number;
  children?: ReactNode;
}
/** Accepted for shared code; native tooltips open on press with no delay. */
function Provider({ children }: TooltipProviderProps): ReactElement {
  return <>{children}</>;
}

export {
  Provider as TooltipProvider,
  Root as TooltipRoot,
  Trigger as TooltipTrigger,
  Content as TooltipContent,
};
