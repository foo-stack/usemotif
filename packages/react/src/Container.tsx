import type { MotifComponent } from '@usemotif/core';
import { useCallback, useContext, useMemo, type ReactElement, type CSSProperties } from 'react';
import { Box, type BoxProps } from './Box.js';
import { ContainerStoreContext, createContainerStore } from './container-context.js';

export interface ContainerProps extends BoxProps {
  /**
   * Container name. Descendants address this container with
   * `@<name>.<bp>` keys (e.g. `p={{ '@card.md': '$4' }}`). When omitted,
   * descendants can still target the nearest container with `@<bp>` keys.
   */
  name?: string;
  /**
   * CSS `container-type`. Defaults to `'inline-size'` - the most common
   * choice and the only one that allows querying inline (width) without
   * laying out children. Pass `'size'` to query both axes (more expensive)
   * or `'normal'` to opt out of containment entirely.
   */
  type?: 'inline-size' | 'size' | 'normal';
}

/**
 * Establishes a containment context so descendants can target it with
 * container-query responsive keys (`@<bp>` or `@<name>.<bp>`), and read its
 * measured width with `useContainerInfo()`.
 *
 * @example
 *
 * ```tsx
 * <Container name="card">
 *   <Box p={{ base: '$2', '@card.md': '$4', '@card.lg': '$8' }}>
 *     Reflows on container width, not viewport width.
 *   </Box>
 * </Container>
 * ```
 */
export const Container: MotifComponent<ContainerProps, ReactElement | null> = function ({
  name,
  type = 'inline-size',
  style,
  ref: userRef,
  ...rest
}: ContainerProps) {
  const parent = useContext(ContainerStoreContext);
  const store = useMemo(() => createContainerStore(name, parent), [name, parent]);
  const ref = useCallback(
    (node: HTMLElement | null) => {
      store.attach(node);
      if (typeof userRef === 'function') userRef(node);
      else if (userRef !== null && userRef !== undefined) {
        (userRef as { current: HTMLElement | null }).current = node;
      }
    },
    [store, userRef],
  );

  const containerStyle: CSSProperties = { containerType: type, ...style };
  if (name !== undefined) containerStyle.containerName = name;

  return (
    <ContainerStoreContext.Provider value={store}>
      <Box {...rest} ref={ref} style={containerStyle} />
    </ContainerStoreContext.Provider>
  );
};
