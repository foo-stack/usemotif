'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { clamp, snap } from './_range-math.js';
import { markValueText, type SliderMark } from './_slider-marks.js';

export type { SliderMark } from './_slider-marks.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Range family - Slider, RangeSlider, Progress, RatingInput.
 *
 * All headless: ARIA wiring + keyboard navigation, no styling.
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
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Inline style for the track wrapper. */
  style?: CSSProperties;
  /** Inline style for the thumb. */
  thumbStyle?: CSSProperties;
  /** Inline style for the filled track. */
  fillStyle?: CSSProperties;
  /** Points to mark along the track, each with an optional label. */
  marks?: ReadonlyArray<SliderMark>;
  /** Inline style for each mark. */
  markStyle?: CSSProperties;
  /** Inline style for each mark's label. */
  markLabelStyle?: CSSProperties;
}
export const Slider = forwardRef(function Slider(
  {
    value: controlled,
    defaultValue = 0,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = 'horizontal',
    style,
    thumbStyle,
    fillStyle,
    marks,
    markStyle,
    markLabelStyle,
    ...aria
  }: SliderProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const [value, commit] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const setValue = useCallback(
    // `exact` skips the step-snap so Home/End can reach an endpoint that is
    // off the step lattice (min=0, max=100, step=3: End must reach 100, not
    // snap down to 99 - aria-valuemax advertises 100).
    (next: number, exact = false) => {
      const v = clamp(exact ? next : snap(next, step, min), min, max);
      commit(v);
    },
    [commit, min, max, step],
  );
  const trackRef = useRef<HTMLDivElement | null>(null);
  const percent = ((value - min) / (max - min)) * 100;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return;
    const incKeys =
      orientation === 'horizontal' ? ['ArrowRight', 'ArrowUp'] : ['ArrowUp', 'ArrowRight'];
    const decKeys =
      orientation === 'horizontal' ? ['ArrowLeft', 'ArrowDown'] : ['ArrowDown', 'ArrowLeft'];
    if (incKeys.includes(e.key)) {
      e.preventDefault();
      setValue(value + step);
    } else if (decKeys.includes(e.key)) {
      e.preventDefault();
      setValue(value - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setValue(min, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      setValue(max, true);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setValue(value + step * 10);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setValue(value - step * 10);
    }
  }

  // Holds the teardown for an in-flight pointer drag so it can be run on
  // unmount - otherwise a Slider that unmounts mid-drag (e.g. inside a
  // Popover that closes on the same interaction) leaks the pointermove /
  // pointerup listeners and keeps calling setValue after unmount.
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanupRef.current?.(), []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    if (disabled || trackRef.current === null) return;
    dragCleanupRef.current = trackPointer(trackRef.current, e, orientation, (ratio) =>
      setValue(min + ratio * (max - min)),
    );
  }

  return (
    <div
      ref={(node) => {
        trackRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref !== null && ref !== undefined)
          (ref as React.RefObject<HTMLDivElement | null>).current = node;
      }}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled || undefined}
      aria-orientation={orientation}
      aria-valuetext={markValueText(marks, value)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      style={{
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        ...style,
      }}
      {...aria}
    >
      <div
        style={{
          position: 'absolute',
          [orientation === 'horizontal' ? 'left' : 'bottom']: 0,
          [orientation === 'horizontal' ? 'width' : 'height']: `${percent}%`,
          ...fillStyle,
        }}
      />
      <Marks
        marks={marks}
        orientation={orientation}
        percentOf={(v) => ((v - min) / (max - min)) * 100}
        isActive={(v) => v <= value}
        markStyle={markStyle}
        markLabelStyle={markLabelStyle}
      />
      <div
        style={{
          position: 'absolute',
          [orientation === 'horizontal' ? 'left' : 'bottom']: `${percent}%`,
          ...thumbStyle,
        }}
      />
    </div>
  );
});

/**
 * Captures the pointer on `track` and reports where along it the pointer sits,
 * 0 at the start and 1 at the end, from the press until it is released or
 * cancelled. Returns the teardown, for a slider unmounted mid-drag.
 */
function trackPointer(
  track: HTMLElement,
  e: PointerEvent<HTMLElement>,
  orientation: 'horizontal' | 'vertical',
  onRatio: (ratio: number) => void,
): () => void {
  track.setPointerCapture(e.pointerId);
  const report = (clientX: number, clientY: number): void => {
    const rect = track.getBoundingClientRect();
    onRatio(
      orientation === 'horizontal'
        ? (clientX - rect.left) / rect.width
        : 1 - (clientY - rect.top) / rect.height,
    );
  };
  report(e.clientX, e.clientY);
  const onMove = (mv: globalThis.PointerEvent): void => report(mv.clientX, mv.clientY);
  const cleanup = (): void => {
    track.removeEventListener('pointermove', onMove);
    track.removeEventListener('pointerup', cleanup);
    // `pointercancel` (common on touch) must also tear down, or the move
    // listener leaks until GC.
    track.removeEventListener('pointercancel', cleanup);
  };
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', cleanup);
  track.addEventListener('pointercancel', cleanup);
  return cleanup;
}

