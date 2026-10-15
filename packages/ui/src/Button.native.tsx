import { buttonRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import { Pressable, styled } from 'usemotif';
import type { ButtonProps } from './Button.js';
import { nativeText } from './_native-text.js';

export type { ButtonProps };

const StyledButton = /* @__PURE__ */ styled(Pressable, buttonRecipe);

type Intent = keyof typeof buttonRecipe.variants.intent;
type Size = keyof typeof buttonRecipe.variants.size;

/** Native Button: the web Button, with a text label in a `Text` that carries the recipe's colour and size. */
export function Button({
  children,
  intent = 'primary',
  size = 'md',
  ...rest
}: ButtonProps): ReactElement {
  const tone =
    buttonRecipe.variants.intent[typeof intent === 'string' ? (intent as Intent) : 'primary'];
  const scale = buttonRecipe.variants.size[typeof size === 'string' ? (size as Size) : 'md'];
  const Styled = StyledButton as unknown as (props: Record<string, unknown>) => ReactElement;
  return (
    <Styled intent={intent} size={size} {...rest}>
      {nativeText(children, {
        color: tone.color,
        fontSize: scale.fontSize,
        fontWeight: buttonRecipe.base.fontWeight,
      })}
    </Styled>
  );
}
