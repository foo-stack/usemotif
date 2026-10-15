import type { MotifComponent } from '@usemotif/core';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Box, type BoxProps } from './Box.js';
import { Text } from './Text.js';

export interface TitleBarProps extends Omit<BoxProps, 'title'> {
  /** The window title, centred and truncated. `children` replaces it with your own content. */
  title?: ReactNode;
  /** Content before the title, such as a menu button. It stays clickable. */
  leading?: ReactNode;
  /** Content after the title, such as your own minimise, maximise and close buttons. */
  trailing?: ReactNode;
  children?: ReactNode;
}

const BAR_STYLE = {
  WebkitAppRegion: 'drag',
  appRegion: 'drag',
  userSelect: 'none',
} as CSSProperties;
const NO_DRAG = { WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as CSSProperties;
// Window Controls Overlay reports where the OS window controls leave room, in window
// coordinates. Spacers at each end take that room, so padding on the bar adds to it rather than
// being replaced; without an overlay both are 0 wide.
const START_INSET = { width: 'env(titlebar-area-x, 0px)' } as CSSProperties;
const END_INSET = {
  width: 'calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw))',
} as CSSProperties;
// Tauri only drags from an element that carries the attribute itself, not from its children.
const TAURI_DRAG = { 'data-tauri-drag-region': '' };

/**
 * A custom window title bar for a frameless desktop window. The bar drags the window, under
 * Electron's `app-region` and Tauri's `data-tauri-drag-region`, while whatever sits in
 * `leading` and `trailing` stays clickable. Under Window Controls Overlay (Electron's
 * `titleBarOverlay`) the bar pads itself clear of the OS window controls, so it should span the
 * window's full width. On React Native desktop it renders the same layout, and the window drags
 * from the OS title bar.
 *
 * @example
 * ```tsx
 * <TitleBar
 *   title="Untitled"
 *   trailing={<IconButton aria-label="Close" icon={X} onPress={() => window.close()} />}
 * />
 * ```
 */
export const TitleBar: MotifComponent<TitleBarProps, ReactElement | null> = function ({
  title,
  leading,
  trailing,
  children,
  style,
  ...rest
}: TitleBarProps): ReactElement {
  return (
    <Box
      display="flex"
      alignItems="center"
      height={38}
      flexShrink={0}
      {...TAURI_DRAG}
      {...rest}
      style={style === undefined ? BAR_STYLE : { ...BAR_STYLE, ...style }}
    >
      <Box aria-hidden flexShrink={0} style={START_INSET} {...TAURI_DRAG} />
      {leading !== undefined ? (
        <Box display="flex" alignItems="center" gap="$1" style={NO_DRAG}>
          {leading}
        </Box>
      ) : null}
      <Box
        flex={1}
        minW={0}
        mx="$2"
        display="flex"
        alignItems="center"
        justifyContent="center"
        {...TAURI_DRAG}
      >
        {children ?? (
          <Text lines={1} fontSize="$sm" fontWeight="$medium" {...TAURI_DRAG}>
            {title}
          </Text>
        )}
      </Box>
      {trailing !== undefined ? (
        <Box display="flex" alignItems="center" gap="$1" style={NO_DRAG}>
          {trailing}
        </Box>
      ) : null}
      <Box aria-hidden flexShrink={0} style={END_INSET} {...TAURI_DRAG} />
    </Box>
  );
};
