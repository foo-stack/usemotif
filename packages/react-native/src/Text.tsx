import {
  type MotifComponent,
  resolveStyles,
  type ResolvedStyle,
  type StyleProps,
  type Theme,
} from '@usemotif/core';
import { type ReactElement, createElement, type ReactNode } from 'react';
import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { useContainerInfo } from './container-context.js';
import { useDirection } from './direction-context.js';
import { sanitizeNativeStyle } from './_native-style.js';
import { resolveResponsivePropsAtViewportAndContainer, useViewportWidth } from './responsive.js';
import { useBreakpointWidths, useTheme } from './theme-context.js';

type ResponsiveValue<V> =
  | ({ base?: V } & Record<string, V | undefined>)
  | readonly (V | undefined)[]
  | string;

/**
 * Native Text props. Same style-prop schema as Box, but the rendered
 * host is RN's `Text` (separate from `View` - you can't put text
 * directly inside a View on RN). Style-prop resolution picks
 * `base`-slot only for now (matches Box's responsive policy until
 * viewport-driven resolution lands).
 */
export type TextProps = {
  -readonly [K in keyof StyleProps]?: StyleProps[K] | ResponsiveValue<StyleProps[K]>;
} & Omit<RNTextProps, 'style' | 'numberOfLines'> & {
    style?: TextStyle | readonly TextStyle[];
    children?: ReactNode;
    /**
     * Truncate to N lines with an ellipsis. Maps to `numberOfLines={N}`
     * on the underlying RN `Text`. Cross-platform - mirrors the same
     * `lines` prop on the web `Text`, which emits the CSS ellipsis
     * triplet (lines=1) or the `-webkit-line-clamp` set (lines>1).
     *
     * @example
     *   <Text lines={1}>Truncates to one line with an ellipsis.</Text>
     *   <Text lines={2}>Truncates to two lines.</Text>
     */
    lines?: number;
  };

/** RN's default font size, used when a unitless `lineHeight` is given
 * without an accompanying `fontSize`. */
const RN_DEFAULT_FONT_SIZE = 14;

/** A `lineHeight` at or above this is treated as absolute DIPs; below
 * it, as a unitless ratio. 4 sits below any real pixel line height and
 * above any sane ratio. */
const LINE_HEIGHT_RATIO_CUTOFF = 4;

/**
 * RN's `lineHeight` is absolute DIPs and has no unitless ratio form, so
 * a web-style multiplier like `1.2` sets a ~1px line box that clips
 * glyphs to nothing. Treat a sub-cutoff `lineHeight` as a ratio and
 * resolve it against the resolved `fontSize` (falling back to RN's
 * default) so cross-platform code written with web habits renders.
 */
function withResolvedLineHeight(style: ResolvedStyle): ResolvedStyle {
  const lh = style.lineHeight;
  if (typeof lh !== 'number' || lh >= LINE_HEIGHT_RATIO_CUTOFF) return style;
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : RN_DEFAULT_FONT_SIZE;
  return { ...style, lineHeight: lh * fontSize };
}

/**
 * Native text primitive. Wraps RN's `Text` so font / color / line-
 * height props apply correctly (RN requires text to live inside a
 * `Text` host; styles like `fontSize` / `lineHeight` only work
 * there).
 *
 * @example
 *
 * ```tsx
 * <Text fontSize="$lg" color="$colors.text.default">
 *   Hello, motif-js
 * </Text>
 * ```
 */
/** The theme's `fontScale.max` as React Native's `maxFontSizeMultiplier`, which a prop overrides. */
export function fontScaleCap(theme: Theme | undefined): { maxFontSizeMultiplier?: number } {
  const max = theme?.tokens.fontScale?.max;
  return typeof max === 'number' && max >= 1 ? { maxFontSizeMultiplier: max } : {};
}

export const Text: MotifComponent<TextProps, ReactElement | null> = function (props: TextProps) {
  const { children, style: userStyle, lines, ...rest } = props;
  const theme = useTheme();
  const direction = useDirection();
  const width = useViewportWidth();
  const container = useContainerInfo();

  const flattened = resolveResponsivePropsAtViewportAndContainer(
    rest,
    width,
    container,
    useBreakpointWidths(),
  );
  const { style: resolvedRaw, rest: passThrough } = resolveStyles(
    flattened as Record<string, unknown>,
    theme,
  );
  const resolved = sanitizeNativeStyle(resolvedRaw as Record<string, unknown>);
  // Inject the Yoga `direction` so logical style props flip per
  // writing direction; see Box for the rationale.
  resolved.direction = direction;

  const sheet = StyleSheet.create({
    text: withResolvedLineHeight(resolved as ResolvedStyle) as TextStyle,
  });
  const finalStyle: TextStyle[] =
    userStyle === undefined
      ? [sheet.text]
      : Array.isArray(userStyle)
        ? [sheet.text, ...(userStyle as TextStyle[])]
        : [sheet.text, userStyle as TextStyle];

  return createElement(
    RNText,
    {
      ...fontScaleCap(theme),
      ...(passThrough as RNTextProps),
      style: finalStyle,
      ...(lines !== undefined ? { numberOfLines: lines } : {}),
    },
    children,
  );
};
