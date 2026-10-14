'use client';

import {
  Select as HeadlessSelect,
  useControllableState,
  type ComboboxOption,
} from '@usemotif/headless';
import { Box } from 'usemotif';
import { LIST_STYLE, renderThemedOption, renderThemedGroupLabel } from './_list-surface.js';

export type SelectOption = ComboboxOption;

export interface SelectProps {
  readonly options: ReadonlyArray<SelectOption>;
  /** Controlled selected value. */
  readonly value?: string;
  /** Initially-selected value (uncontrolled). */
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | undefined) => void;
  /** Shown on the trigger when nothing is selected. */
  readonly placeholder?: string;
  /** Width of the trigger and listbox (number → px). */
  readonly width?: number | string;
}

// Chevron as a right-aligned background image, flipped on open via the
// `_expanded` pseudo (the same approach as the kit Accordion trigger).
const CHEVRON_DOWN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")";
const CHEVRON_UP =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 10l4-4 4 4'/%3E%3C/svg%3E\")";
const TRIGGER_EXPANDED = {
  borderColor: '$colors.action.primary.bg',
  backgroundImage: CHEVRON_UP,
} as const;

/**
 * Themed single-select dropdown over the accessible headless `Select` (a
 * Combobox without typeahead): trigger `aria-haspopup`/`aria-expanded`, full
 * listbox keyboard navigation, click-outside dismissal. Controlled or
 * uncontrolled - the trigger shows the selected option's label and flips its
 * chevron on open via the `_expanded` pseudo.
 *
 * ```tsx
 * <Select
 *   options={[{ value: 'utc', label: 'UTC' }, { value: 'pst', label: 'Pacific' }]}
 *   defaultValue="utc"
 *   onValueChange={(v) => setZone(v)}
 * />
 * ```
 */
export function Select({
  options,
  value: controlledValue,
  defaultValue,
  onValueChange,
  placeholder = 'Select...',
  width = 240,
}: SelectProps) {
  const [value, handleChange] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  const selected = options.find((o) => o.value === value);

  return (
    <HeadlessSelect.Root
      options={options}
      onValueChange={handleChange}
      {...(controlledValue !== undefined ? { value: controlledValue } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    >
      <HeadlessSelect.Trigger>
        <Box
          as="button"
          width={width}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          textAlign="left"
          px="$space.3"
          py="$space.2"
          pr="$space.10"
          bg="$colors.surface.raised"
          color={selected !== undefined ? '$colors.text.default' : '$colors.text.muted'}
          fontSize="$fontSizes.md"
          borderWidth="$borderWidths.thin"
          borderColor="$colors.border.default"
          borderRadius="$radii.lg"
          cursor="pointer"
          backgroundImage={CHEVRON_DOWN}
          backgroundRepeat="no-repeat"
          backgroundPosition="right 12px center"
          transition="border-color 120ms ease"
          _expanded={TRIGGER_EXPANDED}
        >
          {selected !== undefined ? selected.label : placeholder}
        </Box>
      </HeadlessSelect.Trigger>
      <HeadlessSelect.List
        style={LIST_STYLE}
        renderOption={renderThemedOption}
        renderGroupLabel={renderThemedGroupLabel}
      />
    </HeadlessSelect.Root>
  );
}
