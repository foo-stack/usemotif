'use client';

import type { ReactElement, ReactNode } from 'react';
import { Box, Pressable, Text } from 'usemotif';

const DISMISS_HOVER = { opacity: 0.65 } as const;

interface StatusActionsProps {
  readonly action?: ReactNode;
  readonly onDismiss?: (() => void) | undefined;
  /** The intent's foreground token, so the `×` matches the text. */
  readonly color: string;
}

/**
 * The trailing action slot and `×` dismiss button that Alert and Banner share.
 * Pressable and Text, so the same part renders on web and native: on native a
 * bare `×` outside Text would throw, and the colour must sit on the Text.
 */
export function StatusActions({ action, onDismiss, color }: StatusActionsProps): ReactElement {
  return (
    <>
      {action !== undefined ? <Box flexShrink={0}>{action}</Box> : null}
      {onDismiss !== undefined ? (
        <Pressable
          flexShrink={0}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={24}
          h={24}
          p={0}
          borderWidth={0}
          borderRadius="$radii.md"
          bg="transparent"
          color={color}
          _hover={DISMISS_HOVER}
          onPress={onDismiss}
          aria-label="Dismiss"
        >
          <Text color={color}>×</Text>
        </Pressable>
      ) : null}
    </>
  );
}