/**
 * The marks along a track: decorative (`aria-hidden`), since the slider itself
 * announces its value. `data-active` flags those inside the filled range.
 */
function Marks({
  marks,
  orientation,
  percentOf,
  isActive,
  markStyle,
  markLabelStyle,
}: {
  marks: ReadonlyArray<SliderMark> | undefined;
  orientation: 'horizontal' | 'vertical';
  percentOf: (value: number) => number;
  isActive: (value: number) => boolean;
  markStyle: CSSProperties | undefined;
  markLabelStyle: CSSProperties | undefined;
}): ReactElement | null {
  if (marks === undefined || marks.length === 0) return null;
  return (
    <>
      {marks.map((mark) => (
        <div
          key={mark.value}
          aria-hidden
          data-active={isActive(mark.value) || undefined}
          style={{
            position: 'absolute',
            [orientation === 'horizontal' ? 'left' : 'bottom']: `${percentOf(mark.value)}%`,
            ...markStyle,
          }}
        >
          {mark.label !== undefined ? <span style={markLabelStyle}>{mark.label}</span> : null}
        </div>
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
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Inline style for the track wrapper. */
  style?: CSSProperties;
  /** Inline style for each thumb (positioned absolutely per its value). */
  thumbStyle?: CSSProperties;
  /** Inline style for the filled segment between the two thumbs. */
  fillStyle?: CSSProperties;
  /** Lay the track out vertically, the low thumb at the bottom. Defaults to
   * `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical';
  /** Points to mark along the track, each with an optional label. */
  marks?: ReadonlyArray<SliderMark>;
  /** Inline style for each mark. */
  markStyle?: CSSProperties;
  /** Inline style for each mark's label. */
  markLabelStyle?: CSSProperties;
}
export function RangeSlider({
  value: controlled,
  defaultValue = [0, 100],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  style,
  thumbStyle,
  fillStyle,
  orientation = 'horizontal',
  marks,
  markStyle,
  markLabelStyle,
  ...aria
}: RangeSliderProps): ReactElement {
  const [value, commit] = useControllableState<[number, number]>({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const setValue = useCallback(
    (next: [number, number], exact = false) => {
      // `exact` skips the step-snap for Home/End so a thumb can reach an
      // off-lattice min/max endpoint (see Slider).
      const q = (n: number): number => (exact ? n : snap(n, step, min));
      // Clamp each thumb against its neighbor's *current* position rather
      // than sorting the pair afterwards. Sorting swaps thumb identities
      // when one thumb is driven past the other - moving thumb 0 above
      // thumb 1 lands the larger value at index 1, so the thumb the user
      // is dragging silently becomes the other one and per-thumb
      // aria-valuemin/aria-valuemax (derived from value[0]/value[1])
      // describe the wrong thumb. Only one thumb moves per interaction, so
      // the other's current value is the correct bound.
      const v: [number, number] = [
        clamp(q(next[0]), min, value[1]),
        clamp(q(next[1]), value[0], max),
      ];
      commit(v);
    },
    [commit, min, max, step, value],
  );
  const valueRef = useRef(value);
  valueRef.current = value;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanupRef.current?.(), []);

  // A press on the track takes the nearest thumb, or on a tie the one on the
  // side the pointer is, and drags it until release.
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    if (disabled || trackRef.current === null) return;
    let idx: 0 | 1 | undefined;
    dragCleanupRef.current = trackPointer(trackRef.current, e, orientation, (ratio) => {
      const v = min + ratio * (max - min);
      const cur = valueRef.current;
      if (idx === undefined) {
        const toLow = Math.abs(v - cur[0]);
        const toHigh = Math.abs(v - cur[1]);
        idx = toLow < toHigh ? 0 : toHigh < toLow ? 1 : v < cur[0] ? 0 : 1;
      }
      const next: [number, number] = [...cur];
      next[idx] = v;
      setValue(next);
    });
  }

  function thumbHandlers(idx: 0 | 1): {
    role: 'slider';
    tabIndex: number;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-orientation': 'horizontal' | 'vertical';
    'aria-valuetext': string | undefined;
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  } {
    return {
      role: 'slider',
      tabIndex: disabled ? -1 : 0,
      'aria-valuenow': value[idx],
      'aria-valuemin': idx === 0 ? min : value[0],
      'aria-valuemax': idx === 1 ? max : value[1],
      'aria-orientation': orientation,
      'aria-valuetext': markValueText(marks, value[idx]),
      onKeyDown: (e) => {
        if (disabled) return;
        const next: [number, number] = [...value];
        const inc = e.key === 'ArrowRight' || e.key === 'ArrowUp';
        const dec = e.key === 'ArrowLeft' || e.key === 'ArrowDown';
        let exact = false;
        if (inc) next[idx] = value[idx] + step;
        else if (dec) next[idx] = value[idx] - step;
        else if (e.key === 'Home') {
          next[idx] = idx === 0 ? min : value[0];
          exact = true;
        } else if (e.key === 'End') {
          next[idx] = idx === 1 ? max : value[1];
          exact = true;
        } else return;
        e.preventDefault();
        setValue(next, exact);
      },
    };
  }

  // Position the thumbs (and the filled segment between them) by percent so a
  // styled RangeSlider is usable, not just keyboard-accessible. The thumb
  // handlers carry the slider role + arrow-key nav; the inline left/width is the
  // visual placement consumers theme over via thumbStyle / fillStyle.
  const pct = (v: number): number => ((v - min) / (max - min)) * 100;
  const start = orientation === 'horizontal' ? 'left' : 'bottom';
  const length = orientation === 'horizontal' ? 'width' : 'height';
  return (
    <div
      ref={trackRef}
      data-orientation={orientation}
      onPointerDown={onPointerDown}
      style={{ position: 'relative', userSelect: 'none', touchAction: 'none', ...style }}
      {...aria}
    >
      <div
        style={{
          position: 'absolute',
          [start]: `${pct(value[0])}%`,
          [length]: `${pct(value[1]) - pct(value[0])}%`,
          ...fillStyle,
        }}
      />
      <Marks
        marks={marks}
        orientation={orientation}
        percentOf={pct}
        isActive={(v) => v >= value[0] && v <= value[1]}
        markStyle={markStyle}
        markLabelStyle={markLabelStyle}
      />
      <div
        {...thumbHandlers(0)}
        style={{ position: 'absolute', [start]: `${pct(value[0])}%`, ...thumbStyle }}
      />
      <div
        {...thumbHandlers(1)}
        style={{ position: 'absolute', [start]: `${pct(value[1])}%`, ...thumbStyle }}
      />
    </div>
  );
}

// ─────────── Progress ─────────────────────────────────────────────

export interface ProgressProps {
  /** 0..100 by default; pass `max` to scale. Pass `null` for
   * indeterminate state (no aria-valuenow). */
  value: number | null;
  max?: number;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  style?: CSSProperties;
  /** Inline style for the filled track. */
  fillStyle?: CSSProperties;
}
export function Progress({
  value,
  max = 100,
  style,
  fillStyle,
  ...aria
}: ProgressProps): ReactElement {
  const id = useId();
  const determinate = value !== null;
  const percent = determinate ? clamp((value / max) * 100, 0, 100) : 0;
  return (
    <div
      role="progressbar"
      id={id}
      {...(determinate ? { 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': max } : {})}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      {...aria}
    >
      <div
        style={{
          width: determinate ? `${percent}%` : '30%',
          ...fillStyle,
        }}
      />
    </div>
  );
}

// ─────────── RatingInput ──────────────────────────────────────────

export interface RatingInputProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (next: number) => void;
  /** Number of items. Defaults to 5. */
  count?: number;
  /** Allow half-step ratings via Shift+Arrow keys. Off by default. */
  allowHalf?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  /** Render fn for each item. Receives `{ index, filled, half }`. */
  renderItem: (info: { index: number; filled: boolean; half: boolean }) => ReactElement;
  style?: CSSProperties;
}
export function RatingInput({
  value: controlled,
  defaultValue = 0,
  onValueChange,
  count = 5,
  allowHalf = false,
  disabled = false,
  renderItem,
  style,
  ...aria
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

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setValue(value + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setValue(value - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setValue(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setValue(count);
    }
  }

  return (
    <div
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      style={{ display: 'inline-flex', cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
      {...aria}
    >
      {Array.from({ length: count }, (_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value >= i + 0.5;
        return (
          // The wrapper just enables click-to-set; keyboard activation
          // lives on the parent slider role + arrow keys. Lint can't
          // see the parent handler.
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <span
            key={i}
            onMouseDown={(e: MouseEvent<HTMLSpanElement>) => {
              if (disabled) return;
              e.preventDefault();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const v = i + (allowHalf && ratio < 0.5 ? 0.5 : 1);
              setValue(v);
            }}
          >
            {renderItem({ index: i, filled, half })}
          </span>
        );
      })}
    </div>
  );
}
