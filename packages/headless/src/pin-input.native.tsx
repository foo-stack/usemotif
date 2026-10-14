import { useEffect, useRef, type ReactElement } from 'react';
import { TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { pinBackspace, pinInput, type PinType } from './_pin.js';
import { useControllableState } from './use-controllable-state.js';

export type { PinType } from './_pin.js';

export interface PinInputProps {
  length?: number;
  type?: PinType;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  mask?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

/**
 * Native one-time-code input: a `TextInput` per character on the same editing
 * model as web, with the platform's SMS code autofill on the first box.
 */
export function PinInput({
  length = 6,
  type = 'numeric',
  value: controlled,
  defaultValue = '',
  onValueChange,
  onComplete,
  mask = false,
  disabled = false,
  accessibilityLabel,
  style,
  inputStyle,
}: PinInputProps): ReactElement {
  const [value, setValue] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const inputs = useRef<(TextInput | null)[]>([]);
  const focus = (index: number): void => inputs.current[index]?.focus();

  const completedRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (value.length === length && completedRef.current !== value) {
      completedRef.current = value;
      onCompleteRef.current?.(value);
    } else if (value.length < length) {
      completedRef.current = null;
    }
  }, [value, length]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row', gap: 8 }, style as ViewStyle]}
    >
      {Array.from({ length }, (_, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          accessibilityLabel={`Character ${index + 1} of ${length}`}
          value={value[index] ?? ''}
          editable={!disabled}
          secureTextEntry={mask}
          keyboardType={type === 'numeric' ? 'number-pad' : 'default'}
          autoCapitalize="none"
          {...(index === 0 ? { textContentType: 'oneTimeCode', autoComplete: 'sms-otp' } : {})}
          selectTextOnFocus
          onChangeText={(text) => {
            // A box that held a character and gained one more reports both;
            // keep the new one. Anything longer is a pasted or autofilled code.
            const held = value[index] ?? '';
            const added =
              held !== '' && text.length === held.length + 1 && text.startsWith(held)
                ? text.slice(held.length)
                : text;
            const edit =
              added === ''
                ? pinBackspace(value, index)
                : pinInput(value, index, added, length, type);
            if (edit.value !== value) setValue(edit.value);
            focus(edit.focus);
          }}
          onKeyPress={(e) => {
            // An empty box gets no change event for Backspace; step back here.
            if (e.nativeEvent.key === 'Backspace' && (value[index] ?? '') === '') {
              const edit = pinBackspace(value, index);
              if (edit.value !== value) setValue(edit.value);
              focus(edit.focus);
            }
          }}
          style={[{ width: 40, textAlign: 'center' }, inputStyle as TextStyle]}
        />
      ))}
    </View>
  );
}
