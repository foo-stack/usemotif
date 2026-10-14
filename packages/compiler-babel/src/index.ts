import type { ConfigAPI, NodePath, PluginObj, PluginPass } from '@babel/core';
import * as t from '@babel/types';
import {
  analyzeStripSafety,
  bindingForJsxName,
  classifyJsxAttributes,
  evaluateLiteral,
  evaluateStyledConfig,
  extractNative,
  extractWeb,
  findMotifBindings,
  findThemeChainCombos,
  getPrimitiveInfo,
  resolveStyledMergedProps,
  type BailReason,
  type CallSiteAnalysis,
  type PrimitiveBinding,
  type PrimitiveInfo,
  type ResolvedStyledConfig,
} from '@usemotif/compiler-core';
import {
  MEDIA_KEYS,
  type BreakpointName,
  type ResolvedStyle,
  configureBreakpoints,
  isStyleProp,
  resolveStylesToVars,
} from '@usemotif/core';

/**
 * Options for the motif-js Babel plugin.
 *
 * The plugin walks every JSX call site whose component is an imported
 * motif primitive (`Box`, `Stack`, `Text`, `Pressable`, `Image`,
 * `HStack`, `VStack`).
 *
 * **Web target:** static style props are baked into a `style={...}` /
 * `className=` pair plus accumulated CSS; fully-static call sites have
 * the wrapper stripped (`<Box p={4}>` → `<div style={...}>`).
 *
 * **Native target:** literal-only style entries are accumulated into a
 * single `StyleSheet.create({ id1: {...}, ... })` hoisted at file
 * top, and each call site's `style={}` is rewritten to reference the
 * hoisted id (`style={_motifStyles.id3}` or
 * `style={[_motifStyles.id3, userStyle]}` if the user supplied an inline
 * style of their own).
 *
 * Dynamic prop bags are left alone - the runtime still resolves them.
 *
 * The compiler shares its resolver with the runtime (`@usemotif/core`),
 * so the emitted `m-<hash>` class names (web) and StyleSheet entries
 * (native) are byte-identical to what the runtime would produce. Mid-
 * migration codebases (some compiled, some not) dedupe correctly.
 */
/**
 * What the optimizing extractor surfaces about its aggressive-mode work for
 * one source file - emitted via {@link MotifBabelOptions.onAggressiveReport}
 * so the extra extraction is never silent.
 */
export interface AggressiveReport {
  readonly filename?: string | undefined;
  /** Fully-static object spreads inlined into explicit props this file. */
  readonly spreadsInlined: number;
  /** Spreads left in place on a motif element (not provably static). */
  readonly spreadsBailed: number;
  /** `prop={cond ? A : B}` ternaries baked to a conditional inline value. */
  readonly ternariesInlined: number;
  /** `prop={media.bp ? A : B}` reads rewritten to a responsive prop (→ CSS). */
  readonly mediaErased: number;
}

/**
 * One motif element the compiler left to the runtime, and why - emitted via
 * {@link MotifBabelOptions.onBail} so a build can see what extraction missed.
 */
export interface BailEvent {
  readonly filename?: string | undefined;
  /** 1-based line of the element's opening tag, when the source has locations. */
  readonly line?: number | undefined;
  /** 0-based column of the element's opening tag. */
  readonly column?: number | undefined;
  /** The JSX name as written, e.g. `Box` or `Stack`. */
  readonly element: string;
  /**
   * - `dynamic-props`: no style prop is static, so the element's styling is
   *   left entirely to the runtime resolver (see `props`).
   * - `has-spread`: a `{...spread}` hides the element's props from the
   *   compiler, so the element is left to the runtime.
   * - any {@link BailReason}: the static styles were extracted, but the wrapper
   *   component stays, because rendering the plain tag would change behaviour.
   */
  readonly reason: 'dynamic-props' | BailReason;
  /** The style props whose values are dynamic, as written at the call site, when any are. */
  readonly props?: readonly string[] | undefined;
}

export interface MotifBabelOptions {
  /** `'web'` (default) extracts CSS. `'native'` hoists StyleSheet entries. */
  readonly target?: 'web' | 'native';
  /**
   * Extraction aggressiveness.
   *
   * - `'safe'` (default) - the conservative analyzer: a construct is extracted
   *   only when it's provably static, and anything uncertain falls through to
   *   the runtime. Output is byte-identical to a build with the option unset.
   * - `'aggressive'` - opt into extra extraction that the safe tier leaves to
   *   the runtime. Currently: fully-static object spreads (`{...{ p: 8 }}` or
   *   `{...CONST}`) are inlined into explicit props so they bake like any other
   *   static prop. Still obeys byte-for-byte runtime parity; it only ever
   *   extracts *more*, never differently. Pair with `onAggressiveReport` to see
   *   what it did.
   */
  readonly optimizationLevel?: 'safe' | 'aggressive';
  /**
   * Called once per source file at Program-exit (aggressive mode only) with a
   * summary of the extra extraction performed, so a build can log or audit it.
   * Skipped in safe mode and when nothing aggressive happened.
   */
  readonly onAggressiveReport?: (report: AggressiveReport) => void;
  /**
   * Called for each motif element the compiler leaves to the runtime, in every
   * optimization level, with where it is and why. Setting it never changes the
   * output.
   */
  readonly onBail?: (event: BailEvent) => void;
  /**
   * Override the breakpoint pixel widths used to build `@media` / `@container`
   * rules and to compute responsive matches. Merges over the defaults (the five
   * names - `sm`/`md`/`lg`/`xl`/`2xl` - are fixed; only their widths change).
   *
   * CSS media queries can't read `var()`, so a customized breakpoint has to be
   * fixed when the CSS is built. Pass the SAME object to the app's runtime
   * `configureBreakpoints()` (or `<ThemeProvider breakpoints={...}>`) so the
   * dev-time runtime CSS and the compiled CSS use identical thresholds - a
   * mismatch means dev and prod disagree. Applied per file (Program-enter) and
   * reset afterward, so it never leaks across a multi-file build.
   */
  readonly breakpoints?: Partial<Record<BreakpointName, number>>;
  /**
   * Web only. Emit every generated rule inside `@layer <name>`, so the app can
   * order Motif against its own stylesheet explicitly.
   *
   * Pass the SAME name as `<ThemeProvider cssLayer={...}>`. The generated class
   * name is derived from the layer as well as the declarations, so a mismatch
   * means compiled and runtime rules hash differently and stop deduplicating -
   * the same build-time/runtime agreement `breakpoints` requires.
   *
   * When set, base style props compile to a class rather than an inline
   * `style` object, because inline styles cannot belong to a cascade layer.
   */
  readonly cssLayer?: string;
  /**
   * Web only. Called once per source file at Program-exit with the
   * concatenated CSS the plugin accumulated for that file. The host build
   * tool is responsible for writing it to a `.css` artifact (Vite virtual
   * module, webpack child compilation, etc.).
   */
  readonly onCss?: (css: string, filename?: string) => void;
  /**
   * Called once per source file at Program-exit with the set of observed
   * `<Theme>` chain combinations (e.g. `{ "red", "red_blue" }`). The host
   * build tool combines these with the registered base themes to
   * pre-generate just the cross-product CSS that's actually used,
   * avoiding the manual `themes={[...]}` registration step on the
   * provider. Skipped when no `<Theme>` boundaries are observed.
   */
  readonly onThemeChains?: (combos: ReadonlySet<string>, filename?: string) => void;
}

