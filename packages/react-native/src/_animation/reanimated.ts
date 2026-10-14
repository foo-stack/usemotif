import {
  TRANSFORM_AXIS_SET,
  composeTransformAxesNative,
  createMotionValue,
  type MotionValue,
  type TransformAxes,
  type TransformAxis,
} from '@usemotif/core';
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { motionValueSubscriptionKey } from './_mv-subscribe.js';
import { restingValueFor } from './resting.js';
import type {
  DragBackingOptions,
  DragBackingResult,
  MotionDriver,
  MotionDriverEntryOptions,
  MotionDriverExitOptions,
  MotionValueDriverBinding,
  MotionValueDriverResult,
  SpringBackingConfig,
  SpringBackingHandle,
  SpringBackingOptions,
} from './types.js';

// Metro's dynamic `require`. The package's main entry imports from
// `react-native`, which loads RN's ambient `require` global - but this
// file is a standalone package entry (`@usemotif/react-native/reanimated`)
// that only imports `react`/`@usemotif/core`, so its isolated declaration
// build wouldn't otherwise see the global. Declare it locally to stay
// self-sufficient. `unknown` return is fine: both call sites cast.
declare const require: (id: string) => unknown;

/**
 * Reanimated-backed driver - opt-in.
 *
 * Why opt-in: Reanimated is an optional peer dep. Statically importing
 * it from `@usemotif/react-native`'s entry point would force every
 * native consumer to install it, which we don't want. Apps that have
 * Reanimated installed import this file explicitly and call
 * `registerMotionDriver(reanimatedDriver)` once at startup.
 *
 * Bundle policy: this file is NOT re-exported from the package's
 * top-level `index.ts`. Tree-shaking is irrelevant on React Native
 * (Metro doesn't tree-shake by default), so we rely on path-level
 * code splitting instead - consumers reach this driver only via a
 * direct subpath import.
 *
 * ```tsx
 * import { registerMotionDriver } from '@usemotif/react-native';
 * import { reanimatedDriver } from '@usemotif/react-native/reanimated';
 *
 * registerMotionDriver(reanimatedDriver);
 * ```
 *
 * **UI-thread integration.** When Reanimated is loadable, the driver
 * runs animations through `useSharedValue` + `useAnimatedStyle` and
 * exposes Reanimated's `Animated.View` as `AnimatedHost`. Box then
 * renders that host so `useAnimatedStyle` results actually animate
 * on the UI thread (60fps without main-thread cost - the React
 * tree never re-renders during the animation).
 *
 * **Fallback path.** If Reanimated is registered but not actually
 * importable (peer missing, native module not linked yet), the
 * driver degrades to JS-thread `setState` interpolation - the same
 * shape as the v1 driver, so apps don't hang or crash. They just
 * lose the UI-thread benefit until the peer is properly installed.
 */

interface SharedValue<T> {
  value: T;
}

interface ReanimatedModule {
  readonly default?: { readonly View?: ComponentType<unknown> };
  readonly View?: ComponentType<unknown>;
  readonly useSharedValue?: <T>(initial: T) => SharedValue<T>;
  readonly useAnimatedStyle?: (worklet: () => Record<string, unknown>) => Record<string, unknown>;
  readonly useAnimatedReaction?: <T>(
    prepare: () => T,
    react: (current: T, previous: T | null) => void,
    deps?: ReadonlyArray<unknown>,
  ) => void;
  readonly withTiming?: (
    toValue: number,
    config?: { duration?: number; easing?: unknown },
    callback?: (finished: boolean) => void,
  ) => unknown;
  readonly withSpring?: (
    toValue: number,
    config?: {
      stiffness?: number;
      damping?: number;
      mass?: number;
      restSpeedThreshold?: number;
      restDisplacementThreshold?: number;
      velocity?: number;
    },
    callback?: (finished: boolean) => void,
  ) => unknown;
  readonly Easing?: Record<string, unknown>;
  readonly runOnJS?: <F extends (...args: unknown[]) => unknown>(fn: F) => F;
}

let cachedModule: ReanimatedModule | null | undefined;

function loadReanimated(): ReanimatedModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // Dynamic require so the static import graph never references
    // reanimated. Apps without it installed are unaffected.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('react-native-reanimated') as ReanimatedModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/**
 * Minimal shape of `react-native-gesture-handler`'s v2 API the
 * driver consumes. Exposed only enough to construct a `Pan` gesture
 * and wrap children in a `GestureDetector` host.
 */
