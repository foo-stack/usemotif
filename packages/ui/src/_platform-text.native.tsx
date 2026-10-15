import type { ReactNode } from 'react';
import { nativeText } from './_native-text.js';

/** React Native: bare strings and numbers go in `Text`, carrying the given typography. */
export function platformText(
  children: ReactNode,
  typography: Record<string, unknown> = {},
): ReactNode {
  return nativeText(children, typography);
}
