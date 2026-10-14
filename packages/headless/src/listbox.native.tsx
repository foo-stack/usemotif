import type { ReactElement, ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { nativeText } from './_native-text.js';
import type { ComboboxOption } from './combobox.js';
import { useControllableState } from './use-controllable-state.js';

export interface ListboxBaseProps<T = string> {
  options: ReadonlyArray<ComboboxOption<T>>;
  renderOption?: (
    option: ComboboxOption<T>,
    info: { highlighted: boolean; selected: boolean; index: number },
  ) => ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export interface ListboxProps<T = string> extends ListboxBaseProps<T> {
  selectionMode?: 'single';
  value?: T | undefined;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
}

export interface MultiListboxProps<T = string> extends ListboxBaseProps<T> {
  selectionMode: 'multiple';
  value?: ReadonlyArray<T>;
  defaultValue?: ReadonlyArray<T>;
  onValueChange?: (value: ReadonlyArray<T>) => void;
}

const NO_VALUES: ReadonlyArray<never> = [];

/** Native Listbox: a list of pressable options with the same selection modes as web. */
export function Listbox<T>(props: ListboxProps<T> | MultiListboxProps<T>): ReactElement {
  return props.selectionMode === 'multiple' ? (
    <MultiListbox {...props} />
  ) : (
    <SingleListbox {...props} />
  );
}

function SingleListbox<T>(props: ListboxProps<T>): ReactElement {
  const { value, defaultValue, onValueChange, selectionMode: _mode, ...base } = props;
  const [selected, setSelected] = useControllableState<T | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as ((next: T | undefined) => void) | undefined,
    controlled: 'value' in props,
  });
  return <ListboxBody {...base} isSelected={(v) => selected === v} select={setSelected} />;
}

function MultiListbox<T>(props: MultiListboxProps<T>): ReactElement {
  const { value, defaultValue = NO_VALUES, onValueChange, selectionMode: _mode, ...base } = props;
  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  const current = selected ?? NO_VALUES;
  return (
    <ListboxBody
      {...base}
      isSelected={(v) => current.includes(v)}
      select={(v) =>
        setSelected(current.includes(v) ? current.filter((x) => x !== v) : [...current, v])
      }
    />
  );
}

function ListboxBody<T>({
  options,
  renderOption,
  disabled = false,
  accessibilityLabel,
  style,
  isSelected,
  select,
}: ListboxBaseProps<T> & {
  isSelected: (value: T) => boolean;
  select: (value: T) => void;
}): ReactElement {
  return (
    <View accessibilityRole="list" accessibilityLabel={accessibilityLabel} style={style}>
      {options.map((opt, index) => {
        const selected = isSelected(opt.value);
        const off = disabled || opt.disabled === true;
        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected, disabled: off }}
            disabled={off}
            onPress={() => {
              if (!off) select(opt.value);
            }}
          >
            {renderOption !== undefined
              ? renderOption(opt, { highlighted: false, selected, index })
              : nativeText(opt.label)}
          </Pressable>
        );
      })}
    </View>
  );
}
