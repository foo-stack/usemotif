import type { Theme } from '@usemotif/core';

/**
 * Names of the primitives any motif renderer must support. Each renderer's
 * adapter maps these strings to its own implementation (e.g. `@usemotif/react`'s
 * `Box`, eventually `@usemotif/react-native`'s `Box`).
 */
export type PrimitiveName =
  | 'Box'
  | 'Stack'
  | 'HStack'
  | 'VStack'
  | 'Text'
  | 'Container'
  | 'Pressable'
  | 'Image'
  | 'TitleBar';

/**
 * One row of the conformance suite - describes an input (primitive + props)
 * and the resolved styles a conformant renderer must produce.
 *
 * Cases describe the cross-renderer **contract**, not any one renderer's
 * output format. The adapter's job is to render the primitive, gather its
 * styles, and normalise them into the {@link RendererOutput} shape so the
 * harness can compare against expectations.
 */
export interface ConformanceCase {
  /** Human-readable test name. */
  readonly name: string;
  /** Which motif primitive to render. */
  readonly primitive: PrimitiveName;
  /**
   * Props bag passed to the primitive. Style props use the same schema
   * as the runtime - token refs, responsive object/array/DSL,
   * pseudo-state bags, etc. Non-style props (id, aria-*, children) flow
   * through too.
   */
  readonly props: Record<string, unknown>;
  /** Optional text children rendered inside the primitive. */
  readonly children?: string;
  /** Theme to use during render. Falls back to {@link defaultTestTheme}. */
  readonly theme?: Theme;
  /**
   * Inline (unconditional) style expected on the rendered root element.
   * Compared with `toMatchObject` semantics - extra keys are tolerated
   * unless {@link expectExactStyle} is set.
   */
  readonly expectStyle?: Record<string, string | number>;
  /**
   * Declarations expected in the **base class block** - the bare
   * `.<class> { ... }` rule the resolver emits for the `base` slot of any
   * responsive prop that has at least one breakpoint override (1.6).
   * Sits at the same specificity as the `@media` / `@container`
   * overrides so cascade order picks the winner.
   */
  readonly expectBaseClassRule?: Record<string, string | number>;
  /**
   * Per-`@media` rule expectations, keyed by the at-rule prefix (e.g.
   * `'@media (min-width: 768px)'`). Each value is the declarations to
   * expect at that breakpoint.
   */
  readonly expectMediaRules?: Record<string, Record<string, string | number>>;
  /**
   * Per-`@container` rule expectations, keyed by the at-rule prefix (e.g.
   * `'@container card (min-width: 768px)'`).
   */
  readonly expectContainerRules?: Record<string, Record<string, string | number>>;
  /**
   * Pseudo-state rule expectations, keyed by selector suffix
   * (e.g. `':hover'`, `':focus-visible'`).
   */
  readonly expectPseudoRules?: Record<string, Record<string, string | number>>;
  /** When true, {@link expectStyle} is compared with strict equality. */
  readonly expectExactStyle?: boolean;
  /**
   * Renderers (or runners) to skip this case on. Useful for cases that
   * exercise a web-only feature (e.g. pseudo-class CSS rules on Box,
   * which native `<View>` cannot track) or a runtime-only feature the
   * compiler does not yet extract (`'compiler'` skips the compiler
   * differential parity test). Test runners are expected to consult
   * this field and `it.skip` accordingly.
   */
  readonly skipOnRenderer?: readonly string[];
}

/**
 * Normalised render result. Adapters extract this from whatever native
 * shape their renderer produces (DOM + `<style>` blocks for web, RN
 * element tree for native).
 */
