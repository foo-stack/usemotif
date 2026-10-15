import type { ReactElement, ReactNode } from 'react';
import { Box, type BoxProps } from 'usemotif';

export type PlatformLinkProps = Omit<BoxProps, 'children'> & {
  readonly href?: string | undefined;
  readonly children?: ReactNode;
};

const NO_UNDERLINE = { textDecoration: 'none' } as const;

/**
 * A themed link: an `<a href>` on web, or a `<button>` without one.
 * `_link.native.tsx` is the React Native twin.
 */
export function PlatformLink({ href, children, ...style }: PlatformLinkProps): ReactElement {
  return (
    <Box
      as={href !== undefined ? 'a' : 'button'}
      {...style}
      // `href` / `type` go to the underlying element; Box's element typing is
      // generic HTMLElement, so cast past it.
      {...({
        ...(href !== undefined ? { href } : { type: 'button' }),
        style: NO_UNDERLINE,
      } as unknown as BoxProps)}
    >
      {children}
    </Box>
  );
}
