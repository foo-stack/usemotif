import type { StyledConfig } from 'usemotif';

/**
 * A message box tinted by intent: soft surface, matching border colour, readable
 * text, all from the semantic `status` tokens, so it re-themes in light and dark.
 *
 * @example
 * ```tsx
 * const Alert = styled(Box, alertRecipe);
 * <Alert intent="danger" role="alert">Payment failed.</Alert>
 * ```
 */
export const alertRecipe = {
  base: {
    display: 'flex',
    flexDirection: 'row',
    gap: '$space.3',
    p: '$space.4',
    borderRadius: '$radii.md',
    borderWidth: '$borderWidths.thin',
  },
  variants: {
    intent: {
      neutral: {
        bg: '$colors.status.neutral.tint',
        color: '$colors.status.neutral.fg',
        borderColor: '$colors.status.neutral.border',
      },
      info: {
        bg: '$colors.status.info.tint',
        color: '$colors.status.info.fg',
        borderColor: '$colors.status.info.border',
      },
      success: {
        bg: '$colors.status.success.tint',
        color: '$colors.status.success.fg',
        borderColor: '$colors.status.success.border',
      },
      warning: {
        bg: '$colors.status.warning.tint',
        color: '$colors.status.warning.fg',
        borderColor: '$colors.status.warning.border',
      },
      danger: {
        bg: '$colors.status.danger.tint',
        color: '$colors.status.danger.fg',
        borderColor: '$colors.status.danger.border',
      },
    },
  },
  defaultVariants: { intent: 'neutral' },
} as const satisfies StyledConfig;
