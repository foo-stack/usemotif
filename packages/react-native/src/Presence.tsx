import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useExitTransitionNative } from './_animation/presence-context.js';

/** Props for {@link Presence}. */
export interface PresenceProps {
  /** Keyed elements. Removing one plays its `exitStyle` before it unmounts. */
  children?: ReactNode;
  /**
   * `'sync'` (default) enters new children while removed ones exit. `'wait'` holds a new child
   * back until every exiting child has finished, so a keyed swap plays out then in.
   */
  mode?: 'sync' | 'wait';
  /**
   * Longest an exit may take, in milliseconds, before the child unmounts anyway. Default `400`.
   * Pass `0` to unmount at once, for example under reduced motion.
   */
  exitDuration?: number;
  /** Called when the last exiting child has unmounted. */
  onExitComplete?: () => void;
}

interface Entry {
  key: string;
  element: ReactElement;
  present: boolean;
}

/** Next render's entries: the current children, plus removed ones kept in place while they exit. */
function mergeEntries(
  previous: readonly Entry[],
  next: readonly ReactElement[],
  mode: 'sync' | 'wait',
): Entry[] {
  const nextKeys = new Set(next.map((element) => element.key));
  // `Children.toArray` gives every element a key.
  const out: Entry[] = next.map((element) => ({ key: element.key!, element, present: true }));
  previous.forEach((entry, index) => {
    if (nextKeys.has(entry.key)) return;
    out.splice(Math.min(index, out.length), 0, { ...entry, present: false });
  });
  if (mode !== 'wait' || out.every((entry) => entry.present)) return out;
  const shown = new Set(previous.map((entry) => entry.key));
  return out.filter((entry) => !entry.present || shown.has(entry.key));
}

/**
 * Animates keyed children in and out. A child that leaves `children` stays mounted, in the
 * exiting phase, until its `exitStyle` finishes; one that arrives mounts and plays its
 * `enterStyle`. With `mode="wait"`, swapping one keyed child for another plays the old one's
 * exit before the new one enters.
 *
 * @example
 * ```tsx
 * <Presence mode="wait">
 *   <Box
 *     key={step}
 *     enterStyle={{ opacity: 0, x: 16 }}
 *     exitStyle={{ opacity: 0, x: -16 }}
 *     transition={{ duration: '$durations.3' }}
 *   >
 *     {steps[step]}
 *   </Box>
 * </Presence>
 * ```
 */
export function Presence({
  children,
  mode = 'sync',
  exitDuration = 400,
  onExitComplete,
}: PresenceProps): ReactElement {
  const elements = Children.toArray(children).filter(isValidElement);
  const committed = useRef<Entry[]>([]);
  const entries = mergeEntries(committed.current, elements, mode);
  const [, rerender] = useState(0);
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  useLayoutEffect(() => {
    committed.current = entries;
  });

  const onExited = useCallback((key: string) => {
    committed.current = committed.current.filter((entry) => entry.key !== key);
    if (committed.current.every((entry) => entry.present)) onExitCompleteRef.current?.();
    rerender((n) => n + 1);
  }, []);

  return (
    <>
      {entries.map((entry) => (
        <PresenceChild
          key={entry.key}
          id={entry.key}
          present={entry.present}
          exitDuration={exitDuration}
          onExited={onExited}
        >
          {entry.element}
        </PresenceChild>
      ))}
    </>
  );
}

function PresenceChild({
  id,
  present,
  exitDuration,
  onExited,
  children,
}: {
  id: string;
  present: boolean;
  exitDuration: number;
  onExited: (key: string) => void;
  children: ReactElement;
}): ReactElement | null {
  const { shouldRender, ExitBoundary } = useExitTransitionNative(present, exitDuration);

  useEffect(() => {
    if (!shouldRender) onExited(id);
  }, [shouldRender, onExited, id]);

  if (!shouldRender) return null;
  return <ExitBoundary>{children}</ExitBoundary>;
}
