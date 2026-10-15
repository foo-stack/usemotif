'use client';

import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import { Box, Text, type BoxProps } from 'usemotif';
import { platformText } from './_platform-text.js';

export interface FormFieldProps {
  /** The field label. Wired to the control via `htmlFor` / `id`. */
  readonly label: ReactNode;
  /** The single control element - cloned to inject `id` + `aria-describedby` /
   * `aria-invalid` / `aria-required`. */
  readonly children: ReactElement;
  /** Helper text under the control (hidden when `error` is shown). */
  readonly help?: ReactNode;
  /** Error message - shows in the danger tone and sets `aria-invalid`. */
  readonly error?: ReactNode;
  /** Marks the field required (a `*` on the label + `aria-required`). */
  readonly required?: boolean;
}

/**
 * A themed form-field wrapper - a label, the control, and a help / error line,
 * with the accessibility plumbing wired for you: the label's `htmlFor` matches a
 * generated control `id`, and the control gets `aria-describedby` (help or error),
 * `aria-invalid` (on error), and `aria-required`. Pure presentational (Box + Text
 * + a `cloneElement`, no headless), so it hugs the display floor.
 *
 * ```tsx
 * <FormField label="Email" required help="We'll never share it." error={errors.email}>
 *   <input type="email" />
 * </FormField>
 * ```
 */
const LABEL_TEXT = {
  fontSize: '$fontSizes.sm',
  fontWeight: '$fontWeights.medium',
  color: '$colors.text.default',
} as const;
const REQUIRED_TEXT = { color: '$colors.status.danger.fg' } as const;

export function FormField({ label, children, help, error, required = false }: FormFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== null && error !== false;
  const hasHelp = help !== undefined && help !== null;
  const describedBy = hasError ? errorId : hasHelp ? helpId : undefined;

  const controlProps: Record<string, unknown> = { id };
  if (describedBy !== undefined) controlProps['aria-describedby'] = describedBy;
  if (hasError) controlProps['aria-invalid'] = true;
  if (required) controlProps['aria-required'] = true;
  const control = cloneElement(children as ReactElement<Record<string, unknown>>, controlProps);

  return (
    <Box display="flex" flexDirection="column" gap="$space.1">
      <Box
        as="label"
        display="inline-flex"
        gap="$space.1"
        fontSize="$fontSizes.sm"
        fontWeight="$fontWeights.medium"
        color="$colors.text.default"
        {...({ htmlFor: id } as unknown as BoxProps)}
      >
        {platformText(label, LABEL_TEXT)}
        {required ? (
          <Box as="span" color="$colors.status.danger.fg" aria-hidden>
            {platformText('*', REQUIRED_TEXT)}
          </Box>
        ) : null}
      </Box>
      {control}
      {hasError ? (
        <Text id={errorId} fontSize="$fontSizes.sm" color="$colors.status.danger.fg">
          {error}
        </Text>
      ) : hasHelp ? (
        <Text id={helpId} fontSize="$fontSizes.sm" color="$colors.text.muted">
          {help}
        </Text>
      ) : null}
    </Box>
  );
}
