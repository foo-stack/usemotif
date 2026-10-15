import type { ResolvedStyle } from '@usemotif/core';

/**
 * Compile-time classification of a single motif call site.
 *
 * - `static` - every style prop's value is a compile-time literal (string,
 *   number, responsive object whose values are all literals). The whole
 *   call can be extracted; nothing is left for the runtime.
 * - `partial-static` - some style props are literal, some depend on
 *   runtime values (variables, props, member expressions). The static
 *   subset is extracted into pre-baked attributes; the dynamic subset
 *   is left as JSX props for the runtime resolver to handle.
 * - `dynamic` - no extractable subset. The call is left alone.
 *
 * A spread (`{...props}`) usually forces `dynamic`, since we can't see
 * what's inside.
 */
export type Classification = 'static' | 'partial-static' | 'dynamic';

/**
 * Per-prop classification result.
 */
export interface PropAnalysis {
  /** Canonical style-prop name (e.g. `flexDirection` even if the source
   * attribute was Stack's `direction` alias). */
  readonly name: string;
  /** True iff the value is a compile-time literal. */
  readonly isStatic: boolean;
  /**
   * The literal JS value we extracted, when `isStatic === true`.
   * Numbers stay numbers, strings stay strings, responsive objects are
   * plain `Record<string, unknown>`.
   */
  readonly value?: unknown;
  /**
   * For non-static props, an opaque marker the caller can use to recover
   * the original AST node for re-emission.
   */
  readonly handle?: unknown;
  /**
   * Original source attribute name when different from `name` (alias case)
   * or `null` when the prop is synthesized by the primitive (Stack's
   * default `display: flex`) and has no source attribute. When unset,
   * source name equals `name`.
   */
  readonly sourceName?: string | null;
}

/**
 * One extracted pseudo-state bag (`_hover`, `_focus`, etc.) on a Pressable
 * call site. Carries both the source attribute name (so the rewriter can
 * drop it) and the CSS pseudo selector to inject under.
 */
export interface PseudoStateAnalysis {
  /** Source attribute name (`_hover`, `_focus`, `_active`, `_disabled`). */
  readonly name: string;
  /** CSS pseudo selector this maps to (`:hover`, `:focus-visible`, ...). */
  readonly pseudo: string;
  /** Flat style bag - values are literal numbers / strings / token refs. */
  readonly style: Record<string, unknown>;
}

/**
 * One literal motion-prop value extracted from a JSX element. Motion props
 * (`enterStyle`, `exitStyle`, `transition`, `animation`, `animateOnly`)
 * drive mount / unmount transitions and prop-change interpolation; the
 * compiler resolves the literal-arg cases and leaves the rest at runtime.
 *
 * Each renderer's extractor decides which subset to consume:
 *
 * - **web** → `transition` and `animation` collapse into an inline
 *   `transition` CSS string; `exitStyle` becomes a pseudo rule keyed on
 *   `[data-motif-state="exiting"]`. `enterStyle` is left at runtime
 *   because it's a first-paint overlay that needs React state to flip.
 * - **native** → motion props no-op at compile time. The runtime driver
 *   owns the entry/exit interpolation; there is no native StyleSheet
 *   equivalent for `transition` or `animation`.
 *
 * Dynamic values land in `dynamicProps` (forcing partial-static / dynamic
 * classification) - the rewriter leaves them on the JSX element.
 */
export interface MotionPropAnalysis {
  /** Source attribute name. */
  readonly name: 'enterStyle' | 'exitStyle' | 'transition' | 'animation' | 'animateOnly';
  /**
   * Literal value of the prop. Shape depends on `name`:
   *
   * - `transition` - string, `TransitionObject`, or `TransitionObject[]`.
   * - `enterStyle` / `exitStyle` - flat `Record<string, unknown>`.
   * - `animation` - string preset name.
   * - `animateOnly` - `readonly string[]` of property names.
   */
  readonly value: unknown;
}

/**
 * Classification result for a whole motif call site (one JSX element or
 * `styled()` invocation).
 */
