import type { StyledConfig } from 'usemotif';

/**
 * The column a Stat stacks its label, value, and help text in.
 *
 * @example
 * ```tsx
 * const Stat = styled(Box, statRecipe);
 * ```
 */
export const statRecipe = {
  base: { display: 'flex', flexDirection: 'column', gap: '$space.1' },
} as const satisfies StyledConfig;

/**
 * A Stat's change figure, coloured by `trend`: success for up, danger for
 * down, muted for neutral.
 *
 * @example
 * ```tsx
 * const Delta = styled(Text, statDeltaRecipe);
 * <Delta trend="up">12%</Delta>
 * ```
 */
export const statDeltaRecipe = {
  base: { fontSize: '$fontSizes.sm', fontWeight: '$fontWeights.semibold' },
  variants: {
    trend: {
      up: { color: '$components.statDelta.up.color ?? $colors.status.success.fg' },
      down: { color: '$components.statDelta.down.color ?? $colors.status.danger.fg' },
      neutral: { color: '$components.statDelta.neutral.color ?? $colors.text.muted' },
    },
  },
  defaultVariants: { trend: 'neutral' },
} as const satisfies StyledConfig;
