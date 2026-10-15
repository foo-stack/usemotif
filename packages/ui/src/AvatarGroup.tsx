'use client';

import { Avatar, type AvatarSize, Box, useMessages } from 'usemotif';

const SIZE_PX: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};
function sizePx(size: AvatarSize): number {
  return typeof size === 'number' ? size : SIZE_PX[size];
}

export interface AvatarGroupItem {
  readonly name: string;
  readonly src?: string;
}

export interface AvatarGroupProps {
  readonly avatars: ReadonlyArray<AvatarGroupItem>;
  /** Show at most this many; the rest collapse into a `+N` circle. Default 4. */
  readonly max?: number;
  readonly size?: AvatarSize;
}

/**
 * A themed cluster of overlapping {@link Avatar}s with a `+N` overflow circle.
 * Pure presentational (composes the `Avatar` primitive, no headless), so it hugs
 * the display floor. Each avatar gets a ring (matching the page surface) so the
 * overlap reads cleanly.
 *
 * ```tsx
 * <AvatarGroup avatars={[{ name: 'Jane Doe' }, { name: 'Sam Lee', src }]} max={3} />
 * ```
 */
export function AvatarGroup({ avatars, max = 4, size = 'md' }: AvatarGroupProps) {
  const messages = useMessages();
  const px = sizePx(size);
  const overlap = Math.round(px * 0.3);
  const ring = '0 0 0 2px var(--colors-surface-default, #fff)';
  const shown = avatars.slice(0, max);
  const extra = avatars.length - shown.length;
  return (
    <Box display="inline-flex" alignItems="center">
      {shown.map((a, i) => (
        <Box
          key={`${i}:${a.name}|${a.src ?? ''}`}
          borderRadius="$radii.full"
          boxShadow={ring}
          {...(i > 0 ? { ml: -overlap } : {})}
        >
          <Avatar name={a.name} size={size} {...(a.src !== undefined ? { src: a.src } : {})} />
        </Box>
      ))}
      {extra > 0 ? (
        <Box
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={px}
          h={px}
          ml={-overlap}
          borderRadius="$radii.full"
          boxShadow={ring}
          bg="$colors.surface.muted"
          color="$colors.text.muted"
          fontSize={Math.round(px * 0.36)}
          fontWeight="$fontWeights.semibold"
          aria-label={messages.moreItems(extra)}
        >
          +{extra}
        </Box>
      ) : null}
    </Box>
  );
}
