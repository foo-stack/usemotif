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
        bg: '$components.banner.neutral.bg ?? $colors.status.neutral.tint',
        color: '$components.banner.neutral.color ?? $colors.status.neutral.fg',
        borderBottomColor:
          '$components.banner.neutral.borderBottomColor ?? $colors.status.neutral.border',
      },
      info: {
        bg: '$components.banner.info.bg ?? $colors.status.info.tint',
        color: '$components.banner.info.color ?? $colors.status.info.fg',
        borderBottomColor:
          '$components.banner.info.borderBottomColor ?? $colors.status.info.border',
      },
      success: {
        bg: '$components.banner.success.bg ?? $colors.status.success.tint',
        color: '$components.banner.success.color ?? $colors.status.success.fg',
        borderBottomColor:
          '$components.banner.success.borderBottomColor ?? $colors.status.success.border',
      },
      warning: {
        bg: '$components.banner.warning.bg ?? $colors.status.warning.tint',
        color: '$components.banner.warning.color ?? $colors.status.warning.fg',
        borderBottomColor:
          '$components.banner.warning.borderBottomColor ?? $colors.status.warning.border',
      },
      danger: {
        bg: '$components.banner.danger.bg ?? $colors.status.danger.tint',
        color: '$components.banner.danger.color ?? $colors.status.danger.fg',
        borderBottomColor:
          '$components.banner.danger.borderBottomColor ?? $colors.status.danger.border',
      },
    },
  },
  defaultVariants: { intent: 'neutral' },
} as const satisfies StyledConfig;
