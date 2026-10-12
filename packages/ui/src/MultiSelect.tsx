'use client';

import { MultiSelect as HeadlessMultiSelect, type ComboboxOption } from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box, type BoxProps } from 'usemotif';
import { LIST_STYLE } from './_list-surface.js';

export interface MultiSelectProps {
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly value?: ReadonlyArray<string>;
  readonly defaultValue?: ReadonlyArray<string>;
  readonly onValueChange?: (next: ReadonlyArray<string>) => void;
  readonly placeholder?: string;
  /** Cap the number of selections. */
  readonly maxSelections?: number;
  /** Width of the field and listbox (number → px). */
  readonly width?: number | string;
}

// Module-scoped stable `renderChip` / `renderOption` references (lint).
function renderThemedChip(
  opt: ComboboxOption,
  info: { remove: () => void; index: number },
): ReactNode {
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap="$space.1"
      pl="$space.2"
      pr="$space.1"
      py="$space.1"
      borderRadius="$radii.md"
      bg="$colors.surface.muted"
      color="$colors.text.default"
      fontSize="$fontSizes.sm"
    >
      {opt.label}
      <Box
        as="button"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        width={16}
        height={16}
        borderWidth={0}
        borderRadius="$radii.full"
        bg="transparent"
        color="$colors.text.muted"
        cursor="pointer"
        aria-label="Remove"
        {...({ type: 'button', onClick: info.remove } as unknown as BoxProps)}
      >
        ×
      </Box>
    </Box>
  );
}

function renderThemedMultiOption(
  opt: ComboboxOption,
  info: { highlighted: boolean; selected: boolean; index: number },
): ReactNode {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap="$space.2"
      px="$space.3"
      py="$space.2"
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      bg={info.highlighted ? '$colors.surface.interactive' : 'transparent'}
      color={opt.disabled === true ? '$colors.text.muted' : '$colors.text.default'}
      cursor={opt.disabled === true ? 'not-allowed' : 'pointer'}
    >
      <Box as="span" width={14} color="$colors.action.primary.bg">
        {info.selected ? '✓' : ''}
      </Box>
      {opt.label}
    </Box>
  );
}

// A borderless input that grows to fill the field (the field Box carries the
// border); the headless clones the combobox handlers onto it.
function bareInput(placeholder: string) {
  return (
    <Box
      as="input"
      flexGrow={1}
      minWidth={80}
      borderWidth={0}
      bg="transparent"
      color="$colors.text.default"
      fontSize="$fontSizes.md"
      {...({ type: 'text', placeholder, style: { outline: 'none' } } as unknown as BoxProps)}
    />
  );
}

/**
 * Themed multi-select over the accessible headless `MultiSelect` (toggle-select,
 * removable chips, Backspace pops the last chip, `maxSelections`). Selections
 * show as chips in the field; the listbox marks chosen options with a check.
 *
 * ```tsx
 * <MultiSelect options={langs} defaultValue={['ts']} onValueChange={setLangs} />
 * ```
 */
export function MultiSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Add...',
  maxSelections,
  width = 280,
}: MultiSelectProps) {
  return (
    <HeadlessMultiSelect.Root
      options={options}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onValueChange !== undefined ? { onValueChange } : {})}
      {...(maxSelections !== undefined ? { maxSelections } : {})}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap="$space.1"
        width={width}
        minHeight={40}
        px="$space.2"
        py="$space.1"
        borderWidth="$borderWidths.thin"
        borderColor="$colors.border.default"
        borderRadius="$radii.lg"
        bg="$colors.surface.raised"
      >
        <HeadlessMultiSelect.Chips renderChip={renderThemedChip} />
        <HeadlessMultiSelect.Input>
          {
            bareInput(placeholder) as NonNullable<
              Parameters<typeof HeadlessMultiSelect.Input>[0]['children']
            >
          }
        </HeadlessMultiSelect.Input>
      </Box>
      <HeadlessMultiSelect.List style={LIST_STYLE} renderOption={renderThemedMultiOption} />
    </HeadlessMultiSelect.Root>
  );
}
