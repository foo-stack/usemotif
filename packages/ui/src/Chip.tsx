'use client';

import { useState, type ReactNode } from 'react';
import { chipRecipe } from '@usemotif/recipes';
import { Box, type BoxProps } from 'usemotif';

export type ChipIntent = 'neutral' | 'primary';

export interface ChipProps {
  readonly children?: ReactNode;
  /** Optional leading glyph. */
  readonly icon?: ReactNode;
  /** Tone. Default `neutral`. */
  readonly intent?: ChipIntent;
  /** When provided, renders a `×` button that calls this. */
  readonly onRemove?: () => void;
  /** Accessible name of the remove button. Defaults to `'Remove'`; name the
   * chip in it when several sit together, as in `Remove react`. */
  readonly removeLabel?: string;
  /**
   * Makes the chip a toggle, as in a row of filters: its label becomes a
   * button with `aria-pressed`. The remove button stays a separate target.
   */
  readonly selected?: boolean;
  /** Initial `selected` when uncontrolled. */
  readonly defaultSelected?: boolean;
  /** Called with the new state when the chip is toggled. Makes the chip a toggle. */
  readonly onSelectedChange?: (selected: boolean) => void;
}

const REMOVE_HOVER = { opacity: 0.65 } as const;
const TOGGLE_FOCUS = {
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 2,
  outlineColor: '$colors.action.primary.bg',
} as const;

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
export function Chip({
  children,
  icon,
  intent = 'neutral',
  onRemove,
  removeLabel = 'Remove',
  selected: controlledSelected,
  defaultSelected,
  onSelectedChange,
}: ChipProps) {
  const toggle =
    controlledSelected !== undefined ||
    defaultSelected !== undefined ||
    onSelectedChange !== undefined;
  // Local state rather than headless's controllable-state hook, which would pull
  // the headless barrel into this otherwise headless-free display component.
  const [uncontrolled, setUncontrolled] = useState(defaultSelected ?? false);
  const selected = controlledSelected ?? uncontrolled;
  const setSelected = (next: boolean): void => {
    if (controlledSelected === undefined) setUncontrolled(next);
    onSelectedChange?.(next);
  };
  const label = (
    <>
      {icon !== undefined ? (
        <Box as="span" display="inline-flex" alignItems="center">
          {icon}
        </Box>
      ) : null}
      <Box as="span">{children}</Box>
    </>
  );
  return (
    <Box
      {...chipRecipe.base}
      {...chipRecipe.variants.intent[intent]}
      {...chipRecipe.variants.withIcon[icon !== undefined ? 'true' : 'false']}
      {...chipRecipe.variants.removable[onRemove !== undefined ? 'true' : 'false']}
      {...(toggle && selected ? chipRecipe.variants.selected.true : {})}
    >
      {toggle ? (
        <Box
          as="button"
          display="inline-flex"
          alignItems="center"
          gap="$space.1"
          p={0}
          borderWidth={0}
          borderRadius="$radii.full"
          bg="transparent"
          color="inherit"
          fontSize="inherit"
          cursor="pointer"
          _focus={TOGGLE_FOCUS}
          onClick={() => setSelected(!selected)}
          aria-pressed={selected}
          {...({ type: 'button' } as unknown as BoxProps)}
        >
          {label}
        </Box>
      ) : (
        label
      )}
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
          aria-label={removeLabel}
          {...({ type: 'button' } as unknown as BoxProps)}
        >
          ×
        </Box>
      ) : null}
    </Box>
  );
}
