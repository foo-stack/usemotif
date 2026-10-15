/**
 * Minimal `react-native` shim for vitest.
 *
 * The real RN package ships Flow-syntax JS that vitest's parser
 * rejects, AND React 19's `react-test-renderer` is effectively broken
 * for arbitrary host components. The fix that works on both fronts:
 * render motif's native View / Text as plain `<div>` / `<span>` host
 * elements with a `data-motif-host` attribute identifying which RN
 * component they're standing in for. Tests run under jsdom and query
 * by that attribute.
 *
 * If a future test needs another RN export (e.g. `Pressable`,
 * `Image`, `Dimensions`), add it here so the mock stays scoped to
 * what the tests actually touch.
 */

import {
  createElement,
  Fragment,
  useLayoutEffect,
  useRef,
  type ComponentType,
  type ReactNode,
} from 'react';

interface HostProps {
  children?: ReactNode;
  style?: unknown;
  onLayout?: (event: {
    nativeEvent: { layout: { width: number; height: number; x: number; y: number } };
  }) => void;
  testID?: string;
  [key: string]: unknown;
}

/**
 * Per-testID width registry - tests call `__setLayoutWidth(testID, w)`
 * before rendering; the View mock fires `onLayout` with the matching
 * width via `useLayoutEffect` once the element has mounted. This
 * sidesteps jsdom's lack of a real layout pass.
 */
const mockLayoutWidths = new Map<string, number>();

/** Test-only: register a width to fire on the next `onLayout` for the
 * given testID. Subsequent `__setLayoutWidth` calls re-register and
 * the next render's `onLayout` picks them up. */
export function __setLayoutWidth(testID: string, width: number): void {
  mockLayoutWidths.set(testID, width);
}

function makeHost(name: string, htmlTag: string, withLayout = false): ComponentType<HostProps> {
  const Host = (props: HostProps) => {
    const { children, style, onLayout, testID, ...rest } = props;
    const styleAttr = style === undefined ? null : JSON.stringify(style);

    // Hooks must be called unconditionally - call useLayoutEffect for
    // every render of this host. The effect body bails out unless the
    // host actually wants layout firing.
    useLayoutEffect(() => {
      if (!withLayout || typeof onLayout !== 'function') return;
      const width =
        testID !== undefined && mockLayoutWidths.has(testID) ? mockLayoutWidths.get(testID)! : 0;
      onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 0 } } });
    }, [onLayout, testID]);

    return createElement(
      htmlTag,
      {
        'data-motif-host': name,
        ...(styleAttr === null ? {} : { 'data-motif-style': styleAttr }),
        ...(testID === undefined ? {} : { testID }),
        ...rest,
      },
      children,
    );
  };
  Host.displayName = name;
  return Host;
}

// View fires `onLayout` automatically (used by Container).
export const View = makeHost('View', 'div', true);
export const SafeAreaView = makeHost('SafeAreaView', 'div', true);
export const Text = makeHost('Text', 'span');
export const Image = makeHost('Image', 'img');
export const TextInput = makeHost('TextInput', 'input');
export const Switch = makeHost('Switch', 'input');
export const Modal = makeHost('Modal', 'div', true);
export const RefreshControl = makeHost('RefreshControl', 'div');

/**
 * ScrollView shim - surfaces the `stickyHeaderIndices` prop as a
 * `data-sticky-indices` attribute on the rendered host so tests can
 * verify the index list motif's `<ScrollView>` computed from its
 * `<Sticky>` children.
 *
 * To simulate a native scroll event in tests: dispatch a
 * `motif:scroll` CustomEvent on the rendered host with `detail`
 * shaped as RN's `NativeScrollEvent.nativeEvent`
 * (`{ contentOffset, contentSize, layoutMeasurement }`). The shim
 * invokes the `onScroll` prop with `{ nativeEvent: detail }` so
 * motif's ScrollView sees a real RN-style event shape.
 */
