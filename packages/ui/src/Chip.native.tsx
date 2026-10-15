import { chipRecipe } from '@usemotif/recipes';
import { useState, type ReactElement } from 'react';
import { Box, Pressable, Text } from 'usemotif';
import type { ChipProps } from './Chip.js';

export type { ChipIntent, ChipProps } from './Chip.js';

/**
 * Native Chip: the web Chip's toggle and remove targets as `Pressable`s, with
 * the label in a `Text` in the chip's colour, since a native `Text` inherits
 * none from its `View`.
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
}: ChipProps): ReactElement {
  const toggle =
    controlledSelected !== undefined ||
    defaultSelected !== undefined ||
    onSelectedChange !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultSelected ?? false);
  const selected = controlledSelected ?? uncontrolled;
  const setSelected = (next: boolean): void => {
    if (controlledSelected === undefined) setUncontrolled(next);
    onSelectedChange?.(next);
  };
  const tone =
    toggle && selected ? chipRecipe.variants.selected.true : chipRecipe.variants.intent[intent];
  const label = (
    <>
      {icon !== undefined ? <Box alignItems="center">{icon}</Box> : null}
      <Text color={tone.color} fontSize={chipRecipe.base.fontSize}>
        {children}
      </Text>
    </>
  );
  return (
    <Box
      {...chipRecipe.base}
      flexDirection="row"
      alignSelf="flex-start"
      {...chipRecipe.variants.intent[intent]}
      {...chipRecipe.variants.withIcon[icon !== undefined ? 'true' : 'false']}
      {...chipRecipe.variants.removable[onRemove !== undefined ? 'true' : 'false']}
      {...(toggle && selected ? chipRecipe.variants.selected.true : {})}
    >
      {toggle ? (
        <Pressable
          flexDirection="row"
          alignItems="center"
          gap="$space.1"
          onPress={() => setSelected(!selected)}
          aria-pressed={selected}
        >
          {label}
        </Pressable>
      ) : (
        label
      )}
      {onRemove !== undefined ? (
        <Pressable
          alignItems="center"
          justifyContent="center"
          w={18}
          h={18}
          borderRadius="$radii.full"
          onPress={onRemove}
          aria-label={removeLabel}
        >
          <Text color={tone.color}>×</Text>
        </Pressable>
      ) : null}
    </Box>
  );
}
