import { useMessages } from '@usemotif/react-native';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { defaultFilter } from './_combobox-filter.js';
import { addTags, splitTags, type TagRules } from './_tags.js';
import { useControllableState } from './use-controllable-state.js';

export interface TagInfo {
  value: string;
  index: number;
  remove: () => void;
}

export interface TagsInputProps extends TagRules {
  value?: ReadonlyArray<string>;
  defaultValue?: ReadonlyArray<string>;
  onValueChange?: (value: ReadonlyArray<string>) => void;
  delimiters?: ReadonlyArray<string>;
  suggestions?: ReadonlyArray<string>;
  renderTag?: (info: TagInfo) => ReactNode;
  placeholder?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

const COMMA: ReadonlyArray<string> = [','];
const NO_TAGS: ReadonlyArray<string> = [];

function DefaultTag({ value, remove }: TagInfo): ReactElement {
  const messages = useMessages();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.removeItem(value)}
        onPress={remove}
      >
        <Text>×</Text>
      </Pressable>
    </View>
  );
}

/**
 * Native TagsInput: the same rules as web on a `TextInput`. Submitting or a
 * delimiter adds the entry, Backspace on an empty field removes the last tag,
 * and suggestions show as a pressable list while typing.
 */
export function TagsInput({
  value: controlled,
  defaultValue = NO_TAGS,
  onValueChange,
  delimiters = COMMA,
  suggestions,
  renderTag,
  placeholder,
  disabled = false,
  max,
  allowDuplicates,
  validate,
  accessibilityLabel,
  style,
  inputStyle,
}: TagsInputProps): ReactElement {
  const [tags, setTags] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const current = tags ?? NO_TAGS;
  const [text, setText] = useState('');
  const rules: TagRules = {
    ...(max !== undefined ? { max } : {}),
    ...(allowDuplicates !== undefined ? { allowDuplicates } : {}),
    ...(validate !== undefined ? { validate } : {}),
  };
  const add = (entries: ReadonlyArray<string>): void => {
    const next = addTags(current, entries, rules);
    if (next !== current) setTags(next);
  };
  const removeAt = (index: number): void => setTags(current.filter((_, i) => i !== index));

  const offered =
    suggestions === undefined || text.trim() === ''
      ? []
      : suggestions
          .filter((s) => allowDuplicates === true || !current.includes(s))
          .filter((s) => defaultFilter({ label: s }, text));

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        {current.map((value, index) => (
          <View key={`${value}-${index}`}>
            {(renderTag ?? DefaultTag)({ value, index, remove: () => removeAt(index) })}
          </View>
        ))}
        <TextInput
          value={text}
          placeholder={placeholder}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel}
          onChangeText={(next) => {
            const parts = splitTags(next, delimiters);
            if (parts.length < 2) {
              setText(next);
              return;
            }
            // A delimiter was typed or a list pasted: everything before the
            // last delimiter becomes tags, the rest stays in the field.
            add(parts.slice(0, -1));
            setText(parts.at(-1) ?? '');
          }}
          onSubmitEditing={() => {
            add([text]);
            setText('');
          }}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && text === '' && current.length > 0) {
              removeAt(current.length - 1);
            }
          }}
          blurOnSubmit={false}
          style={[{ flexGrow: 1, minWidth: 80 }, inputStyle as TextStyle]}
        />
      </View>
      {offered.length > 0 ? (
        <View accessibilityRole="list">
          {offered.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={s}
              onPress={() => {
                add([s]);
                setText('');
              }}
            >
              <Text>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
