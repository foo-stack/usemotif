'use client';

import { FocusScope, Overlay } from '@usemotif/react';
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { mergeRefs } from './_compose-refs.js';
import { useClickOutside } from './positioning.js';
import { useExitTransition } from './_use-exit-transition.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Dialog - accessible modal dialog. Headless: composes the visuals
 * out of motif primitives (Box, Button, Text), and lets the caller
 * style the surface freely. The headless wiring covers:
 *
 * - **Controlled or uncontrolled** open state (`open` + `onOpenChange`
 *   for controlled; `defaultOpen` for uncontrolled).
 * - **Trigger** with `aria-expanded` / `aria-haspopup="dialog"`.
 * - **Content** rendered inside a Portal + Overlay, with FocusScope
 *   handling autoFocus / restoreFocus / Tab cycling / Escape.
 * - **Title** and **Description** bind via `aria-labelledby` /
 *   `aria-describedby` so screen readers announce both at open.
 * - **Close** action button.
 * - **Click-outside dismiss** via Overlay's `onScrimClick`. Pass
 *   `dismissOnEscape={false}` or `dismissOnScrimClick={false}` to
 *   opt out.
 *
 * Wraps the Radix-style multi-component composition pattern:
 *
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Title>Confirm save?</Dialog.Title>
 *     <Dialog.Description>This will overwrite the existing draft.</Dialog.Description>
 *     <Dialog.Close>Cancel</Dialog.Close>
 *     <button onClick={save}>Save</button>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 *
 * The dialog DOES NOT style the surface - pass styling via children.
 * For a fully-styled component, build one in your app on top of
 * Dialog.
 */

interface DialogContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly titleId: string;
  readonly descriptionId: string;
  readonly triggerRef: React.RefObject<HTMLElement | null>;
  readonly role: 'dialog' | 'alertdialog';
  readonly modal: boolean;
  /** Whether a DialogTitle / DialogDescription is currently mounted, so
   * Content only points aria-labelledby / aria-describedby at ids that
   * actually exist (a dangling reference is an ARIA error). */
  readonly hasTitle: boolean;
  readonly hasDescription: boolean;
  /** Called by Title/Description on mount; returns an unregister fn. */
  readonly registerTitle: () => () => void;
  readonly registerDescription: () => () => void;
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
  /** Controlled open state. Pass alongside `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Use `'alertdialog'` for destructive confirmations (overrides
   * the default `'dialog'` role). */
  role?: 'dialog' | 'alertdialog';
  /**
   * `false` leaves the page usable while the dialog is open: no background
   * `inert` or scroll lock, no `aria-modal`, and Tab can leave the dialog.
   * Focus still moves in on open and back on close, and Escape and a click
   * outside still close it. Defaults to `true`.
   */
  modal?: boolean;
  children?: ReactNode;
}
function Root({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  role = 'dialog',
  modal = true,
  children,
}: DialogRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const reactId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);

  // Reference-count mounted Title/Description so Content can omit the
  // aria-labelledby / aria-describedby reference when none is present.
  const [titleCount, setTitleCount] = useState(0);
  const [descriptionCount, setDescriptionCount] = useState(0);
  const registerTitle = useCallback((): (() => void) => {
    setTitleCount((c) => c + 1);
    return () => setTitleCount((c) => c - 1);
  }, []);
  const registerDescription = useCallback((): (() => void) => {
    setDescriptionCount((c) => c + 1);
    return () => setDescriptionCount((c) => c - 1);
  }, []);

  const value = useMemo<DialogContextValue>(
    () => ({
      open,
      setOpen,
      titleId: `${reactId}-title`,
      descriptionId: `${reactId}-description`,
      triggerRef,
      role,
      modal,
      hasTitle: titleCount > 0,
      hasDescription: descriptionCount > 0,
      registerTitle,
      registerDescription,
    }),
    [
      open,
      setOpen,
      reactId,
      role,
      modal,
      titleCount,
      descriptionCount,
      registerTitle,
      registerDescription,
    ],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export interface DialogTriggerProps {
  /** Single child element. The Dialog clones it to inject onClick +
   * aria-expanded + aria-haspopup. */
  children: ReactElement<{
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: string;
    ref?: React.Ref<HTMLElement>;
  }>;
}
function Trigger({ children }: DialogTriggerProps): ReactElement {
  const ctx = useDialogContext('Dialog.Trigger');
  if (!isValidElement(children)) {
    throw new Error('Dialog.Trigger expects a single React element child.');
  }
  const childOnClick = children.props.onClick;
  return cloneElement(children, {
    ref: mergeRefs(children.props.ref, ctx.triggerRef),
    'aria-expanded': ctx.open,
    'aria-haspopup': ctx.role,
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.setOpen(!ctx.open);
    },
  });
}

/** A layer that only places the dialog: transparent, click-through, and
 * leaving the page behind it interactive and scrollable. */
const NON_MODAL_OVERLAY = {
  scrim: 'transparent',
  isolateBackground: false,
  lockScroll: false,
  style: { pointerEvents: 'none' },
} as const;