export const ScrollView: ComponentType<HostProps> = (props: HostProps) => {
  const {
    children,
    style,
    contentContainerStyle,
    stickyHeaderIndices,
    testID,
    onScroll,
    scrollEventThrottle: _omitThrottle,
    ...rest
  } = props;
  const styleAttr = style === undefined ? null : JSON.stringify(style);
  const contentStyleAttr =
    contentContainerStyle === undefined ? null : JSON.stringify(contentContainerStyle);
  const stickyAttr = Array.isArray(stickyHeaderIndices)
    ? JSON.stringify(stickyHeaderIndices)
    : null;

  const hostRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const node = hostRef.current;
    if (node === null || typeof onScroll !== 'function') return;
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent).detail as { contentOffset: { x: number; y: number } };
      (onScroll as (event: { nativeEvent: typeof detail }) => void)({ nativeEvent: detail });
    };
    node.addEventListener('motif:scroll', handler);
    return () => node.removeEventListener('motif:scroll', handler);
  }, [onScroll]);

  return createElement(
    'div',
    {
      'data-motif-host': 'ScrollView',
      ref: hostRef,
      ...(styleAttr === null ? {} : { 'data-motif-style': styleAttr }),
      ...(contentStyleAttr === null ? {} : { 'data-motif-content-style': contentStyleAttr }),
      ...(stickyAttr === null ? {} : { 'data-sticky-indices': stickyAttr }),
      ...(testID === undefined ? {} : { testID }),
      ...(rest as Record<string, unknown>),
    },
    children,
  );
};
ScrollView.displayName = 'ScrollView';

/**
 * FlatList shim - renders every item through `renderItem` (no windowing in a
 * test DOM), or `ListEmptyComponent` when `data` is empty.
 */
export const FlatList: ComponentType<HostProps> = (props: HostProps) => {
  const { data, renderItem, keyExtractor, ListEmptyComponent, ...rest } = props as HostProps & {
    data: readonly unknown[];
    renderItem: (info: { item: unknown; index: number }) => ReactNode;
    keyExtractor?: (item: unknown, index: number) => string;
    ListEmptyComponent?: ReactNode;
  };
  return createElement(
    'div',
    { 'data-motif-host': 'FlatList', ...rest },
    data.length === 0
      ? ListEmptyComponent
      : data.map((item, index) =>
          createElement(
            Fragment,
            { key: keyExtractor?.(item, index) ?? String(index) },
            renderItem({ item, index }),
          ),
        ),
  );
};

/** `AccessibilityInfo` shim: reduced motion is off, and the listener is a no-op. */
export const AccessibilityInfo = {
  isReduceMotionEnabled: (): Promise<boolean> => Promise.resolve(false),
  addEventListener: (): { remove: () => void } => ({ remove: () => {} }),
};

export const Linking = {
  openURL: (_url: string): Promise<void> => Promise.resolve(),
  canOpenURL: (_url: string): Promise<boolean> => Promise.resolve(true),
};

/**
 * Pressable shim - RN's Pressable accepts a function-as-style
 * `(state) => styles`. The shim invokes that with a synthetic
 * `{ pressed: false }` to produce the default-state style array
 * (which is what jsdom queries against). Tests that need other
 * states (`hovered`, `focused`, `pressed`) opt in via the
 * `data-motif-pressable-state` attribute set on the rendered host.
 */
export const Pressable: ComponentType<HostProps> = (props: HostProps) => {
  const { children, style, onPress, onLongPress, ...rest } = props;
  const stateRaw =
    typeof rest['data-motif-pressable-state'] === 'string'
      ? (JSON.parse(rest['data-motif-pressable-state'] as string) as Record<string, boolean>)
      : { pressed: false };
  const { 'data-motif-pressable-state': _omit, ...passThrough } = rest;
  const resolvedStyle = typeof style === 'function' ? style(stateRaw) : style;
  const styleAttr = resolvedStyle === undefined ? null : JSON.stringify(resolvedStyle);
  // Translate RN's `onPress` → DOM's `onClick` so jsdom's click()
  // dispatches reach the consumer-supplied handler. RN's
  // GestureResponderEvent shape is loose enough that passing the DOM
  // MouseEvent through is fine for tests.
  const onClick =
    typeof onPress === 'function'
      ? (e: unknown) => (onPress as (e: unknown) => void)(e)
      : undefined;
  // `onLongPress` has no native DOM analogue. Tests trigger it by
  // dispatching a `longpress` CustomEvent on the rendered host; we
  // attach the listener via a ref-effect so each render rebinds.
  const longPressRef = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    const node = longPressRef.current;
    if (node === null || typeof onLongPress !== 'function') return;
    const handler = (): void => (onLongPress as () => void)();
    node.addEventListener('longpress', handler);
    return () => node.removeEventListener('longpress', handler);
  }, [onLongPress]);
  return createElement(
    'button',
    {
      'data-motif-host': 'Pressable',
      ref: longPressRef,
      ...(styleAttr === null ? {} : { 'data-motif-style': styleAttr }),
      ...(onClick === undefined ? {} : { onClick }),
      ...(passThrough as Record<string, unknown>),
    },
    children,
  );
};
Pressable.displayName = 'Pressable';