interface NativeStyleEntry {
  /** Property name on the hoisted styles object (`id0`, `id1`, ...). */
  readonly id: string;
  /** Resolved style object to register. */
  readonly style: ResolvedStyle;
}

/**
 * One same-file `const X = styled(Y, { ... literal config ... })`
 * declaration the compiler can statically resolve. The Babel visitor
 * uses these to rewrite `<X size="sm" />` into `<Y p={2} />` (with the
 * variant prop dropped, the merged styles inlined, and the wrapper
 * collapsed to the underlying primitive). Cross-file styled() lookups
 * stay at runtime - the Babel pass processes one file at a time.
 */
interface StyledBinding {
  /** The motif primitive being styled (resolved against state.bindings). */
  readonly underlying: PrimitiveBinding;
  /** The literal-evaluated config object. */
  readonly config: ResolvedStyledConfig;
}

interface State extends PluginPass {
  bindings: Map<string, PrimitiveBinding>;
  styledBindings: Map<string, StyledBinding>;
  cssChunks: string[];
  nativeStyles: NativeStyleEntry[];
  nativeIdCounter: number;
  aggressiveSpreadsInlined: number;
  aggressiveSpreadsBailed: number;
  aggressiveTernariesInlined: number;
  aggressiveMediaErased: number;
  useMediaLocals: Set<string>;
}

/**
 * Module specifiers that export the `styled()` factory. `styled` ships from
 * the umbrella `usemotif` package (and is re-exported from the renderer
 * entry points); omitting `usemotif` made the whole variant-expansion
 * pipeline a no-op for real consumers.
 */
const STYLED_SOURCES: ReadonlySet<string> = new Set([
  'usemotif',
  '@usemotif/react',
  '@usemotif/react-native',
]);

const PACKAGE_NAME = '@usemotif/compiler-babel';

/**
 * Local name used for the hoisted `StyleSheet.create({...})` object. The
 * leading underscore + `motif` namespace keeps it from colliding with
 * anything in user code; if a user happens to declare `_motifStyles`
 * themselves they'll get a normal scope shadowing error (preferable to
 * silent merge).
 */
const NATIVE_STYLES_LOCAL = '_motifStyles';
/** Local name for the imported `StyleSheet` from `react-native`. */
const NATIVE_STYLESHEET_LOCAL = '_motifStyleSheet';

/**
 * Babel plugin entry point. Default-exports a function compatible with
 * Babel's plugin contract; returns a `PluginObj` whose visitor performs
 * the JSX rewrite.
 */
