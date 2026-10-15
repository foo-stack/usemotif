'use client';

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export interface Position {
  readonly top: number;
  readonly left: number;
}

/** A position, plus the side the floating element ended up on. */
export interface PlacedPosition extends Position {
  readonly placement: Placement;
  /** How far along the edge facing the reference its centre sits, in px from
   * the floating element's start; where an arrow should point. */
  readonly arrow: number;
}

/** The visible area to keep floating elements inside. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** Gap kept between a floating element and the viewport edge, in px. */
const VIEWPORT_MARGIN = 8;

const OPPOSITE: Record<Placement, Placement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function room(reference: DOMRect, side: Placement, viewport: Viewport): number {
  switch (side) {
    case 'top':
      return reference.top;
    case 'bottom':
      return viewport.height - reference.bottom;
    case 'left':
      return reference.left;
    case 'right':
      return viewport.width - reference.right;
  }
}

function clamp(value: number, size: number, extent: number): number {
  const max = extent - size - VIEWPORT_MARGIN;
  // An element bigger than the viewport pins to the near edge.
  return max < VIEWPORT_MARGIN ? VIEWPORT_MARGIN : Math.min(Math.max(value, VIEWPORT_MARGIN), max);
}

/**
 * Position a floating element beside a reference rect, keeping it in the
 * viewport. When the requested side lacks room and the opposite side has it,
 * the element flips (to the roomier side when neither fits); it then shifts
 * along the other axis to stay inside the viewport. Returns document
 * coordinates and the side used.
 *
 * `offset` is the gap between the reference edge and the floating element.
 */