/**
 * `PanResponder` shim. Production code calls `PanResponder.create({...})`
 * to bind drag handlers to a View; in jsdom we can't dispatch real
 * touch events, so the mock returns a `panHandlers` object whose
 * entries are no-ops. Tests that need to exercise drag logic should
 * call the relevant prop directly (e.g. `onPanResponderMove({ ... })`)
 * rather than going through a real gesture pipeline.
 */
export const PanResponder = {
  create<T extends Record<string, unknown>>(config: T): { panHandlers: Record<string, unknown> } {
    return { panHandlers: { ...config } };
  },
};

export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
  flatten(style: unknown): unknown {
    if (Array.isArray(style)) {
      return style.reduce<Record<string, unknown>>(
        (acc, s) => Object.assign(acc, (s as Record<string, unknown>) ?? {}),
        {},
      );
    }
    return style ?? {};
  },
};

// Type re-exports - empty to keep consumer-side types alignable with
// RN's `ViewStyle` / `ViewProps` shapes without dragging in RN's Flow
// source. eslint disabled inline since the empty body is intentional.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ViewStyle {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ViewProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextStyle {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageStyle {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PressableProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GestureResponderEvent {}
// Layout event shape used by `View.onLayout` callbacks.
export interface LayoutChangeEvent {
  nativeEvent: {
    layout: { x: number; y: number; width: number; height: number };
  };
}

// `Dimensions` mock - minimal API used by the viewport-driven
// resolver. Returns a fixed 360×640 size by default so tests are
// deterministic. Tests can override via `__setDimensions(width)`.
let mockWidth = 360;
let mockHeight = 640;
const dimensionsListeners = new Set<(d: { window: { width: number; height: number } }) => void>();
export const Dimensions = {
  get(_dim: 'window' | 'screen' = 'window') {
    return { width: mockWidth, height: mockHeight, scale: 1, fontScale: 1 };
  },
  addEventListener(
    _name: 'change',
    handler: (d: { window: { width: number; height: number } }) => void,
  ) {
    dimensionsListeners.add(handler);
    return {
      remove() {
        dimensionsListeners.delete(handler);
      },
    };
  },
};

/** Test-only: change the mock viewport width and notify listeners. */
export function __setDimensions(width: number, height = 640): void {
  mockWidth = width;
  mockHeight = height;
  for (const fn of dimensionsListeners) {
    fn({ window: { width: mockWidth, height: mockHeight } });
  }
}

// `Appearance` mock - used by `useThemeSetting`. Defaults to `'light'`;
// tests can flip via `__setColorScheme('dark')`.
type ColorScheme = 'light' | 'dark' | null;
let mockColorScheme: ColorScheme = 'light';
const appearanceListeners = new Set<(p: { colorScheme: ColorScheme }) => void>();
export const Appearance = {
  getColorScheme(): ColorScheme {
    return mockColorScheme;
  },
  addChangeListener(handler: (p: { colorScheme: ColorScheme }) => void) {
    appearanceListeners.add(handler);
    return {
      remove() {
        appearanceListeners.delete(handler);
      },
    };
  },
};

/** Test-only: change the mock OS color scheme and notify listeners. */
export function __setColorScheme(next: ColorScheme): void {
  mockColorScheme = next;
  for (const fn of appearanceListeners) {
    fn({ colorScheme: next });
  }
}

let mockIsRTL = false;
export const I18nManager = {
  get isRTL(): boolean {
    return mockIsRTL;
  },
  doLeftAndRightSwapInRTL: true,
  allowRTL(): void {},
  forceRTL(): void {},
  swapLeftAndRightInRTL(): void {},
};

/** Test-only: set the mock global RTL flag (read by `I18nManager.isRTL`). */
export function __setIsRTL(next: boolean): void {
  mockIsRTL = next;
}

/**
 * `Animated` mock - minimal stub used by the default motion driver.
 * `Animated.Value` exposes `addListener` / `removeListener`, and
 * `Animated.timing(...).start()` synchronously notifies all listeners
 * with `{ value: 1 }` so tests don't depend on rAF timing. For
 * fine-grained progress assertions, tests register the noop driver or
 * a fake driver instead of relying on Animated's behaviour.
 */
class AnimatedValue {
  private listeners = new Map<string, (e: { value: number }) => void>();
  private nextId = 0;
  private current: number;

  constructor(initial: number) {
    this.current = initial;
  }

  addListener(fn: (e: { value: number }) => void): string {
    const id = String(this.nextId++);
    this.listeners.set(id, fn);
    return id;
  }

  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Mirrors RN's real `Animated.Value.setValue` - assigns the new
   * value and notifies all listeners. Test-only setter `__set` is
   * retained for fake-driver tests that drive partial progress
   * without going through the public API.
   */
  setValue(value: number): void {
    this.__set(value);
  }

