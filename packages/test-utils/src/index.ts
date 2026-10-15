/**
 * @usemotif/test-utils - cross-renderer conformance suite.
 *
 * Renderer-agnostic test cases + adapter contract. Each renderer (web,
 * native) supplies a {@link RendererAdapter} and runs the
 * {@link standardCases} suite against it. The harness only knows about
 * the resolved-style contract, not any one renderer's internal shape.
 */

export const PACKAGE_NAME = '@usemotif/test-utils';

export {
  assertConformance,
  defaultTestTheme,
  type ConformanceCase,
  type PrimitiveName,
  type RendererAdapter,
  type RendererOutput,
} from './conformance.js';

export { standardCases } from './standard-cases.js';

export { motifMatchers } from './matchers.js';
export { accessibleFacts, type AccessibleFacts, type NativeTestInstance } from './a11y.js';
