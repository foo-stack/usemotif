import type { ReactNode } from 'react';

/**
 * Text that a parent box carries. On web the browser inherits colour and size
 * into bare strings, so children pass through unchanged; `_platform-text.native.tsx`
 * wraps them in `Text` for React Native.
 */
export function platformText(
  children: ReactNode,
  _typography?: Record<string, unknown>,
): ReactNode {
  return children;
}
