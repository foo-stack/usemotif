'use client';

import {
  Combobox as HeadlessCombobox,
  Search as HeadlessSearch,
  type ComboboxOption,
} from '@usemotif/headless';
import { Box, type BoxProps } from 'usemotif';
import { LIST_STYLE, renderThemedOption } from './_list-surface.js';

export type ComboboxItem = ComboboxOption;

export interface ComboboxProps {
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | undefined) => void;
  readonly placeholder?: string;
  /** Width of the input and listbox (number → px). */
  readonly width?: number | string;
}

// The themed text input projected into the headless Input (which clones the
// combobox role / value / onChange / keyboard handlers onto it).
function themedInput(width: number | string, placeholder: string) {
  return (
    <Box
      as="input"
      width={width}
      px="$space.3"
      py="$space.2"
      borderWidth="$borderWidths.thin"
      borderColor="$colors.border.default"
      borderRadius="$radii.lg"
      bg="$colors.surface.raised"
      color="$colors.text.default"
      fontSize="$fontSizes.md"
      {...({ type: 'text', placeholder } as unknown as BoxProps)}
    />
  );
}

function rootProps(props: ComboboxProps) {
  const { options, value, defaultValue, onValueChange } = props;
  return {
    options,
    ...(value !== undefined ? { value } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(onValueChange !== undefined ? { onValueChange } : {}),
  };
}

/**
 * Themed autocomplete over the accessible headless `Combobox` (typeahead
 * filtering, `role="combobox"`, listbox keyboard navigation). The input filters
 * the options as you type; picking one fills the input.
 *
 * ```tsx
 * <Combobox options={frameworks} defaultValue="react" onValueChange={setFw} />
 * ```
 */
export function Combobox({ placeholder = 'Search...', width = 240, ...rest }: ComboboxProps) {
  return (
    <HeadlessCombobox.Root {...rootProps({ ...rest, placeholder, width })}>
      <HeadlessCombobox.Input>
        {
          themedInput(width, placeholder) as NonNullable<
            Parameters<typeof HeadlessCombobox.Input>[0]['children']
          >
        }
      </HeadlessCombobox.Input>
      <HeadlessCombobox.List style={LIST_STYLE} renderOption={renderThemedOption} />
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
  return (
    <HeadlessSearch.Root {...rootProps({ ...rest, placeholder, width })}>
      <HeadlessSearch.Input>
        {
          themedInput(width, placeholder) as NonNullable<
            Parameters<typeof HeadlessSearch.Input>[0]['children']
          >
        }
      </HeadlessSearch.Input>
      <HeadlessSearch.List style={LIST_STYLE} renderOption={renderThemedOption} />
    </HeadlessSearch.Root>
  );
}
