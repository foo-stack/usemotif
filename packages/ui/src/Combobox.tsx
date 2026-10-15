'use client';

import {
  Combobox as HeadlessCombobox,
  Search as HeadlessSearch,
  type ComboboxOption,
} from '@usemotif/headless';
import type { ReactNode } from 'react';
import { ThemedInput } from './_themed-input.js';
import { LIST_STYLE, renderThemedOption, renderThemedGroupLabel } from './_list-surface.js';
import { usePlatformStyle } from './_platform-style.js';

export type ComboboxItem = ComboboxOption;

export interface ComboboxProps {
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | undefined) => void;
  readonly placeholder?: string;
  /** Width of the input and listbox (number → px). */
  readonly width?: number | string;
  /** Controlled text in the input. */
  readonly inputValue?: string;
  /** Fires on every keystroke: the place to fetch options as the user types. */
  readonly onInputValueChange?: (input: string) => void;
  /** `false` shows `options` exactly as given, for results a server already matched. */
  readonly filter?: ((option: ComboboxOption, input: string) => boolean) | false;
  /** Results are being fetched; the list shows `loadingMessage` while it has no options. */
  readonly loading?: boolean;
  /** Shown while `loading` with no options. Defaults to `'Loading...'`. */
  readonly loadingMessage?: ReactNode;
  /** Shown when there are no options. Defaults to `'No options'`. */
  readonly emptyMessage?: ReactNode;
}

// The themed text input projected into the headless Input (which clones the
// combobox role / value / onChange / keyboard handlers onto it).
function themedInput(width: number | string, placeholder: string) {
  return (
    <ThemedInput
      width={width}
      px="$space.3"
      py="$space.2"
      borderWidth="$borderWidths.thin"
      borderColor="$colors.border.default"
      borderRadius="$radii.lg"
      bg="$colors.surface.raised"
      color="$colors.text.default"
      fontSize="$fontSizes.md"
      type="text"
      placeholder={placeholder}
    />
  );
}

function rootProps(props: ComboboxProps) {
  const { options, value, defaultValue, onValueChange, inputValue, onInputValueChange } = props;
  const { filter, loading } = props;
  return {
    options,
    ...(value !== undefined ? { value } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(onValueChange !== undefined ? { onValueChange } : {}),
    ...(inputValue !== undefined ? { inputValue } : {}),
    ...(onInputValueChange !== undefined ? { onInputValueChange } : {}),
    ...(filter !== undefined ? { filter } : {}),
    ...(loading !== undefined ? { loading } : {}),
  };
}

function listProps(props: ComboboxProps) {
  const { loadingMessage, emptyMessage } = props;
  return {
    ...(loadingMessage !== undefined ? { loadingMessage } : {}),
    ...(emptyMessage !== undefined ? { emptyMessage } : {}),
  };
}

/**
 * Themed autocomplete over the accessible headless `Combobox` (typeahead
 * filtering, `role="combobox"`, listbox keyboard navigation). The input filters
 * the options as you type; picking one fills the input. For options fetched as
 * the user types, pass `filter={false}`, `loading`, and `onInputValueChange`.
 *
 * ```tsx
 * <Combobox options={frameworks} defaultValue="react" onValueChange={setFw} />
 * <Combobox options={results} filter={false} loading={pending} onInputValueChange={fetch} />
 * ```
 */
export function Combobox({ placeholder = 'Search...', width = 240, ...rest }: ComboboxProps) {
  const platformStyle = usePlatformStyle();
  return (
    <HeadlessCombobox.Root {...rootProps({ ...rest, placeholder, width })}>
      <HeadlessCombobox.Input>
        {
          themedInput(width, placeholder) as NonNullable<
            Parameters<typeof HeadlessCombobox.Input>[0]['children']
          >
        }
      </HeadlessCombobox.Input>
      <HeadlessCombobox.List
        {...listProps(rest)}
        style={platformStyle(LIST_STYLE)}
        renderOption={renderThemedOption}
        renderGroupLabel={renderThemedGroupLabel}
      />
    </HeadlessCombobox.Root>
  );
}

/**
 * Themed search box - a {@link Combobox} tuned for free-text input, wrapped in a
 * `role="search"` landmark.
 *
 * ```tsx
 * <Search options={results} onValueChange={openResult} placeholder="Search docs..." />
 * ```
 */
export function Search({ placeholder = 'Search...', width = 280, ...rest }: ComboboxProps) {
  const platformStyle = usePlatformStyle();
  return (
    <HeadlessSearch.Root {...rootProps({ ...rest, placeholder, width })}>
      <HeadlessSearch.Input>
        {
          themedInput(width, placeholder) as NonNullable<
            Parameters<typeof HeadlessSearch.Input>[0]['children']
          >
        }
      </HeadlessSearch.Input>
      <HeadlessSearch.List
        {...listProps(rest)}
        style={platformStyle(LIST_STYLE)}
        renderOption={renderThemedOption}
        renderGroupLabel={renderThemedGroupLabel}
      />
    </HeadlessSearch.Root>
  );
}
