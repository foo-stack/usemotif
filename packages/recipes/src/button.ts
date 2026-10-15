import type { StyledConfig } from 'usemotif';

/**
 * Button recipe - `intent × size` static styling as plain `styled()` data.
 *
 * ```tsx
 * import { styled, Pressable } from 'usemotif';
 * import { buttonRecipe } from '@usemotif/recipes';
 *
 * const Button = styled(Pressable, buttonRecipe);
 * <Button intent="primary" size="lg">Save</Button>;
 * ```
 *
 * Colours resolve against the active theme's semantic `action` / `surface` /
 * `text` tokens, so the same recipe themes itself in light and dark.
 *
 * Interaction lives in the recipe: a `styled()` layer carries pseudo-states
 * and motion alongside static styles, so the base below ships hover/press
 * feedback and a transition. Call-site props still win - and pseudo bags
 * deep-merge, so `<Button _hover={{ outline: '2px solid' }} />` extends the
 * recipe's hover rather than replacing it.
 */
export const buttonRecipe = {
  base: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '$space.2',
    fontWeight: '$fontWeights.semibold',
    borderRadius: '$components.button.borderRadius ?? $radii.md',
    borderWidth: '$borderWidths.thin',
    borderColor: 'transparent',
    transition: 'opacity 120ms ease',
    _hover: { opacity: 0.92 },
    _active: { opacity: 0.84 },
  },
  variants: {
    intent: {
      primary: {
        bg: '$components.button.primary.bg ?? $colors.action.primary.bg',
        color: '$components.button.primary.color ?? $colors.action.primary.fg',
      },
      danger: {
        bg: '$components.button.danger.bg ?? $colors.action.danger.bg',
        color: '$components.button.danger.color ?? $colors.action.danger.fg',
      },
      success: {
        bg: '$components.button.success.bg ?? $colors.action.success.bg',
        color: '$components.button.success.color ?? $colors.action.success.fg',
      },
      neutral: {
        bg: '$components.button.neutral.bg ?? $colors.surface.muted',
        color: '$components.button.neutral.color ?? $colors.text.default',
        borderColor: '$components.button.neutral.borderColor ?? $colors.border.default',
      },
      ghost: { bg: 'transparent', color: '$components.button.ghost.color ?? $colors.text.default' },
    },
    size: {
      sm: { height: 32, paddingInline: '$space.3', fontSize: '$fontSizes.sm' },
      md: { height: 40, paddingInline: '$space.4', fontSize: '$fontSizes.md' },
      lg: { height: 48, paddingInline: '$space.6', fontSize: '$fontSizes.lg' },
    },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
} as const satisfies StyledConfig;
