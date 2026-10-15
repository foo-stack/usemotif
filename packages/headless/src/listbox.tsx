'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ListboxOptions, optionId } from './_listbox-options.js';
import type { ComboboxOption } from './combobox.js';
import { useControllableState } from './use-controllable-state.js';

/** Props both selection modes share. */
export interface ListboxBaseProps<T = string> {
  options: ReadonlyArray<ComboboxOption<T>>;
  /** Override how each option renders. */
  renderOption?: (
    option: ComboboxOption<T>,
    info: { highlighted: boolean; selected: boolean; index: number },
  ) => ReactNode;
  disabled?: boolean;
  /** Row height in px for long lists, which render only the rows in view.
   * Omitted, it is measured from the first row; rows must share one height. */
  itemHeight?: number;
  /** Renders a group's heading, for options with a `group`. Defaults to the name. */
  renderGroupLabel?: (group: string) => ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  style?: CSSProperties;
}

export interface ListboxProps<T = string> extends ListboxBaseProps<T> {
  /** One selected option. The default. */
  selectionMode?: 'single';
  value?: T | undefined;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
}

/** Several selected options: selecting one toggles it. */
export interface MultiListboxProps<T = string> extends ListboxBaseProps<T> {
  selectionMode: 'multiple';
  value?: ReadonlyArray<T>;
  defaultValue?: ReadonlyArray<T>;
  onValueChange?: (value: ReadonlyArray<T>) => void;
}

/** How long the type-ahead keeps adding to its search, in ms. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * An always-visible listbox: arrow keys, Home and End move over enabled
 * options, typing jumps to a matching label, and Enter or Space selects. Pass
 * `selectionMode="multiple"` to select several.
 *
 * ```tsx
 * <Listbox aria-label="Fruit" options={fruit} value={pick} onValueChange={setPick} />
 * ```
 */
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
  return (
    <ListboxBody
      {...base}
      multiselectable={false}
      isSelected={(v) => selected === v}
      select={setSelected}
      initial={selected}
    />
  );
}

const NO_VALUES: ReadonlyArray<never> = [];

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
      multiselectable
      isSelected={(v) => current.includes(v)}
      select={(v) =>
        setSelected(current.includes(v) ? current.filter((x) => x !== v) : [...current, v])
      }
      initial={current[0]}
    />
  );
}

interface ListboxBodyProps<T> extends ListboxBaseProps<T> {
  multiselectable: boolean;
  isSelected: (value: T) => boolean;
  select: (value: T) => void;
  initial: T | undefined;
}

function ListboxBody<T>({
  options,
  renderOption,
  disabled = false,
  style,
  multiselectable,
  isSelected,
  select,
  initial,
  itemHeight,
  renderGroupLabel,
  ...aria
}: ListboxBodyProps<T>): ReactElement {
  const id = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [highlighted, setHighlighted] = useState(() =>
    options.findIndex((o) => o.value === initial),
  );
  const typed = useRef({ text: '', timer: undefined as ReturnType<typeof setTimeout> | undefined });
  useEffect(() => () => clearTimeout(typed.current.timer), []);

  const enabled = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.disabled !== true)
    .map(({ i }) => i);

  function move(to: number | undefined): void {
    if (to !== undefined) setHighlighted(to);
  }

  function typeahead(char: string): void {
    const t = typed.current;
    clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = setTimeout(() => {
      t.text = '';
    }, TYPEAHEAD_RESET_MS);
    // Search from the option after the current one, so repeating a letter
    // cycles through the options that start with it.
    const order = [
      ...enabled.filter((i) => i > highlighted),
      ...enabled.filter((i) => i <= highlighted),
    ];
    const search =
      t.text.length > 1 && t.text.split('').every((c) => c === t.text[0]) ? t.text[0]! : t.text;
    move(order.find((i) => options[i]!.label.toLowerCase().startsWith(search)));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (disabled || enabled.length === 0) return;
    const at = enabled.indexOf(highlighted);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(at === -1 ? enabled[0] : enabled[Math.min(at + 1, enabled.length - 1)]);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(at === -1 ? enabled[enabled.length - 1] : enabled[Math.max(at - 1, 0)]);
        return;
      case 'Home':
        e.preventDefault();
        move(enabled[0]);
        return;
      case 'End':
        e.preventDefault();
        move(enabled[enabled.length - 1]);
        return;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const option = options[highlighted];
        if (option !== undefined && option.disabled !== true) select(option.value);
        return;
      }
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key);
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={disabled ? -1 : 0}
      aria-multiselectable={multiselectable || undefined}
      aria-disabled={disabled || undefined}
      aria-activedescendant={highlighted >= 0 ? optionId(id, highlighted) : undefined}
      onKeyDown={onKeyDown}
      onFocus={() => {
        if (highlighted === -1) move(enabled[0]);
      }}
      style={style}
      {...aria}
    >
      <ListboxOptions
        options={options}
        idPrefix={id}
        highlightedIndex={highlighted}
        onHighlight={setHighlighted}
        isSelected={isSelected}
        onPick={(option) => {
          if (disabled) return;
          // Option rows keep focus where it was on mousedown; a standalone
          // listbox wants it, so its keyboard keeps working after a click.
          listRef.current?.focus();
          setHighlighted(options.indexOf(option));
          select(option.value);
        }}
        renderOption={renderOption}
        scrollRef={listRef}
        itemHeight={itemHeight}
        renderGroupLabel={renderGroupLabel}
      />
    </div>
  );
}
