import type { ReactNode } from 'react';
import { alertRecipe } from '@usemotif/recipes';
import { Box, Text } from 'usemotif';
import { StatusActions } from './_status-actions.js';
import { statusIcon } from './_status-icons.js';

export type AlertIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  /** Tone - drives the tinted background, border, and text colour. Default `neutral`. */
  readonly intent?: AlertIntent;
  /** Bold heading line. */
  readonly title?: ReactNode;
  /**
   * Leading icon, drawn in the intent colour. Defaults to the intent's status
   * icon (none for `neutral`); pass `null` to show none.
   */
  readonly icon?: ReactNode;
  /** Body content. */
  readonly children?: ReactNode;
  /** Trailing action area, such as a `<Button>`. */
  readonly action?: ReactNode;
  /** When provided, renders a `×` dismiss button calling this. The consumer
   * owns visibility: the Alert does not unmount itself. */
  readonly onDismiss?: () => void;
}

/**
 * A themed message box - a soft intent-tinted surface with a matching border
 * and readable text, an optional icon, and body copy. Colours resolve from the
 * semantic `status` tokens, so it re-themes in light and dark. Announced via
 * `role="alert"`.
 *
 * ```tsx
 * <Alert intent="danger" title="Payment failed" onDismiss={hide}>
 *   Update your card and try again.
 * </Alert>
 * ```
 */
export function Alert({
  intent = 'neutral',
  title,
  icon,
  children,
  action,
  onDismiss,
}: AlertProps) {
  const fg = `$colors.status.${intent}.fg`;
  const shown = icon === undefined ? statusIcon(intent) : icon;
  return (
    <Box role="alert" {...alertRecipe.base} {...alertRecipe.variants.intent[intent]}>
      {shown !== null && shown !== false ? (
        <Box flexShrink={0} display="inline-flex" color={fg}>
          {shown}
        </Box>
      ) : null}
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
      <StatusActions action={action} onDismiss={onDismiss} color={fg} />
    </Box>
  );
}
