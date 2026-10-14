import { useDrag, type UseDragOptions } from '@usemotif/react-native';
import { useCallback, useMemo, useRef, type ReactElement } from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { nativeText } from './_native-text.js';
import { clamp, snap } from './_range-math.js';
import { markValueText, type SliderMark } from './_slider-marks.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native range family - Slider / RangeSlider / Progress / RatingInput.
 *
 * Sliders and ratings use Pressable + onLayout to track the track's
 * width and translate touch X to a normalised value. The wrapper
 * exposes the exact same prop shape as the web variants, with `style`
 * / `thumbStyle` / `fillStyle` swapped to RN's `ViewStyle`.
 */

// ─────────── Slider ───────────────────────────────────────────────

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  accessibilityLabel?: string;
  style?: ViewStyle;
  thumbStyle?: ViewStyle;
  fillStyle?: ViewStyle;
  /** Points to mark along the track, each with an optional label. */
  marks?: ReadonlyArray<SliderMark>;
  markStyle?: ViewStyle;
  markLabelStyle?: ViewStyle;
}
export function Slider({
  value: controlled,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  orientation = 'horizontal',
  accessibilityLabel,
  style,
  thumbStyle,
  fillStyle,
  marks,
  markStyle,
  markLabelStyle,
}: SliderProps): ReactElement {
  const [value, commit] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const setValue = useCallback(
    (next: number) => {
      const v = clamp(snap(next, step, min), min, max);
      commit(v);
    },
    [commit, min, max, step],
  );

  const trackSize = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height, x, y } = e.nativeEvent.layout;
    trackSize.current = { width, height, x, y };
  };

  const updateFromEvent = (e: GestureResponderEvent): void => {
    if (disabled) return;
    const { width, height } = trackSize.current;
    const target = e.nativeEvent;
    const ratio =
      orientation === 'horizontal'
        ? width === 0
          ? 0
          : clamp(target.locationX / width, 0, 1)
        : height === 0
          ? 0
          : 1 - clamp(target.locationY / height, 0, 1);
    setValue(min + ratio * (max - min));
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityValue={withText({ min, max, now: value }, markValueText(marks, value))}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onLayout={onLayout}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={updateFromEvent}
      onResponderMove={updateFromEvent}
      style={[{ position: 'relative' }, style as ViewStyle]}
    >
      <View
        style={[
          { position: 'absolute' },
          orientation === 'horizontal'
            ? { left: 0, width: `${percent}%`, top: 0, bottom: 0 }
            : { bottom: 0, height: `${percent}%`, left: 0, right: 0 },
          fillStyle as ViewStyle,
        ]}
      />
      <Marks
        marks={marks}
        orientation={orientation}
        percentOf={(v) => ((v - min) / (max - min)) * 100}
        markStyle={markStyle}
        markLabelStyle={markLabelStyle}
      />
      <View
        style={[
          { position: 'absolute' },
          orientation === 'horizontal'
            ? { left: `${percent}%`, top: 0 }
            : { bottom: `${percent}%`, left: 0 },
          thumbStyle as ViewStyle,
        ]}
      />
    </View>
  );
}

function withText<T extends object>(value: T, text: string | undefined): T & { text?: string } {
  return text === undefined ? value : { ...value, text };
}

/** The marks along a track: hidden from assistive technology, which hears the value. */
function Marks({
  marks,
  orientation,
  percentOf,
  markStyle,
  markLabelStyle,
}: {
  marks: ReadonlyArray<SliderMark> | undefined;
  orientation: 'horizontal' | 'vertical';
  percentOf: (value: number) => number;
  markStyle: ViewStyle | undefined;
  markLabelStyle: ViewStyle | undefined;
}): ReactElement | null {
  if (marks === undefined || marks.length === 0) return null;
  return (
    <>
      {marks.map((mark) => (
        <View
          key={mark.value}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            { position: 'absolute' },
            orientation === 'horizontal'
              ? { left: `${percentOf(mark.value)}%` }
              : { bottom: `${percentOf(mark.value)}%` },
            markStyle as ViewStyle,
          ]}
        >
          {mark.label !== undefined ? (
            <View style={markLabelStyle}>{nativeText(mark.label)}</View>
          ) : null}
        </View>
      ))}
    </>
  );
}

// ─────────── RangeSlider ──────────────────────────────────────────

