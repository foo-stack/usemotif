import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Modal, Pressable, Text, View, type ViewStyle } from 'react-native';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native Dialog - RN's `<Modal>` is the right primitive: it handles
 * the platform's accessibility focus, hardware-back dismissal on
 * Android, and the modal layer (no portal needed because RN's modal
 * tree is rooted independently of the React tree).
 *
 * The composition mirrors the web Dialog - `Root` / `Trigger` /
 * `Content` / `Title` / `Description` / `Close` - so cross-platform
 * code stays portable. `dismissOnEscape` maps to RN's `onRequestClose`
 * (Android back button + ESC on hardware keyboards). `dismissOnScrimClick`
 * is implemented via a transparent backdrop Pressable.
 */

interface DialogContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly titleId: string;
  readonly descriptionId: string;
  readonly role: 'dialog' | 'alertdialog';
  /** Resolved description *text* (not its id) for accessibilityHint. */
  readonly descriptionText: string | undefined;
  readonly setDescriptionText: (text: string | undefined) => void;
}
const DialogContext = createContext<DialogContextValue | null>(null);
function useDialogContext(component: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (ctx === null) {
    throw new Error(`${component} must be rendered inside <Dialog.Root>.`);
  }
  return ctx;
}

export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  role?: 'dialog' | 'alertdialog';
  children?: ReactNode;
}
function Root({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  role = 'dialog',
  children,
}: DialogRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const reactId = useId();
  const [descriptionText, setDescriptionText] = useState<string | undefined>(undefined);

  return (
    <DialogContext.Provider
      value={{
        open,
        setOpen,
        titleId: `${reactId}-title`,
        descriptionId: `${reactId}-description`,
        role,
        descriptionText,
        setDescriptionText,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps {
  /** Single child element. Cloned to inject `onPress`. */
  children: ReactElement<{
    onPress?: () => void;
    accessibilityState?: { expanded?: boolean };
  }>;
}
function Trigger({ children }: DialogTriggerProps): ReactElement {
  const ctx = useDialogContext('Dialog.Trigger');
  if (!isValidElement(children)) {
    throw new Error('Dialog.Trigger expects a single React element child.');
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

export interface DialogContentProps {
  dismissOnEscape?: boolean;
  dismissOnScrimClick?: boolean;
  /** Inline style for the dialog surface. */
  style?: ViewStyle;
  /** Animation style for the underlying RN Modal. */
  animationType?: 'none' | 'slide' | 'fade';
  children?: ReactNode;
}
function Content({
  dismissOnEscape = true,
  dismissOnScrimClick = true,
  style,
  animationType = 'fade',
  children,
}: DialogContentProps): ReactElement | null {
  const ctx = useDialogContext('Dialog.Content');
  if (!ctx.open) return null;
  return (
    <Modal
      transparent
      visible
      animationType={animationType}
      // RN's onRequestClose fires on hardware back / ESC. This is the
      // direct analogue of FocusScope's onEscape on the web side.
      onRequestClose={() => {
        if (dismissOnEscape) ctx.setOpen(false);
      }}
    >
      {/*
        Centering container. The scrim is an absolutely-positioned
        sibling *behind* the surface - NOT its parent - because the scrim
        carries accessibilityElementsHidden / importantForAccessibility=
        "no-hide-descendants", which hide the element AND all descendants.
        With the old scrim-as-parent structure that hid the entire dialog
        from VoiceOver/TalkBack.
      */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => {
            if (dismissOnScrimClick) ctx.setOpen(false);
          }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        />
        {/* Dialog surface - a sibling of the scrim, so it stays visible to
            assistive tech. accessibilityRole maps to ctx.role. */}
        <View
          accessibilityRole={ctx.role === 'alertdialog' ? 'alert' : 'none'}
          accessibilityViewIsModal
          accessibilityLabelledBy={ctx.titleId}
          accessibilityHint={ctx.descriptionText}
          style={style as ViewStyle}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

export interface DialogTitleProps {
  children?: ReactNode;
}
function Title({ children }: DialogTitleProps): ReactElement {
  const ctx = useDialogContext('Dialog.Title');
  return (
    <Text nativeID={ctx.titleId} accessibilityRole="header">
      {children}
    </Text>
  );
}

export interface DialogDescriptionProps {
  children?: ReactNode;
}
function Description({ children }: DialogDescriptionProps): ReactElement {
  const ctx = useDialogContext('Dialog.Description');
  // Publish the description *text* so the surface can announce it via
  // accessibilityHint (which wants human-readable text, not an id).
  const { setDescriptionText } = ctx;
  useEffect(() => {
    setDescriptionText(typeof children === 'string' ? children : undefined);
    return () => setDescriptionText(undefined);
  }, [children, setDescriptionText]);
  return <Text nativeID={ctx.descriptionId}>{children}</Text>;
}

export interface DialogCloseProps {
  children: ReactElement<{ onPress?: () => void }>;
}
function Close({ children }: DialogCloseProps): ReactElement {
  const ctx = useDialogContext('Dialog.Close');
  if (!isValidElement(children)) {
    throw new Error('Dialog.Close expects a single React element child.');
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
 * The parts, exported flat, to match the web twin.
 *
 * Native has no server boundary, so nothing here needs a client reference. The
 * flat names exist because `src/client.ts` re-exports them from `./Dialog.js`,
 * and Metro resolves that specifier to this file: the two twins have to offer
 * the same names or the native bundle fails to build.
 *
 * The object below stays for this module's own consumers.
 */
export {
  Close as DialogClose,
  Content as DialogContent,
  Description as DialogDescription,
  Root as DialogRoot,
  Title as DialogTitle,
  Trigger as DialogTrigger,
};

/**
 * Imperative open-state control. Same shape as the web variant so
 * cross-platform consumers don't need a platform branch.
 */
export function useDialogState(opts: { defaultOpen?: boolean } = {}): {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
} {
  const [open, setOpen] = useState(opts.defaultOpen ?? false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return { open, setOpen, toggle };
}
