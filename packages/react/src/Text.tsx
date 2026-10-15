import type { MotifComponent } from '@usemotif/core';
import type { ReactElement } from 'react';
import { Box, type BoxProps } from './Box.js';
import { resolveLineClampStyle } from './_line-clamp.js';

export type TextProps = BoxProps & {
  /**
   * Truncate to N lines with an ellipsis. Cross-platform: on web emits
   * the canonical single-line ellipsis triplet (`white-space: nowrap`
   * + `overflow: hidden` + `text-overflow: ellipsis`) when `lines={1}`,
   * or the `-webkit-line-clamp` set (`display: -webkit-box` +
   * `-webkit-line-clamp: N` + `-webkit-box-orient: vertical` +
   * `overflow: hidden`) for `lines>1`. On native maps to
   * `numberOfLines={N}` on the underlying RN `Text`.
   *
   * The line-clamp styles land via the inline `style` prop, so any
   * `style={{ ... }}` overrides the consumer passes win - useful for
   * opting out of an individual declaration per-instance.
   *
   * @example
   *   <Text lines={1}>This long string will truncate with an ellipsis.</Text>
   *   <Text lines={2}>This wraps to two lines, then clamps the third.</Text>
   */
  lines?: number;
};

/**
 * Text primitive. Renders a `<span>` by default with neutral typography
 * defaults; use the standard style props (`fontSize`, `fontWeight`,
 * `color`, `lineHeight`) to vary.
 *
 * For semantic block-level text, override `as` (`<Text as="p">`) or use
 * the `Heading` / `Paragraph` primitives once they ship.
 */
export const Text: MotifComponent<TextProps, ReactElement | null> = function ({
  as = 'span',
  lines,
  style,
  ...rest
}: TextProps) {
  const clampStyle = lines === undefined ? undefined : resolveLineClampStyle(lines);
  const mergedStyle =
    clampStyle === undefined
      ? style
      : style === undefined
        ? clampStyle
        : { ...clampStyle, ...style };
  // Conditional spread keeps `style` out of the Box props bag entirely
  // when it's undefined - `exactOptionalPropertyTypes` forbids passing
  // `style: undefined` to an `style?: CSSProperties` field.
  return <Box as={as} {...(mergedStyle === undefined ? {} : { style: mergedStyle })} {...rest} />;
};
