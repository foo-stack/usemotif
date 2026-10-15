import { accessibleFacts } from './a11y.js';
import type { RendererOutput } from './conformance.js';

/**
 * Cross-renderer custom matchers for vitest. Operate on
 * {@link RendererOutput} so the same assertions read identically when
 * pointed at any motif renderer.
 *
 * **Setup** - at the top of any test file (or in a vitest setup file):
 *
 * ```ts
 * import { expect } from 'vitest';
 * import { motifMatchers } from '@usemotif/test-utils';
 * expect.extend(motifMatchers);
 * ```
 *
 * **Usage:**
 *
 * ```ts
 * const out = adapter.render({ primitive: 'Box', props: { p: '$4' } });
 * expect(out).toHaveStyle({ padding: 16 });
 * expect(out).toHaveStyleAt('@media (min-width: 768px)', { padding: 32 });
 * expect(out).toHaveStyleAt(':hover', { opacity: 0.9 });
 * ```
 *
 * `toHaveStyleAt` accepts any of the three rule-bucket prefixes:
 * - `@media ...` → media-rule bucket
 * - `@container ...` → container-rule bucket
 * - `:hover` / `:focus-visible` / `:active` / `:disabled, ...` → pseudo bucket
 */

/**
 * Result shape vitest expects from a custom matcher. Defining locally
 * (vs. importing from vitest) so consumers don't pin a particular
 * vitest internal-types path; keeps the package portable.
 */
interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Test-runner-supplied utilities. Vitest passes these as the second arg
 * via `this`; we declare them loosely so we don't pull a vitest type
 * dependency.
 */
interface MatcherContext {
  isNot: boolean;
  utils?: {
    matcherHint?: (name: string, expected?: string, received?: string) => string;
  };
}

function isRendererOutput(v: unknown): v is RendererOutput {
  return (
    v !== null &&
    typeof v === 'object' &&
    'style' in v &&
    'mediaRules' in v &&
    'containerRules' in v &&
    'pseudoRules' in v
  );
}

function fmt(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (v === undefined) return 'undefined';
  return JSON.stringify(v, null, 2);
}

function checkSubset(
  actual: Record<string, string | number>,
  expected: Record<string, string | number>,
): { pass: true } | { pass: false; mismatch: string } {
  for (const key in expected) {
    if (actual[key] !== expected[key]) {
      return {
        pass: false,
        mismatch: `\n  ${key}:\n    expected: ${fmt(expected[key])}\n    received: ${fmt(actual[key])}`,
      };
    }
  }
  return { pass: true };
}

/**
 * Pick the right rule bucket from the prefix:
 * - `@media ...` → mediaRules
 * - `@container ...` → containerRules
 * - everything else (typically `:state ...`) → pseudoRules
 */
function bucketForScope(
  out: RendererOutput,
  scope: string,
): {
  bucketName: 'mediaRules' | 'containerRules' | 'pseudoRules';
  bucket: Record<string, Record<string, string | number>>;
} {
  if (scope.startsWith('@media')) return { bucketName: 'mediaRules', bucket: out.mediaRules };
  if (scope.startsWith('@container'))
    return { bucketName: 'containerRules', bucket: out.containerRules };
  return { bucketName: 'pseudoRules', bucket: out.pseudoRules };
}

