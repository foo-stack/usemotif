import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { Pressable, Switch as RNSwitch, View, type ViewStyle } from 'react-native';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native toggle family - Switch / Checkbox / Radio / RadioGroup.
 *
 * Switch wraps RN's native `<Switch>` (which is platform-correct on
 * iOS / Android out of the box). Checkbox and Radio are headless
 * Pressables with the right ARIA / accessibilityRole; consumers
 * provide the visual via children, the same way as the web variants.
 *
 * The web inputs lean on `<input>` for form integration; on native
 * there's no equivalent of HTML forms, so the value is held in
 * controlled state and changes flow through the standard
 * `onValueChange` callback.
 */

export interface SwitchProps {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  accessibilityLabel?: string;
}
export const Switch = forwardRef(function Switch(
  { value, defaultValue = false, onValueChange, disabled, accessibilityLabel }: SwitchProps,
  _ref: Ref<unknown>,
): ReactElement {
  const [current, handleChange] = useControllableState({
    value: value,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <RNSwitch
      value={current}
      onValueChange={handleChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    />
  );
});

export interface CheckboxProps {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Indeterminate state - surfaces as `accessibilityState={{ checked: 'mixed' }}`. */
  indeterminate?: boolean;
  accessibilityLabel?: string;
  /** Visual content (the box / tick / etc.). The Pressable wrapper
   * fires onValueChange on tap; render whatever you want inside. */
  children?: ReactNode;
  style?: ViewStyle;
}
export const Checkbox = forwardRef(function Checkbox(
  {
    value,
    defaultValue = false,
    onValueChange,
    disabled,
    indeterminate,
    accessibilityLabel,
    children,
    style,
  }: CheckboxProps,
  _ref: Ref<unknown>,
): ReactElement {
  const [current, commit] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const toggle = useCallback(() => {
    if (disabled === true) return;
    commit(!current);
  }, [current, disabled, commit]);
  const checked: boolean | 'mixed' = indeterminate === true ? 'mixed' : current;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: disabled === true }}
      accessibilityLabel={accessibilityLabel}
      onPress={toggle}
      disabled={disabled}
      style={style}
    >
      {children}
    </Pressable>
  );
});

interface RadioContextValue {
  readonly name: string;
  readonly value: string | undefined;
  readonly setValue: (next: string) => void;
  readonly disabled: boolean;
}
const RadioContext = createContext<RadioContextValue | null>(null);

export interface RadioGroupProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (next: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children?: ReactNode;
}
export function RadioGroup({
  name,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  children,
  style,
}: RadioGroupProps): ReactElement {
  const [current, setValue] = useControllableState({
    value: value,
    defaultValue,
    onChange: onValueChange,
  });
  const reactId = useId();
  const groupName = name ?? `${reactId}-radio`;
  return (
    <RadioContext.Provider value={{ name: groupName, value: current, setValue, disabled }}>
      <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={style}>
        {children}
      </View>
    </RadioContext.Provider>
  );
}

export interface RadioProps {
  value: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Visual content (the dot / circle). */
  children?: ReactNode;
  style?: ViewStyle;
}
export const Radio = forwardRef(function Radio(
  { value, disabled, accessibilityLabel, children, style }: RadioProps,
  _ref: Ref<unknown>,
): ReactElement {
  const ctx = useContext(RadioContext);
  if (ctx === null) throw new Error('Radio must be inside <RadioGroup>.');
  const isDisabled = disabled === true || ctx.disabled;
  const isSelected = ctx.value === value;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled}
      onPress={() => {
        if (!isDisabled) ctx.setValue(value);
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
});
