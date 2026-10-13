'use client';

import {
  createMotionValue,
  type DragAxis,
  type DragConstraints,
  type DragInfo,
  type DragSpringConfig,
  type MotionValue,
  type UseDragOptions,
} from '@usemotif/core';
import {
  createElement,
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

export type { DragAxis, DragConstraints, DragInfo, DragSpringConfig, UseDragOptions };

/**
 * Result returned by {@link useDrag}. Spread `dragProps` onto a `Box`
 * (or any element accepting `onPointerDown`). The `x` / `y` motion
 * values track the drag offset and compose with `useTransform`,
 * `useSpring`, and the rest of the motion-value surface.
 */
export interface UseDragResult {
  /** Spread onto the draggable element to wire up pointer handlers. */
  readonly dragProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  };
  /** Host wrapper for the draggable element. On web there is no
   *  gesture-host requirement, so this is a passthrough `Fragment` - it
   *  exists purely so the cross-platform recipe
   *  `<Wrapper><Box {...dragProps} /></Wrapper>` is identical to native,
   *  where some drivers need a real `<GestureDetector>` host. */
  readonly Wrapper: ComponentType<{ children: ReactNode }>;
  /** Horizontal offset from drag start (in pixels). Pinned at 0 when
   *  `axis === 'y'`. */
  readonly x: MotionValue<number>;
  /** Vertical offset from drag start (in pixels). Pinned at 0 when
   *  `axis === 'x'`. */
  readonly y: MotionValue<number>;
  /** True while a drag is in flight (between pointer-down and
   *  pointer-up / cancel). Stays `true` through the momentum settle
   *  is NOT included - `isDragging` reflects pointer-down only. */
  readonly isDragging: boolean;
}

const PassthroughWrapper: ComponentType<{ children: ReactNode }> = ({ children }) =>
  createElement(Fragment, null, children);
PassthroughWrapper.displayName = 'PassthroughDragWrapper';

const DEFAULT_SPRING: Required<DragSpringConfig> = {
  stiffness: 200,
  damping: 25,
  mass: 1,
  restSpeed: 0.1,
  restDistance: 0.1,
};

/** Maximum integrator step (s) - caps `dt` so a deferred frame doesn't
 *  catapult the spring past its target on the first tick. */
const MAX_DT_S = 0.064;

/** Velocity-projection horizon (seconds): how far into the future the
 *  release velocity carries the target. 50 ms ≈ a couple of frames
 *  of inertia, enough to feel like momentum without overshooting. */
const MOMENTUM_PROJECTION_S = 0.05;

/**
 * Pointer-event-driven drag gesture.
 *
 * Returns motion values for the drag offset plus a `dragProps` bag to
 * spread on the draggable element. Composes with the existing motion-
 * value surface - feed `x` / `y` into `useTransform` to derive
 * rotation, opacity, etc. from drag position without per-frame
 * `setState`.
 *
 * @example
 * ```tsx
 * const { dragProps, x, y } = useDrag({
 *   constraints: { left: -100, right: 100 },
 *   dragElastic: 0.5,
 *   dragMomentum: true,
 *   onDragEnd: ({ offset }) => console.log('settled at', offset),
 * });
 * return <Box {...dragProps} x={x} y={y}>drag me</Box>;
 * ```
 *
 * @remarks
 * Uses `setPointerCapture` so the drag continues tracking outside
 * the element bounds. Lifecycle callbacks (`onDragStart`, `onDrag`,
 * `onDragEnd`) receive a snapshot of the current offset + velocity.
 * `onDragEnd` fires before the momentum animation starts; consumers
 * that need a post-settle callback should branch in the spring's
 * settle handler.
 *
 * Honour reduced-motion at the consumer level when drag drives
 * decorative motion; the gesture itself is a direct manipulation and
 * doesn't gate on reduced-motion preferences.
 */