export const motifMatchers = {
  /**
   * Assert the inline (unconditional) style on the rendered root element
   * contains every entry of `expected`. Subset match - extra keys are
   * tolerated; renderers may add delivery-specific styles.
   */
  toHaveStyle(
    this: MatcherContext,
    received: unknown,
    expected: Record<string, string | number>,
  ): MatcherResult {
    if (!isRendererOutput(received)) {
      // Throw rather than return { pass: false }: under `.not`, vitest
      // inverts `pass`, so a malformed `received` would make the negated
      // assertion pass - laundering "you passed the wrong thing" into a
      // green test. A thrown error fails the assertion regardless of `.not`.
      throw new Error(
        `toHaveStyle: received value is not a RendererOutput.\nGot: ${fmt(received)}`,
      );
    }
    const result = checkSubset(received.style, expected);
    return {
      pass: result.pass,
      message: () =>
        result.pass
          ? `Expected style NOT to contain ${fmt(expected)}, but it did.`
          : `Expected style to contain ${fmt(expected)}, but mismatch:${
              (result as { mismatch: string }).mismatch
            }\nFull style: ${fmt(received.style)}`,
    };
  },

  /**
   * Assert the rendered output applies the given declarations under the
   * given scope (`@media ...`, `@container ...`, or `:pseudo`). Subset
   * match within the scoped rule.
   */
  toHaveStyleAt(
    this: MatcherContext,
    received: unknown,
    scope: string,
    expected: Record<string, string | number>,
  ): MatcherResult {
    if (!isRendererOutput(received)) {
      // See toHaveStyle: throw so `.not` can't launder a wrong `received`
      // into a passing assertion.
      throw new Error(
        `toHaveStyleAt: received value is not a RendererOutput.\nGot: ${fmt(received)}`,
      );
    }
    const { bucketName, bucket } = bucketForScope(received, scope);
    const decls = bucket[scope];
    if (decls === undefined) {
      const available = Object.keys(bucket);
      return {
        pass: false,
        message: () =>
          `Expected ${bucketName} to contain "${scope}", but it does not.\nAvailable: ${
            available.length > 0 ? available.map((k) => `"${k}"`).join(', ') : '(none)'
          }`,
      };
    }
    const result = checkSubset(decls, expected);
    return {
      pass: result.pass,
      message: () =>
        result.pass
          ? `Expected ${bucketName}["${scope}"] NOT to contain ${fmt(expected)}, but it did.`
          : `Expected ${bucketName}["${scope}"] to contain ${fmt(expected)}, but mismatch:${
              (result as { mismatch: string }).mismatch
            }\nFull ${bucketName}["${scope}"]: ${fmt(decls)}`,
    };
  },

  /**
   * Assert the role assistive technology reports, in ARIA terms, for a web DOM element or a
   * React Native test instance: `<button>` and `accessibilityRole="button"` are both `button`,
   * `<h2>` and `accessibilityRole="header"` both `heading`.
   */
  toHaveRole(this: MatcherContext, received: unknown, role: string): MatcherResult {
    const actual = accessibleFacts(received).role;
    return {
      pass: actual === role,
      message: () =>
        this.isNot
          ? `Expected the role not to be ${fmt(role)}.`
          : `Expected role ${fmt(role)}, received ${fmt(actual)}.`,
    };
  },

  /** Assert the accessible name, exactly or by pattern, on either platform. */
  toHaveAccessibleName(
    this: MatcherContext,
    received: unknown,
    name: string | RegExp,
  ): MatcherResult {
    const actual = accessibleFacts(received).name;
    const pass = typeof name === 'string' ? actual === name : name.test(actual);
    return {
      pass,
      message: () =>
        this.isNot
          ? `Expected the accessible name not to match ${String(name)}, received ${fmt(actual)}.`
          : `Expected accessible name ${typeof name === 'string' ? fmt(name) : String(name)}, received ${fmt(actual)}.`,
    };
  },

  /**
   * Assert the element reports itself expanded: `aria-expanded="true"` on web,
   * `accessibilityState.expanded` or `aria-expanded` on native. An element that reports no
   * expanded state at all fails both this and its negation, since it is neither.
   */
  toBeExpanded(this: MatcherContext, received: unknown): MatcherResult {
    const { expanded } = accessibleFacts(received);
    if (expanded === undefined) {
      throw new Error('toBeExpanded: the element reports no expanded state at all.');
    }
    return {
      pass: expanded,
      message: () =>
        this.isNot
          ? 'Expected the element to be collapsed.'
          : 'Expected the element to be expanded.',
    };
  },
};

/**
 * Type augmentation for `expect(rendererOutput).toHaveStyle(...)` etc.
 * Consumers `import '@usemotif/test-utils';` to pick this up - TS sees
 * the global `Assertion` interface merge automatically.
 */
declare module 'vitest' {
  interface Assertion<T> {
    toHaveStyle(expected: Record<string, string | number>): T;
    toHaveStyleAt(scope: string, expected: Record<string, string | number>): T;
    toHaveRole(role: string): T;
    toHaveAccessibleName(name: string | RegExp): T;
    toBeExpanded(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveStyle(expected: Record<string, string | number>): unknown;
    toHaveStyleAt(scope: string, expected: Record<string, string | number>): unknown;
    toHaveRole(role: string): unknown;
    toHaveAccessibleName(name: string | RegExp): unknown;
    toBeExpanded(): unknown;
  }
}
