'use client';

import type { ReactElement, ReactNode } from 'react';
import type { ComboboxOption } from './combobox.js';

export interface ListboxOptionsProps<T> {
  readonly options: ReadonlyArray<ComboboxOption<T>>;
  /** Prefix for each option's id: `${idPrefix}-option-${index}`. */
  readonly idPrefix: string;
  readonly highlightedIndex: number;
  readonly onHighlight: (index: number) => void;
  readonly isSelected: (value: T) => boolean;
  /** Called with an enabled option the pointer picked. */
  readonly onPick: (option: ComboboxOption<T>) => void;
  readonly renderOption?:
    | ((
        option: ComboboxOption<T>,
        info: { highlighted: boolean; selected: boolean; index: number },
      ) => ReactNode)
    | undefined;
}

/** The id `ListboxOptions` gives the option at `index`. */
export function optionId(idPrefix: string, index: number): string {
  return `${idPrefix}-option-${index}`;
}

/**
 * The `role="option"` rows of a listbox, shared by Combobox's popup and the
 * standalone Listbox. Picking happens on mousedown, with its default
 * prevented, so focus stays wherever the list's keyboard handling lives.
 */
export function ListboxOptions<T>({
  options,
  idPrefix,
  highlightedIndex,
  onHighlight,
  isSelected,
  onPick,
  renderOption,
}: ListboxOptionsProps<T>): ReactElement {
  return (
    <>
      {options.map((opt, i) => {
        const id = optionId(idPrefix, i);
        const highlighted = highlightedIndex === i;
        const selected = isSelected(opt.value);
        return (
          <div
            key={id}
            id={id}
            role="option"
            aria-selected={selected}
            aria-disabled={opt.disabled || undefined}
            onMouseDown={(e) => {
              e.preventDefault();
              if (opt.disabled !== true) onPick(opt);
            }}
            onMouseEnter={() => onHighlight(i)}
          >
            {renderOption !== undefined
              ? renderOption(opt, { highlighted, selected, index: i })
              : opt.label}
          </div>
        );
      })}
    </>
  );
}
