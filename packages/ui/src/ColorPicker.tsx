'use client';

import {
  ColorPicker as HeadlessColorPicker,
  type ColorPickerProps as HeadlessColorPickerProps,
} from '@usemotif/headless';
import type { CSSProperties } from 'react';

export type ColorPickerProps = Omit<
  HeadlessColorPickerProps,
  | 'style'
  | 'saturationValueStyle'
  | 'saturationValueThumbStyle'
  | 'hueSliderStyle'
  | 'alphaSliderStyle'
  | 'swatchStyle'
  | 'eyeDropperStyle'
>;

// The headless renders its own SV plane / hue / alpha tracks (with the colour
// gradients baked in); the kit supplies size + radius + the surrounding card via
// the per-part style hooks, referencing motif's token CSS vars.
const ROOT_STYLE: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  gap: 10,
  padding: 10,
  borderRadius: 'var(--radii-lg, 12px)',
  background: 'var(--colors-surface-default, #fff)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
};
const SV_STYLE: CSSProperties = { width: 220, height: 150, borderRadius: 'var(--radii-md, 8px)' };
const SV_THUMB_STYLE: CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: '9999px',
  border: '2px solid #fff',
  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.35)',
};
const SLIDER_STYLE: CSSProperties = { width: 220, height: 12, borderRadius: '9999px' };
const SWATCH_STYLE: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 'var(--radii-sm, 4px)',
  boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.15)',
};
const EYEDROPPER_STYLE: CSSProperties = {
  alignSelf: 'flex-start',
  padding: '4px 10px',
  borderRadius: 'var(--radii-md, 8px)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  background: 'var(--colors-surface-raised, #fff)',
  color: 'var(--colors-text-default, #111)',
  cursor: 'pointer',
};

/**
 * Themed HSV colour picker over the accessible headless `ColorPicker` (drag the
 * saturation×value plane, hue + optional alpha sliders, a hex/rgb/hsl format
 * toggle, full keyboard control). The kit wraps the parts in a token-themed card.
 *
 * ```tsx
 * <ColorPicker value={color} onValueChange={setColor} format="rgb" allowAlpha />
 * ```
 */
export function ColorPicker(props: ColorPickerProps) {
  return (
    <HeadlessColorPicker
      {...props}
      style={ROOT_STYLE}
      saturationValueStyle={SV_STYLE}
      saturationValueThumbStyle={SV_THUMB_STYLE}
      hueSliderStyle={SLIDER_STYLE}
      alphaSliderStyle={SLIDER_STYLE}
      swatchStyle={SWATCH_STYLE}
      eyeDropperStyle={EYEDROPPER_STYLE}
    />
  );
}