interface PanGesture {
  onUpdate(
    cb: (e: {
      translationX: number;
      translationY: number;
      velocityX: number;
      velocityY: number;
    }) => void,
  ): PanGesture;
  onBegin(cb: () => void): PanGesture;
  onEnd(
    cb: (e: {
      translationX: number;
      translationY: number;
      velocityX: number;
      velocityY: number;
    }) => void,
  ): PanGesture;
  onFinalize(cb: () => void): PanGesture;
  runOnJS(value: boolean): PanGesture;
}

interface GestureHandlerModule {
  readonly Gesture?: { Pan(): PanGesture };
  readonly GestureDetector?: ComponentType<{
    gesture: PanGesture;
    children?: ReactNode;
  }>;
}

let cachedGestureHandler: GestureHandlerModule | null | undefined;

/** Test-only: stand in for the two peers, which no test runtime can load. */
export function _setPeersForTesting(reanimated: unknown, gestureHandler: unknown): void {
  cachedModule = reanimated as ReanimatedModule | null;
  cachedGestureHandler = gestureHandler as GestureHandlerModule | null;
}

function loadGestureHandler(): GestureHandlerModule | null {
  if (cachedGestureHandler !== undefined) return cachedGestureHandler;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedGestureHandler = require('react-native-gesture-handler') as GestureHandlerModule;
  } catch {
    cachedGestureHandler = null;
  }
  return cachedGestureHandler;
}

/**
 * Resolve Reanimated's `Animated.View` if the peer is loadable.
 * Drivers consume this via the {@link MotionDriver.AnimatedHost} slot;
 * Box renders it instead of plain `View` when motion props are
 * active. When Reanimated isn't loadable this stays `undefined` and
 * Box falls back to plain `View` (the JS-thread fallback path still
 * works because the driver's hook returns plain style records the
 * regular `View` understands).
 */
function resolveAnimatedHost(): ComponentType<unknown> | undefined {
  const r = loadReanimated();
  if (r === null) return undefined;
  return r.default?.View ?? r.View;
}

/**
 * Pick a Reanimated `Easing` function for a CSS-style keyword. Falls
 * back to a permissive `inOut` curve when the keyword isn't known -
 * matches the behaviour of the JS-thread driver and the web
 * fallback in `springToCssTiming`.
 */
function pickEasing(r: ReanimatedModule, easing: string): unknown {
  const e = r.Easing;
  if (e === undefined) return undefined;
  switch (easing) {
    case 'linear':
      return (e['linear'] as () => unknown | undefined)?.();
    case 'ease':
      return (e['ease'] as () => unknown | undefined)?.();
    case 'ease-in':
      return (e['in'] as ((fn: unknown) => unknown) | undefined)?.(e['ease']);
    case 'ease-out':
      return (e['out'] as ((fn: unknown) => unknown) | undefined)?.(e['ease']);
    case 'ease-in-out':
    default:
      return (e['inOut'] as ((fn: unknown) => unknown) | undefined)?.(e['ease']);
  }
}

/**
 * Build a worklet body that interpolates between `from` and `to` at
 * the current shared-value progress. Numeric keys interpolate
 * linearly; non-numeric keys snap at the midpoint (Reanimated has no
 * cross-fade primitive for arbitrary string values).
 *
 * The body MUST start with the `'worklet'` directive - Reanimated's
 * Babel plugin lifts the function body to the UI thread when this
 * directive is present, and degrades to a JS-thread call otherwise.
 */
function makeStyleWorklet(
  from: Record<string, string | number>,
  to: Record<string, string | number>,
  progress: SharedValue<number>,
): () => Record<string, unknown> {
  return function styleWorklet(): Record<string, unknown> {
    'worklet';
    const t = progress.value;
    const out: Record<string, unknown> = {};
    for (const k in from) {
      const fromValue = from[k];
      const toValue = to[k];
      if (typeof fromValue === 'number' && typeof toValue === 'number') {
        out[k] = fromValue + (toValue - fromValue) * t;
      } else if (typeof fromValue === 'number' && toValue === undefined) {
        // No explicit target: rest at the property's identity (opacity / scale
        // → 1, most numerics → 0), inlined because worklets can't call
        // restingValueFor. Callers now pre-complete the target, so this is a
        // safety net rather than the common path.
        const rest = k === 'opacity' || k === 'scale' || k === 'scaleX' || k === 'scaleY' ? 1 : 0;
        out[k] = fromValue + (rest - fromValue) * t;
      } else {
        out[k] = t < 0.5 ? fromValue : (toValue ?? fromValue);
      }
    }
    return out;
  };
}

