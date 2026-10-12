'use client';

import {
  createMotionValue,
  motionValueBrand,
  resolveAnimationToken,
  type MotionValue,
} from '@usemotif/core';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from './theme-context.js';

// Duplicate of `packages/react-native/src/use-spring.ts`. Both
// platform packages own their own copy of this hook so each one ships
// a complete motion-value surface without reaching into a sibling.
// The integrator body is React-only and has no DOM / RN-specific code;
// the two copies stay in sync by convention - change one, change the
// other.

/**
 * Spring physics configuration. Defaults match a critically-damped
 * UI spring (`stiffness=100, damping=10, mass=1`) - close to framer-
 * motion's defaults, easy to tune toward bouncier or stiffer feels.
 *
 * `restSpeed` and `restDistance` set the settle thresholds: the spring
 * snaps to the target once both `|velocity| < restSpeed` and
 * `|value - target| < restDistance`. Lower values let the spring
 * crawl closer before settling; higher values cut animation tails
 * shorter at the cost of a more visible snap.
 */
export interface SpringConfig {
  /** Spring stiffness. Higher = faster snap. Default `100`. */
  stiffness?: number;
  /** Damping coefficient. Higher = less oscillation. Default `10`. */
  damping?: number;
  /** Mass of the spring. Higher = slower. Default `1`. */
  mass?: number;
  /** Settle threshold for velocity. Default `0.01`. */
  restSpeed?: number;
  /** Settle threshold for distance to target. Default `0.01`. */
  restDistance?: number;
  /** Initial velocity to seed on the first `.set()`. Default `0`. */
  velocity?: number;
}

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

/**
 * Strip the `$animations.` prefix from a token reference. Both `'bouncy'`
 * and `'$animations.bouncy'` are accepted; the former is the form used
 * everywhere else in motif's animation surface, the latter mirrors
 * the explicit token-reference syntax used in style props.
 */
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
    // Timing tokens have no spring shape - fall through to defaults
    // rather than warn-and-crash. Consumers who pass a timing token by
    // mistake get a non-bouncy spring with the same look as the default.
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

/** Maximum integrator step. Caps `dt` at ~4 frames worth (64ms) so a
 * backgrounded tab returning to focus doesn't catapult the spring past
 * its target on the first frame. */
const MAX_DELTA_TIME_S = 0.064;

/**
 * A motion value whose `.set(target)` springs from the current value
 * toward `target` over the spring's natural duration, instead of
 * snapping. The returned value is a {@link MotionValue}, so it drops
 * into every styled-primitive prop that accepts a motion value -
 * `<Box opacity={spring} />`, `useTransform(spring, ...)`, etc.
 *
 * The initial value is only used on first mount (matches
 * `useMotionValue` semantics). To drive the value externally, call
 * `.set()`. Re-targeting mid-flight smoothly redirects the spring
 * without resetting velocity.
 *
 * Config is either a literal {@link SpringConfig} or a theme token
 * name (`'bouncy'` or `'$animations.bouncy'`). Timing tokens (non-
 * spring) and unknown names fall back to the default spring rather
 * than erroring.
 *
 * @example
 * ```tsx
 * const x = useSpring(0, { stiffness: 200, damping: 18 });
 * x.set(100);
 * <Box style={{ transform: `translateX(${x.get()}px)` }} />;
 * ```
 *
 * @example
 * ```tsx
 * // Theme-aware:
 * const x = useSpring(0, '$animations.bouncy');
 * ```
 *
 * @remarks
 * The spring runs a JS-thread `requestAnimationFrame` loop. Subscribers
 * (via `.on('change', ...)`) fire each frame the value moves. No React
 * renders are scheduled - motion-value writes go through the same
 * subscription channel as `useMotionValue`.
 *
 * Honour user reduced-motion preference at the consumer level - pass
 * an instant config (e.g. `{ stiffness: 1000, damping: 1000 }`) or
 * bypass `useSpring` entirely and use {@link useMotionValue} under
 * `prefers-reduced-motion: reduce`.
 */
export function useSpring(initial: number, config?: SpringConfig | string): MotionValue<number> {
  const theme = useTheme();

  // Stash the latest config in a ref so the rAF loop reads fresh
  // values (mid-flight config tweaks take effect on the next frame)
  // without re-allocating the spring on every render.
  const configRef = useRef<ResolvedSpringConfig>(DEFAULT_CONFIG);
  configRef.current = resolveSpringInputs(config, theme as never);

  // Per-spring mutable state. Held in a ref so the rAF closure can
  // mutate it across frames; reset would lose mid-flight velocity.
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
      get: () => inner.get(),
      on: inner.on,
      set(target: number): void {
        const s = stateRef.current;
        // No-op when already settled at the target. Matches
        // createMotionValue's Object.is bail-out.
        if (Object.is(s.target, target) && s.rafId === null && Object.is(inner.get(), target)) {
          return;
        }
        s.target = target;
        if (s.rafId === null) {
          // Seed the configured velocity on the first kickoff only; mid-flight
          // re-targets keep existing velocity for smooth re-direction.
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
