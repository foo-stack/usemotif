import type { ReactNode } from 'react';
import { alertRecipe } from '@usemotif/recipes';
import { Box, Text } from 'usemotif';

export type AlertIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  /** Tone - drives the tinted background, border, and text colour. Default `neutral`. */
  readonly intent?: AlertIntent;
  /** Bold heading line. */
  readonly title?: ReactNode;
  /** Optional leading icon (inherits the intent colour via `currentColor`). */
  readonly icon?: ReactNode;
  /** Body content. */
  readonly children?: ReactNode;
}

/**
 * A themed message box - a soft intent-tinted surface with a matching border
 * and readable text, an optional icon, and body copy. Colours resolve from the
 * semantic `status` tokens, so it re-themes in light and dark. Announced via
 * `role="alert"`.
 *
 * ```tsx
 * <Alert intent="danger" title="Payment failed">
 *   Update your card and try again.
 * </Alert>
 * ```
 */
export function Alert({ intent = 'neutral', title, icon, children }: AlertProps) {
  const fg = `$colors.status.${intent}.fg`;
  return (
    <Box role="alert" {...alertRecipe.base} {...alertRecipe.variants.intent[intent]}>
      {icon ? <Box flexShrink={0}>{icon}</Box> : null}
      <Box display="flex" flexDirection="column" gap="$space.1" flex={1}>
        {title ? (
          <Text fontWeight="$fontWeights.semibold" color={fg}>
            {title}
          </Text>
        ) : null}
        {children ? (
          <Text fontSize="$fontSizes.sm" color={fg}>
            {children}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
