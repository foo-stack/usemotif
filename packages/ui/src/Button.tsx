import { buttonRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import {
  Pressable,
  styled,
  type MotifComponent,
  type PressableProps,
  type VariantProps,
} from 'usemotif';

const StyledButton = /* @__PURE__ */ styled(Pressable, buttonRecipe);

type ButtonVariants = VariantProps<typeof StyledButton>;

export type ButtonProps = ButtonVariants & Omit<PressableProps, keyof ButtonVariants>;

/**
 * Themed button. `intent` (`primary` · `danger` · `success` · `neutral` ·
 * `ghost`) × `size` (`sm` · `md` · `lg`), with hover and press feedback.
 * A `Pressable`, so it renders a `<button type="button">` and handles
 * `disabled`.
 *
 * ```tsx
 * <Button intent="danger" size="sm" onPress={remove}>Delete</Button>
 * ```
 */
// `styled()` types its result over Box props; the host here is a Pressable,
// so the Pressable props (`onPress`, `disabled`, `type`) reach it too.
export const Button = StyledButton as MotifComponent<ButtonProps, ReactElement | null>;
