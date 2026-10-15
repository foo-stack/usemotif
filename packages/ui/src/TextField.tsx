import { inputRecipe } from '@usemotif/recipes';
import type { InputHTMLAttributes, ReactElement } from 'react';
import { Box, styled, type BoxProps } from 'usemotif';

const Field = /* @__PURE__ */ styled(Box, inputRecipe);

// Box reads `onDrag*` as its own drag gesture, so the HTML drag events are left out.
export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> {
  /** `sm` · `md` · `lg`. Defaults to `md`. */
  readonly size?: 'sm' | 'md' | 'lg';
  /** Shows the danger border and sets `aria-invalid`. */
  readonly invalid?: boolean;
}

/**
 * Themed single-line text input. Drop it into `FormField` for the label,
 * help and error wiring.
 *
 * ```tsx
 * <FormField label="Email" error={error}>
 *   <TextField type="email" invalid={error !== undefined} />
 * </FormField>
 * ```
 */
export function TextField({ size, invalid, ...rest }: TextFieldProps): ReactElement {
  // The recipe needs a style-prop host, so this is a Box rendered as an
  // <input>; its element typing is a generic HTMLElement, hence the cast.
  return (
    <Field
      as="input"
      {...(size !== undefined && { size })}
      {...(invalid === true && { invalid: true })}
      {...({
        type: 'text',
        ...(invalid === true && { 'aria-invalid': true }),
        ...rest,
      } as unknown as BoxProps)}
    />
  );
}