const ANIMATED_HOST = resolveAnimatedHost();

export const reanimatedDriver: MotionDriver = {
  name: 'reanimated',
  AnimatedHost: ANIMATED_HOST,
  useEntryAnimation(opts: MotionDriverEntryOptions): Record<string, unknown> | null {
    const { from, to, durationMs, easing, delayMs = 0 } = opts;
    const r = loadReanimated();

    // Tease apart the two paths up-front (Rules of Hooks: both
    // branches must call the same hooks in the same order). We always
    // call useState + useEffect; the body inside swaps based on
    // whether the UI-thread integration is wireable.
    const uiThreadAvailable =
      r !== null &&
      r.useSharedValue !== undefined &&
      r.useAnimatedStyle !== undefined &&
      r.withTiming !== undefined;

    const progress = uiThreadAvailable ? r.useSharedValue!(0) : null;

    // JS-thread fallback: setProgress driven by rAF - same shape as
    // the v1 driver so tests / apps without Reanimated still land
    // sensibly when the driver is registered.
    const [jsProgress, setJsProgress] = useState(0);

    useEffect(() => {
      // `<Stack stagger>` populates delayMs. Delay both paths uniformly
      // via setTimeout - the rAF fallback's startedAt clock includes
      // the delay too so progress stays at 0 during the wait.
      let cancelled = false;
      const kickoff = (): void => {
        if (cancelled) return;
        if (uiThreadAvailable && progress !== null) {
          progress.value = r.withTiming!(1, {
            duration: durationMs,
            easing: pickEasing(r, easing),
          }) as unknown as number;
          return;
        }
        const startedAt = Date.now();
        const tick = (): void => {
          if (cancelled) return;
          const elapsed = Date.now() - startedAt;
          const t = Math.min(1, elapsed / durationMs);
          setJsProgress(t);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      const delayTimer = delayMs > 0 ? setTimeout(kickoff, delayMs) : null;
      if (delayTimer === null) kickoff();
      return () => {
        cancelled = true;
        if (delayTimer !== null) clearTimeout(delayTimer);
      };
      // Animation runs once on mount. Re-running mid-flight on prop
      // changes would jitter the entry; consumers that want re-trigger
      // semantics should remount the component.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // We unconditionally call useAnimatedStyle even on the fallback
    // path (with a noop worklet) so the hook count stays stable. When
    // we go through the fallback we ignore the return value.
    const animatedStyle = (r?.useAnimatedStyle ?? noopUseAnimatedStyle)(
      uiThreadAvailable && progress !== null
        ? makeStyleWorklet(
            from as Record<string, string | number>,
            to as Record<string, string | number>,
            progress,
          )
        : NOOP_WORKLET,
    );

    if (uiThreadAvailable) return animatedStyle;
    if (jsProgress >= 1) return null;
    return interpolate(from, to, jsProgress);
  },
  useExitAnimation(opts: MotionDriverExitOptions): Record<string, unknown> {
    const { from, to, durationMs, easing, onComplete, active = true } = opts;
    const r = loadReanimated();

    const uiThreadAvailable =
      r !== null &&
      r.useSharedValue !== undefined &&
      r.useAnimatedStyle !== undefined &&
      r.withTiming !== undefined;

    const progress = uiThreadAvailable ? r.useSharedValue!(0) : null;
    const [jsProgress, setJsProgress] = useState(0);

    useEffect(() => {
      // Idle until the boundary flips into the exiting phase. The
      // subtree stays mounted across the open phase (#219), so the run
      // starts when `active` goes true, not on mount.
      if (!active) return undefined;
      if (uiThreadAvailable && progress !== null) {
        const finish = (...args: unknown[]): unknown => {
          const finished = args[0] as boolean;
          if (finished) onComplete();
          return undefined;
        };
        // `withTiming`'s completion callback runs on the UI thread; if
        // `runOnJS` is exposed (it is in Reanimated 2+), bounce the
        // user-supplied callback back onto the JS thread to avoid
        // worklet/JS scope confusion.
        const cb = r.runOnJS !== undefined ? r.runOnJS(finish) : finish;
        progress.value = r.withTiming!(
          1,
          { duration: durationMs, easing: pickEasing(r, easing) },
          cb as (finished: boolean) => void,
        ) as unknown as number;
        return;
      }
      const startedAt = Date.now();
      let cancelled = false;
      let signalled = false;
      const tick = (): void => {
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        const t = Math.min(1, elapsed / durationMs);
        setJsProgress(t);
        if (t >= 1) {
          if (!signalled) {
            signalled = true;
            onComplete();
          }
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return () => {
        cancelled = true;
      };
      // Keyed on `active` so the run starts exactly when the boundary
      // enters 'exiting'. Other inputs are captured by closure at that
      // flip; we deliberately don't restart mid-flight on re-render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const animatedStyle = (r?.useAnimatedStyle ?? noopUseAnimatedStyle)(
      uiThreadAvailable && progress !== null
        ? makeStyleWorklet(
            from as Record<string, string | number>,
            to as Record<string, string | number>,
            progress,
          )
        : NOOP_WORKLET,
    );

    if (uiThreadAvailable) return animatedStyle;
    return interpolate(from, to, Math.min(jsProgress, 1));
  },
  useMotionValueBacking(bindings: readonly MotionValueDriverBinding[]): MotionValueDriverResult {
    const r = loadReanimated();
    const uiThreadAvailable =
      r !== null && r.useSharedValue !== undefined && r.useAnimatedStyle !== undefined;

    // Single shared record. Each binding occupies one key - non-axis
    // bindings under their cssProperty, transform-axis bindings under
    // their axis name (`x`, `rotate`, ...). The worklet walks the
    // record on the UI thread and composes the RN `transform` array
    // inline, so per-axis MV changes never round-trip through JS.
    const sharedRecord = (r?.useSharedValue ?? noopUseSharedValue)<Record<string, number>>(
      buildInitialRecord(bindings),
    );

    // Fallback path: setState-driven record. Used when reanimated is
    // registered but not actually loadable, or when running in test
    // environments without the native module.
    const [jsRecord, setJsRecord] = useState<Record<string, number>>(() =>
      buildInitialRecord(bindings),
    );

    // Partition bindings into the two key spaces the worklet has to
    // walk: regular css-property keys flow into the output style
    // record verbatim; axis keys feed the transform composer below.
    const nonAxisKeys: string[] = [];
    const boundAxes: TransformAxis[] = [];
    for (const b of bindings) {
      if (b.transformAxis !== undefined) boundAxes.push(b.transformAxis);
      else nonAxisKeys.push(b.cssProperty);
    }
    const hasAxes = boundAxes.length > 0;

    // Read bindings through a ref so the subscribe effect can depend on a
    // stable signature rather than the array identity (fresh every render).
    const bindingsRef = useRef(bindings);
    bindingsRef.current = bindings;
    const subKey = motionValueSubscriptionKey(bindings);

    useEffect(() => {
      const unsubs: Array<() => void> = [];
      for (const b of bindingsRef.current) {
        const initial = b.mv.get();
        if (typeof initial !== 'number') {
          // eslint-disable-next-line no-console
          console.warn(
            `[motif] motion value on '${b.cssProperty}' has non-numeric value - ` +
              `the reanimated driver supports numeric motion values only in v1.`,
          );
          continue;
        }
        const key = b.transformAxis ?? b.cssProperty;
        unsubs.push(
          b.mv.on('change', (v) => {
            if (typeof v !== 'number') return;
            if (uiThreadAvailable) {
              // Replace the record reference so Reanimated's top-level
              // identity change picks up the mutation. The UI-thread
              // worklet re-reads the record and recomposes transforms
              // inline - JS never composes.
              sharedRecord.value = { ...sharedRecord.value, [key]: v };
            } else {
              setJsRecord((prev) => ({ ...prev, [key]: v }));
            }
          }),
        );
      }
      return () => {
        for (const u of unsubs) u();
      };
      // Resubscribe only when the pairings change (`subKey`) or the thread
      // target flips. `sharedRecord`/`setJsRecord` are stable; bindings are
      // read from a ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subKey, uiThreadAvailable]);

    const animatedStyle = (r?.useAnimatedStyle ?? noopUseAnimatedStyle)(
      uiThreadAvailable
        ? buildTransformWorklet(sharedRecord, nonAxisKeys, boundAxes, hasAxes)
        : NOOP_WORKLET,
    );

    if (uiThreadAvailable) {
      // ANIMATED_HOST is undefined when reanimated is registered but
      // didn't expose a `View` (peer mismatch). Plain `View` is the
      // safe fallback there - reanimated's animated style results
      // degrade gracefully when handed to a regular View (no animation,
      // but no crash either).
      return ANIMATED_HOST === undefined
        ? { overlay: animatedStyle }
        : { overlay: animatedStyle, Host: ANIMATED_HOST };
    }
    return { overlay: composeFallbackRecord(jsRecord) };
  },
  useSpringBacking(opts: SpringBackingOptions): SpringBackingHandle {
    const r = loadReanimated();
    const uiThreadAvailable =
      r !== null &&
      r.useSharedValue !== undefined &&
      r.withSpring !== undefined &&
      r.useAnimatedReaction !== undefined &&
      r.runOnJS !== undefined;

    // Single shared value carrying the live spring value. The UI-thread
    // path drives it via `withSpring`; the fallback path drives it via
    // a JS-thread rAF integrator that writes the same `.value` so the
    // reaction wiring stays uniform.
    const shared = (r?.useSharedValue ?? noopUseSharedValue)<number>(opts.initial);

    const subscribersRef = useRef<Set<(value: number) => void>>(new Set());
    const valueRef = useRef<number>(opts.initial);
    const fallbackRafRef = useRef<number | null>(null);
    const fallbackStateRef = useRef<{
      velocity: number;
      target: number;
      lastTime: number;
      // See use-spring.ts: velocity resets to 0 on settle, so the configured
      // initial velocity must be applied once (first activation), not on
      // every settled→moving transition.
      seeded: boolean;
    }>({
      velocity: 0,
      target: opts.initial,
      lastTime: 0,
      seeded: false,
    });

    // Mirror the shared value back to JS-thread subscribers. We always
    // call a reaction-shaped hook to keep the hook count stable - when
    // Reanimated isn't loadable, `noopUseAnimatedReaction` runs and
    // does nothing (the rAF fallback in `setTarget` writes valueRef
    // + subscribers directly instead). When the peer IS loadable,
    // Reanimated's `useAnimatedReaction` wires the UI-thread shared
    // value through `runOnJS` back to the JS thread.
    const useReactionOrNoop = r?.useAnimatedReaction ?? noopUseAnimatedReaction;
    useReactionOrNoop<number>(
      () => {
        'worklet';
        return shared.value;
      },
      (current) => {
        'worklet';
        if (r?.runOnJS !== undefined) {
          const bridged = r.runOnJS(
            emitToSubscribers as unknown as (...args: unknown[]) => unknown,
          ) as unknown as (
            v: number,
            ref: { current: number },
            subs: Set<(value: number) => void>,
          ) => void;
          bridged(current, valueRef, subscribersRef.current);
        }
      },
    );

    useEffect(() => {
      return () => {
        const id = fallbackRafRef.current;
        if (id !== null) cancelAnimationFrame(id);
        fallbackRafRef.current = null;
      };
    }, []);

    return {
      get(): number {
        return valueRef.current;
      },
      setTarget(target: number, config: SpringBackingConfig): void {
        if (uiThreadAvailable && r?.withSpring !== undefined) {
          // withSpring returns Reanimated's animation handle; assigning
          // it to .value sets up the spring on the UI thread without
          // reallocating the shared value.
          shared.value = r.withSpring(target, {
            stiffness: config.stiffness,
            damping: config.damping,
            mass: config.mass,
            restSpeedThreshold: config.restSpeed,
            restDisplacementThreshold: config.restDistance,
            velocity: config.velocity,
          }) as unknown as number;
          return;
        }
        // Fallback path - JS-thread spring integrator. Same shape as the
        // inline integrator that used to live in useSpring; lifted here
        // so consumers see the same `Driver-routed` API regardless of
        // whether the peer is actually loadable.
        const state = fallbackStateRef.current;
        state.target = target;
        if (fallbackRafRef.current === null) {
          if (!state.seeded) {
            state.seeded = true;
            if (state.velocity === 0) state.velocity = config.velocity;
          }
          state.lastTime =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();
          fallbackRafRef.current = requestAnimationFrame(function step(now): void {
            const s = fallbackStateRef.current;
            const dt = Math.min((now - s.lastTime) / 1000, 0.064);
            s.lastTime = now;
            let value = valueRef.current;
            const force = -config.stiffness * (value - s.target) - config.damping * s.velocity;
            s.velocity += (force / config.mass) * dt;
            value += s.velocity * dt;
            if (
              Math.abs(s.velocity) < config.restSpeed &&
              Math.abs(value - s.target) < config.restDistance
            ) {
              s.velocity = 0;
              fallbackRafRef.current = null;
              valueRef.current = s.target;
              for (const cb of subscribersRef.current) cb(s.target);
              return;
            }
            valueRef.current = value;
            for (const cb of subscribersRef.current) cb(value);
            fallbackRafRef.current = requestAnimationFrame(step);
          });
        }
      },
      subscribe(cb: (value: number) => void): () => void {
        subscribersRef.current.add(cb);
        return () => {
          subscribersRef.current.delete(cb);
        };
      },
    };
  },
  useDragBacking(opts: DragBackingOptions): DragBackingResult | null {
    const r = loadReanimated();
    const gh = loadGestureHandler();
    const supported =
      r !== null &&
      r.useSharedValue !== undefined &&
      r.runOnJS !== undefined &&
      gh !== null &&
      gh.Gesture !== undefined &&
      gh.GestureDetector !== undefined;

    // Hooks called unconditionally so the order stays stable across
    // every render of the hosting component, regardless of whether the
    // peer detection swings (it doesn't in practice - both `cachedX`
    // flags freeze at module import - but the contract stays honest).
    const [mvs] = useState<{ x: MotionValue<number>; y: MotionValue<number> }>(() => ({
      x: createMotionValue(0),
      y: createMotionValue(0),
    }));
    const [isDragging, setIsDragging] = useState(false);
    const optsRef = useRef<DragBackingOptions>(opts);
    optsRef.current = opts;

    // Shared values that the gesture worklet writes to. Allocated on
    // every render via the unconditional hook call; when peers are
    // missing we still allocate but ignore the values.
    const sharedX = (r?.useSharedValue ?? noopUseSharedValue)<number>(0);
    const sharedY = (r?.useSharedValue ?? noopUseSharedValue)<number>(0);

    // useMemo also runs unconditionally; gesture construction is gated
    // inside the body. When the peer isn't there we return a sentinel
    // gesture object that is never actually mounted (Wrapper is unused).
    const gesture = useMemo(() => {
      if (!supported || gh?.Gesture === undefined || r?.runOnJS === undefined) return null;
      const onUpdateJS = (info: DragBackingInfoSnapshot): void => {
        sharedX.value = info.tx;
        sharedY.value = info.ty;
        const applied = applyConstraints(info.tx, info.ty, optsRef.current);
        mvs.x.set(applied.x);
        mvs.y.set(applied.y);
        optsRef.current.onDrag?.({
          offset: applied,
          velocity: { x: info.vx, y: info.vy },
        });
      };
      const onBeginJS = (): void => {
        setIsDragging(true);
        optsRef.current.onDragStart?.({
          offset: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
        });
      };
      const onEndJS = (info: DragBackingInfoSnapshot): void => {
        const applied = applyConstraints(info.tx, info.ty, optsRef.current);
        optsRef.current.onDragEnd?.({
          offset: applied,
          velocity: { x: info.vx, y: info.vy },
        });
      };
      const onFinalizeJS = (): void => {
        setIsDragging(false);
      };
      // Bridge each callback through runOnJS exactly once at gesture-
      // construction time; the gesture-handler runtime invokes them
      // from the UI thread on each event. The worklet directives mark
      // the wrapping closure as worklet-eligible.
      const onUpdate = r.runOnJS(
        onUpdateJS as unknown as (...args: unknown[]) => unknown,
      ) as unknown as (e: DragBackingInfoSnapshot) => void;
      const onBegin = r.runOnJS(
        onBeginJS as unknown as (...args: unknown[]) => unknown,
      ) as unknown as () => void;
      const onEnd = r.runOnJS(onEndJS as unknown as (...args: unknown[]) => unknown) as unknown as (
        e: DragBackingInfoSnapshot,
      ) => void;
      const onFinalize = r.runOnJS(
        onFinalizeJS as unknown as (...args: unknown[]) => unknown,
      ) as unknown as () => void;

      return gh
        .Gesture!.Pan()
        .onBegin(() => {
          'worklet';
          onBegin();
        })
        .onUpdate((e) => {
          'worklet';
          onUpdate({
            tx: e.translationX,
            ty: e.translationY,
            vx: e.velocityX,
            vy: e.velocityY,
          });
        })
        .onEnd((e) => {
          'worklet';
          onEnd({
            tx: e.translationX,
            ty: e.translationY,
            vx: e.velocityX,
            vy: e.velocityY,
          });
        })
        .onFinalize(() => {
          'worklet';
          onFinalize();
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supported]);

    // One component per gesture: a new component type on every render would
    // remount the dragged subtree when `isDragging` flips at gesture start,
    // detaching the gesture it is in the middle of.
    const GestureDetector = gh?.GestureDetector;
    const Wrapper = useMemo<ComponentType<{ children: ReactNode }> | null>(
      () =>
        gesture === null || GestureDetector === undefined
          ? null
          : ({ children }) => createElement(GestureDetector, { gesture }, children),
      [gesture, GestureDetector],
    );

    if (!supported || Wrapper === null) {
      return null;
    }

    return {
      dragProps: {},
      Wrapper,
      x: mvs.x,
      y: mvs.y,
      isDragging,
    };
  },
};

interface DragBackingInfoSnapshot {
  readonly tx: number;
  readonly ty: number;
  readonly vx: number;
  readonly vy: number;
}

/**
 * Apply axis-filter + constraints + elastic overshoot to a raw
 * translation, mirroring the same math the JS-thread useDrag uses.
 * Lifted out of the hook body so the worklet bridge can call it
 * without closing over component-local helpers.
 */
function applyConstraints(
  rawDx: number,
  rawDy: number,
  opts: DragBackingOptions,
): { x: number; y: number } {
  let dx = rawDx;
  let dy = rawDy;
  if (opts.axis === 'x') dy = 0;
  if (opts.axis === 'y') dx = 0;
  const c = opts.constraints;
  if (c === undefined) return { x: dx, y: dy };
  const elastic = Math.min(1, Math.max(0, opts.dragElastic));
  const rubber = (raw: number, lo: number | undefined, hi: number | undefined): number => {
    if (lo !== undefined && raw < lo) return lo + (raw - lo) * elastic;
    if (hi !== undefined && raw > hi) return hi + (raw - hi) * elastic;
    return raw;
  };
  return {
    x: rubber(dx, c.left, c.right),
    y: rubber(dy, c.top, c.bottom),
  };
}

/**
 * Bridge function used by `useAnimatedReaction` on the UI-thread spring
 * path. The reaction body bounces here via `runOnJS`; this writes the
 * latest shared-value into the JS-thread valueRef and notifies all MV
 * subscribers. Lifted out of `useSpringBacking` so the closure stays
 * stable and Reanimated's reaction plugin can serialise it cleanly.
 */
function emitToSubscribers(
  value: number,
  valueRef: { current: number },
  subscribers: Set<(v: number) => void>,
): void {
  valueRef.current = value;
  for (const cb of subscribers) cb(value);
}

/**
 * Build the `useAnimatedStyle` worklet body. The body composes the RN
 * `transform` array inline by walking an axis-name literal declared
 * inside the worklet (so the closure is fully serialisable - no
 * reference to module-level arrays or helper functions). Non-axis
 * style keys pass through verbatim.
 *
 * The `'worklet'` directive at the top of the returned function is
 * what makes Reanimated's Babel plugin lift the body to the UI thread.
 */
function buildTransformWorklet(
  sharedRecord: SharedValue<Record<string, number>>,
  nonAxisKeys: readonly string[],
  boundAxes: readonly TransformAxis[],
  hasAxes: boolean,
): () => Record<string, unknown> {
  return function styleWorklet(): Record<string, unknown> {
    'worklet';
    const record = sharedRecord.value;
    const out: Record<string, unknown> = {};

    for (let i = 0; i < nonAxisKeys.length; i++) {
      const key = nonAxisKeys[i] as string;
      out[key] = record[key];
    }

    if (!hasAxes) return out;

    // Canonical axis order, inlined so Reanimated's worklet plugin can
    // serialise the closure without referencing a module-level array.
    // Order matches TRANSFORM_AXIS_NAMES in @usemotif/core (translate →
    // rotate → scale → skew).
    const axisOrder = [
      'x',
      'y',
      'z',
      'rotate',
      'rotateX',
      'rotateY',
      'rotateZ',
      'scale',
      'scaleX',
      'scaleY',
      'skew',
      'skewX',
      'skewY',
    ];

    const transform: Array<Record<string, unknown>> = [];
    for (let i = 0; i < axisOrder.length; i++) {
      const axis = axisOrder[i];
      let isBound = false;
      for (let j = 0; j < boundAxes.length; j++) {
        if (boundAxes[j] === axis) {
          isBound = true;
          break;
        }
      }
      if (!isBound) continue;
      const v = record[axis as string];
      if (v === undefined) continue;
      if (axis === 'x') transform.push({ translateX: v });
      else if (axis === 'y') transform.push({ translateY: v });
      else if (axis === 'z') transform.push({ translateZ: v });
      else if (axis === 'scale') transform.push({ scale: v });
      else if (axis === 'scaleX') transform.push({ scaleX: v });
      else if (axis === 'scaleY') transform.push({ scaleY: v });
      else if (axis === 'rotate') transform.push({ rotate: v + 'deg' });
      else if (axis === 'rotateX') transform.push({ rotateX: v + 'deg' });
      else if (axis === 'rotateY') transform.push({ rotateY: v + 'deg' });
      else if (axis === 'rotateZ') transform.push({ rotateZ: v + 'deg' });
      else if (axis === 'skew') {
        const s = v + 'deg';
        transform.push({ skewX: s });
        transform.push({ skewY: s });
      } else if (axis === 'skewX') transform.push({ skewX: v + 'deg' });
      else if (axis === 'skewY') transform.push({ skewY: v + 'deg' });
    }

    out.transform = transform;
    return out;
  };
}

/**
 * JS-thread fallback composer. Walks the JS-side record, separates
 * axis keys from regular style keys, and runs the canonical
 * {@link composeTransformAxesNative} so the fallback path produces
 * the same `transform` array shape Box's native style consumer
 * expects. Used only when the Reanimated peer isn't actually loadable.
 */
function composeFallbackRecord(record: Record<string, number>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const axes: TransformAxes = {};
  let hasAxes = false;
  for (const k in record) {
    if (TRANSFORM_AXIS_SET.has(k)) {
      axes[k as TransformAxis] = record[k] as number;
      hasAxes = true;
    } else {
      out[k] = record[k];
    }
  }
  if (hasAxes) {
    const composed = composeTransformAxesNative(axes);
    if (composed !== undefined) out.transform = composed;
  }
  return out;
}

function buildInitialRecord(bindings: readonly MotionValueDriverBinding[]): Record<string, number> {
  // Every binding gets one slot keyed by `transformAxis ?? cssProperty`
  // - axis bindings stay independent so the worklet can pick the right
  // RN transform entry per axis at compose time.
  const initial: Record<string, number> = {};
  for (const b of bindings) {
    const v = b.mv.get();
    if (typeof v !== 'number') continue;
    const key = b.transformAxis ?? b.cssProperty;
    initial[key] = v;
  }
  return initial;
}

function noopUseSharedValue<T>(initial: T): { value: T } {
  // Returns a fresh shell each render. The fallback path doesn't
  // depend on its identity - it reads from jsRecord instead. Calling
  // a hook here would risk rules-of-hooks violations if the runtime
  // branch ever flipped (it can't, in practice - `loadReanimated()`
  // caches - but the plain factory keeps the contract honest).
  return { value: initial };
}

const NOOP_WORKLET = (): Record<string, unknown> => ({});

function noopUseAnimatedStyle(_worklet: () => Record<string, unknown>): Record<string, unknown> {
  // The fallback path doesn't read this - see consumers above.
  return {};
}

function noopUseAnimatedReaction<T>(
  _prepare: () => T,
  _react: (current: T, previous: T | null) => void,
): void {
  // Reanimated-not-loadable fallback for the spring backing. The JS
  // integrator in `setTarget` writes valueRef + subscribers directly,
  // so the bridge isn't needed here.
}

function interpolate(
  from: Record<string, string | number>,
  to: Record<string, string | number>,
  t: number,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, fromValue] of Object.entries(from)) {
    const toValue = to[k];
    if (typeof fromValue === 'number' && typeof toValue === 'number') {
      out[k] = fromValue + (toValue - fromValue) * t;
    } else if (typeof fromValue === 'number' && toValue === undefined) {
      // Interpolate toward the property's natural resting value (opacity → 1,
      // most numerics → 0), not a blind 0 - see animated.ts for the rationale.
      const rest = restingValueFor(k);
      const restNum = typeof rest === 'number' ? rest : 0;
      out[k] = fromValue + (restNum - fromValue) * t;
    } else {
      out[k] = t < 0.5 ? fromValue : (toValue ?? fromValue);
    }
  }
  return out;
}
