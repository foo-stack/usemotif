import { resolveValue } from '@usemotif/core';
import { useTheme } from 'usemotif';
import { cssToNative } from './_native-css.js';

/** React Native: convert the kit's CSS style objects, resolving tokens against the theme. */
export function usePlatformStyle(): <T>(style: T) => T {
  const theme = useTheme();
  return <T>(style: T): T => {
    if (style === null || typeof style !== 'object') return style;
    return cssToNative(style as Record<string, unknown>, (path) =>
      theme === undefined ? undefined : resolveValue(`$${path}`, theme),
    ) as T;
  };
}
