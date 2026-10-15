import { Checkbox as WebTypedCheckbox, useControllableState } from '@usemotif/headless';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { Box, Text } from 'usemotif';

// This file type-checks against headless's web declarations, where Checkbox is
// a DOM input; at runtime the native build resolves the native checkbox.
const HeadlessCheckbox = WebTypedCheckbox as unknown as ComponentType<{
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  children?: ReactNode;
}>;

export interface CheckboxProps {
  /** Checked state, controlled. */
  readonly value?: boolean;
  /** Initial checked state when uncontrolled. */
  readonly defaultValue?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  readonly disabled?: boolean;
  /** Mark the control invalid: a danger border. */
  readonly invalid?: boolean;
  readonly accessibilityLabel?: string;
  /** A label beside the box. */
  readonly children?: ReactNode;
}

/**
 * Native Checkbox: the headless native checkbox drawing the kit's box and
 * tick. On native it takes the headless API (`value`, `onValueChange`)
 * rather than the web input's `checked` and `onChange`.
 */
export function Checkbox({
  value,
  defaultValue = false,
  onValueChange,
  disabled,
  invalid,
  accessibilityLabel,
  children,
}: CheckboxProps): ReactElement {
  const [checked, setChecked] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <HeadlessCheckbox
      value={checked}
      onValueChange={setChecked}
      {...(disabled !== undefined && { disabled })}
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        gap="$space.2"
        opacity={disabled === true ? 0.5 : 1}
      >
        <Box
          width={18}
          height={18}
          alignItems="center"
          justifyContent="center"
          borderWidth="$borderWidths.thin"
          borderRadius="$radii.sm"
          borderColor={
            invalid === true
              ? '$colors.action.danger.bg'
              : checked
                ? '$colors.action.primary.bg'
                : '$colors.border.strong'
          }
          bg={checked ? '$colors.action.primary.bg' : 'transparent'}
        >
          {checked ? (
            <Text
              color="$colors.action.primary.fg"
              fontSize={12}
              fontWeight="$fontWeights.semibold"
            >
              ✓
            </Text>
          ) : null}
        </Box>
        {typeof children === 'string' ? (
          <Text color="$colors.text.default">{children}</Text>
        ) : (
          children
        )}
      </Box>
    </HeadlessCheckbox>
  );
}
