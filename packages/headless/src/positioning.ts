'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export interface Position {
  readonly top: number;
  readonly left: number;
}

/**
 * Compute a fixed position for a floating element relative to a
 * reference rect. v0 uses straightforward `getBoundingClientRect`
 * math - no collision detection or auto-flipping. Real
 * collision-aware positioning will land via `@floating-ui/react`
 * as a v1.x peer dep.
 *
 * `offset` is the gap between the reference edge and the floating
 * element, in pixels.
 */
export function computePosition(
  reference: DOMRect,
  floating: { width: number; height: number },
  placement: Placement,
  offset = 8,
): Position {
  let top = 0;
  let left = 0;
  switch (placement) {
    case 'top':
      top = reference.top - floating.height - offset;
      left = reference.left + reference.width / 2 - floating.width / 2;
      break;
    case 'bottom':
      top = reference.bottom + offset;
      left = reference.left + reference.width / 2 - floating.width / 2;
      break;
    case 'left':
      top = reference.top + reference.height / 2 - floating.height / 2;
      left = reference.left - floating.width - offset;
      break;
    case 'right':
      top = reference.top + reference.height / 2 - floating.height / 2;
      left = reference.right + offset;
      break;
  }
  return { top: top + window.scrollY, left: left + window.scrollX };
}

/**
 * Hook: track the position of a floating element anchored to a
 * reference. Recomputes on resize + scroll + open-state change.
 * Returns `{ position, floatingRef }` - attach the ref to your
 * floating element.
 */
export function useFloatingPosition(
  referenceRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  placement: Placement,
  offset = 8,
): { position: Position; floatingRef: React.RefObject<HTMLDivElement | null> } {
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  const update = useCallback(() => {
    const ref = referenceRef.current;
    const float = floatingRef.current;
    if (ref === null || float === null) return;
    const rect = ref.getBoundingClientRect();
    setPosition(
      computePosition(
        rect,
        { width: float.offsetWidth, height: float.offsetHeight },
        placement,
        offset,
      ),
    );
  }, [referenceRef, placement, offset]);

  useEffect(() => {
    if (!open) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return { position, floatingRef };
}

/** An element whose subtree is not "outside", or a test for one. */
export type ClickOutsideIgnore = React.RefObject<HTMLElement | null> | ((target: Node) => boolean);

/**
 * Hook: dismiss when the user clicks outside the given element.
 * `enabled` toggles the listener; `onDismiss` fires on outside click.
 *
 * `ignore` lists extra elements (a single ref, a test, or an array of
 * either) whose clicks count as "inside" - typically the trigger that toggles
 * this surface.
 * The listener fires on `mousedown`, which runs before the trigger's own
 * `click` toggle; without ignoring the trigger, the two fight (mousedown
 * dismisses, then the trigger's click re-opens) and the surface reopens
 * or flickers instead of closing. Pass the trigger/anchor ref here so the
 * trigger's handler owns the toggle.
 */
export function useClickOutside(
  enabled: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  ignore?: ClickOutsideIgnore | ReadonlyArray<ClickOutsideIgnore>,
): void {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: MouseEvent): void {
      const target = e.target as Node;
      const el = ref.current;
      if (el !== null && el.contains(target)) return;
      const ignoreList = ignore === undefined ? [] : Array.isArray(ignore) ? ignore : [ignore];
      for (const r of ignoreList) {
        if (typeof r === 'function' ? r(target) : r.current?.contains(target)) return;
      }
      onDismiss();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [enabled, ref, onDismiss, ignore]);
}
