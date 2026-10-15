import * as React from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';

/**
 * `'activity'` keeps content that is not shown mounted but hidden, through React's
 * `<Activity>`: its state and DOM survive, its effects pause, and its updates run at low
 * priority. React before 19.2 has no `<Activity>`, and the content unmounts as before.
 */
export type KeepMounted = 'activity';

// Read off the namespace so an older React, which lacks the export, gives `undefined`.
const Activity = (
  React as { Activity?: ComponentType<{ mode: 'visible' | 'hidden'; children?: ReactNode }> }
).Activity;

/** Whether `keepMounted` asks for hidden content to stay mounted, and React can do it. */
export function keepsMounted(keepMounted: KeepMounted | undefined): boolean {
  return keepMounted === 'activity' && Activity !== undefined;
}

/** Shows or hides `children` without unmounting them. Use after {@link keepsMounted}. */
export function KeepMountedBoundary({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}): ReactElement {
  const Boundary = Activity!;
  return <Boundary mode={visible ? 'visible' : 'hidden'}>{children}</Boundary>;
}
