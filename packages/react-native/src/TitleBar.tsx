import type { MotifComponent } from '@usemotif/core';
import type { ReactElement, ReactNode } from 'react';
import { Box, type BoxProps } from './Box.js';
import { Text } from './Text.js';

export interface TitleBarProps extends Omit<BoxProps, 'title'> {
  /** The window title, centred and truncated. `children` replaces it with your own content. */
  title?: ReactNode;
  /** Content before the title, such as a menu button. */
  leading?: ReactNode;
  /** Content after the title, such as window buttons. */
  trailing?: ReactNode;
  children?: ReactNode;
}

/**
 * A window title bar row. On react-native-windows and react-native-macos it lays out the same
 * slots as the web `TitleBar`; React Native has no drag-region API, so the window keeps
 * dragging from the OS title bar.
 */
export const TitleBar: MotifComponent<TitleBarProps, ReactElement | null> = function ({
  title,
  leading,
  trailing,
  children,
  ...rest
}: TitleBarProps): ReactElement {
  return (
    <Box flexDirection="row" alignItems="center" height={38} flexShrink={0} {...rest}>
      {leading !== undefined ? (
        <Box flexDirection="row" alignItems="center" gap="$1">
          {leading}
        </Box>
      ) : null}
      <Box
        flex={1}
        minW={0}
        mx="$2"
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
      >
        {children ?? (
          <Text lines={1} fontSize="$sm" fontWeight="$medium">
            {title}
          </Text>
        )}
      </Box>
      {trailing !== undefined ? (
        <Box flexDirection="row" alignItems="center" gap="$1">
          {trailing}
        </Box>
      ) : null}
    </Box>
  );
};