export interface CallSiteAnalysis {
  readonly classification: Classification;
  /** Style props with extractable literal values. */
  readonly staticProps: ReadonlyArray<PropAnalysis & { readonly isStatic: true }>;
  /** Style props with values that must stay at runtime. */
  readonly dynamicProps: ReadonlyArray<PropAnalysis & { readonly isStatic: false }>;
  /** Non-style props (event handlers, aria-*, data-*, children, etc.). */
  readonly passThrough: ReadonlyArray<PropAnalysis>;
  /**
   * Pressable pseudo-state bags that were resolvable at compile time.
   * Dynamic pseudo-state values land in `dynamicProps` instead.
   */
  readonly pseudoStateProps: ReadonlyArray<PseudoStateAnalysis>;
  /**
   * Motion-prop literal values (`enterStyle`, `exitStyle`, `transition`,
   * `animation`, `animateOnly`). Dynamic motion values land in
   * `dynamicProps` - same partial-static rule as regular style props.
   */
  readonly motionProps: ReadonlyArray<MotionPropAnalysis>;
  /** True iff a `{...spread}` was seen. Forces classification to `dynamic`. */
  readonly hasSpread: boolean;
}

/**
 * Result of extracting a static / partial-static call site for the **web**
 * target. The compiler-side rewrite uses this to splice attributes into
 * the JSX element and accumulate CSS for the build's stylesheet output.
 */
export interface ExtractWebOptions {
  /**
   * CSS cascade layer to emit into. Must match `<ThemeProvider cssLayer>`.
   *
   * When set, base style props are emitted as a class instead of inline
   * styles, because inline styles cannot participate in a cascade layer, and
   * every emitted rule is wrapped in `@layer <name>`.
   */
  readonly cssLayer?: string | undefined;
  /**
   * Emit one shared class per declaration instead of inline styles and a class per element.
   * Declarations that override another on the same element keep the per-element output.
   */
  readonly atomic?: boolean | undefined;
}

export interface WebExtractionResult {
  /**
   * Inline style object to apply via `style={...}`. Equivalent to
   * `baseStyle` from the runtime resolver - every value is either a
   * primitive number/string or a `var(--...)` token reference.
   */
  readonly inlineStyle: ResolvedStyle;
  /**
   * Generated motif class name (`m-<hash>`) covering the responsive /
   * container at-rules. Undefined when the call has no responsive props.
   */
  readonly className: string | undefined;
  /**
   * The CSS body for `className` - raw at-rule blocks ready to write to
   * a stylesheet. Empty string when there are no at-rules to emit.
   *
   * Example:
   *   `@media (min-width: 768px) { .m-abc { padding: var(--space-4); } }`
   */
  readonly css: string;
  /** Style-prop names consumed by the static path (safe to drop from JSX). */
  readonly consumedProps: ReadonlyArray<string>;
}

/**
 * Result of extracting a static / partial-static call site for the
 * **native** target. The compiler hoists a single `StyleSheet.create({...})`
 * per file and references it by `id` (a numeric index assigned at hoist
 * time) at each call site.
 *
 * Responsive style props are deliberately *not* statically extracted on
 * native - viewport / container resolution is dynamic, so the runtime
 * keeps owning that path. Only the `base` slot (or unconditional literal)
 * goes into the StyleSheet.
 */
export interface NativeExtractionResult {
  /** The flat style object to register in `StyleSheet.create({ id: ... })`. */
  readonly style: ResolvedStyle;
  /**
   * Style-prop names safe to drop from JSX because they were folded into
   * the StyleSheet entry. Responsive props with non-trivial breakpoints
   * stay on the JSX element; only the `base` slot is consumed.
   */
  readonly consumedProps: ReadonlyArray<string>;
}

/**
 * Identity of a motif primitive call site. Used by analyzers / extractors
 * to decide whether a JSX element is a motif call worth processing.
 */
export interface PrimitiveBinding {
  /** Local name in the source (e.g. `Box` after `import { Box } from ...`). */
  readonly localName: string;
  /** Source module the binding came from (e.g. `@usemotif/react`). */
  readonly source: string;
  /** Imported name on the source side (e.g. `Box`). */
  readonly importedName: string;
}
