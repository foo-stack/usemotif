import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useDrag } from '@usemotif/react-native';
import { Animated, View, type ViewStyle } from 'react-native';
import { nativeText } from './_native-text.js';
import { withPromise, type ToastFn } from './_toast-promise.js';
import { isSwipeDismiss } from './_toast-swipe.js';
import { useReducedMotion } from './_use-reduced-motion.js';

/**
 * Native Toast / Toaster / useToast.
 *
 * `<Toaster>` is a context provider that holds a queue of toasts in
 * state and renders them as an absolutely-positioned overlay above
 * the host's content. Each toast Animated-fades in on mount and
 * out on dismiss, then drops from the queue.
 *
 * Use `useToast()` from anywhere inside the Toaster subtree to
 * push / dismiss toasts imperatively. Same surface as the web
 * variant so cross-platform consumers don't branch.
 */

export interface ToastItem {
  readonly id: string;
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly duration?: number;
  readonly type?: 'foreground' | 'background';
}

type ToastInput = Omit<ToastItem, 'id'> & { id?: string };

interface ToasterContextValue {
  readonly toast: ToastFn;
  readonly dismiss: (id: string) => void;
  readonly toasts: ToastItem[];
}
const ToasterContext = createContext<ToasterContextValue | null>(null);

export function useToast(): ToasterContextValue {
  const ctx = useContext(ToasterContext);
  if (ctx === null) {
    throw new Error('useToast() must be used inside a <Toaster> subtree.');
  }
  return ctx;
}

export interface ToasterProps {
  children?: ReactNode;
  defaultDuration?: number;
  maxVisible?: number;
  /** Render fn for each toast. Defaults to a simple labelled View. */
  renderToast?: (item: ToastItem, info: { dismiss: () => void }) => ReactElement;
  /** Position of the toast stack. Defaults to bottom. */
  placement?: 'top' | 'bottom';
  /** Let a sideways swipe dismiss a toast. Defaults to `true`. */
  swipeToDismiss?: boolean;
  style?: ViewStyle;
}
export function Toaster({
  children,
  defaultDuration = 4000,
  maxVisible = 4,
  renderToast,
  placement = 'bottom',
  swipeToDismiss = true,
  style,
}: ToasterProps): ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput): string => {
      const id = input.id ?? `toast-${idCounter.current++}`;
      const item: ToastItem = {
        ...input,
        id,
        duration: input.duration ?? defaultDuration,
      };
      // Reusing an id replaces the toast in place; clear its prior timer so
      // the orphan can't early-dismiss the replacement.
      const prevTimer = timers.current.get(id);
      if (prevTimer !== undefined) {
        clearTimeout(prevTimer);
        timers.current.delete(id);
      }
      setToasts((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return [...prev, item].slice(-maxVisible);
        const next = prev.slice();
        next[idx] = item;
        return next;
      });
      // Match the web semantics: duration <= 0 (and Infinity) means persistent
      // - no auto-dismiss timer. Previously only Infinity was special-cased, so
      // `duration: 0` dismissed instantly.
      if (item.duration !== Infinity && (item.duration ?? 0) > 0) {
        const timer = setTimeout(() => dismiss(id), item.duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [defaultDuration, dismiss, maxVisible],
  );

  // Clean up any pending timers when the Toaster unmounts.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  const toastFn = useMemo(() => withPromise(toast), [toast]);
  const ctx = useMemo<ToasterContextValue>(
    () => ({ toast: toastFn, dismiss, toasts }),
    [toastFn, dismiss, toasts],
  );

  const overlayPosition: ViewStyle =
    placement === 'top' ? { top: 32, left: 0, right: 0 } : { bottom: 32, left: 0, right: 0 };

  return (
    <ToasterContext.Provider value={ctx}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          { position: 'absolute', alignItems: 'center', zIndex: 1000 },
          overlayPosition,
          style as ViewStyle,
        ]}
      >
        {toasts.map((t) => (
          <ToastView
            key={t.id}
            item={t}
            dismiss={() => dismiss(t.id)}
            render={renderToast}
            swipe={swipeToDismiss}
          />
        ))}
      </View>
    </ToasterContext.Provider>
  );
}

function ToastView({
  item,
  dismiss,
  render,
  swipe,
}: {
  item: ToastItem;
  dismiss: () => void;
  render?: ((item: ToastItem, info: { dismiss: () => void }) => ReactElement) | undefined;
  swipe: boolean;
}): ReactElement {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity, reducedMotion]);

  // Bounded at 0 with full elasticity: the toast follows the finger and
  // springs back when a release does not dismiss it.
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const { dragProps, Wrapper, x } = useDrag({
    axis: 'x',
    constraints: { left: 0, right: 0 },
    dragElastic: 1,
    onDragEnd: (info) => {
      if (isSwipeDismiss(info)) dismissRef.current();
    },
  });
  const translateX = useRef(new Animated.Value(0)).current;
  useEffect(() => x.on('change', (offset) => translateX.setValue(offset)), [x, translateX]);

  const view = (
    <Animated.View
      {...(swipe ? dragProps : {})}
      // role="status" semantics - non-modal, polite for background,
      // assertive for foreground toasts.
      accessibilityLiveRegion={item.type === 'foreground' ? 'assertive' : 'polite'}
      style={{ opacity, transform: [{ translateX }] }}
    >
      {render !== undefined ? (
        render(item, { dismiss })
      ) : (
        <View>
          {nativeText(item.title)}
          {nativeText(item.description)}
          {item.action}
        </View>
      )}
    </Animated.View>
  );
  return swipe ? <Wrapper>{view}</Wrapper> : view;
}

/**
 * Re-export the standalone Toast view in case callers want to render
 * a single notification outside of a Toaster (e.g. inline status).
 */
export function Toast({ item }: { item: ToastItem }): ReactElement {
  return (
    <View accessibilityLiveRegion={item.type === 'foreground' ? 'assertive' : 'polite'}>
      {nativeText(item.title)}
      {nativeText(item.description)}
      {item.action}
    </View>
  );
}
