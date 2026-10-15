'use client';

import type { ReactNode } from 'react';
import { bannerRecipe } from '@usemotif/recipes';
import { Box, Text } from 'usemotif';
import { StatusActions } from './_status-actions.js';

export type BannerIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps {
  /** Tone - drives the tinted background, border, and text colour. Default `neutral`. */
  readonly intent?: BannerIntent;
  /** Optional leading icon (inherits the intent colour). */
  readonly icon?: ReactNode;
  /** Bold heading line. */
  readonly title?: ReactNode;
  /** Body copy. */
  readonly children?: ReactNode;
  /** Trailing action area - e.g. a `<Button>`. */
  readonly action?: ReactNode;
  /** When provided, renders a `×` dismiss button calling this. The consumer
   * owns visibility (a Banner is presentational - it doesn't unmount itself). */
  readonly onDismiss?: () => void;
}

/**
 * A themed full-width announcement bar - the page-level cousin of `Alert`. Soft
 * intent tint from the `status` tokens, an optional icon, title + copy, a
 * trailing action, and an optional dismiss button. Pure presentational (Box +
 * Text, no headless), so it hugs the display floor. Announced via `role="alert"`
 * for `warning` / `danger`, `role="status"` otherwise.
 *
 * ```tsx
 * <Banner intent="warning" title="Scheduled maintenance" onDismiss={hide}>
 *   The dashboard will be read-only from 02:00-03:00 UTC.
 * </Banner>
 * ```
 */
export function Banner({
  intent = 'neutral',
  icon,
  title,
  children,
  action,
  onDismiss,
}: BannerProps) {
  const fg = `$colors.status.${intent}.fg`;
  return (
    <Box
      role={intent === 'danger' || intent === 'warning' ? 'alert' : 'status'}
      {...bannerRecipe.base}
      {...bannerRecipe.variants.intent[intent]}
    >
      {icon !== undefined ? (
        <Box flexShrink={0} display="inline-flex" alignItems="center">
          {icon}
        </Box>
      ) : null}
      <Box flexGrow={1} display="flex" flexDirection="column" gap="$space.1">
        {title !== undefined ? (
          <Text fontWeight="$fontWeights.semibold" color={fg}>
            {title}
          </Text>
        ) : null}
        {children !== undefined ? (
          <Text fontSize="$fontSizes.sm" color={fg}>
            {children}
          </Text>
        ) : null}
      </Box>
      <StatusActions action={action} onDismiss={onDismiss} color={fg} />
    </Box>
  );
}