export interface DialogContentProps {
  /** Allow Escape to close. Defaults to true. */
  dismissOnEscape?: boolean;
  /** Allow scrim clicks to close. Defaults to true. */
  dismissOnScrimClick?: boolean;
  /** Custom inline style for the surface wrapper. The dialog's a11y
   * wiring (aria-modal, role, aria-labelledby, aria-describedby) is
   * always applied. */
  style?: CSSProperties;
  /**
   * Fallback timeout (ms) for the exit transition. **Defaults to `0`**
   * - the dialog unmounts instantly on close (matches the original
   * pre-T1.1 behaviour). Set to a positive value to opt into exit
   * animations: the dialog stays rendered with
   * `data-motif-state="exiting"` until either a `transitionend` event
   * fires on the surface element or this timeout expires (whichever
   * comes first). Pair with `exitStyle` on a child `<Box>` to actually
   * see the animation.
   */
  exitDurationMs?: number;
  children?: ReactNode;
}
function Content({
  dismissOnEscape = true,
  dismissOnScrimClick = true,
  style,
  exitDurationMs = 0,
  children,
}: DialogContentProps): ReactElement | null {
  const ctx = useDialogContext('Dialog.Content');
  const { shouldRender, phase, elementRef, ExitBoundary } = useExitTransition(
    ctx.open,
    exitDurationMs,
  );
  const { setOpen, modal } = ctx;
  const close = useCallback(() => setOpen(false), [setOpen]);
  // A modal dialog's scrim takes the outside click; a non-modal one has no
  // scrim, so a press anywhere else closes it. The trigger toggles on its own.
  useClickOutside(
    !modal && ctx.open && dismissOnScrimClick,
    elementRef as React.RefObject<HTMLElement | null>,
    close,
    ctx.triggerRef,
  );
  if (!shouldRender) return null;
  return (
    <Overlay
      {...(modal ? (dismissOnScrimClick ? { onScrimClick: close } : {}) : NON_MODAL_OVERLAY)}
    >
      <FocusScope
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        restoreFocus
        trapFocus={modal}
        {...(dismissOnEscape ? { onEscape: close } : {})}
      >
        <div
          ref={(node) => {
            elementRef.current = node;
          }}
          role={ctx.role}
          aria-modal={modal || undefined}
          aria-labelledby={ctx.hasTitle ? ctx.titleId : undefined}
          aria-describedby={ctx.hasDescription ? ctx.descriptionId : undefined}
          {...(phase === 'exiting' ? { 'data-motif-state': 'exiting' } : {})}
          style={modal ? style : { pointerEvents: 'auto', ...style }}
        >
          {/* Publish the presence phase so a WAAPI-driven descendant surface
              (`<Box exitStyle>`) can register + play its exit off-thread; the
              CSS path still rides `data-motif-state` + `transitionend` above. */}
          <ExitBoundary>{children}</ExitBoundary>
        </div>
      </FocusScope>
    </Overlay>
  );
}

export interface DialogTitleProps {
  children?: ReactNode;
  /** Render as a different element. Defaults to `<h2>`. */
  as?: keyof React.JSX.IntrinsicElements;
}
function Title({ children, as = 'h2' }: DialogTitleProps): ReactElement {
  const ctx = useDialogContext('Dialog.Title');
  // Announce presence so Content's aria-labelledby points at a real id.
  const { registerTitle } = ctx;
  useEffect(() => registerTitle(), [registerTitle]);
  const Tag = as as React.ElementType;
  return <Tag id={ctx.titleId}>{children}</Tag>;
}

export interface DialogDescriptionProps {
  children?: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}
function Description({ children, as = 'p' }: DialogDescriptionProps): ReactElement {
  const ctx = useDialogContext('Dialog.Description');
  const { registerDescription } = ctx;
  useEffect(() => registerDescription(), [registerDescription]);
  const Tag = as as React.ElementType;
  return <Tag id={ctx.descriptionId}>{children}</Tag>;
}

export interface DialogCloseProps {
  children: ReactElement<{ onClick?: (e: MouseEvent<HTMLElement>) => void }>;
}
function Close({ children }: DialogCloseProps): ReactElement {
  const ctx = useDialogContext('Dialog.Close');
  if (!isValidElement(children)) {
    throw new Error('Dialog.Close expects a single React element child.');
  }
  const childOnClick = children.props.onClick;
  return cloneElement(children, {
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.setOpen(false);
    },
  });
}

/**
 * The parts, exported flat.
 *
 * `src/index.ts` builds the `Dialog` namespace out of these, in the server
 * graph, so that each property of it is a client reference rather than a
 * property read on one. Exporting them here is what makes that possible: a
 * client reference exposes named exports and nothing else.
 *
 * They are not public. The barrel re-exports by name and deliberately does not
 * list them, so `Dialog.Root` stays the only way to reach a part.
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
 * `useDialogState({ defaultOpen })` - imperative control for callers
 * who want to drive Dialog from external state machines (form
 * libraries, routing, etc.). Returns `{ open, setOpen, toggle, props }`
 * where `props` is the controlled-mode pair to spread into `<Dialog.Root>`.
 */
export function useDialogState(initial: { defaultOpen?: boolean } = {}): {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  props: { open: boolean; onOpenChange: (next: boolean) => void };
} {
  const [open, setOpen] = useState(initial.defaultOpen ?? false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return {
    open,
    setOpen,
    toggle,
    props: { open, onOpenChange: setOpen },
  };
}

// Suppress unused-effect warning - kept for future imperative APIs.
export { useEffect };