export default function motifBabelPlugin(_api: ConfigAPI): PluginObj<State> {
  return {
    name: 'motif-extract',
    visitor: {
      Program: {
        enter(path, state) {
          // Apply per-file breakpoint overrides before any extraction, so the
          // shared resolver builds `@media` rules / computes matches against
          // the same widths the runtime will. Reset at Program-exit keeps a
          // multi-file build from leaking one file's config into the next.
          const breakpoints = (state.opts as MotifBabelOptions).breakpoints;
          if (breakpoints !== undefined) configureBreakpoints(breakpoints);

          state.bindings = findMotifBindings(path.node.body);
          state.styledBindings = collectStyledBindings(
            path.node.body,
            state.bindings,
            (state.opts as MotifBabelOptions).optimizationLevel === 'aggressive',
          );
          state.useMediaLocals = collectUseMediaLocals(path.node.body);
          state.cssChunks = [];
          state.nativeStyles = [];
          state.nativeIdCounter = 0;
          state.aggressiveSpreadsInlined = 0;
          state.aggressiveSpreadsBailed = 0;
          state.aggressiveTernariesInlined = 0;
          state.aggressiveMediaErased = 0;
        },
        exit(path, state) {
          const opts = state.opts as MotifBabelOptions;
          const target = opts.target ?? 'web';

          // Reset breakpoint overrides applied at Program-enter. The emitted
          // `@media` strings were baked into `state.cssChunks` during the JSX
          // visits, so the reset only prevents leakage into the next file.
          if (opts.breakpoints !== undefined) configureBreakpoints({});

          // Theme-chain pre-generation runs on both targets - observed
          // chains feed into the host build tool's CSS-emit pipeline
          // regardless of whether the file is being compiled for web
          // or native (the chains describe the JSX structure, not the
          // emitted output).
          if (typeof opts.onThemeChains === 'function') {
            const combos = findThemeChainCombos(path.node.body);
            if (combos.size > 0) opts.onThemeChains(combos, state.filename);
          }

          // Surface aggressive-mode work before the target-specific early
          // returns below, so the report fires even for a file that produced
          // no CSS / StyleSheet output.
          if (
            typeof opts.onAggressiveReport === 'function' &&
            (state.aggressiveSpreadsInlined > 0 ||
              state.aggressiveSpreadsBailed > 0 ||
              state.aggressiveTernariesInlined > 0 ||
              state.aggressiveMediaErased > 0)
          ) {
            opts.onAggressiveReport({
              filename: state.filename,
              spreadsInlined: state.aggressiveSpreadsInlined,
              spreadsBailed: state.aggressiveSpreadsBailed,
              ternariesInlined: state.aggressiveTernariesInlined,
              mediaErased: state.aggressiveMediaErased,
            });
          }

          if (target === 'web') {
            if (state.cssChunks.length === 0) return;
            if (typeof opts.onCss === 'function') {
              opts.onCss(state.cssChunks.join('\n'), state.filename);
            }
            return;
          }

          if (target === 'native' && state.nativeStyles.length > 0) {
            hoistNativeStyleSheet(path, state.nativeStyles);
          }
        },
      },
      JSXOpeningElement(path, state) {
        // Same-file `styled()` expansion: `<MyButton size="sm" />` →
        // `<Box p={2} />` with the variant prop dropped and the merged
        // styles inlined. After the rewrite, the regular extract
        // pipeline treats it as a plain primitive call site.
        if (t.isJSXIdentifier(path.node.name)) {
          const name = path.node.name.name;
          const styledBinding = state.styledBindings.get(name);
          if (styledBinding !== undefined && resolvesToModuleBinding(path, name)) {
            const expanded = applyStyledExpansion(path, styledBinding);
            if (!expanded) return; // call-site has dynamic variant args
          }
        }

        const binding = bindingForJsxName(path.node.name, state.bindings);
        if (binding === undefined) return;
        // Match by binding identity, not just name: a local shadow of the
        // imported name (`const Box = props.Box`, a destructured prop, etc.)
        // must not be rewritten into the motif primitive.
        if (
          t.isJSXIdentifier(path.node.name) &&
          !resolvesToModuleBinding(path, path.node.name.name)
        ) {
          return;
        }

        const primitive = getPrimitiveInfo(binding.importedName);
        const opts = state.opts as MotifBabelOptions;
        const aggressive = opts.optimizationLevel === 'aggressive';
        const target = opts.target ?? 'web';

        // Aggressive-mode pre-pass: turn fully-static object spreads into the
        // equivalent explicit attributes *before* classification, so the
        // normal extract pipeline bakes them. Scoped to confirmed motif
        // primitives (this point is past the binding-identity guard), so
        // unrelated JSX is never touched.
        if (aggressive) {
          const report = inlineStaticSpreads(path, path.scope);
          state.aggressiveSpreadsInlined += report.inlined;
          state.aggressiveSpreadsBailed += report.bailed;
          // Erase `prop={media.bp ? A : B}` reads to a responsive prop (→ CSS),
          // so the styling no longer depends on the runtime media hook. Web
          // only - native keeps the runtime read.
          if (target === 'web') {
            state.aggressiveMediaErased += eraseUseMediaTernaries(path, state.useMediaLocals);
          }
        }

        const analysis = classifyJsxAttributes(path.node.attributes, path.scope, primitive);

        // A `prop={cond ? A : B}` with both branches static is a dynamic prop
        // today, but (web, aggressive) it can be baked to a conditional inline
        // value. Detecting a candidate keeps the early-returns below from
        // skipping an element whose only non-static content is such a ternary.
        const ternaryEligible =
          aggressive && target === 'web' && hasStaticTernaryCandidate(analysis, path.scope);

        if (analysis.classification === 'dynamic' && !ternaryEligible) {
          const dynamicNames = analysis.dynamicProps.map((p) => p.name);
          reportBail(
            path,
            state,
            dynamicNames.length === 0 && analysis.hasSpread ? 'has-spread' : 'dynamic-props',
            dynamicNames,
          );
          return;
        }
        if (
          analysis.staticProps.length === 0 &&
          analysis.pseudoStateProps.length === 0 &&
          analysis.motionProps.length === 0 &&
          !ternaryEligible
        ) {
          return;
        }

        if (target === 'web') {
          rewriteJsxForWeb(path, analysis, state, primitive, aggressive);
        } else if (target === 'native') {
          rewriteJsxForNative(path, analysis, state);
        }
      },
    },
  };
}

/**
 * Confirm a JSX identifier still resolves, at its call site, to the
 * module-scope binding the plugin recorded (a motif import or a `styled()`
 * const) - i.e. it hasn't been shadowed by a local binding (a destructured
 * prop, an inner `const`, a function param). Matching by name alone would
 * rewrite an unrelated component that happens to share the name.
 *
 * Uses binding identity: the nearest binding for the name at this site must
 * be the very same binding object as the program-scope binding. A shadow
 * yields a different (inner) binding; a name whose only binding is local
 * (the module binding having been erased, e.g. a type-only import) has no
 * program binding and so fails too.
 */
function resolvesToModuleBinding(path: NodePath<t.JSXOpeningElement>, name: string): boolean {
  const local = path.scope.getBinding(name);
  if (local === undefined) return false;
  const program = path.scope.getProgramParent().getBinding(name);
  return program !== undefined && local === program;
}

/** Scope shape `evaluateLiteral` accepts - derived so we don't import it. */
type LiteralScope = Parameters<typeof evaluateLiteral>[1];

/** Valid JSX attribute name: identifier-ish, allowing the `-` in aria-/data-. */
const JSX_ATTR_NAME_RE = /^[A-Za-z_$][A-Za-z0-9_$-]*$/;

/**
 * Convert a literal JS value (from `evaluateLiteral`) into a JSX attribute
 * value node. Strings become a plain string-literal attribute
 * (`p="$space.4"`); everything else (number, boolean, null, or a nested
 * object/array for a responsive value) becomes an expression container.
 * Returns null for anything `valueToNode` can't represent, so the caller can
 * bail the whole spread rather than emit something lossy.
 */
function literalToJsxAttrValue(value: unknown): t.StringLiteral | t.JSXExpressionContainer | null {
  if (typeof value === 'string') return t.stringLiteral(value);
  if (value === undefined) return null;
  try {
    const node = t.valueToNode(value);
    if (!t.isExpression(node)) return null;
    return t.jsxExpressionContainer(node);
  } catch {
    return null;
  }
}

/**
 * Expand a spread argument into explicit JSX attributes when it is a
 * fully-static object literal (directly, or a const that resolves to one).
 * Returns null to signal "leave the spread alone" - a dynamic argument, a
 * non-object, an attribute-unsafe key, or an unrepresentable value.
 */
function spreadArgToAttributes(arg: t.Expression, scope: LiteralScope): t.JSXAttribute[] | null {
  const lit = evaluateLiteral(arg, scope);
  if (!lit.ok) return null;
  const value = lit.value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const attrs: t.JSXAttribute[] = [];
  for (const key of Object.keys(obj)) {
    if (!JSX_ATTR_NAME_RE.test(key)) return null;
    const valueNode = literalToJsxAttrValue(obj[key]);
    if (valueNode === null) return null;
    attrs.push(t.jsxAttribute(t.jsxIdentifier(key), valueNode));
  }
  return attrs;
}

