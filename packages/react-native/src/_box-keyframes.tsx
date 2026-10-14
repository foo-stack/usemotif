import type { Keyframe, Theme } from '@usemotif/core';
import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, View, type ViewProps, type ViewStyle } from 'react-native';
import { mapEasing } from './_animation/animated.js';
import {
  compileKeyframes,
  keyframeProgress,
  sampleKeyframes,
  type KeyframeTiming,
} from './_keyframes.js';

export interface BoxWithKeyframesProps {
  readonly passThrough: ViewProps;
  /** The resolved style, read for values a keyframe leaves out of its end stops. */
  readonly baseStyle: Readonly<Record<string, unknown>>;
  /** `baseStyle` as a registered sheet entry, the first entry of the style array. */
  readonly box: ViewStyle;
  readonly userStyle: ViewStyle | readonly ViewStyle[] | undefined;
  readonly keyframe: Keyframe & { readonly frames: NonNullable<Keyframe['frames']> };
  readonly timing: KeyframeTiming;
  readonly easing: string;
  readonly paused: boolean;
  readonly animatedHost: boolean;
  readonly theme: Theme | undefined;
  readonly children?: ReactNode;
}

/**
 * Milliseconds since the animation named `name` started, advanced every frame
 * until `endMs` and frozen while `paused`. A new `name` restarts it, as a new
 * `animation-name` does in CSS.
 */
function useKeyframeClock(name: string, paused: boolean, endMs: number): number {
  const [clock, setClock] = useState({ name, elapsed: 0 });
  const elapsedRef = useRef(0);
  if (clock.name !== name) {
    elapsedRef.current = 0;
    setClock({ name, elapsed: 0 });
  }

  useEffect(() => {
    if (paused || elapsedRef.current >= endMs) return;
    const origin = Date.now() - elapsedRef.current;
    let frame = 0;
    const tick = (): void => {
      const elapsed = Date.now() - origin;
      elapsedRef.current = elapsed;
      setClock({ name, elapsed });
      if (elapsed < endMs) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [name, paused, endMs]);

  return clock.name === name ? clock.elapsed : 0;
}

/**
 * Runs an object-form `animation` whose `name` is a `keyframes()` result,
 * layering the sampled style between the resolved style and the user `style`.
 *
 * ponytail: samples on the JS thread and re-renders once per frame, like the
 * Animated enter/exit driver. Move to precomputed native-driver interpolation
 * if a long-running keyframe animation measurably drops frames.
 */
export function BoxWithKeyframesNative(props: BoxWithKeyframesProps) {
  const { passThrough, baseStyle, box, userStyle, keyframe, timing, paused, theme } = props;
  const { frames } = keyframe;
  const stops = useMemo(() => compileKeyframes(frames, theme), [frames, theme]);
  const ease = useMemo(() => mapEasing(props.easing), [props.easing]);
  const endMs = timing.delayMs + timing.durationMs * timing.iterations;
  const elapsed = useKeyframeClock(keyframe.name, paused, endMs);

  const { progress } = keyframeProgress(elapsed, timing);
  const frame =
    progress === null
      ? undefined
      : (sampleKeyframes(stops, progress, ease, baseStyle) as ViewStyle);
  const style: (ViewStyle | undefined)[] = [box, frame];
  if (Array.isArray(userStyle)) style.push(...(userStyle as ViewStyle[]));
  else if (userStyle !== undefined) style.push(userStyle as ViewStyle);

  const Host = (props.animatedHost ? Animated.View : View) as typeof View;
  return createElement(Host, { ...passThrough, style }, props.children);
}
