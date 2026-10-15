import type { MotifComponent } from '@usemotif/core';
import { type ReactElement, type ReactNode } from 'react';
import { Modal, type ViewStyle } from 'react-native';
import type { BreakpointName } from '@usemotif/core';
import { Box, type BoxProps } from './Box.js';
import { Pressable } from './Pressable.js';
import { Text, type TextProps } from './Text.js';
import { useViewportWidth } from './responsive.js';
import { useBreakpointWidths } from './theme-context.js';
import { KeepMountedBoundary, keepsMounted, type KeepMounted } from './_keep-mounted.js';

/**
 * Portal on native - RN doesn't have a native portal primitive.
 * The closest equivalent is `<Modal>`, which lifts content out of
 * the normal layout tree and renders it on top of everything. Our
 * Portal wraps Modal with `transparent={true}` so the caller
 * controls the scrim themselves (via Overlay or by hand).
 *
 * `to` is documented as web-only and ignored here.
 */
export interface PortalProps {
  children?: ReactNode;
  /** Web-only; ignored on native. */
  to?: unknown;
  /** Closes the underlying Modal. Set this when wiring up dismiss
   * logic from Overlay. Defaults to a no-op. */
  onRequestClose?: () => void;
  /** Whether the Modal is visible. Defaults to `true` so a portalled
   * tree is visible immediately on mount; callers controlling
   * visibility externally pass `visible={false}` to hide. */
  visible?: boolean;
}
export function Portal({ children, onRequestClose, visible = true }: PortalProps): ReactElement {
  return (
    <Modal transparent visible={visible} onRequestClose={onRequestClose ?? (() => {})}>
      {children}
    </Modal>
  );
}

export interface OverlayProps extends Omit<BoxProps, 'position'> {
  onScrimClick?: () => void;
  scrim?: string;
  children?: ReactNode;
}
export const Overlay: MotifComponent<OverlayProps, ReactElement | null> = function ({
  onScrimClick,
  scrim,
  children,
  ...rest
}: OverlayProps): ReactElement {
  // The scrim is an absolutely-positioned full-screen Pressable *behind*
  // the centered content, not its parent. A tap on the content no longer
  // bubbles to the scrim Pressable, so only taps outside the content
  // dismiss - matching the web's `e.target === e.currentTarget` guard.
  return (
    <Portal>
      <Box flex={1} alignItems="center" justifyContent="center">
        <Pressable
          onPress={onScrimClick ?? (() => {})}
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          bg={scrim ?? 'rgba(0,0,0,0.5)'}
        />
        <Box {...rest}>{children}</Box>
      </Box>
    </Portal>
  );
};

/** VisuallyHidden on native - wraps children with `accessible={true}`
 * but renders them with zero size so they're announced but not
 * visible. */
export interface VisuallyHiddenProps {
  children?: ReactNode;
}
export function VisuallyHidden({ children }: VisuallyHiddenProps): ReactElement {
  return (
    <Box
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' } as ViewStyle}
      accessible
    >
      <Text>{children}</Text>
    </Box>
  );
}

export interface LiveRegionProps extends BoxProps {
  politeness?: 'polite' | 'assertive' | 'off';
  visuallyHidden?: boolean;
  children?: ReactNode;
}
export const LiveRegion: MotifComponent<LiveRegionProps, ReactElement | null> = function ({
  politeness = 'polite',
  visuallyHidden = false,
  children,
  ...rest
}: LiveRegionProps): ReactElement {
  return (
    <Box
      accessibilityLiveRegion={politeness === 'off' ? 'none' : politeness}
      {...(visuallyHidden
        ? {
            style: {
              position: 'absolute',
              width: 0,
              height: 0,
              overflow: 'hidden',
            } as ViewStyle,
          }
        : {})}
      {...rest}
    >
      {children}
    </Box>
  );
};

/** FocusScope on native - RN's focus model doesn't map cleanly to
 * the web's. v0 is a passthrough; full integration with RN's
 * `accessibilityElementsHidden` + `focus()` machinery lands in a
 * follow-up alongside Dialog. */
export interface FocusScopeProps {
  autoFocus?: boolean;
  restoreFocus?: boolean;
  children?: ReactNode;
}
export function FocusScope({ children }: FocusScopeProps): ReactElement {
  return <>{children}</>;
}

export interface ShowHideProps {
  above?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  below?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /**
   * `'activity'` keeps the children mounted while they are not shown, hidden through React's
   * `<Activity>`, so their state survives a resize across the breakpoint. Needs React 19.2.
   */
  keepMounted?: KeepMounted;
  children?: ReactNode;
}
function useViewportMatch(above?: BreakpointName, below?: BreakpointName): boolean {
  const w = useViewportWidth();
  // Per-tree configured widths - previously this used a hardcoded literal
  // table, so native Show/Hide ignored `<ThemeProvider breakpoints={...}>`
  // entirely (unlike web). Now it resolves against the same source as the
  // declarative props and useMedia.
  const bp = useBreakpointWidths();
  const aboveOk = above === undefined || w >= (bp[above] ?? 0);
  const belowOk = below === undefined || w < (bp[below] ?? Infinity);
  return aboveOk && belowOk;
}

export function Show({ above, below, keepMounted, children }: ShowHideProps): ReactElement | null {
  return showWhen(useViewportMatch(above, below), keepMounted, children);
}

export function Hide({ above, below, keepMounted, children }: ShowHideProps): ReactElement | null {
  return showWhen(!useViewportMatch(above, below), keepMounted, children);
}

function showWhen(
  visible: boolean,
  keepMounted: KeepMounted | undefined,
  children: ReactNode,
): ReactElement | null {
  if (keepsMounted(keepMounted)) {
    return <KeepMountedBoundary visible={visible}>{children}</KeepMountedBoundary>;
  }
  return visible ? <>{children}</> : null;
}

export type { TextProps };