export interface RangeSliderProps {
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (next: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  thumbStyle?: ViewStyle;
  fillStyle?: ViewStyle;
  /** Lays the track out vertically, low values at the bottom. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical';
  /** Points to mark along the track, each with an optional label. */
  marks?: ReadonlyArray<SliderMark>;
  markStyle?: ViewStyle;
  markLabelStyle?: ViewStyle;
}
/**
 * Two thumbs over one track. Each thumb drags on its own through `useDrag`,
 * stopping at the other, and steps by `step` through the accessibility
 * increment and decrement actions.
 */
export function RangeSlider({
  value: controlled,
  defaultValue = [0, 100],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  accessibilityLabel,
  style,
  thumbStyle,
  fillStyle,
  orientation = 'horizontal',
  marks,
  markStyle,
  markLabelStyle,
}: RangeSliderProps): ReactElement {
  const [value, commit] = useControllableState<[number, number]>({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const valueRef = useRef(value);
  valueRef.current = value;
  const horizontal = orientation === 'horizontal';

  // A thumb is clamped at its neighbour rather than the pair being sorted, so
  // a thumb pushed past the other never swaps identities with it.
  const setThumb = useCallback(
    (idx: 0 | 1, raw: number) => {
      if (disabled) return;
      const cur = valueRef.current;
      const v = snap(raw, step, min);
      const next: [number, number] =
        idx === 0 ? [clamp(v, min, cur[1]), cur[1]] : [cur[0], clamp(v, cur[0], max)];
      if (next[idx] !== cur[idx]) commit(next);
    },
    [disabled, step, min, max, commit],
  );

  const track = useRef({ width: 0, height: 0 });
  const dragFrom = useRef<[number, number]>([0, 0]);
  const dragOptions = (idx: 0 | 1): UseDragOptions => ({
    axis: horizontal ? 'x' : 'y',
    onDragStart: () => {
      dragFrom.current[idx] = valueRef.current[idx];
    },
    onDrag: ({ offset }) => {
      const size = horizontal ? track.current.width : track.current.height;
      if (size === 0) return;
      const moved = horizontal ? offset.x : -offset.y;
      setThumb(idx, dragFrom.current[idx] + (moved / size) * (max - min));
    },
  });
  const drags = [useDrag(dragOptions(0)), useDrag(dragOptions(1))] as const;

  const pct = (v: number): number => ((v - min) / (max - min)) * 100;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        track.current = { width, height };
      }}
      style={[{ position: 'relative' }, style as ViewStyle]}
    >
      <View
        style={[
          { position: 'absolute' },
          horizontal
            ? {
                left: `${pct(value[0])}%`,
                width: `${pct(value[1]) - pct(value[0])}%`,
                top: 0,
                bottom: 0,
              }
            : {
                bottom: `${pct(value[0])}%`,
                height: `${pct(value[1]) - pct(value[0])}%`,
                left: 0,
                right: 0,
              },
          fillStyle as ViewStyle,
        ]}
      />
      <Marks
        marks={marks}
        orientation={orientation}
        percentOf={pct}
        markStyle={markStyle}
        markLabelStyle={markLabelStyle}
      />
      {([0, 1] as const).map((idx) => {
        const { Wrapper, dragProps } = drags[idx];
        return (
          <Wrapper key={idx}>
            <View
              {...(disabled ? {} : dragProps)}
              accessibilityRole="adjustable"
              accessibilityValue={withText(
                idx === 0
                  ? { min, max: value[1], now: value[0] }
                  : { min: value[0], max, now: value[1] },
                markValueText(marks, value[idx]),
              )}
              accessibilityState={{ disabled }}
              accessibilityActions={[
                { name: 'increment' as const },
                { name: 'decrement' as const },
              ]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'increment') setThumb(idx, value[idx] + step);
                else if (e.nativeEvent.actionName === 'decrement') setThumb(idx, value[idx] - step);
              }}
              style={[
                { position: 'absolute' },
                horizontal
                  ? { left: `${pct(value[idx])}%`, top: 0 }
                  : { bottom: `${pct(value[idx])}%`, left: 0 },
                thumbStyle as ViewStyle,
              ]}
            />
          </Wrapper>
        );
      })}
    </View>
  );
}

// ─────────── Progress ─────────────────────────────────────────────

export interface ProgressProps {
  value: number | null;
  max?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
  fillStyle?: ViewStyle;
}
export function Progress({
  value,
  max = 100,
  accessibilityLabel,
  style,
  fillStyle,
}: ProgressProps): ReactElement {
  const determinate = value !== null;
  const percent = determinate ? clamp((value / max) * 100, 0, 100) : 30;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={determinate ? { min: 0, max, now: value } : undefined}
      style={[{ position: 'relative', overflow: 'hidden' }, style as ViewStyle]}
    >
      <View style={[{ width: `${percent}%` }, fillStyle as ViewStyle]} />
    </View>
  );
}

// ─────────── RatingInput ──────────────────────────────────────────

export interface RatingInputProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (next: number) => void;
  count?: number;
  allowHalf?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  renderItem: (info: { index: number; filled: boolean; half: boolean }) => ReactElement;
  style?: ViewStyle;
}
export function RatingInput({
  value: controlled,
  defaultValue = 0,
  onValueChange,
  count = 5,
  allowHalf = false,
  disabled = false,
  accessibilityLabel,
  renderItem,
  style,
}: RatingInputProps): ReactElement {
  const [value, commit] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const step = allowHalf ? 0.5 : 1;
  const setValue = useCallback(
    (next: number) => {
      const v = clamp(snap(next, step), 0, count);
      commit(v);
    },
    [commit, count, step],
  );

  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value >= i + 0.5;
        return { i, filled, half };
      }),
    [count, value],
  );

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: count, now: value }}
      accessibilityState={{ disabled }}
      style={[{ flexDirection: 'row' }, style as ViewStyle]}
    >
      {items.map(({ i, filled, half }) => (
        <Pressable
          key={i}
          disabled={disabled}
          onPress={() => {
            if (disabled) return;
            // Tapping the i-th star sets value to i+1; consumers that
            // want half-step input set `allowHalf` and use the renderItem
            // info to show half-fills (the touch fires on the whole
            // pressable region; finer half-step UX needs a custom
            // gesture).
            setValue(i + 1);
          }}
        >
          {renderItem({ index: i, filled, half })}
        </Pressable>
      ))}
    </View>
  );
}