/**
 * Aggressive-mode pre-pass over one motif JSX element: replace every
 * fully-static object spread with the equivalent explicit attributes at the
 * spread's position. Precedence is preserved - the synthesized attributes sit
 * where the spread was, so a later attribute (or a later spread) still
 * overrides, exactly as the runtime spread would. Spreads that can't be proven
 * static are left untouched and counted as bailed.
 *
 * This is the entire footprint of static-spread extraction: by lowering the
 * spread to ordinary attributes here, the unchanged classify → extract →
 * rewrite → strip pipeline produces output byte-identical to what the runtime
 * resolves for the same element.
 */
function inlineStaticSpreads(
  path: NodePath<t.JSXOpeningElement>,
  scope: LiteralScope,
): { inlined: number; bailed: number } {
  let inlined = 0;
  let bailed = 0;
  let changed = false;
  const next: (t.JSXAttribute | t.JSXSpreadAttribute)[] = [];
  for (const attr of path.node.attributes) {
    if (!t.isJSXSpreadAttribute(attr)) {
      next.push(attr);
      continue;
    }
    const expanded = spreadArgToAttributes(attr.argument, scope);
    if (expanded === null) {
      bailed++;
      next.push(attr);
      continue;
    }
    inlined++;
    changed = true;
    next.push(...expanded);
  }
  if (changed) path.node.attributes = next;
  return { inlined, bailed };
}

/** Local names bound to a `useMedia` import from a motif source in this file. */
function collectUseMediaLocals(body: readonly t.Statement[]): Set<string> {
  return new Set(findMotifBindings(body, STYLED_SOURCES, new Set(['useMedia'])).keys());
}

const MEDIA_KEY_SET: ReadonlySet<string> = new Set(MEDIA_KEYS);

function isScalarLiteral(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

/**
 * Is `name` a `const` bound to a `useMedia()` call (from one of `useMediaLocals`)
 * that is never reassigned? Resolved through the call-site scope, so a shadowing
 * local of the same name is respected, and `binding.constant` rules out
 * reassignment.
 */
function isUseMediaVar(
  name: string,
  scope: NodePath<t.JSXOpeningElement>['scope'],
  useMediaLocals: ReadonlySet<string>,
): boolean {
  const binding = scope.getBinding(name);
  if (binding === undefined || !binding.constant) return false;
  const decl = binding.path.node;
  if (!t.isVariableDeclarator(decl) || decl.init === null || !t.isCallExpression(decl.init)) {
    return false;
  }
  const callee = decl.init.callee;
  return t.isIdentifier(callee) && useMediaLocals.has(callee.name);
}

/**
 * Aggressive web pre-pass: rewrite a style prop written
 * `prop={media.<bp> ? A : B}` (both branches static scalars, `media` bound to
 * `useMedia()`) into the equivalent responsive prop `{ base: B, <bp>: A }`. The
 * normal responsive extraction then compiles it to a CSS media query, so the
 * prop no longer reads the runtime hook. `media.<bp>` is true at
 * `min-width: <bp>`, so the truthy branch maps to the `<bp>` slot and the falsy
 * branch to `base` - the same viewport behavior, expressed as CSS.
 *
 * This is a semantics-preserving *rewrite*, not a byte-identical pre-resolution:
 * it intentionally trades a JS media read (and its inline style) for a CSS media
 * query. Returns the number of props erased.
 */
function eraseUseMediaTernaries(
  path: NodePath<t.JSXOpeningElement>,
  useMediaLocals: ReadonlySet<string>,
): number {
  if (useMediaLocals.size === 0) return 0;
  let erased = 0;
  for (const attr of path.node.attributes) {
    if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
    if (!isStyleProp(attr.name.name)) continue;
    const value = attr.value;
    if (value === null || !t.isJSXExpressionContainer(value)) continue;
    const expr = value.expression;
    if (!t.isConditionalExpression(expr)) continue;

    const test = expr.test;
    if (!t.isMemberExpression(test) || test.computed) continue;
    if (!t.isIdentifier(test.object) || !t.isIdentifier(test.property)) continue;
    if (!MEDIA_KEY_SET.has(test.property.name)) continue;
    if (!isUseMediaVar(test.object.name, path.scope, useMediaLocals)) continue;

    const truthy = evaluateLiteral(expr.consequent, path.scope);
    const falsy = evaluateLiteral(expr.alternate, path.scope);
    if (!truthy.ok || !falsy.ok) continue;
    if (!isScalarLiteral(truthy.value) || !isScalarLiteral(falsy.value)) continue;

    // media.<bp> is true at min-width:<bp> → truthy is the <bp> slot, falsy base.
    attr.value = t.jsxExpressionContainer(
      t.objectExpression([
        t.objectProperty(t.stringLiteral('base'), t.cloneNode(expr.alternate)),
        t.objectProperty(t.stringLiteral(test.property.name), t.cloneNode(expr.consequent)),
      ]),
    );
    erased++;
  }
  return erased;
}

/** A style-prop ternary lowered to a conditional CSS value. */
interface StaticTernary {
  /** Source attribute name to drop from the JSX. */
  readonly sourceName: string;
  /** Resolved CSS property the prop maps to (`padding`, `backgroundColor`). */
  readonly cssProp: string;
  /** The runtime condition (cloned), kept dynamic. */
  readonly test: t.Expression;
  /** Resolved value node for the truthy branch. */
  readonly whenTrue: t.Expression;
  /** Resolved value node for the falsy branch. */
  readonly whenFalse: t.Expression;
}

function scalarToNode(value: string | number): t.Expression {
  return typeof value === 'number' ? t.numericLiteral(value) : t.stringLiteral(value);
}

/**
 * Resolve a single style-prop value the way the runtime would (token → CSS
 * var, alias → CSS property), but only accept a result that is exactly one
 * scalar CSS property. Returns null for responsive objects, multi-property
 * shorthands, transform compositions that don't collapse to one key, or any
 * non-scalar - those stay at runtime.
 */
function resolveScalarStyle(
  styleName: string,
  value: unknown,
): { prop: string; value: string | number } | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const { style } = resolveStylesToVars({ [styleName]: value });
  const keys = Object.keys(style);
  if (keys.length !== 1) return null;
  const prop = keys[0]!;
  const resolved = (style as Record<string, unknown>)[prop];
  if (typeof resolved !== 'string' && typeof resolved !== 'number') return null;
  return { prop, value: resolved };
}

