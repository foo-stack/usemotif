'use client';

import {
  TagsInput as HeadlessTagsInput,
  type TagInfo,
  type TagsInputProps as HeadlessTagsInputProps,
} from '@usemotif/headless';
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Chip } from './Chip.js';
import { LIST_STYLE, renderThemedOption } from './_list-surface.js';

export interface TagsInputProps extends Omit<
  HeadlessTagsInputProps,
  'renderTag' | 'style' | 'inputStyle' | 'listStyle' | 'renderSuggestion'
> {
  /** Width of the field (number → px). Default 320. */
  readonly width?: number | string;
}

// The field is the headless wrapper, themed through token CSS vars with hex
// fallbacks like the other inline-styled kit surfaces.
const INPUT_STYLE: CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  padding: '4px 2px',
};

// Module-scoped so they are stable references (lint: no-new-fn-as-prop).
function renderChip({ value, remove }: TagInfo): ReactNode {
  return (
    <Chip onRemove={remove} removeLabel={`Remove ${value}`}>
      {value}
    </Chip>
  );
}

function renderSuggestion(suggestion: string, info: { highlighted: boolean }): ReactNode {
  return renderThemedOption(
    { value: suggestion, label: suggestion },
    { highlighted: info.highlighted, selected: false, index: 0 },
  );
}

/**
 * Themed tags field over the headless `TagsInput`: each entry becomes a
 * removable `Chip`. Enter or a comma adds what was typed, a paste adds every
 * entry in it, Backspace removes the last chip, and `suggestions` offers
 * entries as you type.
 *
 * ```tsx
 * <TagsInput aria-label="Topics" defaultValue={['react']} suggestions={topics} />
 * ```
 */
export function TagsInput({ width = 320, disabled, ...rest }: TagsInputProps) {
  const fieldStyle = useMemo<CSSProperties>(
    () => ({
      width,
      minHeight: 40,
      padding: '4px 8px',
      borderRadius: 'var(--radii-lg, 12px)',
      border: '1px solid var(--colors-border-default, #d1d5db)',
      background: 'var(--colors-surface-raised, #fff)',
      color: 'var(--colors-text-default, #111)',
      opacity: disabled === true ? 0.5 : 1,
    }),
    [width, disabled],
  );
  return (
    <HeadlessTagsInput
      {...rest}
      {...(disabled !== undefined ? { disabled } : {})}
      style={fieldStyle}
      inputStyle={INPUT_STYLE}
      listStyle={LIST_STYLE}
      renderTag={renderChip}
      renderSuggestion={renderSuggestion}
    />
  );
}
