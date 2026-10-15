import { CircleAlert, CircleCheck, Info, TriangleAlert } from '@usemotif/icons';
import type { ReactNode } from 'react';

type StatusIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** The icon Alert and Banner show for an intent when `icon` is not given. Neutral has none. */
export function statusIcon(intent: StatusIntent): ReactNode {
  switch (intent) {
    case 'info':
      return <Info />;
    case 'success':
      return <CircleCheck />;
    case 'warning':
      return <TriangleAlert />;
    case 'danger':
      return <CircleAlert />;
    default:
      return null;
  }
}
