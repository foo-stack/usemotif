import type { StyledConfig } from 'usemotif';

/**
 * A full-width notice strip tinted by intent, with a bottom rule in the
 * intent's border colour. Colours come from the semantic `status` tokens.
 *
 * @example
 * ```tsx
 * const Banner = styled(Box, bannerRecipe);
 * <Banner intent="info" role="status">Maintenance on Sunday.</Banner>
 * ```
 */
export const bannerRecipe = {
  base: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '$space.3',
    width: '100%',
    px: '$space.4',
    py: '$space.3',
    borderBottomWidth: '$borderWidths.thin',
  },
  variants: {
    intent: {
      neutral: {
        bg: '$colors.status.neutral.tint',
        color: '$colors.status.neutral.fg',
        borderBottomColor: '$colors.status.neutral.border',
      },
      info: {
        bg: '$colors.status.info.tint',
        color: '$colors.status.info.fg',
        borderBottomColor: '$colors.status.info.border',
      },
      success: {
        bg: '$colors.status.success.tint',
        color: '$colors.status.success.fg',
        borderBottomColor: '$colors.status.success.border',
      },
      warning: {
        bg: '$colors.status.warning.tint',
        color: '$colors.status.warning.fg',
        borderBottomColor: '$colors.status.warning.border',
      },
      danger: {
        bg: '$colors.status.danger.tint',
        color: '$colors.status.danger.fg',
        borderBottomColor: '$colors.status.danger.border',
      },
    },
  },
  defaultVariants: { intent: 'neutral' },
} as const satisfies StyledConfig;
