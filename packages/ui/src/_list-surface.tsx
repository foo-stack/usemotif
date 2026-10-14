'use client';

import type { ComboboxOption } from '@usemotif/headless';
import type { CSSProperties, ReactNode } from 'react';
import { Box } from 'usemotif';

// The headless listbox is a portalled `<div role="listbox">` the kit can only
// style inline - so its surface is referenced through motif's token CSS vars
// (`--colors-*`, `--radii-*`), with hex fallbacks for the pre-hydration paint.
export const LIST_STYLE: CSSProperties = {
  maxHeight: 260,
  overflowY: 'auto',
  padding: 4,
  borderRadius: 'var(--radii-lg, 12px)',
  background: 'var(--colors-surface-raised, #fff)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
};

// Module-scoped so it's a stable `renderOption` reference (lint: no-new-fn-as-prop).
// `highlighted` reflects both keyboard navigation and mouse hover (the headless
// list sets it on mouse-enter), so the row needs no `_hover` of its own.
export function renderThemedOption(
  opt: ComboboxOption,
  info: { highlighted: boolean; selected: boolean; index: number },
): ReactNode {
  return (
    <Box
      px="$space.3"
      py="$space.2"
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      bg={info.highlighted ? '$colors.surface.interactive' : 'transparent'}
      color={opt.disabled === true ? '$colors.text.muted' : '$colors.text.default'}
      fontWeight={info.selected ? 600 : 400}
      cursor={opt.disabled === true ? 'not-allowed' : 'pointer'}
    >
      {opt.label}
    </Box>
  );
}

/** The themed heading over a group of options. */
export function renderThemedGroupLabel(group: string): ReactNode {
  return (
    <Box
      px="$space.3"
      pt="$space.2"
      pb="$space.1"
      fontSize="$fontSizes.xs"
      fontWeight={600}
      color="$colors.text.muted"
      textTransform="uppercase"
      letterSpacing="$letterSpacings.wide"
    >
      {group}
    </Box>
  );
}