/**
 * Recognise a dynamic style prop whose value is `test ? A : B` with both
 * branches statically resolvable to the same single scalar CSS property.
 * Returns the lowered form, or null when it isn't such a ternary.
 */
function asStaticTernary(
  dp: CallSiteAnalysis['dynamicProps'][number],
  scope: LiteralScope,
): StaticTernary | null {
  const attr = dp.handle;
  if (!t.isJSXAttribute(attr as t.Node)) return null;
  const value = (attr as t.JSXAttribute).value;
  if (value === null || !t.isJSXExpressionContainer(value)) return null;
  const expr = value.expression;
  if (!t.isConditionalExpression(expr)) return null;
  const a = evaluateLiteral(expr.consequent, scope);
  const b = evaluateLiteral(expr.alternate, scope);
  if (!a.ok || !b.ok) return null;
  const ra = resolveScalarStyle(dp.name, a.value);
  const rb = resolveScalarStyle(dp.name, b.value);
  if (ra === null || rb === null || ra.prop !== rb.prop) return null;
  return {
    sourceName: dp.sourceName ?? dp.name,
    cssProp: ra.prop,
    test: t.cloneNode(expr.test),
    whenTrue: scalarToNode(ra.value),
    whenFalse: scalarToNode(rb.value),
  };
}

/** Cheap pre-check: does the element have at least one extractable ternary? */
function hasStaticTernaryCandidate(analysis: CallSiteAnalysis, scope: LiteralScope): boolean {
  return analysis.dynamicProps.some((dp) => asStaticTernary(dp, scope) !== null);
}

/**
 * Collect every static-branch ternary on the element. Returns null (extract
 * none) unless **every** dynamic prop is such a ternary and no two - nor a
 * ternary and an already-baked static prop (`staticCssProps`) - target the
 * same CSS property. That all-or-nothing rule keeps every value on the inline
 * layer, so there is no inline-vs-runtime cascade to invert: the baked
 * `style` object holds exactly what the runtime would compute per branch.
 */
function collectStaticTernaries(
  analysis: CallSiteAnalysis,
  scope: LiteralScope,
  staticCssProps: ReadonlySet<string>,
): StaticTernary[] | null {
  if (analysis.dynamicProps.length === 0) return null;
  const used = new Set(staticCssProps);
  const out: StaticTernary[] = [];
  for (const dp of analysis.dynamicProps) {
    const ternary = asStaticTernary(dp, scope);
    if (ternary === null) return null; // a truly-dynamic prop → leave all at runtime
    if (used.has(ternary.cssProp)) return null; // collision → leave all at runtime
    used.add(ternary.cssProp);
    out.push(ternary);
  }
  return out;
}

/**
 * Apply the web extraction result back onto the JSX element:
 *  - drop consumed style-prop attributes
 *  - merge the baked inline-style into any existing `style=` attribute
 *  - merge the generated class name into any existing `className=`
 *  - accumulate the at-rule CSS for the host build tool
 *  - when fully static, swap the wrapper for its underlying HTML tag
 */
function rewriteJsxForWeb(
  path: NodePath<t.JSXOpeningElement>,
  analysis: CallSiteAnalysis,
  state: State,
  primitive: PrimitiveInfo | undefined,
  aggressive: boolean,
): void {
  const result = extractWeb(analysis, { cssLayer: (state.opts as MotifBabelOptions).cssLayer });

  // Aggressive: lower `prop={cond ? A : B}` (both branches static) to a
  // conditional entry in the same inline-style object the static props bake
  // into. Only when every dynamic prop qualifies and nothing collides - so
  // the whole element resolves on the inline layer with no cascade inversion.
  //
  // The ternary value lands in `style` (applied after the wrapper's base), so
  // bail if anything could need a different layer/order: a pseudo or motion
  // bag (their specificity lift would be bypassed), or a static prop the
  // extractor kept on the JSX because it shares a shorthand family with a
  // ternary (baking the ternary post-base could then invert source order).
  const consumedStatic = new Set(result.consumedProps);
  const staticKeptOnJsx = analysis.staticProps.some(
    (p) => typeof p.sourceName === 'string' && !consumedStatic.has(p.sourceName),
  );
  const ternaries =
    aggressive &&
    analysis.pseudoStateProps.length === 0 &&
    analysis.motionProps.length === 0 &&
    !staticKeptOnJsx
      ? collectStaticTernaries(analysis, path.scope, new Set(Object.keys(result.inlineStyle)))
      : null;

  const consumed = new Set(result.consumedProps);
  if (ternaries !== null) {
    for (const ternary of ternaries) consumed.add(ternary.sourceName);
  }
  const remaining = dropConsumed(path.node.attributes, consumed);

  const bakedStyle = resolvedStyleToObjectExpression(result.inlineStyle);
  if (ternaries !== null && ternaries.length > 0) {
    for (const ternary of ternaries) {
      bakedStyle.properties.push(
        t.objectProperty(
          objectKey(ternary.cssProp),
          t.conditionalExpression(ternary.test, ternary.whenTrue, ternary.whenFalse),
        ),
      );
    }
    state.aggressiveTernariesInlined += ternaries.length;
  }
  if (bakedStyle.properties.length > 0) {
    mergeStyleAttribute(remaining, bakedStyle);
  }
  if (result.className !== undefined) {
    mergeClassNameAttribute(remaining, result.className);
  }

  path.node.attributes = remaining;

  if (result.css.length > 0) {
    state.cssChunks.push(result.css);
  }

  // Wrapper-stripping: when every style prop is static and the call site
  // can be rendered directly as the underlying HTML element, replace the
  // primitive's JSX name with its lowercase tag. Saves the React function
  // component call entirely. The safety analysis is centralised in
  // `analyzeStripSafety` (compiler-core) - see the BailReason docstring
  // for the full bail-out list.
  if (primitive !== undefined) {
    const parent = path.parent;
    const parentEl = t.isJSXElement(parent) ? parent : null;
    const safety = analyzeStripSafety(path.node, parentEl, primitive, analysis);
    if (safety.safe) {
      renameJsxElement(path, primitive.defaultTag);
    } else if (safety.bailReason !== undefined) {
      const dynamicNames = analysis.dynamicProps.map((p) => p.name);
      reportBail(
        path,
        state,
        safety.bailReason,
        dynamicNames.length > 0 ? dynamicNames : undefined,
      );
    }
  }
}

