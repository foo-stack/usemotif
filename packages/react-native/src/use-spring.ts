import {
  createMotionValue,
  motionValueBrand,
  resolveAnimationToken,
  type MotionValue,
  type SpringConfig,
} from '@usemotif/core';
import { useEffect, useRef, useState } from 'react';
import { getMotionDriver } from './_animation/index.js';
import type { SpringBackingConfig, SpringBackingHandle } from './_animation/types.js';
import { useTheme } from './theme-context.js';

// Duplicate of `packages/react/src/use-spring.ts`. Both platform
// packages own their own copy of this hook so each one ships a
// complete motion-value surface without reaching into a sibling. The
// integrator body is React-only and has no DOM / RN-specific code;
// the two copies stay in sync by convention - change one, change the
// other.
//
// On native, the spring routes through the active motion driver's
// `useSpringBacking` method when available. That keeps the spring math
// on whatever thread the driver chose - `Animated.spring` for the
// default driver, `withSpring` on the UI thread for the Reanimated
// driver. Drivers that don't implement `useSpringBacking` fall through
// to the JS-thread rAF integrator below.

export type { SpringConfig };

interface ResolvedSpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  restSpeed: number;
  restDistance: number;
  velocity: number;
}

const DEFAULT_CONFIG: ResolvedSpringConfig = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  restSpeed: 0.01,
  restDistance: 0.01,
  velocity: 0,
};

function stripTokenPrefix(name: string): string {
  return name.startsWith('$animations.') ? name.slice('$animations.'.length) : name;
}

function resolveSpringInputs(
  config: SpringConfig | string | undefined,
  theme: { tokens: { animations?: Readonly<Record<string, unknown>> } } | undefined,
): ResolvedSpringConfig {
  if (config === undefined) return DEFAULT_CONFIG;

  if (typeof config === 'string') {
    const token = resolveAnimationToken(
      stripTokenPrefix(config),
      theme as Parameters<typeof resolveAnimationToken>[1],
    );
    if (token === undefined || token.type !== 'spring') return DEFAULT_CONFIG;
    return {
      stiffness: token.stiffness ?? DEFAULT_CONFIG.stiffness,
      damping: token.damping ?? DEFAULT_CONFIG.damping,
      mass: token.mass ?? DEFAULT_CONFIG.mass,
      restSpeed: DEFAULT_CONFIG.restSpeed,
      restDistance: DEFAULT_CONFIG.restDistance,
      velocity: DEFAULT_CONFIG.velocity,
    };
  }

  return {
    stiffness: config.stiffness ?? DEFAULT_CONFIG.stiffness,
    damping: config.damping ?? DEFAULT_CONFIG.damping,
    mass: config.mass ?? DEFAULT_CONFIG.mass,
    restSpeed: config.restSpeed ?? DEFAULT_CONFIG.restSpeed,
    restDistance: config.restDistance ?? DEFAULT_CONFIG.restDistance,
    velocity: config.velocity ?? DEFAULT_CONFIG.velocity,
  };
}

const MAX_DELTA_TIME_S = 0.064;

/**
 * A motion value whose `.set(target)` springs from the current value
 * toward `target` over the spring's natural duration, instead of
 * snapping. The returned value is a {@link MotionValue}, so it drops
 * into every styled-primitive prop that accepts a motion value -
 * `<Box opacity={spring} />`, `useTransform(spring, ...)`, etc.
 *
 * Config is either a literal {@link SpringConfig} or a theme token
 * name (`'bouncy'` or `'$animations.bouncy'`). Timing tokens (non-
 * spring) and unknown names fall back to the default spring.
 *
 * @example
 * ```tsx
 * const x = useSpring(0, { stiffness: 200, damping: 18 });
 * x.set(100);
 * ```
 *
 * @remarks
 * On native, the spring physics runs on whatever thread the active
 * motion driver chose: `Animated.spring` on the default driver
 * (native-thread animation under `useNativeDriver: false`), `withSpring`
 * on the UI thread under the Reanimated driver. If the driver doesn't
 * implement `useSpringBacking`, the spring falls back to a JS-thread
 * `requestAnimationFrame` integrator with the same physics.
 *
 * Honour user reduced-motion preference at the consumer level -
 * branch on RN's `AccessibilityInfo.isReduceMotionEnabled()` (or the
 * `useReducedMotion` hook from `@usemotif/headless`) and bypass
 * `useSpring` for an instant write when reduced motion is on.
 */
