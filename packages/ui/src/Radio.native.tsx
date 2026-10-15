import {
  Radio as WebTypedRadio,
  RadioGroup as WebTypedRadioGroup,
  useControllableState,
} from '@usemotif/headless';
import {
  createContext,
  useContext,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Box, Text } from 'usemotif';

export interface RadioGroupProps {
  /** The selected option's value, controlled. */
  readonly value?: string;
  /** The initially selected option when uncontrolled. */
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly children?: ReactNode;
}

export interface RadioProps {
  /** This option's value. */
  readonly value: string;
  readonly disabled?: boolean;
  /** Mark the option invalid: a danger ring. */
  readonly invalid?: boolean;
  readonly accessibilityLabel?: string;
  /** The option's label. */
  readonly children?: ReactNode;
}

const SelectedValue = createContext<string | undefined>(undefined);

// Typed against headless's web declarations; the native build resolves the
// native radio group and radio.
const HeadlessRadioGroup = WebTypedRadioGroup as unknown as ComponentType<
  Omit<RadioGroupProps, 'defaultValue'>
>;
const HeadlessRadio = WebTypedRadio as unknown as ComponentType<Omit<RadioProps, 'invalid'>>;

/**
 * Native RadioGroup: the headless native group, holding the selection so each
 * Radio can draw its dot. It takes the headless API (`value`, `onValueChange`).
 */
export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: RadioGroupProps): ReactElement {
  const [selected, setSelected] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as ((next: string | undefined) => void) | undefined,
  });
  return (
    <SelectedValue.Provider value={selected}>
      <HeadlessRadioGroup
        {...(selected !== undefined && { value: selected })}
        onValueChange={setSelected}
        {...rest}
      >
        <Box gap="$space.2">{children}</Box>
      </HeadlessRadioGroup>
    </SelectedValue.Provider>
  );
}

/** Native Radio: a ring with the selection dot, and the label in `Text`. */
export function Radio({ value, invalid, children, ...rest }: RadioProps): ReactElement {
  const checked = useContext(SelectedValue) === value;
  return (
    <HeadlessRadio value={value} {...rest}>
      <Box flexDirection="row" alignItems="center" gap="$space.2">
        <Box
          width={18}
          height={18}
          alignItems="center"
          justifyContent="center"
          borderWidth="$borderWidths.thin"
          borderRadius="$radii.full"
          borderColor={
            invalid === true
              ? '$colors.action.danger.bg'
              : checked
                ? '$colors.action.primary.bg'
                : '$colors.border.strong'
          }
        >
          {checked ? (
            <Box width={8} height={8} borderRadius="$radii.full" bg="$colors.action.primary.bg" />
          ) : null}
        </Box>
        {typeof children === 'string' ? (
          <Text color="$colors.text.default">{children}</Text>
        ) : (
          children
        )}
      </Box>
    </HeadlessRadio>
  );
}