function reportBail(
  path: NodePath<t.JSXOpeningElement>,
  state: State,
  reason: BailEvent['reason'],
  props?: readonly string[],
): void {
  const onBail = (state.opts as MotifBabelOptions).onBail;
  if (typeof onBail !== 'function') return;
  const start = path.node.loc?.start;
  onBail({
    filename: state.filename,
    line: start?.line,
    column: start?.column,
    element: jsxNameText(path.node.name),
    reason,
    props,
  });
}

function jsxNameText(name: t.JSXOpeningElement['name']): string {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXNamespacedName(name)) return `${name.namespace.name}:${name.name.name}`;
  return `${jsxNameText(name.object as t.JSXOpeningElement['name'])}.${name.property.name}`;
}

/**
 * Native-target rewrite: extract literal-only styles into a per-file
 * accumulator, drop the consumed style props from the JSX, and splice in
 * a `style={_motifStyles.idN}` reference. The hoisted
 * `StyleSheet.create({...})` is generated in `Program.exit`.
 */
function rewriteJsxForNative(
  path: NodePath<t.JSXOpeningElement>,
  analysis: CallSiteAnalysis,
  state: State,
): void {
  const result = extractNative(analysis);
  if (result.consumedProps.length === 0) return;

  const consumed = new Set(result.consumedProps);
  const remaining = dropConsumed(path.node.attributes, consumed);

  if (Object.keys(result.style).length === 0) {
    path.node.attributes = remaining;
    return;
  }

  const id = `id${state.nativeIdCounter++}`;
  state.nativeStyles.push({ id, style: result.style });

  // Build `_motifStyles.idN` as a member expression we can re-use.
  const styleRef = (): t.Expression =>
    t.memberExpression(t.identifier(NATIVE_STYLES_LOCAL), t.identifier(id));

  mergeNativeStyleAttribute(remaining, styleRef);
  path.node.attributes = remaining;
}

/**
 * Inject the hoisted `StyleSheet.create({...})` and an aliased
 * `react-native` import. Idempotent within a file - `nativeStyles` is
 * the per-file accumulator. Insertion point: after the last existing
 * `import` declaration so ESM ordering rules stay happy.
 */
function hoistNativeStyleSheet(
  programPath: NodePath<t.Program>,
  entries: readonly NativeStyleEntry[],
): void {
  const importDecl = t.importDeclaration(
    [t.importSpecifier(t.identifier(NATIVE_STYLESHEET_LOCAL), t.identifier('StyleSheet'))],
    t.stringLiteral('react-native'),
  );

  const props: t.ObjectProperty[] = entries.map((entry) =>
    t.objectProperty(t.identifier(entry.id), resolvedStyleToObjectExpression(entry.style)),
  );

  const stylesDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier(NATIVE_STYLES_LOCAL),
      t.callExpression(
        t.memberExpression(t.identifier(NATIVE_STYLESHEET_LOCAL), t.identifier('create')),
        [t.objectExpression(props)],
      ),
    ),
  ]);

  // Insert after the last import; if there are no imports at all, prepend.
  const body = programPath.node.body;
  let insertIdx = -1;
  for (let i = 0; i < body.length; i++) {
    if (t.isImportDeclaration(body[i])) insertIdx = i;
  }
  if (insertIdx === -1) {
    programPath.unshiftContainer('body', [importDecl, stylesDecl]);
  } else {
    body.splice(insertIdx + 1, 0, importDecl, stylesDecl);
  }
}

/**
 * Merge a `_motifStyles.idN` reference into the JSX element's `style=`
 * attribute. RN's style prop accepts a single style or an array of
 * styles; later entries override earlier ones, so the hoisted entry
 * comes first and any user-supplied style is appended (user wins).
 */
function mergeNativeStyleAttribute(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  styleRef: () => t.Expression,
): void {
  const existingIdx = attributes.findIndex(
    (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === 'style',
  );

  if (existingIdx === -1) {
    attributes.push(t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(styleRef())));
    return;
  }

  const existing = attributes[existingIdx] as t.JSXAttribute;
  const ev = existing.value;
  if (ev === null || !t.isJSXExpressionContainer(ev) || !t.isExpression(ev.expression)) {
    existing.value = t.jsxExpressionContainer(styleRef());
    return;
  }

  // If the existing value is already an array literal, prepend our ref
  // so user entries (which come later) keep their override priority.
  if (t.isArrayExpression(ev.expression)) {
    ev.expression.elements.unshift(styleRef());
    return;
  }

  // Generic case: wrap into a 2-element array `[motifRef, existing]`.
  existing.value = t.jsxExpressionContainer(t.arrayExpression([styleRef(), ev.expression]));
}

/**
 * Rename a JSX element: the opening tag, and the closing tag when there is one.
 * Rewrite only - stripping a wrapper must be cleared by `analyzeStripSafety`
 * first.
 */
function renameJsxElement(path: NodePath<t.JSXOpeningElement>, name: string): void {
  path.node.name = t.jsxIdentifier(name);
  const closing = t.isJSXElement(path.parent) ? path.parent.closingElement : null;
  if (closing !== null && closing !== undefined) closing.name = t.jsxIdentifier(name);
}

/** The attributes left once every plain attribute named in `consumed` is removed. */
function dropConsumed(
  attrs: readonly (t.JSXAttribute | t.JSXSpreadAttribute)[],
  consumed: ReadonlySet<string>,
): (t.JSXAttribute | t.JSXSpreadAttribute)[] {
  return attrs.filter(
    (attr) =>
      !(t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && consumed.has(attr.name.name)),
  );
}

/**
 * Build a `style={{ ...baked, ...existing }}` literal merge: existing
 * (user-supplied) values override the baked values, mirroring the
 * runtime's `{ ...baseStyle, ...inlineStyle }` semantics in `<Box>`.
 */
