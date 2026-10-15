import type { StyledConfig } from 'usemotif';

/**
 * A compact pill. `withIcon` tightens the leading padding for an icon, and
 * `removable` tightens the trailing padding for a remove button. `selected`
 * fills a toggled filter chip with the primary action colour.
 *
 * @example
 * ```tsx
 * const Chip = styled(Box, chipRecipe);
 * <Chip intent="primary">design</Chip>
 * ```
 */
export const chipRecipe = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '$space.1',
    py: '$space.1',
    borderRadius: '$components.chip.borderRadius ?? $radii.full',
    fontSize: '$fontSizes.sm',
  },
  variants: {
    intent: {
      neutral: {
        bg: '$components.chip.neutral.bg ?? $colors.surface.muted',
        color: '$components.chip.neutral.color ?? $colors.text.default',
      },
      primary: {
        bg: '$components.chip.primary.bg ?? $colors.action.primary.bg',
        color: '$components.chip.primary.color ?? $colors.text.inverse',
      },
    },
    withIcon: {
      true: { pl: '$space.2' },
      false: { pl: '$space.3' },
    },
    removable: {
      true: { pr: '$space.1' },
      false: { pr: '$space.3' },
    },
    // Declared after `intent` so a selected chip takes the primary fill whatever its tone.
    selected: {
      true: {
        bg: '$components.chip.selected.bg ?? $colors.action.primary.bg',
        color: '$components.chip.selected.color ?? $colors.text.inverse',
      },
    },
  },
  defaultVariants: { intent: 'neutral', withIcon: false, removable: false },
} as const satisfies StyledConfig;
