import type { ReactNode } from 'react';

/** A labelled point along a slider's track. */
export interface SliderMark {
  readonly value: number;
  /** Shown beside the mark. A string label also names the value for assistive
   * technology when the thumb sits on this mark. */
  readonly label?: ReactNode;
}

/** The text that names `value`, when it sits on a mark with a string label. */
export function markValueText(
  marks: ReadonlyArray<SliderMark> | undefined,
  value: number,
): string | undefined {
  const label = marks?.find((m) => m.value === value)?.label;
  return typeof label === 'string' ? label : undefined;
}
