import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Animated, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { mapEasing } from './_animation/animated.js';

/** Which axes to animate. Mirrors the web hook's option shape. */
export type LayoutAnimationKind = 'all' | 'position' | 'size';

export interface UseLayoutAnimationOptions {
  kind?: LayoutAnimationKind;
  /** Duration in seconds. Default `0.3`. */
  duration?: number;
  /** CSS easing keyword or `cubic-bezier(...)`. Default `'ease-in-out'`. */
  easing?: string;
}

/**
 * Cross-platform return shape. On native both `onLayout` and `style`
 * are populated - spread them onto a `Box` (or any RN View). The
 * `ref` is present for consumer access but the FLIP runs through
 * `onLayout` + the animated `style.transform`, not through the ref.
 */
export interface UseLayoutAnimationResult<T = unknown> {
  ref: RefObject<T | null>;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: ViewStyle;
}

/** One frame's layout snapshot. RN's onLayout fires with absolute
 * coordinates within the View's parent; FLIP only needs the relative
 * positional + size delta, so storing all four fields is sufficient. */
interface LayoutSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Animate a Box between its previous and next layout (FLIP) on native.
 *
 * RN has no synchronous measurement primitive equivalent to web's
 * `getBoundingClientRect()` inside `useLayoutEffect`, so the native
 * FLIP runs through `onLayout`:
 *
 * 1. The first `onLayout` records the initial layout.
 * 2. On every subsequent `onLayout`, the hook computes the delta
 *    from the previous snapshot, sets the underlying
 *    `Animated.Value`s to the inverse delta (placing the View
 *    visually where it was), and starts a parallel `Animated.timing`
 *    that interpolates each value back to identity.
 * 3. The `style` returned by the hook carries
 *    `{ transform: [{ translateX }, { translateY }, { scaleX }, { scaleY }] }`
 *    where each entry is the live Animated.Value. RN's Animated
 *    runtime drives the interpolation on the JS thread (the default
 *    driver) or the UI thread (Reanimated, when registered).
 *
 * The delta between "RN layout fires" and "first paint with the new
 * layout" is the visual cost - for one frame the View shows at its
 * new position before the inverse transform applies. Web's FLIP
 * avoids this because `useLayoutEffect` runs synchronously before
 * paint; RN has no such hook, so a one-frame flash at large layout
 * deltas is a known limitation. Most layout changes are small
 * enough that the flash isn't perceptible.
 *
 * Spread the returned bindings onto a `Box`:
 *
 * ```tsx
 * const { ref, onLayout, style } = useLayoutAnimation();
 * <Box ref={ref} onLayout={onLayout} style={style}>...</Box>
 * ```
 *
 * For the declarative case, `<Box layout>` wraps this hook
 * internally - see Box.tsx.
 *
 * @remarks
 * Uses `useNativeDriver: true` for the Animated.timing where supported
 * (transforms are native-driver-friendly), so the interpolation runs
 * off the JS thread on the default driver. Reanimated UI-thread
 * routing via the motion-driver registry is a follow-up.
 *
 * Reduced-motion: gate at the consumer site - pass `duration: 0` or
 * skip the hook under `useReducedMotion`.
 */
export function useLayoutAnimation<T = unknown>(
  options: UseLayoutAnimationOptions = {},
): UseLayoutAnimationResult<T> {
  const ref = useRef<T | null>(null);
  const lastLayoutRef = useRef<LayoutSnapshot | null>(null);
  const optsRef = useRef<UseLayoutAnimationOptions>(options);
  optsRef.current = options;

  // One Animated.Value per axis. Held in refs so the values persist
  // across renders without being reset. Initial state: identity
  // transform (0/0/1/1).
  const translateX = useRef<Animated.Value | null>(null);
  const translateY = useRef<Animated.Value | null>(null);
  const scaleX = useRef<Animated.Value | null>(null);
  const scaleY = useRef<Animated.Value | null>(null);
  if (translateX.current === null) translateX.current = new Animated.Value(0);
  if (translateY.current === null) translateY.current = new Animated.Value(0);
  if (scaleX.current === null) scaleX.current = new Animated.Value(1);
  if (scaleY.current === null) scaleY.current = new Animated.Value(1);

  // The in-flight FLIP animation. A rapid second layout (or unmount) must
  // stop it first - otherwise the previous parallel keeps driving the same
  // four Animated.Values alongside the new one, and an unmounted component
  // is left with a running animation. (Web got this interrupt/cleanup in
  // v1.1.2; native had none.)
  const running = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => () => running.current?.stop(), []);

  const onLayout = useCallback((event: LayoutChangeEvent): void => {
    const next: LayoutSnapshot = {
      x: event.nativeEvent.layout.x,
      y: event.nativeEvent.layout.y,
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
    const prev = lastLayoutRef.current;
    lastLayoutRef.current = next;

    if (prev === null) return;

    const opts = optsRef.current;
    const kind = opts.kind ?? 'all';
    const dx = kind === 'size' ? 0 : prev.x - next.x;
    const dy = kind === 'size' ? 0 : prev.y - next.y;
    const sx =
      kind === 'position' ? 1 : prev.width === 0 ? 1 : prev.width / Math.max(1, next.width);
    const sy =
      kind === 'position' ? 1 : prev.height === 0 ? 1 : prev.height / Math.max(1, next.height);

    if (dx === 0 && dy === 0 && sx === 1 && sy === 1) return;

    // Apply the inverse transform instantly.
    translateX.current!.setValue(dx);
    translateY.current!.setValue(dy);
    scaleX.current!.setValue(sx);
    scaleY.current!.setValue(sy);

    // Stop any in-flight FLIP before starting the next one.
    running.current?.stop();

    // Animate each axis back to identity.
    const durationMs = (opts.duration ?? 0.3) * 1000;
    const easingFn = mapEasing(opts.easing ?? 'ease-in-out');
    const anim = Animated.parallel([
      Animated.timing(translateX.current!, {
        toValue: 0,
        duration: durationMs,
        easing: easingFn,
        useNativeDriver: true,
      }),
      Animated.timing(translateY.current!, {
        toValue: 0,
        duration: durationMs,
        easing: easingFn,
        useNativeDriver: true,
      }),
      Animated.timing(scaleX.current!, {
        toValue: 1,
        duration: durationMs,
        easing: easingFn,
        useNativeDriver: true,
      }),
      Animated.timing(scaleY.current!, {
        toValue: 1,
        duration: durationMs,
        easing: easingFn,
        useNativeDriver: true,
      }),
    ]);
    running.current = anim;
    anim.start(() => {
      if (running.current === anim) running.current = null;
    });
  }, []);

  const style: ViewStyle = {
    transform: [
      { translateX: translateX.current as unknown as number },
      { translateY: translateY.current as unknown as number },
      { scaleX: scaleX.current as unknown as number },
      { scaleY: scaleY.current as unknown as number },
    ],
  };

  return { ref, onLayout, style };
}
