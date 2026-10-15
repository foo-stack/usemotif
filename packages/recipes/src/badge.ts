import type { StyledConfig } from 'usemotif';

/**
 * Badge recipe - a small status pill. `intent × size`, and `dot` for a bare
 * status dot (give it an accessible label at the call site).
 *
 * ```tsx
 * const Badge = styled(Box, badgeRecipe);
 * <Badge intent="success">Active</Badge>;
 * ```
 */
export const badgeRecipe = {
  base: {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '$space.1',
    fontWeight: '$fontWeights.medium',
    borderRadius: '$components.badge.borderRadius ?? $radii.full',
    whiteSpace: 'nowrap',
  },
  variants: {
    intent: {
      neutral: {
        bg: '$components.badge.neutral.bg ?? $colors.surface.sunken',
        color: '$components.badge.neutral.color ?? $colors.text.muted',
      },
      primary: {
        bg: '$components.badge.primary.bg ?? $colors.action.primary.bg',
        color: '$components.badge.primary.color ?? $colors.action.primary.fg',
      },
      danger: {
        bg: '$components.badge.danger.bg ?? $colors.action.danger.bg',
        color: '$components.badge.danger.color ?? $colors.action.danger.fg',
      },
      success: {
        bg: '$components.badge.success.bg ?? $colors.action.success.bg',
        color: '$components.badge.success.color ?? $colors.action.success.fg',
      },
    },
    size: {
      sm: { paddingInline: '$space.2', py: 1, fontSize: '$fontSizes.xs' },
      md: { paddingInline: '$space.3', py: 2, fontSize: '$fontSizes.sm' },
    },
    // Declared after `size` so its zero padding wins over the size's.
    dot: {
      true: { width: 8, height: 8, paddingInline: 0, py: 0, gap: 0 },
    },
  },
  defaultVariants: { intent: 'neutral', size: 'sm' },
} as const satisfies StyledConfig;
