'use client';

import { Toolbar as HeadlessToolbar } from '@usemotif/headless';
import type { CSSProperties, ReactNode } from 'react';
import { usePlatformStyle } from './_platform-style.js';

export interface ToolbarProps {
  readonly orientation?: 'horizontal' | 'vertical';
  readonly 'aria-label'?: string;
  readonly children?: ReactNode;
}

// The headless Toolbar renders its own `role="toolbar"` div, themeable only via
// inline style - so the surface references motif's token CSS vars.
const STYLE_HORIZONTAL: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  padding: 4,
  borderRadius: 'var(--radii-lg, 12px)',
  background: 'var(--colors-surface-default, #fff)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
};
const STYLE_VERTICAL: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 4,
  padding: 4,
  borderRadius: 'var(--radii-lg, 12px)',
  background: 'var(--colors-surface-default, #fff)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
};

/**
 * A themed toolbar over the accessible headless `Toolbar` (`role="toolbar"` with
 * arrow-key roving focus across its focusable children). Put `Button` /
 * `IconButton` primitives inside.
 *
 * ```tsx
 * <Toolbar aria-label="Formatting">
 *   <IconButton aria-label="Bold"><BoldIcon /></IconButton>
 *   <IconButton aria-label="Italic"><ItalicIcon /></IconButton>
 * </Toolbar>
 * ```
 */
export function Toolbar({ orientation = 'horizontal', children, ...rest }: ToolbarProps) {
  const platformStyle = usePlatformStyle();
  return (
    <HeadlessToolbar
      orientation={orientation}
      style={platformStyle(orientation === 'vertical' ? STYLE_VERTICAL : STYLE_HORIZONTAL)}
      {...(rest['aria-label'] !== undefined ? { 'aria-label': rest['aria-label'] } : {})}
    >
      {children}
    </HeadlessToolbar>
  );
}
