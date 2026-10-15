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
    borderRadius: '$components.alert.borderRadius ?? $radii.md',
    borderWidth: '$borderWidths.thin',
  },
  variants: {
    intent: {
      neutral: {
        bg: '$components.alert.neutral.bg ?? $colors.status.neutral.tint',
        color: '$components.alert.neutral.color ?? $colors.status.neutral.fg',
        borderColor: '$components.alert.neutral.borderColor ?? $colors.status.neutral.border',
      },
      info: {
        bg: '$components.alert.info.bg ?? $colors.status.info.tint',
        color: '$components.alert.info.color ?? $colors.status.info.fg',
        borderColor: '$components.alert.info.borderColor ?? $colors.status.info.border',
      },
      success: {
        bg: '$components.alert.success.bg ?? $colors.status.success.tint',
        color: '$components.alert.success.color ?? $colors.status.success.fg',
        borderColor: '$components.alert.success.borderColor ?? $colors.status.success.border',
      },
      warning: {
        bg: '$components.alert.warning.bg ?? $colors.status.warning.tint',
        color: '$components.alert.warning.color ?? $colors.status.warning.fg',
        borderColor: '$components.alert.warning.borderColor ?? $colors.status.warning.border',
      },
      danger: {
        bg: '$components.alert.danger.bg ?? $colors.status.danger.tint',
        color: '$components.alert.danger.color ?? $colors.status.danger.fg',
        borderColor: '$components.alert.danger.borderColor ?? $colors.status.danger.border',
      },
    },
  },
  defaultVariants: { intent: 'neutral' },
} as const satisfies StyledConfig;