export function useSpring(initial: number, config?: SpringConfig | string): MotionValue<number> {
  const theme = useTheme();

  const configRef = useRef<ResolvedSpringConfig>(DEFAULT_CONFIG);
  configRef.current = resolveSpringInputs(config, theme as never);

  // Driver routing - every render asks for the driver-backed handle.
  // When the active driver doesn't implement `useSpringBacking`, the
  // optional call returns undefined and we fall through to the JS rAF
  // integrator. Drivers themselves keep their internal hooks stable
  // across renders (each implementation owns the rules-of-hooks
  // contract); useSpring just consumes whatever they return.
  const driver = getMotionDriver();
  const handle: SpringBackingHandle | undefined = driver.useSpringBacking?.({
    initial,
    config: configRef.current,
  });
  const handleRef = useRef<SpringBackingHandle | undefined>(undefined);
  handleRef.current = handle;

  const stateRef = useRef<{
    target: number;
    velocity: number;
    rafId: number | null;
    lastTime: number;
    /** Whether the configured initial velocity has already been applied.
     * `velocity` resets to 0 on every settle, so without this flag the
     * configured seed would be re-applied on every settled→moving
     * transition - but it is documented as a *first* `.set()` seed only. */
    seeded: boolean;
  }>({
    target: initial,
    velocity: 0,
    rafId: null,
    lastTime: 0,
    seeded: false,
  });

  const [mv] = useState<MotionValue<number>>(() => {
    const inner = createMotionValue(initial);

    function step(now: number): void {
      const s = stateRef.current;
      const cfg = configRef.current;
      const dt = Math.min((now - s.lastTime) / 1000, MAX_DELTA_TIME_S);
      s.lastTime = now;

      let value = inner.get();
      const force = -cfg.stiffness * (value - s.target) - cfg.damping * s.velocity;
      s.velocity += (force / cfg.mass) * dt;
      value += s.velocity * dt;

      if (Math.abs(s.velocity) < cfg.restSpeed && Math.abs(value - s.target) < cfg.restDistance) {
        s.velocity = 0;
        s.rafId = null;
        inner.set(s.target);
        return;
      }

      inner.set(value);
      s.rafId = requestAnimationFrame(step);
    }

    return {
      [motionValueBrand]: true,
      get: () => (handleRef.current !== undefined ? handleRef.current.get() : inner.get()),
      on(event, cb) {
        // When a driver handle is active, subscriptions route through
        // it so the driver's emit path (Animated listener, runOnJS
        // bridge, ...) fans out to consumers. Without a handle, we
        // delegate to the inner MV.
        const h = handleRef.current;
        if (h !== undefined) {
          if (event !== 'change') return () => {};
          return h.subscribe(cb as (value: number) => void);
        }
        return inner.on(event, cb);
      },
      set(target: number): void {
        const h = handleRef.current;
        if (h !== undefined) {
          const snapshot: SpringBackingConfig = configSnapshot(configRef.current);
          h.setTarget(target, snapshot);
          return;
        }
        // JS-thread fallback integrator.
        const s = stateRef.current;
        if (Object.is(s.target, target) && s.rafId === null && Object.is(inner.get(), target)) {
          return;
        }
        s.target = target;
        if (s.rafId === null) {
          if (!s.seeded) {
            s.seeded = true;
            if (s.velocity === 0) s.velocity = configRef.current.velocity;
          }
          s.lastTime =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();
          s.rafId = requestAnimationFrame(step);
        }
      },
    };
  });

  useEffect(
    () => () => {
      const s = stateRef.current;
      if (s.rafId !== null) {
        cancelAnimationFrame(s.rafId);
        s.rafId = null;
      }
    },
    [],
  );

  return mv;
}

function configSnapshot(c: ResolvedSpringConfig): SpringBackingConfig {
  return {
    stiffness: c.stiffness,
    damping: c.damping,
    mass: c.mass,
    restSpeed: c.restSpeed,
    restDistance: c.restDistance,
    velocity: c.velocity,
  };
}
