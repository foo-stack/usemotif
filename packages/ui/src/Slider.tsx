'use client';

import {
  Slider as HeadlessSlider,
  type SliderProps as HeadlessSliderProps,
} from '@usemotif/headless';
import { useMemo, type CSSProperties } from 'react';
import { usePlatformStyle } from './_platform-style.js';
import { labelRoom, MARK_LABEL_STYLE, MARK_STYLE } from './_slider-marks.js';

export interface SliderProps extends Omit<
  HeadlessSliderProps,
  'style' | 'thumbStyle' | 'fillStyle' | 'orientation' | 'markStyle' | 'markLabelStyle'
> {
  /** Track length (number → px). Default 200. */
  readonly width?: number | string;
}

// The headless Slider renders its own track / fill / thumb `<div>`s, themeable
// only through inline style - so the kit references motif's token CSS vars
// (`--colors-*`, `--radii-*`) with hex fallbacks. Fill + thumb styles are
// value-independent, so they're hoisted to stable references (lint: no-new-object).
const FILL_STYLE: CSSProperties = {
  height: '100%',
  top: 0,
  borderRadius: 'var(--radii-full, 9999px)',
  background: 'var(--colors-action-primary-bg, #2563eb)',
};
const THUMB_STYLE: CSSProperties = {
  top: '50%',
  width: 16,
  height: 16,
  transform: 'translate(-50%, -50%)',
  borderRadius: 'var(--radii-full, 9999px)',
  background: 'var(--colors-surface-default, #fff)',
  border: '2px solid var(--colors-action-primary-bg, #2563eb)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  cursor: 'pointer',
};

/**
 * Themed range slider over the accessible headless `Slider` (drag, arrow-key /
 * Home / End / PageUp-Down navigation, `aria-valuenow`). The track, filled
 * portion, and thumb are themed from the token palette; controlled or
 * uncontrolled.
 *
 * ```tsx
 * <Slider defaultValue={40} min={0} max={100} aria-label="Volume" onValueChange={setVolume} />
 * ```
 */
export function Slider({ width = 200, ...rest }: SliderProps) {
  const platformStyle = usePlatformStyle();
  const disabled = rest.disabled ?? false;
  const trackStyle = useMemo<CSSProperties>(
    () => ({
      width,
      height: 6,
      borderRadius: 'var(--radii-full, 9999px)',
      background: 'var(--colors-surface-muted, #e5e7eb)',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...labelRoom(rest.marks, 'horizontal'),
    }),
    [width, disabled, rest.marks],
  );
  return (
    <HeadlessSlider
      {...rest}
      style={platformStyle(trackStyle)}
      fillStyle={platformStyle(FILL_STYLE)}
      thumbStyle={platformStyle(THUMB_STYLE)}
      markStyle={platformStyle(MARK_STYLE.horizontal)}
      markLabelStyle={platformStyle(MARK_LABEL_STYLE.horizontal)}
    />
  );
}
