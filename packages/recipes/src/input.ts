import type { StyledConfig } from 'usemotif';

/**
 * Text-input recipe - `size`, with an `invalid` boolean variant for form
 * validation.
 *
 * ```tsx
 * import { styled, Input } from 'usemotif';
 * const TextField = styled(Input, inputRecipe);
 * <TextField size="md" invalid={hasError} />;
 * ```
 *
 * A focus ring is interaction. A `styled()` layer can carry pseudo-states, so
 * you can bake one into this recipe's `base` (`_focus: { ... }`) - or apply it at
 * the call site, where it deep-merges with any recipe interaction:
 *
 * ```tsx
 * <TextField _focus={{ borderColor: '$colors.action.primary.bg' }}
 *            transition="border-color 150ms ease" />
 * ```
 */
export const inputRecipe = {
  base: {
    display: 'flex',
    width: '100%',
    bg: '$components.input.bg ?? $colors.surface.base',
    color: '$components.input.color ?? $colors.text.default',
    borderRadius: '$components.input.borderRadius ?? $radii.md',
    borderWidth: '$borderWidths.thin',
    borderColor: '$components.input.borderColor ?? $colors.border.default',
  },
  variants: {
    size: {
      sm: { height: 32, paddingInline: '$space.2', fontSize: '$fontSizes.sm' },
      md: { height: 40, paddingInline: '$space.3', fontSize: '$fontSizes.md' },
      lg: { height: 48, paddingInline: '$space.4', fontSize: '$fontSizes.lg' },
    },
    invalid: {
      true: { borderColor: '$components.input.invalid.borderColor ?? $colors.action.danger.bg' },
    },
  },
  defaultVariants: { size: 'md' },
} as const satisfies StyledConfig;