function mergeStyleAttribute(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  bakedObject: t.ObjectExpression,
): void {
  const existingIdx = attributes.findIndex(
    (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === 'style',
  );
  if (existingIdx === -1) {
    attributes.push(
      t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(bakedObject)),
    );
    return;
  }
  const existing = attributes[existingIdx] as t.JSXAttribute;
  const ev = existing.value;
  if (ev !== null && t.isJSXExpressionContainer(ev) && t.isObjectExpression(ev.expression)) {
    // Literal-on-literal merge: append the user's properties so they
    // win. Avoids creating a runtime spread.
    bakedObject.properties.push(...ev.expression.properties);
    existing.value = t.jsxExpressionContainer(bakedObject);
    return;
  }
  // Fallback: emit a spread merge `{ ...baked, ...existing }`.
  const merged = t.objectExpression([
    t.spreadElement(bakedObject),
    ...(ev !== null && t.isJSXExpressionContainer(ev) && t.isExpression(ev.expression)
      ? [t.spreadElement(ev.expression)]
      : []),
  ]);
  existing.value = t.jsxExpressionContainer(merged);
}

function mergeClassNameAttribute(
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  generated: string,
): void {
  const existingIdx = attributes.findIndex(
    (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === 'className',
  );
  if (existingIdx === -1) {
    attributes.push(t.jsxAttribute(t.jsxIdentifier('className'), t.stringLiteral(generated)));
    return;
  }
  const existing = attributes[existingIdx] as t.JSXAttribute;
  const ev = existing.value;
  if (ev === null) {
    existing.value = t.stringLiteral(generated);
    return;
  }
  if (t.isStringLiteral(ev)) {
    // filter(Boolean) so an empty existing className (`className=""`) doesn't
    // leave a trailing space / stray token - mirrors the runtime's
    // `[...].filter(Boolean).join(' ')` and the dynamic branch below.
    existing.value = t.stringLiteral([generated, ev.value].filter(Boolean).join(' '));
    return;
  }
  if (t.isJSXExpressionContainer(ev) && t.isStringLiteral(ev.expression)) {
    existing.value = t.stringLiteral([generated, ev.expression.value].filter(Boolean).join(' '));
    return;
  }
  if (t.isJSXExpressionContainer(ev) && t.isExpression(ev.expression)) {
    // `className={dynamic}` → `className={["m-x", dynamic].filter(Boolean).join(" ")}`.
    // Raw `"m-x " + dynamic` concatenation would stringify a falsy dynamic
    // value into the class list (`"m-x undefined"`, `"m-x false"`, or a
    // trailing space for `""`). The runtime builds the class with
    // `[...].filter(Boolean).join(' ')`, so mirror that to stay identical.
    existing.value = t.jsxExpressionContainer(
      t.callExpression(
        t.memberExpression(
          t.callExpression(
            t.memberExpression(
              t.arrayExpression([t.stringLiteral(generated), ev.expression]),
              t.identifier('filter'),
            ),
            [t.identifier('Boolean')],
          ),
          t.identifier('join'),
        ),
        [t.stringLiteral(' ')],
      ),
    );
    return;
  }
}

function resolvedStyleToObjectExpression(style: ResolvedStyle): t.ObjectExpression {
  const props: t.ObjectProperty[] = [];
  for (const key in style) {
    const value = style[key];
    let valueNode: t.Expression;
    if (typeof value === 'number') {
      valueNode = t.numericLiteral(value);
    } else if (typeof value === 'string') {
      valueNode = t.stringLiteral(value);
    } else {
      continue;
    }
    props.push(t.objectProperty(objectKey(key), valueNode));
  }
  return t.objectExpression(props);
}

/**
 * Scan the program body for `import { styled } from '@usemotif/react'`
 * declarations and resulting `const X = styled(Y, { ... })` definitions.
 * The result is a map keyed on the local name introduced by the
 * declaration (`X`), with the underlying primitive binding and the
 * literal-evaluated config attached.
 *
 * Cross-file styled definitions are intentionally not tracked - the
 * Babel pass works on one file at a time, so the consuming file can't
 * see the producing file's config. Those call sites stay at runtime.
 *
 * Aliased imports (`import { styled as s } from '@usemotif/react'`) are
 * supported.
 */
/** A styled config with no variants - its only contribution is `base`. */
function isBaseOnlyConfig(config: ResolvedStyledConfig): boolean {
  return (
    Object.keys(config.variants).length === 0 &&
    config.compoundVariants.length === 0 &&
    Object.keys(config.defaultVariants).length === 0
  );
}

/**
 * Merge an inner styled config under an outer one for a flattened chain. Only
 * valid for base-only configs (the caller guarantees it): `base` merges with
 * the outer winning on conflict - matching the runtime, where the outer styled
 * passes its resolved props down to the inner and the inner's base is a default.
 */
function mergeBaseOnlyConfigs(
  inner: ResolvedStyledConfig,
  outer: ResolvedStyledConfig,
): ResolvedStyledConfig {
  return {
    base: { ...inner.base, ...outer.base },
    variants: {},
    compoundVariants: [],
    defaultVariants: {},
    variantNames: new Set(),
  };
}

function collectStyledBindings(
  programBody: readonly t.Statement[],
  primitiveBindings: ReadonlyMap<string, PrimitiveBinding>,
  aggressive: boolean,
): Map<string, StyledBinding> {
  const styledLocals = new Set(
    findMotifBindings(programBody, STYLED_SOURCES, new Set(['styled'])).keys(),
  );
  if (styledLocals.size === 0) return new Map();

  const out = new Map<string, StyledBinding>();
  for (const stmt of programBody) {
    let decls: t.VariableDeclarator[] | null = null;
    if (t.isVariableDeclaration(stmt)) {
      decls = stmt.declarations;
    } else if (
      (t.isExportNamedDeclaration(stmt) || t.isExportDefaultDeclaration(stmt)) &&
      stmt.declaration !== null &&
      stmt.declaration !== undefined &&
      t.isVariableDeclaration(stmt.declaration)
    ) {
      decls = stmt.declaration.declarations;
    }
    if (decls === null) continue;

    for (const decl of decls) {
      if (!t.isIdentifier(decl.id)) continue;
      const init = decl.init;
      if (init === null || init === undefined || !t.isCallExpression(init)) continue;
      const callee = init.callee;
      if (!t.isIdentifier(callee) || !styledLocals.has(callee.name)) continue;

      const [componentArg, configArg] = init.arguments;
      if (componentArg === undefined || !t.isIdentifier(componentArg)) continue;
      let underlying = primitiveBindings.get(componentArg.name);
      // Safe mode only flattens `styled(<primitive>, ...)`. A `styled(<styled>, ...)`
      // chain needs the inner config merged in - an aggressive-only step.
      if (underlying === undefined && !aggressive) continue;
      if (configArg === undefined || !t.isExpression(configArg)) continue;
      const config = evaluateStyledConfig(configArg);
      if (config === null) continue;

      let effectiveConfig = config;
      if (underlying === undefined) {
        // Deeper wrapper flatten: the component arg is another styled local.
        // Resolve through it and merge bases, but only when both levels are
        // base-only - merging variants across a chain is order-sensitive and
        // left to the runtime.
        const inner = out.get(componentArg.name);
        if (inner !== undefined && isBaseOnlyConfig(inner.config) && isBaseOnlyConfig(config)) {
          underlying = inner.underlying;
          effectiveConfig = mergeBaseOnlyConfigs(inner.config, config);
        }
        if (underlying === undefined) continue;
      }

      out.set(decl.id.name, { underlying, config: effectiveConfig });
    }
  }
  return out;
}

/**
 * Rewrite a `<MyStyled foo="bar" size="sm" />` call site into the
 * underlying primitive (`<Box />`) with the variant prop consumed and
 * the merged style props spliced in. Returns `false` when the call
 * site has dynamic variant values (resolver can't run); the caller
 * leaves the JSX alone in that case.
 *
 * Caller-supplied non-variant attributes stay on the JSX (they take
 * precedence over the merged config - same semantics as runtime).
 * When the caller has already set a style prop the config would also
 * set, the caller's value wins (the merged entry is dropped to avoid
 * duplicate JSX attributes).
 */
/**
 * Whether a JSX attribute's value is guaranteed to be defined at runtime -
 * i.e. it can soundly override a merged-config entry. A boolean shorthand
 * (`<X foo />`), a string literal, or an expression that statically evaluates
 * to a non-`undefined` literal qualifies. A dynamic expression (which might
 * be `undefined`) does not.
 */
function isDefinitelyDefinedAttrValue(
  attr: t.JSXAttribute,
  path: NodePath<t.JSXOpeningElement>,
): boolean {
  const value = attr.value;
  if (value === null) return true; // boolean shorthand → true
  if (t.isStringLiteral(value)) return true;
  if (t.isJSXExpressionContainer(value)) {
    const expr = value.expression;
    if (t.isJSXEmptyExpression(expr)) return false;
    const lit = evaluateLiteral(expr, path.scope);
    return lit.ok && lit.value !== undefined;
  }
  return false;
}

function applyStyledExpansion(path: NodePath<t.JSXOpeningElement>, styled: StyledBinding): boolean {
  const callValues: Record<string, unknown> = {};
  const consumedVariantAttrs = new Set<t.JSXAttribute>();
  const callerAttrNames = new Set<string>();
  const callerAttrs = new Map<string, t.JSXAttribute>();

  for (const attr of path.node.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      // Spread invalidates static resolution.
      return false;
    }
    if (!t.isJSXIdentifier(attr.name)) continue;
    const name = attr.name.name;
    callerAttrNames.add(name);
    callerAttrs.set(name, attr);
    if (!styled.config.variantNames.has(name)) continue;

    // Variant prop: must be a literal value to fold at compile time.
    const value = attr.value;
    let lit: { ok: true; value: unknown } | { ok: false } = { ok: false };
    if (value === null) {
      // `<X enabled />` → boolean true (matches React's JSX semantics).
      lit = { ok: true, value: true };
    } else if (t.isStringLiteral(value)) {
      lit = { ok: true, value: value.value };
    } else if (t.isJSXExpressionContainer(value)) {
      const expr = value.expression;
      if (!t.isJSXEmptyExpression(expr)) {
        lit = evaluateLiteral(expr, path.scope);
      }
    }
    if (!lit.ok) return false;
    callValues[name] = lit.value;
    consumedVariantAttrs.add(attr);
  }

  const merged = resolveStyledMergedProps(styled.config, callValues);
  if (merged === null) return false;

  // Soundness guard: when the caller sets the same style key the merged config
  // also sets, but the caller's value may be `undefined` at runtime
  // (`padding={cond ? 4 : undefined}`), we can't expand. The runtime styled()
  // drops an explicit `undefined` and falls back to the config value; a
  // compiled `<Box padding={cond ? 4 : undefined} />` has no fallback and
  // would render with no padding. Bail so the runtime resolves it correctly.
  for (const k of Object.keys(merged)) {
    if (!callerAttrNames.has(k)) continue;
    const attr = callerAttrs.get(k);
    if (attr !== undefined && !isDefinitelyDefinedAttrValue(attr, path)) return false;
  }

  // Build new attribute list: caller's non-variant attrs first (so
  // they appear in source order), with merged-config entries spliced
  // in for any name the caller didn't set. Caller wins on conflict.
  const remaining = path.node.attributes.filter(
    (attr) => !(t.isJSXAttribute(attr) && consumedVariantAttrs.has(attr)),
  );
  const mergedAttrs: t.JSXAttribute[] = [];
  for (const [k, v] of Object.entries(merged)) {
    if (callerAttrNames.has(k)) continue;
    const value = literalToJsxAttrValue(v);
    // Not representable as a literal attribute: leave the call site to the runtime.
    if (value === null) return false;
    mergedAttrs.push(t.jsxAttribute(t.jsxIdentifier(k), value));
  }
  // Place merged-config attrs first so caller's later entries override
  // at runtime - mirrors the runtime's `{ ...merged, ...passThrough }`
  // (caller wins).
  path.node.attributes = [...mergedAttrs, ...remaining];

  // Rewrite the JSX name to the underlying primitive. Closing tag
  // mirrors. Subsequent visitor logic (extractWeb, wrapper-stripping)
  // sees a regular primitive call site.
  renameJsxElement(path, styled.underlying.localName);
  return true;
}

/**
 * Build an object-property key node. Emits a bare identifier only when `k`
 * is a legal JS identifier; otherwise a quoted string literal. Keys that are
 * not valid identifiers - the real `2xl` breakpoint name, `--custom-prop`,
 * any digit-leading key - would produce unparseable output through
 * `t.identifier`, breaking the build (no try/catch on the native/Metro path).
 */
function objectKey(k: string): t.Identifier | t.StringLiteral {
  return t.isValidIdentifier(k) ? t.identifier(k) : t.stringLiteral(k);
}

export { PACKAGE_NAME };
export type { BailReason } from '@usemotif/compiler-core';
