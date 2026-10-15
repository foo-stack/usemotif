import { useState, type ReactElement } from 'react';
import { Box, Pressable, Text } from 'usemotif';
import type { SegmentedControlProps } from './SegmentedControl.js';

export type { SegmentedControlOption, SegmentedControlProps } from './SegmentedControl.js';

/**
 * Native SegmentedControl: one Pressable per segment, each a `radio` in a
 * `radiogroup`. Native has no arrow keys to roam with, so a press selects.
 */
export function SegmentedControl({
  options,
  value: controlled,
  defaultValue,
  onValueChange,
  'aria-label': ariaLabel,
}: SegmentedControlProps): ReactElement {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]?.value);
  const selected = controlled ?? uncontrolled;
  return (
    <Box
      role="radiogroup"
      flexDirection="row"
      alignSelf="flex-start"
      gap={2}
      p={2}
      borderRadius="$radii.lg"
      bg="$colors.surface.muted"
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
    >
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        const disabled = opt.disabled === true;
        return (
          <Pressable
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            px="$space.3"
            py="$space.1"
            borderRadius="$radii.md"
            bg={isSelected ? '$colors.surface.raised' : 'transparent'}
            boxShadow={isSelected ? '0 1px 2px rgba(0, 0, 0, 0.12)' : 'none'}
            onPress={() => {
              if (controlled === undefined) setUncontrolled(opt.value);
              onValueChange?.(opt.value);
            }}
          >
            {typeof opt.label === 'string' ? (
              <Text
                fontSize="$fontSizes.sm"
                fontWeight={isSelected ? '$fontWeights.semibold' : '$fontWeights.medium'}
                color={disabled ? '$colors.text.muted' : '$colors.text.default'}
              >
                {opt.label}
              </Text>
            ) : (
              opt.label
            )}
          </Pressable>
        );
      })}
    </Box>
  );
}
