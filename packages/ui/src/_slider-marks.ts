import type { SliderMark } from '@usemotif/headless';
import type { CSSProperties } from 'react';

// Ticks sit centred on the track; labels hang below it (beside it when
// vertical). Token CSS vars with hex fallbacks, like the rest of the slider.
const TICK: CSSProperties = {
  width: 4,
  height: 4,
  borderRadius: 'var(--radii-full, 9999px)',
  background: 'var(--colors-text-muted, #6b7280)',
};
const LABEL: CSSProperties = {
  position: 'absolute',
  fontSize: 12,
  color: 'var(--colors-text-muted, #6b7280)',
  whiteSpace: 'nowrap',
};

export const MARK_STYLE: Record<'horizontal' | 'vertical', CSSProperties> = {
  horizontal: { ...TICK, top: '50%', transform: 'translate(-50%, -50%)' },
  vertical: { ...TICK, left: '50%', transform: 'translate(-50%, 50%)' },
};

export const MARK_LABEL_STYLE: Record<'horizontal' | 'vertical', CSSProperties> = {
  horizontal: { ...LABEL, top: 10, left: '50%', transform: 'translateX(-50%)' },
  vertical: { ...LABEL, left: 12, top: '50%', transform: 'translateY(-50%)' },
};

/** Room the track leaves for mark labels, so they do not overlap what follows. */
export function labelRoom(
  marks: ReadonlyArray<SliderMark> | undefined,
  orientation: 'horizontal' | 'vertical',
): CSSProperties {
  if (marks?.some((m) => m.label !== undefined) !== true) return {};
  return orientation === 'horizontal' ? { marginBottom: 22 } : { marginRight: 48 };
}
