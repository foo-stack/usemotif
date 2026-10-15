import type { ReactElement } from 'react';
import { Box, type BoxProps } from 'usemotif';

/**
 * The kit's text input element: on web a Box rendered as an `<input>`, so the
 * style props theme it. `_themed-input.native.tsx` is the native twin. Headless
 * input parts clone their value and handlers onto it.
 */
export function ThemedInput(props: BoxProps & Record<string, unknown>): ReactElement {
  return <Box as="input" {...(props as BoxProps)} />;
}
