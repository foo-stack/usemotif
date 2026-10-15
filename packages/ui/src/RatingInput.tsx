'use client';

import {
  RatingInput as HeadlessRatingInput,
  type RatingInputProps as HeadlessRatingInputProps,
} from '@usemotif/headless';
import type { CSSProperties, ReactElement } from 'react';
import { Box } from 'usemotif';
import { platformText } from './_platform-text.js';

export type RatingInputProps = Omit<HeadlessRatingInputProps, 'renderItem' | 'style'>;

const STYLE: CSSProperties = { gap: 4 };

// Module-scoped so it's a stable `renderItem` reference (lint: no-new-fn-as-prop).
// A filled or half star reads in the warning/amber tone; an empty one is a muted
// outline. (A true half-fill overlay is a follow-up; `allowHalf` is off by default.)
function renderThemedStar(info: { index: number; filled: boolean; half: boolean }): ReactElement {
  const on = info.filled || info.half;
  return (
    <Box
      as="span"
      fontSize={22}
      lineHeight={1}
      color={on ? '$colors.status.warning.fg' : '$colors.border.strong'}
    >
      {platformText(on ? '★' : '☆', {
        fontSize: 22,
        color: on ? '$colors.status.warning.fg' : '$colors.border.strong',
      })}
    </Box>
  );
}

/**
 * A themed star rating over the accessible headless `RatingInput` (`role="slider"`,
 * click-to-set, arrow-key navigation, optional `allowHalf`). Controlled or
 * uncontrolled.
 *
 * ```tsx
 * <RatingInput defaultValue={3} count={5} aria-label="Rate this" onValueChange={setStars} />
 * ```
 */
export function RatingInput(props: RatingInputProps) {
  return <HeadlessRatingInput {...props} renderItem={renderThemedStar} style={STYLE} />;
}
