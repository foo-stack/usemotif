'use client';

import {
  TimeInput as HeadlessTimeInput,
  type TimeInputProps as HeadlessTimeInputProps,
} from '@usemotif/headless';
import { useMemo, type CSSProperties } from 'react';
import { usePlatformStyle } from './_platform-style.js';

export type TimeInputProps = HeadlessTimeInputProps;

// The headless renders a native `<input type="time">`; the kit themes it via
// inline token CSS vars (hex fallbacks), merged under any caller `style`.
const TIME_STYLE: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radii-lg, 12px)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  background: 'var(--colors-surface-default, #fff)',
  color: 'var(--colors-text-default, #111)',
  font: 'inherit',
};

/**
 * A themed time field over the headless `TimeInput` - a native `<input type="time">`
 * (so it's keyboard- and form-native, with the platform time UI) with a token
 * theme and `precision` (`'minute'` | `'second'`).
 *
 * ```tsx
 * <TimeInput defaultValue="09:30" onChange={(e) => setTime(e.currentTarget.value)} />
 * ```
 */
export function TimeInput({ style, ...rest }: TimeInputProps) {
  const platformStyle = usePlatformStyle();
  const merged = useMemo<CSSProperties>(
    () => (style !== undefined ? { ...TIME_STYLE, ...style } : TIME_STYLE),
    [style],
  );
  return <HeadlessTimeInput {...rest} style={platformStyle(merged)} />;
}
