/**
 * `@usemotif/recipes` - ready-made `styled()` configs as plain data.
 *
 * Each export is a `StyledConfig` object: pass it to `styled()` over any
 * primitive to get a themed, variant-driven component. The recipes carry no
 * runtime code and no opinion that can't be overridden - every value is a
 * semantic token reference that re-themes itself, and any style prop at the
 * call site wins over the recipe.
 *
 * ```tsx
 * import { styled, Pressable } from 'usemotif';
 * import { buttonRecipe } from '@usemotif/recipes';
 *
 * const Button = styled(Pressable, buttonRecipe);
 * ```
 */
export { buttonRecipe } from './button.js';
export { cardRecipe } from './card.js';
export { badgeRecipe } from './badge.js';
export { inputRecipe } from './input.js';
export { alertRecipe } from './alert.js';
export { bannerRecipe } from './banner.js';
export { chipRecipe } from './chip.js';
export { statRecipe, statDeltaRecipe } from './stat.js';
