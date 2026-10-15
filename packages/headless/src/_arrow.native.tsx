import type { CSSProperties, ReactElement } from 'react';

export interface FloatingArrowProps {
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  style?: CSSProperties;
}

/** Native overlays open as modals with no anchored edge, so there is nothing
 * to point at; the part exists so shared code renders on both platforms. */
export function FloatingArrow(_props: FloatingArrowProps): ReactElement | null {
  return null;
}