export interface RendererOutput {
  /** Inline style applied to the root rendered element. */
  readonly style: Record<string, string | number>;
  /**
   * Declarations from the bare `.<class> { ... }` base class block (the
   * empty-atRule entry from the responsive resolver). Empty when no
   * responsive prop has overrides. Web only - native renderers leave
   * this empty since they have no class system.
   */
  readonly baseClassRule: Record<string, string | number>;
  /** Media-rule keyed declarations. */
  readonly mediaRules: Record<string, Record<string, string | number>>;
  /** Container-rule keyed declarations. */
  readonly containerRules: Record<string, Record<string, string | number>>;
  /** Pseudo-state-keyed declarations. */
  readonly pseudoRules: Record<string, Record<string, string | number>>;
}

/**
 * A renderer's adapter. Each renderer supplies one of these so the
 * harness can run cases against it without knowing renderer internals.
 */
export interface RendererAdapter {
  /** Renderer name used in error messages (e.g. `'react-web'`). */
  readonly name: string;
  /** Render a case and return its normalised output. */
  render(c: ConformanceCase): RendererOutput;
}

/**
 * Simple `Theme` used as the default for cases that don't override it.
 * Includes spacing, color, sizing, font-size, and radii scales - enough
 * to cover the standard cases below.
 */
export const defaultTestTheme: Theme = {
  name: 'test',
  tokens: {
    colors: {
      blue: { 500: '#3b82f6' },
      red: { 500: '#ef4444' },
      surface: { base: '#ffffff' },
    },
    space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 },
    sizes: { full: '100%' },
    radii: { sm: 4, md: 8, lg: 12 },
    fontSizes: { sm: 14, md: 16, lg: 18 },
  },
};

/**
 * Throws an `Error` describing any mismatch between the adapter's
 * rendered output and the case's expectations. Test frameworks wrap
 * this in their own `it(...)` block per case.
 */
export function assertConformance(adapter: RendererAdapter, c: ConformanceCase): void {
  const out = adapter.render(c);
  const fail = (msg: string): never => {
    throw new Error(`[${adapter.name}] ${c.name}: ${msg}`);
  };

  if (c.expectStyle !== undefined) {
    if (c.expectExactStyle === true) {
      if (!shallowEqual(out.style, c.expectStyle)) {
        fail(`expected style ${stringify(c.expectStyle)}, got ${stringify(out.style)}`);
      }
    } else {
      assertSubset(out.style, c.expectStyle, 'style', fail);
    }
  }

  if (c.expectBaseClassRule !== undefined) {
    assertSubset(out.baseClassRule, c.expectBaseClassRule, 'base class rule', fail);
  }

  if (c.expectMediaRules !== undefined) {
    assertRulesMatch(out.mediaRules, c.expectMediaRules, 'media rules', fail);
  }
  if (c.expectContainerRules !== undefined) {
    assertRulesMatch(out.containerRules, c.expectContainerRules, 'container rules', fail);
  }
  if (c.expectPseudoRules !== undefined) {
    assertRulesMatch(out.pseudoRules, c.expectPseudoRules, 'pseudo rules', fail);
  }
}

function assertSubset(
  actual: Record<string, string | number>,
  expected: Record<string, string | number>,
  label: string,
  fail: (msg: string) => never,
): void {
  for (const key in expected) {
    if (actual[key] !== expected[key]) {
      fail(`expected ${label}.${key} = ${stringify(expected[key])}, got ${stringify(actual[key])}`);
    }
  }
}

function assertRulesMatch(
  actual: Record<string, Record<string, string | number>>,
  expected: Record<string, Record<string, string | number>>,
  label: string,
  fail: (msg: string) => never,
): void {
  for (const ruleKey in expected) {
    const actualDecls = actual[ruleKey];
    if (actualDecls === undefined) {
      fail(
        `expected ${label} for "${ruleKey}", got none. Available: ${Object.keys(actual).join(', ') || '(none)'}`,
      );
    }
    assertSubset(actualDecls, expected[ruleKey]!, `${label}["${ruleKey}"]`, fail);
  }
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (v === undefined) return 'undefined';
  return JSON.stringify(v);
}
