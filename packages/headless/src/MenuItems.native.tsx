import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { MenuCloseContext } from './_menu-close.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native checkbox, radio and label items, shared by Menu and ContextMenu. Like
 * the web parts they close the menu unless `closeOnSelect` is `false`.
 */

interface ToggleItemProps {
  disabled?: boolean;
  closeOnSelect?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
}

function ToggleItem({
  checked,
  toggle,
  disabled = false,
  closeOnSelect = true,
  children,
  style,
}: ToggleItemProps & { checked: boolean; toggle: () => void }): ReactElement {
  const close = useContext(MenuCloseContext);
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        toggle();
        if (closeOnSelect) close?.();
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export interface MenuCheckboxItemProps extends ToggleItemProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function CheckboxItem({
  checked: controlled,
  defaultChecked = false,
  onCheckedChange,
  ...rest
}: MenuCheckboxItemProps): ReactElement {
  const [checked, setChecked] = useControllableState({
    value: controlled,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });
  return <ToggleItem {...rest} checked={checked} toggle={() => setChecked(!checked)} />;
}

interface RadioGroupContextValue {
  readonly value: string | undefined;
  readonly setValue: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface MenuRadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  children?: ReactNode;
}

function RadioGroup({
  value: controlled,
  defaultValue,
  onValueChange,
  label,
  children,
}: MenuRadioGroupProps): ReactElement {
  const [value, setValue] = useControllableState<string | undefined>({
    value: controlled,
    defaultValue,
    onChange: onValueChange as ((next: string | undefined) => void) | undefined,
  });
  const ctx = useMemo(
    () => ({ value, setValue: (next: string) => setValue(next) }),
    [value, setValue],
  );
  return (
    <RadioGroupContext.Provider value={ctx}>
      <View
        accessibilityRole="radiogroup"
        {...(label !== undefined ? { accessibilityLabel: label } : {})}
      >
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

export interface MenuRadioItemProps extends ToggleItemProps {
  value: string;
}

function RadioItem({ value, ...rest }: MenuRadioItemProps): ReactElement {
  const group = useContext(RadioGroupContext);
  if (group === null) throw new Error('Menu.RadioItem must be inside Menu.RadioGroup.');
  return (
    <ToggleItem {...rest} checked={group.value === value} toggle={() => group.setValue(value)} />
  );
}

export interface MenuLabelProps {
  children?: ReactNode;
  style?: ViewStyle;
}

function Label({ children, style }: MenuLabelProps): ReactElement {
  return (
    <View accessibilityRole="header" style={style}>
      {children}
    </View>
  );
}

export {
  CheckboxItem as MenuCheckboxItem,
  RadioGroup as MenuRadioGroup,
  RadioItem as MenuRadioItem,
  Label as MenuLabel,
};
