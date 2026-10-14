import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native Toggle and ToggleGroup: the same pressed state as web on Pressables,
 * announced as toggle buttons. Native has no keyboard model to rove with.
 */

export interface ToggleProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children?: ReactNode;
}

export function Toggle({
  pressed: controlled,
  defaultPressed = false,
  onPressedChange,
  disabled = false,
  accessibilityLabel,
  style,
  children,
}: ToggleProps): ReactElement {
  const [pressed, setPressed] = useControllableState({
    value: controlled,
    defaultValue: defaultPressed,
    onChange: onPressedChange,
  });
  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityState={{ checked: pressed, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => setPressed(!pressed)}
      style={style}
    >
      {children}
    </Pressable>
  );
}

interface ToggleGroupContextValue {
  readonly value: ReadonlyArray<string>;
  readonly toggle: (item: string) => void;
  readonly disabled: boolean;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);
const NO_VALUES: ReadonlyArray<string> = [];

export interface ToggleGroupProps {
  type?: 'single' | 'multiple';
  value?: ReadonlyArray<string>;
  defaultValue?: ReadonlyArray<string>;
  onValueChange?: (value: ReadonlyArray<string>) => void;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children?: ReactNode;
}

export function ToggleGroup({
  type = 'single',
  value: controlled,
  defaultValue = NO_VALUES,
  onValueChange,
  orientation = 'horizontal',
  disabled = false,
  accessibilityLabel,
  style,
  children,
}: ToggleGroupProps): ReactElement {
  const [value, setValue] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const current = value ?? NO_VALUES;
  const ctx = useMemo<ToggleGroupContextValue>(
    () => ({
      value: current,
      disabled,
      toggle: (item) => {
        const on = current.includes(item);
        if (type === 'single') setValue(on ? NO_VALUES : [item]);
        else setValue(on ? current.filter((v) => v !== item) : [...current, item]);
      },
    }),
    [current, disabled, type, setValue],
  );
  return (
    <ToggleGroupContext.Provider value={ctx}>
      <View
        accessibilityLabel={accessibilityLabel}
        style={[
          { flexDirection: orientation === 'horizontal' ? 'row' : 'column' },
          style as ViewStyle,
        ]}
      >
        {children}
      </View>
    </ToggleGroupContext.Provider>
  );
}

export interface ToggleGroupItemProps {
  value: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children?: ReactNode;
}

export function ToggleGroupItem({
  value,
  disabled,
  accessibilityLabel,
  style,
  children,
}: ToggleGroupItemProps): ReactElement {
  const group = useContext(ToggleGroupContext);
  if (group === null) throw new Error('ToggleGroupItem must be inside ToggleGroup.');
  const pressed = group.value.includes(value);
  const off = disabled === true || group.disabled;
  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityState={{ checked: pressed, disabled: off }}
      accessibilityLabel={accessibilityLabel}
      disabled={off}
      onPress={() => {
        if (!off) group.toggle(value);
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
}