export function useDrag(options: UseDragOptions = {}): UseDragResult {
  const axis = options.axis ?? 'both';

  // Stash options in a ref so callbacks invoked from pointer handlers
  // see the latest closures without forcing re-subscription. The
  // pointer-handlers themselves are stable for the component's
  // lifetime so spreading `dragProps` doesn't churn child renders.
  const optsRef = useRef<UseDragOptions>(options);
  optsRef.current = options;

  const [values] = useState<{ x: MotionValue<number>; y: MotionValue<number> }>(() => ({
    x: createMotionValue(0),
    y: createMotionValue(0),
  }));

  const [isDragging, setIsDragging] = useState(false);

  // Per-drag mutable state. Held in a ref so the pointer-event closures
  // mutate it across events without depending on stale render values.
  const stateRef = useRef<{
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    lastTimeMs: number;
    velocityX: number;
    velocityY: number;
    capturedEl: HTMLElement | null;
    /** rAF id for an in-flight post-release momentum settle. */
    settleRafId: number | null;
  }>({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    lastClientX: 0,
    lastClientY: 0,
    lastTimeMs: 0,
    velocityX: 0,
    velocityY: 0,
    capturedEl: null,
    settleRafId: null,
  });

  const handlersRef = useRef<{
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  } | null>(null);

  if (handlersRef.current === null) {
    // Apply axis filter + constraints with optional elastic overshoot.
    // When `dragElastic > 0` and the raw offset is past a bound, the
    // visible offset scales the overshoot portion by `(1 - elastic)`
    // so the value still moves but with diminishing returns. At
    // elastic = 1 the constraint is effectively disabled.
    const applyConstraints = (dx: number, dy: number): { x: number; y: number } => {
      const cur = optsRef.current.axis ?? 'both';
      if (cur === 'x') dy = 0;
      if (cur === 'y') dx = 0;
      const c = optsRef.current.constraints;
      if (c === undefined) return { x: dx, y: dy };
      const elastic = Math.min(1, Math.max(0, optsRef.current.dragElastic ?? 0));
      const rubberX = (raw: number, lo: number | undefined, hi: number | undefined): number => {
        if (lo !== undefined && raw < lo) return lo + (raw - lo) * elastic;
        if (hi !== undefined && raw > hi) return hi + (raw - hi) * elastic;
        return raw;
      };
      return {
        x: rubberX(dx, c.left, c.right),
        y: rubberX(dy, c.top, c.bottom),
      };
    };

    const info = (): DragInfo => {
      const s = stateRef.current;
      return {
        offset: applyConstraints(s.lastClientX - s.startClientX, s.lastClientY - s.startClientY),
        velocity: { x: s.velocityX, y: s.velocityY },
      };
    };

    const onPointerMove = (event: PointerEvent): void => {
      const s = stateRef.current;
      if (event.pointerId !== s.pointerId) return;
      const now = nowMs();
      const dt = Math.max(1, now - s.lastTimeMs);
      s.velocityX = ((event.clientX - s.lastClientX) / dt) * 1000;
      s.velocityY = ((event.clientY - s.lastClientY) / dt) * 1000;
      s.lastClientX = event.clientX;
      s.lastClientY = event.clientY;
      s.lastTimeMs = now;
      const off = applyConstraints(s.lastClientX - s.startClientX, s.lastClientY - s.startClientY);
      values.x.set(off.x);
      values.y.set(off.y);
      optsRef.current.onDrag?.(info());
    };

    /**
     * Spring the values back into bounds (or forward via momentum)
     * after the pointer is released. Runs a single rAF integrator
     * per axis, both targeting the post-release equilibrium -
     * either the nearest in-bound coordinate, or `currentValue +
     * velocity * projectionHorizon` clamped to bounds when
     * `dragMomentum` is true.
     */
    const startSettle = (): void => {
      const opts = optsRef.current;
      const c = opts.constraints;
      const wantsMomentum = opts.dragMomentum === true;
      const wantsElasticReturn =
        c !== undefined &&
        (opts.dragElastic ?? 0) > 0 &&
        isOutOfBounds(values.x.get(), values.y.get(), c);
      if (!wantsMomentum && !wantsElasticReturn) return;

      const cfg = (
        opts.dragTransition === undefined
          ? DEFAULT_SPRING
          : { ...DEFAULT_SPRING, ...opts.dragTransition }
      ) as Required<DragSpringConfig>;

      // Pick targets per axis.
      const projectAndClamp = (
        v: number,
        velocity: number,
        lo: number | undefined,
        hi: number | undefined,
      ): number => {
        let target = v;
        if (wantsMomentum) target = v + velocity * MOMENTUM_PROJECTION_S;
        if (lo !== undefined && target < lo) target = lo;
        if (hi !== undefined && target > hi) target = hi;
        return target;
      };
      const targetX = projectAndClamp(
        values.x.get(),
        stateRef.current.velocityX,
        c?.left,
        c?.right,
      );
      const targetY = projectAndClamp(
        values.y.get(),
        stateRef.current.velocityY,
        c?.top,
        c?.bottom,
      );

      // Spring integrator. Runs both axes in lockstep - same dt, same
      // rAF tick - so the settle stays synchronised. Either axis can
      // be at-rest while the other still moves.
      let valueX = values.x.get();
      let valueY = values.y.get();
      let velX = stateRef.current.velocityX;
      let velY = stateRef.current.velocityY;
      let lastTime = nowMs();

      const step = (now: number): void => {
        const dt = Math.min((now - lastTime) / 1000, MAX_DT_S);
        lastTime = now;

        // Per-axis spring step.
        const forceX = -cfg.stiffness * (valueX - targetX) - cfg.damping * velX;
        velX += (forceX / cfg.mass) * dt;
        valueX += velX * dt;

        const forceY = -cfg.stiffness * (valueY - targetY) - cfg.damping * velY;
        velY += (forceY / cfg.mass) * dt;
        valueY += velY * dt;

        const restedX =
          Math.abs(velX) < cfg.restSpeed && Math.abs(valueX - targetX) < cfg.restDistance;
        const restedY =
          Math.abs(velY) < cfg.restSpeed && Math.abs(valueY - targetY) < cfg.restDistance;

        if (restedX && restedY) {
          stateRef.current.settleRafId = null;
          values.x.set(targetX);
          values.y.set(targetY);
          return;
        }
        values.x.set(valueX);
        values.y.set(valueY);
        stateRef.current.settleRafId = requestAnimationFrame(step);
      };
      stateRef.current.settleRafId = requestAnimationFrame(step);
    };

    const finishDrag = (event: PointerEvent): void => {
      const s = stateRef.current;
      if (event.pointerId !== s.pointerId) return;
      const captured = s.capturedEl;
      if (captured !== null) {
        try {
          captured.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore - pointer may have been released already.
        }
        captured.removeEventListener('pointermove', onPointerMove);
        captured.removeEventListener('pointerup', onPointerUp);
        captured.removeEventListener('pointercancel', onPointerCancel);
      }
      s.pointerId = null;
      s.capturedEl = null;
      optsRef.current.onDragEnd?.(info());
      setIsDragging(false);
      // Kick off the momentum / elastic settle AFTER onDragEnd so
      // consumers reading the offset / velocity in onDragEnd see the
      // pre-settle snapshot (matches framer-motion's semantics).
      startSettle();
    };

    const onPointerUp = (event: PointerEvent): void => {
      finishDrag(event);
    };

    const onPointerCancel = (event: PointerEvent): void => {
      finishDrag(event);
    };

    const onPointerDown = (event: React.PointerEvent<HTMLElement>): void => {
      const s = stateRef.current;
      if (s.pointerId !== null) return; // already dragging
      // Cancel any in-flight settle so a fresh grab takes over cleanly.
      if (s.settleRafId !== null) {
        cancelAnimationFrame(s.settleRafId);
        s.settleRafId = null;
      }
      const el = event.currentTarget;
      s.pointerId = event.pointerId;
      s.startClientX = event.clientX;
      s.startClientY = event.clientY;
      s.lastClientX = event.clientX;
      s.lastClientY = event.clientY;
      s.lastTimeMs = nowMs();
      s.velocityX = 0;
      s.velocityY = 0;
      s.capturedEl = el;
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // Older environments don't implement pointer capture - drag
        // still works via move/up events on the element itself.
      }
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerCancel);
      setIsDragging(true);
      optsRef.current.onDragStart?.(info());
    };

    handlersRef.current = { onPointerMove, onPointerUp, onPointerCancel, onPointerDown };
  }

  useEffect(
    () => () => {
      const s = stateRef.current;
      const h = handlersRef.current;
      if (s.pointerId !== null && s.capturedEl !== null && h !== null) {
        try {
          s.capturedEl.releasePointerCapture(s.pointerId);
        } catch {
          // ignore
        }
        s.capturedEl.removeEventListener('pointermove', h.onPointerMove);
        s.capturedEl.removeEventListener('pointerup', h.onPointerUp);
        s.capturedEl.removeEventListener('pointercancel', h.onPointerCancel);
      }
      if (s.settleRafId !== null) {
        cancelAnimationFrame(s.settleRafId);
        s.settleRafId = null;
      }
    },
    [],
  );

  // `axis` is read via optsRef in applyConstraints; the local is here
  // for hook-signature readability.
  void axis;

  return {
    dragProps: {
      onPointerDown: handlersRef.current.onPointerDown,
    },
    Wrapper: PassthroughWrapper,
    x: values.x,
    y: values.y,
    isDragging,
  };
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function isOutOfBounds(x: number, y: number, c: DragConstraints): boolean {
  if (c.left !== undefined && x < c.left) return true;
  if (c.right !== undefined && x > c.right) return true;
  if (c.top !== undefined && y < c.top) return true;
  if (c.bottom !== undefined && y > c.bottom) return true;
  return false;
}