export function computePosition(
  reference: DOMRect,
  floating: { width: number; height: number },
  placement: Placement,
  offset = 8,
  viewport: Viewport = { width: window.innerWidth, height: window.innerHeight },
): PlacedPosition {
  const vertical = placement === 'top' || placement === 'bottom';
  const need = (vertical ? floating.height : floating.width) + offset + VIEWPORT_MARGIN;
  let side = placement;
  if (room(reference, side, viewport) < need) {
    const other = OPPOSITE[side];
    if (
      room(reference, other, viewport) >= need ||
      room(reference, other, viewport) > room(reference, side, viewport)
    ) {
      side = other;
    }
  }

  let top = 0;
  let left = 0;
  switch (side) {
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
  if (vertical) left = clamp(left, floating.width, viewport.width);
  else top = clamp(top, floating.height, viewport.height);
  const arrow = vertical
    ? Math.min(Math.max(reference.left + reference.width / 2 - left, 0), floating.width)
    : Math.min(Math.max(reference.top + reference.height / 2 - top, 0), floating.height);
  return { top: top + window.scrollY, left: left + window.scrollX, placement: side, arrow };
}

let anchoring: boolean | undefined;

/**
 * Whether the browser can put a floating element in the top layer and place it against its
 * reference in CSS: the Popover API, `position-area`, and `position-try-fallbacks` for the flip.
 */
export function supportsAnchorPositioning(): boolean {
  anchoring ??=
    typeof HTMLElement !== 'undefined' &&
    'showPopover' in HTMLElement.prototype &&
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-area: bottom') &&
    CSS.supports('position-try-fallbacks: flip-block');
  return anchoring;
}

/** Test hook: forget the cached feature check. */
export function _resetAnchorSupportForTesting(): void {
  anchoring = undefined;
}

const FACING_MARGIN: Record<Placement, string> = {
  top: 'marginBottom',
  bottom: 'marginTop',
  left: 'marginRight',
  right: 'marginLeft',
};

/** The side a placed element actually sits on, and where along it the reference's centre is. */
function measurePlacement(
  reference: DOMRect,
  floating: DOMRect,
): Omit<PlacedPosition, 'top' | 'left'> {
  const placement: Placement =
    floating.top >= reference.bottom - 1
      ? 'bottom'
      : floating.bottom <= reference.top + 1
        ? 'top'
        : floating.left >= reference.right - 1
          ? 'right'
          : 'left';
  const vertical = placement === 'top' || placement === 'bottom';
  const arrow = vertical
    ? Math.min(Math.max(reference.left + reference.width / 2 - floating.left, 0), floating.width)
    : Math.min(Math.max(reference.top + reference.height / 2 - floating.top, 0), floating.height);
  return { placement, arrow };
}

/**
 * Hook: track the position of a floating element anchored to a
 * reference. Recomputes on resize + scroll + open-state change.
 * Returns `{ style, position, floatingRef, placement }` - attach the ref to your
 * floating element and spread `style` onto it; `placement` is the side it landed on after any
 * flip.
 *
 * Where the browser supports it, the element is shown as a manual popover, so it sits in the
 * top layer above any `overflow` or stacking context, and CSS anchor positioning places and
 * flips it; `style` carries that. Elsewhere `style` is absolute document coordinates from
 * {@link computePosition}. Either way the side and arrow offset are reported.
 */
export function useFloatingPosition(
  referenceRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  placement: Placement,
  offset = 8,
): {
  style: CSSProperties;
  position: Position;
  placement: Placement;
  arrow: number;
  floatingRef: React.RefObject<HTMLDivElement | null>;
} {
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<PlacedPosition>({ top: 0, left: 0, placement, arrow: 0 });
  const anchorName = `--motif-anchor-${useId().replace(/[^\w-]/g, '')}`;
  // Read once per mount, so the server render and the first client render agree on `style`.
  const [native] = useState(() => typeof window !== 'undefined' && supportsAnchorPositioning());

  const update = useCallback(() => {
    const ref = referenceRef.current;
    const float = floatingRef.current;
    if (ref === null || float === null) return;
    const rect = ref.getBoundingClientRect();
    if (native) {
      const next = measurePlacement(rect, float.getBoundingClientRect());
      setPlaced((prev) =>
        prev.placement === next.placement && prev.arrow === next.arrow
          ? prev
          : { top: 0, left: 0, ...next },
      );
      return;
    }
    setPlaced(
      computePosition(
        rect,
        { width: float.offsetWidth, height: float.offsetHeight },
        placement,
        offset,
      ),
    );
  }, [referenceRef, placement, offset, native]);

  useEffect(() => {
    if (!open) return;
    const ref = referenceRef.current;
    const float = floatingRef.current;
    if (native && ref !== null && float !== null) {
      ref.style.setProperty('anchor-name', anchorName);
      float.setAttribute('popover', 'manual');
      if (!float.matches(':popover-open')) float.showPopover();
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (native && ref?.style.getPropertyValue('anchor-name') === anchorName) {
        ref.style.removeProperty('anchor-name');
      }
    };
  }, [open, update, native, referenceRef, anchorName]);

  const position = useMemo<Position>(
    () => ({ top: placed.top, left: placed.left }),
    [placed.top, placed.left],
  );
  const style = useMemo<CSSProperties>(() => {
    if (!native) return { position: 'absolute', top: placed.top, left: placed.left };
    const vertical = placement === 'top' || placement === 'bottom';
    // A popover's UA styles centre it in the viewport with a border and padding; undo them.
    return {
      position: 'fixed',
      inset: 'auto',
      margin: 0,
      padding: 0,
      border: 0,
      background: 'transparent',
      color: 'inherit',
      overflow: 'visible',
      [FACING_MARGIN[placement]]: offset,
      positionAnchor: anchorName,
      positionArea: placement,
      positionTryFallbacks: vertical ? 'flip-block' : 'flip-inline',
      [vertical ? 'justifySelf' : 'alignSelf']: 'anchor-center',
    } as CSSProperties;
  }, [native, placed.top, placed.left, placement, offset, anchorName]);
  return { style, position, placement: placed.placement, arrow: placed.arrow, floatingRef };
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
