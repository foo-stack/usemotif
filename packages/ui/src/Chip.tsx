'use client';

import type { ReactNode } from 'react';
import { chipRecipe } from '@usemotif/recipes';
import { Box, styled, type BoxProps } from 'usemotif';

const ChipFrame = styled(Box, chipRecipe);

export type ChipIntent = 'neutral' | 'primary';

export interface ChipProps {
  readonly children?: ReactNode;
  /** Optional leading glyph. */
  readonly icon?: ReactNode;
  /** Tone. Default `neutral`. */
  readonly intent?: ChipIntent;
  /** When provided, renders a `×` button that calls this. */
  readonly onRemove?: () => void;
}

const REMOVE_HOVER = { opacity: 0.65 } as const;

/**
 * A themed compact tag / pill - like a `Badge`, but built for input affordances:
 * an optional leading icon and an optional `×` remove button. Pure presentational
 * (Box, no headless), so it hugs the display floor.
 *
 * ```tsx
 * <Chip onRemove={() => remove('react')}>React</Chip>
 * <Chip intent="primary" icon={<TagIcon />}>Featured</Chip>
 * ```
 */
export function Chip({ children, icon, intent = 'neutral', onRemove }: ChipProps) {
  return (
    <ChipFrame intent={intent} withIcon={icon !== undefined} removable={onRemove !== undefined}>
      {icon !== undefined ? (
        <Box as="span" display="inline-flex" alignItems="center">
          {icon}
        </Box>
      ) : null}
      <Box as="span">{children}</Box>
      {onRemove !== undefined ? (
        <Box
          as="button"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={18}
          h={18}
          borderWidth={0}
          borderRadius="$radii.full"
          bg="transparent"
          color="currentColor"
          cursor="pointer"
          _hover={REMOVE_HOVER}
          onClick={onRemove}
          aria-label="Remove"
          {...({ type: 'button' } as unknown as BoxProps)}
        >
          ×
        </Box>
      ) : null}
    </ChipFrame>
  );
}