  __set(value: number): void {
    this.current = value;
    for (const fn of this.listeners.values()) {
      fn({ value });
    }
  }

  __get(): number {
    return this.current;
  }
}

interface TimingHandle {
  start(callback?: (result: { finished: boolean }) => void): void;
}

/**
 * `Animated.View` mock - same DOM shape as the regular View host, but
 * tagged separately so motion-value tests can assert that the
 * animated-driver routed through it. Style entries holding
 * `AnimatedValue` instances are serialised as `__animatedValue:<n>`
 * markers in the `data-motif-style` attribute so tests can read the
 * MV-driven values without depending on AnimatedValue's class shape.
 */
const AnimatedView: ComponentType<HostProps> = (props: HostProps) => {
  const { children, style, testID, ...rest } = props;
  const serialisedStyle = serialiseAnimatedStyle(style);
  return createElement(
    'div',
    {
      'data-motif-host': 'Animated.View',
      ...(serialisedStyle === null ? {} : { 'data-motif-style': serialisedStyle }),
      ...(testID === undefined ? {} : { testID }),
      ...rest,
    },
    children,
  );
};
AnimatedView.displayName = 'Animated.View';

function serialiseAnimatedStyle(style: unknown): string | null {
  if (style === undefined || style === null) return null;
  return JSON.stringify(style, (_key, value) => {
    if (value instanceof AnimatedValue) {
      // Marker shape - tests can match on `__animatedValue` to recognise
      // an MV-driven slot, and `value` to read the current number.
      return { __animatedValue: true, value: value.__get() };
    }
    return value;
  });
}

export const Animated = {
  Value: AnimatedValue,
  View: AnimatedView,
  timing(value: AnimatedValue, config: { toValue: number; duration: number }): TimingHandle {
    return {
      start(callback?: (result: { finished: boolean }) => void) {
        // Fire one tick immediately at full progress. Tests that need
        // partial-progress steps poke `value.__set(t)` directly.
        value.__set(config.toValue);
        callback?.({ finished: true });
      },
    };
  },
  /**
   * `Animated.spring(value, config).start()` mirrors RN's spring API
   * just enough for the spring-driver tests: snaps the value to
   * `toValue` immediately, fires listeners, then resolves the start
   * callback. Tests that need physical-spring-step assertions register
   * a custom driver instead - the real RN spring loop isn't worth
   * simulating in vitest.
   */
  spring(
    value: AnimatedValue,
    config: { toValue: number },
  ): { start(cb?: (r: { finished: boolean }) => void): void; stop(): void } {
    let stopped = false;
    return {
      start(callback?: (r: { finished: boolean }) => void) {
        if (stopped) return;
        value.__set(config.toValue);
        callback?.({ finished: true });
      },
      stop() {
        stopped = true;
      },
    };
  },
  /**
   * `Animated.parallel(animations).start(...)` mirrors RN's API. The
   * mock fires every contained animation's `.start()` immediately;
   * the composite callback runs once on the result of the LAST
   * animation (matches RN's "settle when all settle" semantics in
   * the synchronous mock world).
   */
  parallel(animations: TimingHandle[]): TimingHandle {
    return {
      start(callback?: (result: { finished: boolean }) => void) {
        let last: { finished: boolean } = { finished: true };
        for (const a of animations) {
          a.start((r) => {
            last = r;
          });
        }
        callback?.(last);
      },
    };
  },
};

const passthrough = (t: number): number => t;
/**
 * `processColor` for hex, `rgb()` / `rgba()` and a few names, returning
 * 0xAARRGGBB like the real one; anything else is `undefined`.
 */
export function processColor(color: unknown): number | undefined {
  if (typeof color !== 'string') return undefined;
  const named: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    transparent: '#00000000',
  };
  const value = named[color] ?? color;
  let r: number;
  let g: number;
  let b: number;
  let a = 1;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
  const rgb = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(value);
  if (hex !== null) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join('') : hex[1]!;
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else if (rgb !== null) {
    r = Number(rgb[1]);
    g = Number(rgb[2]);
    b = Number(rgb[3]);
    if (rgb[4] !== undefined) a = Number(rgb[4]);
  } else {
    return undefined;
  }
  return ((Math.round(a * 255) << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

export const Easing = {
  linear: passthrough,
  ease: passthrough,
  in: (_easing: (t: number) => number): ((t: number) => number) => passthrough,
  out: (_easing: (t: number) => number): ((t: number) => number) => passthrough,
  inOut: (_easing: (t: number) => number): ((t: number) => number) => passthrough,
};
