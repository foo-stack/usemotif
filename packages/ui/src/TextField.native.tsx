import { resolveValue } from '@usemotif/core';
import { inputRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import { Input, useTheme, type InputProps } from 'usemotif';

type Size = keyof typeof inputRecipe.variants.size;

export interface TextFieldProps extends Omit<InputProps, 'size'> {
  /** `sm` · `md` · `lg`. Defaults to `md`. */
  readonly size?: Size;
  /** Shows the danger border and marks the field invalid. */
  readonly invalid?: boolean;
}

/**
 * Native TextField: the platform `Input` (its own themed border, surface and
 * invalid state), sized from the input recipe's height, padding and font size.
 * The recipe's tokens are resolved here because a `TextInput` style takes
 * values, not tokens.
 */
export function TextField({ size = 'md', invalid, style, ...rest }: TextFieldProps): ReactElement {
  const theme = useTheme();
  const scale = inputRecipe.variants.size[size];
  const value = (token: string | number): unknown =>
    typeof token === 'string' && theme !== undefined ? resolveValue(token, theme) : token;
  const sized = {
    height: scale.height,
    paddingHorizontal: value(scale.paddingInline),
    fontSize: value(scale.fontSize),
  };
  return (
    <Input
      {...(invalid === true && { invalid: true, 'aria-invalid': true })}
      style={(style === undefined ? sized : [sized, style]) as InputProps['style']}
      {...rest}
    />
  );
}
