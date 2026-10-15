'use client';

import { MultiSelect as HeadlessMultiSelect, type ComboboxOption } from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box, Pressable } from 'usemotif';
import { platformText } from './_platform-text.js';
import { ThemedInput } from './_themed-input.js';
import { LIST_STYLE, renderThemedGroupLabel } from './_list-surface.js';
import { usePlatformStyle } from './_platform-style.js';

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
      {platformText(opt.label, CHIP_TEXT)}
      <Pressable
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        width={16}
        height={16}
        p={0}
        borderWidth={0}
        borderRadius="$radii.full"
        bg="transparent"
        color="$colors.text.muted"
        aria-label="Remove"
        onPress={info.remove}
      >
        {platformText('×', MUTED_TEXT)}
      </Pressable>
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
        {platformText(info.selected ? '✓' : '', MARK_TEXT)}
      </Box>
      {platformText(opt.label, {
        fontSize: '$fontSizes.sm',
        color: opt.disabled === true ? '$colors.text.muted' : '$colors.text.default',
      })}
    </Box>
  );
}

// A borderless input that grows to fill the field (the field Box carries the
// border); the headless clones the combobox handlers onto it.
const CHIP_TEXT = { color: '$colors.text.default', fontSize: '$fontSizes.sm' } as const;
const MUTED_TEXT = { color: '$colors.text.muted' } as const;
const MARK_TEXT = { color: '$colors.action.primary.bg' } as const;
const BARE_INPUT = { outline: 'none' } as const;

function bareInput(placeholder: string) {
  return (
    <ThemedInput
      flexGrow={1}
      minWidth={80}
      borderWidth={0}
      bg="transparent"
      color="$colors.text.default"
      fontSize="$fontSizes.md"
      type="text"
      placeholder={placeholder}
      style={BARE_INPUT}
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
  const platformStyle = usePlatformStyle();
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
      <HeadlessMultiSelect.List
        style={platformStyle(LIST_STYLE)}
        renderOption={renderThemedMultiOption}
        renderGroupLabel={renderThemedGroupLabel}
      />
    </HeadlessMultiSelect.Root>
  );
}
