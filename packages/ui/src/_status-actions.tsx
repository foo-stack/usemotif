'use client';

import type { ReactElement, ReactNode } from 'react';
import { Box, type BoxProps } from 'usemotif';

const DISMISS_HOVER = { opacity: 0.65 } as const;

interface StatusActionsProps {
  readonly action?: ReactNode;
  readonly onDismiss?: (() => void) | undefined;
  /** The intent's foreground token, so the `×` matches the text. */
  readonly color: string;
}

/** The trailing action slot and `×` dismiss button that Alert and Banner share. */
export function StatusActions({ action, onDismiss, color }: StatusActionsProps): ReactElement {
  return (
    <>
      {action !== undefined ? <Box flexShrink={0}>{action}</Box> : null}
      {onDismiss !== undefined ? (
        <Box
          as="button"
          flexShrink={0}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={24}
          h={24}
          borderWidth={0}
          borderRadius="$radii.md"
          bg="transparent"
          color={color}
          cursor="pointer"
          _hover={DISMISS_HOVER}
          onClick={onDismiss}
          aria-label="Dismiss"
          {...({ type: 'button' } as unknown as BoxProps)}
        >
          ×
        </Box>
      ) : null}
    </>
  );
}
