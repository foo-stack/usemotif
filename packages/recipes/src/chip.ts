import type { StyledConfig } from 'usemotif';

/**
 * A compact pill. `withIcon` tightens the leading padding for an icon, and
 * `removable` tightens the trailing padding for a remove button.
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
    borderRadius: '$radii.full',
    fontSize: '$fontSizes.sm',
  },
  variants: {
    intent: {
      neutral: { bg: '$colors.surface.muted', color: '$colors.text.default' },
      primary: { bg: '$colors.action.primary.bg', color: '$colors.text.inverse' },
    },
    withIcon: {
      true: { pl: '$space.2' },
      false: { pl: '$space.3' },
    },
    removable: {
      true: { pr: '$space.1' },
      false: { pr: '$space.3' },
    },
  },
  defaultVariants: { intent: 'neutral', withIcon: false, removable: false },
} as const satisfies StyledConfig;
