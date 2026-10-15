'use client';

import { useMessages } from '@usemotif/react';
import {
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { defaultFilter } from './_combobox-filter.js';
import { addTags, splitTags, type TagRules } from './_tags.js';
import { ComboboxInput, ComboboxList, ComboboxRoot, type ComboboxOption } from './combobox.js';
import { useControllableState } from './use-controllable-state.js';

/** What `renderTag` is told about one tag. */
export interface TagInfo {
  value: string;
  index: number;
  remove: () => void;
}

export interface TagsInputProps extends TagRules {
  value?: ReadonlyArray<string>;
  defaultValue?: ReadonlyArray<string>;
  onValueChange?: (value: ReadonlyArray<string>) => void;
  /** Keys, besides Enter, that add the typed entry; pasted text splits on them
   * too. Defaults to `[',']`. */
  delimiters?: ReadonlyArray<string>;
  /** Offered as the user types: the ones not yet added, filtered by the text. */
  suggestions?: ReadonlyArray<string>;
  /** Renders one tag. Defaults to the text and a "Remove {tag}" button. */
  renderTag?: (info: TagInfo) => ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Names the input. */
  'aria-label'?: string;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  /** Inline style for the suggestion list. */
  listStyle?: CSSProperties;
  /** Override how each suggestion renders. */
  renderSuggestion?: (suggestion: string, info: { highlighted: boolean }) => ReactNode;
}

const COMMA: ReadonlyArray<string> = [','];
const NO_TAGS: ReadonlyArray<string> = [];

function DefaultTag({ value, remove }: TagInfo): ReactElement {
  const messages = useMessages();
  return (
    <span>
      {value}
      <button type="button" aria-label={messages.removeItem(value)} onClick={remove}>
        ×
      </button>
    </span>
  );
}

/**
 * An input that turns entries into tags. Enter or a delimiter adds what was
 * typed, a paste adds every entry in it, and Backspace on an empty input
 * removes the last tag. Pass `suggestions` to offer entries as the user types.
 *
 * ```tsx
 * <TagsInput aria-label="Topics" value={topics} onValueChange={setTopics} />
 * ```
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
  style,
  inputStyle,
  listStyle,
  renderSuggestion,
  ...aria
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

  function onKeyDown(e: KeyboardEvent<HTMLElement>): void {
    // A suggestion picked with Enter has already been handled (and its event
    // prevented) by the combobox input this bubbles up from.
    if (e.defaultPrevented || disabled) return;
    if (e.key === 'Enter' || delimiters.includes(e.key)) {
      if (text.trim() === '' && e.key === 'Enter') return;
      e.preventDefault();
      add([text]);
      setText('');
    } else if (e.key === 'Backspace' && text === '' && current.length > 0) {
      removeAt(current.length - 1);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLElement>): void {
    const pasted = e.clipboardData.getData('text');
    const entries = splitTags(pasted, delimiters);
    if (entries.length < 2) return;
    e.preventDefault();
    add(entries);
    setText('');
  }

  // A picked suggestion also writes its label into the input; the tag has
  // already been added, so that write is swallowed.
  const pickedRef = useRef(false);
  const options = useMemo<ReadonlyArray<ComboboxOption>>(
    () =>
      (suggestions ?? [])
        .filter((s) => allowDuplicates === true || !current.includes(s))
        .filter((s) => defaultFilter({ label: s }, text))
        .map((s) => ({ value: s, label: s })),
    [suggestions, current, text, allowDuplicates],
  );

  const input = (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={aria['aria-label']}
      onChange={(e) => setText(e.target.value)}
      style={{ flex: 1, minWidth: 80, ...inputStyle }}
    />
  );

  return (
    // The keys are handled on the wrapper so the combobox input, which owns the
    // input's own handlers when suggestions are on, sees them first.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, ...style }}
    >
      {current.map((value, index) => (
        <span key={`${value}-${index}`}>
          {(renderTag ?? DefaultTag)({ value, index, remove: () => removeAt(index) })}
        </span>
      ))}
      {suggestions === undefined ? (
        input
      ) : (
        <ComboboxRoot<string>
          options={options}
          filter={false}
          // Always controlled and empty: a pick becomes a tag, never a selection.
          value=""
          onValueChange={(picked) => {
            if (picked === undefined || picked === '') return;
            pickedRef.current = true;
            add([picked]);
            setText('');
          }}
          inputValue={text}
          onInputValueChange={(next) => {
            if (pickedRef.current) {
              pickedRef.current = false;
              return;
            }
            setText(next);
          }}
        >
          <ComboboxInput>{input}</ComboboxInput>
          <ComboboxList<string>
            {...(listStyle !== undefined ? { style: listStyle } : {})}
            {...(renderSuggestion !== undefined
              ? {
                  renderOption: (option: ComboboxOption<string>, info: { highlighted: boolean }) =>
                    renderSuggestion(option.value, info),
                }
              : {})}
          />
        </ComboboxRoot>
      )}
    </div>
  );
}
