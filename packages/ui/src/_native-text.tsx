import { Children, type ReactNode } from 'react';
import { Text } from 'usemotif';

/**
 * Native only. Wrap bare strings and numbers in `Text`, carrying the
 * typography a React Native `View` cannot pass to its children: a string
 * outside `Text` throws, and `Text` inherits no colour or size from a `View`.
 */
export function nativeText(children: ReactNode, typography: Record<string, unknown>): ReactNode {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <Text {...typography}>{child}</Text>
    ) : (
      child
    ),
  );
}
