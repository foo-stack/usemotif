# @usemotif/core

## 1.8.0

## 1.7.0

### Minor Changes

- 35cd26c: Keyframe animations run on React Native. A `Box` whose `animation` is an object with a `keyframes()` result as its `name` now animates its stops on native, honouring `duration`, `delay`, `easing`, `iterationCount`, `direction`, `fillMode` and `playState`. Numbers, colours, same-unit lengths and matching `transform` lists interpolate; other values switch halfway, as in CSS. `Keyframe` objects now carry the definition they were built from as `frames`.

## 1.6.0

### Minor Changes

- 3fe366c: Define the spring and drag option types once, in `@usemotif/core`. `SpringConfig`, `DragAxis`, `DragConstraints`, `DragInfo`, `DragSpringConfig` and `UseDragOptions` are now exported from `@usemotif/core`, and `@usemotif/react` and `@usemotif/react-native` re-export the same types under the same names, so existing imports keep working.

## 1.5.0

### Minor Changes

- 2cfc425: Preserve the literal token shape through `createTheme`, and add the types that
  derive `$` references from it.

  `createTheme` returned `Theme & { readonly tokens: T }`. `Theme` already
  declares `tokens: TokenMap`, so the intersection was `TokenMap & T` rather than
  `T`, and `TokenMap`'s scales are `TokenScale`, which carries
  `[key: string]: TokenNode<V>`. That index signature put `string` back into
  `keyof`, collapsing any type derived from the result:

  ```ts
  const theme = createTheme({
    name: "app",
    tokens: { colors: { brand: { 500: "#3b82f6" } } },
  } as const);
  type P = Paths<(typeof theme)["tokens"]["colors"]>;
  //   before: string
  //   after:  'brand.500'
  ```

  The return type is now `Omit<Theme, 'tokens'> & { readonly tokens: T }`. It
  still satisfies `Theme`, so this is additive for callers.

  Three new exported types, all type-level with no runtime emit:

  - `Paths<T>` gives the dotted leaf paths of a token tree. A token whose value is
    itself a `$` reference is a leaf, not a path into what it points at.
  - `ScalePath<TTokens, S>` gives the `$`-prefixed references of one scale.
  - `KnownScaleName` names the 15 derivable scales. `animations` is excluded: it
    holds object leaves and resolves through `resolveAnimationToken` rather than
    the generic `$`-path walk.

  **Keep references scoped to a single scale.** A union of every scale's paths is
  both slower to typecheck and wrong: it admits cross-product nonsense like
  `$colors.4` and `$space.brand.500`.

  Nothing about style props changes yet. `p="$anything"` still compiles exactly as
  before; this release only makes the derivation possible.

- 7cdda63: Add opt-in rejection of `$` paths a theme does not contain.

  `MotifTypeOptions` is a second augmentation interface, separate from
  `MotifCustomTheme` on purpose: deriving autocomplete from a theme and rejecting
  a bad path are two decisions, and a consumer has to be able to make the first
  without the second.

  ```ts
  declare module "usemotif" {
    interface MotifCustomTheme extends AppTheme {}
    interface MotifTypeOptions {
      strictTokens: true;
    }
  }
  ```

  With the flag set, `<Box p="$nope" />` reports
  `Not a path in the 'space' scale: $nope`. Without it, nothing changes.

  Only a literal `$` string is checked, so raw CSS values, numbers, non-ASCII
  strings, and any value whose type is `string` all still compile. Reaching the
  literal requires a generic type parameter, so every component that accepts
  style props is now declared through `MotifComponent`, which resolves to the
  plain non-generic signature unless the flag is set. Consumers who do not opt in
  pay nothing.

  Pseudo bags (`_hover`), the responsive forms, and a `styled()` config's own
  style bags are deliberately not checked. Autocomplete still works inside all of
  them.

- 8635edc: Derive `$`-reference autocomplete from the consumer's own theme.

  `MotifCustomTheme` is a new interface a consumer extends with their theme via
  `declare module`. Once declared, every style prop offers the `$` paths of the one
  token scale it is bound to: `p` suggests `space` paths, `backgroundColor`
  suggests `colors` paths. Scales stay separate, which is both cheaper to
  type-check and more accurate than one union of every path.

  Permissive by design. Raw CSS values, numbers, and a `$` path the scale does not
  contain all still compile, so this is additive. An app that never augments keeps
  exactly the types it had.

  Also fixes two places where the token paths were being silently dropped from a
  prop's type. `Box`'s responsive props and `StateStyleBag` both wrapped their
  value in `NonNullable`, which is `T & {}`; that intersection reduces
  `(string & {}) | '$space.4'` back to a bare `string`, discarding every literal.
  The value stayed assignable either way, so nothing failed - the editor simply
  offered nothing. `yarn tokens:check` now fails if either regresses.

### Patch Changes

- cf149f6: Apply the writing rule across the repository.

  No behaviour changes and no API changes. Published bytes move, because JSDoc is
  emitted into `.d.ts` and the package descriptions and READMEs render on npm.

  Em dashes become hyphens, the ellipsis character becomes three dots, and en
  dashes in ranges become hyphens. A character standing alone inside quotes is
  left as it is: that is a symbol rather than punctuation, such as the
  indeterminate mark on a checkbox or the elision in a code sample.

  `yarn writing:check` now fails when one reaches tracked source, so this is a
  rule rather than a one-time sweep.

## 1.4.0

## 1.3.0

### Minor Changes

- 991fcea: Add opt-in CSS cascade layer support via `<ThemeProvider cssLayer>`.

  Motif emitted no `@layer` rules, so there was no way to place its styles below
  an existing stylesheet in the cascade. Base style props resolve to inline
  styles (`1,0,0,0`), which beat any host utility class (`0,1,0`) regardless of
  authoring order, and runtime-injected rules land in `document.head` after the
  bundled stylesheet — so neither specificity nor source order could express
  "the app's stylesheet wins". That blocked incremental adoption alongside
  Tailwind, where the established contract is the opposite.

  ```tsx
  <ThemeProvider themes={themes} active="dark" cssLayer="motif">
  ```

  ```css
  /* your stylesheet, loaded first — earlier layers lose */
  @layer motif, app;
  ```

  Setting `cssLayer` wraps everything Motif emits — the theme variable block,
  the runtime block, responsive and container at-rules, pseudo-state rules and
  `@keyframes` — in `@layer <name>`, and switches base style props from inline
  styles to a class, since inline styles cannot participate in a layer.

  A single layer is deliberate: inside it, specificity and source order still
  apply, so every existing base → responsive → pseudo relationship is preserved.
  Motif does not emit a layer _order_ statement — declare that yourself, or
  precedence would depend on which stylesheet reached the DOM first.

  Pass the same name to the compiler plugin (`cssLayer`), as with `breakpoints`
  — the layer is part of the generated class name, so a mismatch stops compiled
  and runtime rules deduplicating. The React Native provider accepts and ignores
  it; native has no cascade.

  Default behaviour is unchanged: with no `cssLayer`, emitted CSS and class
  names are byte-identical to before.

  Closes #319

### Patch Changes

- 6f03572: Resolve token keys that contain a dot, so the half-step spacing tokens work.

  `resolveToken` split a `$`-path on `.`, so `$space.1.5` looked up
  `space['1']['5']` and found nothing. The default `space` scale ships `0.5`,
  `1.5`, `2.5` and `3.5` (and `sizes` spreads them), so those four values were
  emitted as CSS variables and visible in the scale but unreachable by the
  syntax every other token uses — the declaration was simply dropped.

  This affected Motif's own primitives, not just consumer code: `Field` and the
  typography components use `gap="$1.5"` and `px="$1.5"`, and rendered with no
  gap or padding on both web and native.

  Adjacent all-digit segments are now merged into a single decimal key, and
  `tokenRefToCssVar` applies the same rule so the emitted `var(--space-1_5)`
  matches the name in the theme block. The merge runs only after the plain
  segment walk finds nothing, so every path that resolved before resolves to
  the same value now.

  Fixes #318

## 1.2.3

### Patch Changes

- 5928046: Align every published package on a single suite version

  The package group was configured as `linked`, which keeps changed packages on a
  shared version number but leaves untouched packages behind. Releases that
  happened to modify `@usemotif/core` cascaded a bump to nearly everything and so
  looked uniform; 1.2.2 touched only the React packages, and twelve packages
  stayed at 1.2.1.

  The group is now `fixed`, so every package moves together on every release and
  one version identifies the whole suite. This release carries no functional
  change to the packages it lifts — it exists to put them back on one number.

## 1.2.1

### Patch Changes

- 7ead388: Fix dead hover states across the kit, a neutral intent that could not invert per theme, and an
  illegible outline/ghost label. Warn on unresolvable token references.

  `@usemotif/ui` styled its hover / highlight / drag states with `$colors.surface.default`, a
  token no theme defines. Unresolvable references are dropped silently, so menu items, listbox
  options, calendar days, accordion triggers and pagination controls simply never changed
  background — with no error to explain why. The shipped themes gain `surface.interactive` for
  that job and the kit now references it. It is a distinct entry rather than a reuse of
  `surface.muted` because a panel is `raised`, and in the dark theme `raised` and `muted` resolve
  to the same primitive. Three call sites that wanted a form-control background rather than a
  hover fill (the `Select` trigger, the `Combobox` input, the `MultiSelect` chip container) now
  use `surface.raised`, and the idle `FileUpload` dropzone uses `surface.base` so it stays
  distinct from its dragging state.

  `Button` and `IconButton` mapped `intent="neutral"` to primitive `gray` ramp steps. A ramp is
  theme-independent by definition, so the one intent that most needs to invert was the only one
  that could not — a neutral button rendered a light-grey fill with near-black text on a dark
  canvas. Both shipped themes gain `action.neutral`, and the intent now reads it. Themes without
  the group fall back to their own `gray` ramp, then to literals, so existing themes render
  exactly as before.

  The unfilled variants took their label colour from the intent's _fill_ token. That holds for
  the mid-tone intents but not for neutral, whose fill is a near-white tint: `outline` and `ghost`
  neutral buttons rendered at roughly 1.2:1 against a white page. Label colour now comes from a
  distinct `ink` role, which for neutral is `text.default`. The ghost hover tint moved from the
  `gray` ramp to `surface.interactive` for the same reason the fill did.

  Theme authors using `createTheme` should add `surface.interactive` and `action.neutral`; both
  degrade rather than break, but only the semantic groups invert between light and dark.

  `resolveToken` now emits a dev-only warning when a `$`-reference fails to resolve, naming the
  keys that _are_ available at the deepest path segment that resolved. Production builds
  tree-shake it away.

## 1.2.0

### Minor Changes

- Feature release.
  - **Rich variants and styled context.** `styled()` base, variants, and compound variants now carry interaction (`_hover`/`_focus`/`_checked`/…) and motion (`transition`/`enterStyle`/`exitStyle`) styles, deep-merged across layers. New `createStyledContext` flows a parent's variant props down to sub-components.
  - **Imperative responsive.** Public `useMedia()` and `useBreakpoint()` hooks on web and native, re-rendering only when a breakpoint boundary is crossed.
  - **Configurable breakpoints.** The five breakpoint widths are now customizable at build time — a compiler `breakpoints` option plus `<ThemeProvider breakpoints={…}>` / `configureBreakpoints()` at runtime, with `configureViewportBreakpoints()` for the headless layer. `Adapt`/`Show`/`Hide` also accept an explicit pixel width in place of a name.
  - **Compiler.** New opt-in `optimizationLevel: 'aggressive'` tier (static-spread inlining, static-ternary extraction, `useMedia` erasure to CSS) with byte-for-byte runtime parity; the conservative tier stays the default. `@usemotif/compiler-swc` is renamed to `@usemotif/compiler-web`; the old package remains as a deprecated alias.
  - **Animation.** A Web Animations API driver for off-main-thread, interruptible enter and exit; unified driver selection across web and native; and asymmetric enter/exit timing.
  - **Adaptive UI.** The `Adapt` primitive shapeshifts a Dialog into a Drawer/sheet by breakpoint.
  - **Tokens.** A new soft-tint `status.{neutral,info,success,warning,danger}` intent group, with `Alert` refit to use it.
  - **New pseudo-states.** `_checked`, `_selected`, and `_expanded`.
  - **Components.** `@usemotif/recipes` (variant configs as data) and the `@usemotif/ui` kit, now around 50 themed, animated, adaptive components.

## 1.1.5

### Patch Changes

- Patch release rolling up the fixes from a second full-codebase audit (issues #209–#278), plus a follow-up ReDoS hardening.

  Highlights:

  - **core**: custom-property names and `@keyframes`/`:root` selectors are escaped against CSS injection; the `_disabled` pseudo no longer leaks as a global `:disabled` selector; own-property guards across token, variant, and responsive resolution.
  - **compiler**: JSX/`styled` references resolve by binding identity (scope-shadow safe) with hardened literal evaluation; extraction bails when static props/pseudo bags collide with a dynamic prop, when a sibling motion prop is dynamic, or when `styled()` caller props are possibly-undefined; the SWC plugin serves aggregated CSS in Vite dev.
  - **react**: SSR without a collector now throws instead of leaking CSS through process-global dedup; the default `<Link>` underline is emitted as a class rule so hover/focus win; `styled()` ignores an explicit `undefined` variant value (falls through to `defaultVariants`); `<Stack stagger>` no longer reads reduced-motion at render (no hydration mismatch); `<Blockquote>` honours a `fontStyle` opt-out.
  - **react-native**: corrected transform identity/axis interpolation, easing, and imperative pause/resume; web→native style translation for `textDecoration`, per-side border styles, viewport units, font stacks, and percentage translate; `@usemotif/icons` render on native, with fixed RN package resolution and native accessibility roles/labels; the presence boundary no longer remounts the subtree when an exit animation starts, so descendant state and scroll position survive a close. **Security**: removed a polynomial-ReDoS in the `vw`/`vh` viewport-unit regex.
  - **headless**: overlay/menu focus order, positioning, and ARIA wiring corrected (DOM-order keyboard nav, ref-merged triggers, gated `aria-controls`); forms/selection/date-picker correctness — Select keyboard operability, controlled clearing via `'value' in props`, file-drop `accept`/`multiple` filtering, `addMonths` day-clamp, slider snap relative to `min`, color-channel clamping, and toast de-duplication; default option, empty-state, toast, and nav-item renderers wrap bare strings in `<Text>` so native components no longer crash on first use.
  - **tooling**: the `rename-v2` codemod is idempotent (a rerun no longer corrupts renamed imports); `publish.mjs` gained a downgrade and unparseable-version guard, and `verify-version-bump` fails closed on an unclassifiable bump.

## 1.1.4

### Patch Changes

- Patch release rolling up 25 bug, accessibility, and cross-platform fixes from a full-codebase audit (issues #183–#207).

  Highlights:

  - **core**: unitless CSS props (`aspect-ratio`, `flex`, grid line props) now emit bare numbers instead of `1px`, restoring runtime/compiler output parity; fully space-delimited CSS Color 4 `rgba()`/`hsla()` (`rgb(255 0 0 0.5)`) parse for color interpolation; object-form value props such as `fontVariationSettings` are no longer mis-detected as responsive when a key collides with a breakpoint name.
  - **react**: a disabled `<Link>` no longer performs default browser navigation; `enterStyle` is no longer rendered during SSR (no FOUC, no hydration mismatch); `Avatar` falls back to initials for a cached/already-broken image; `useAnimate().finished` rejects on cancel per its documented contract; `ZStack` preserves each child's key; an orphaned `<Theme>` no longer re-renders every consumer each render.
  - **react-native**: a native style translator maps shadow tokens to native `shadow*`/`elevation`, array-izes literal `transform` strings, and drops web-only props; enter/exit animations interpolate toward each key's resting value (e.g. `opacity` → 1) instead of 0; native translate preserves percentage units.
  - **styled() (`usemotif`)**: `styled('button', …)` keeps the intended element type on React Native; an explicit `undefined` prop no longer erases a base/variant value.
  - **headless**: Popover closes on Escape when focus is on the trigger; DatePicker's trigger label updates in uncontrolled mode; nested NavigationMenu submenus collapse one level per Escape; MultiSelect detects a controlled value via `'value' in props`; Toast no longer double-announces; TreeView ArrowLeft climbs to the parent, the ColorPicker saturation/value plane is a slider with `aria-valuetext`, and FormatToggle gets roving-tabindex arrow-key navigation.
  - **compiler / build tooling**: extracted CSS aggregates in a deterministic order (reproducible builds); the literal extractor refuses to bake mutated `const` objects/arrays; query-suffixed module ids (`?v=`, `?used`) are transformed; a single malformed file no longer aborts the compile/codemod run; the tree-shaking check now fails when a target fails to bundle.

## 1.1.3

### Patch Changes

- 9d5bcf8: Two small correctness fixes. `parseResponsiveDSL` now coerces a value to a number only when the round-trip is lossless (`String(Number(raw)) === raw`), so DSL values like `md:09`, `md:050`, or `md:1.50` stay strings — matching the object/array syntaxes and preserving string token-key segments. Color interpolation now decides `rgb()` vs `rgba()` on the rounded alpha string, so an interpolated alpha of `0.9999` collapses to `rgb(…)` instead of emitting a fully-opaque `rgba(…, 1)`.
- ba954af: Escape emitted CSS values to close two style-injection holes. `themeToCssBlock` now escapes custom-property values (not just the theme name), so a token value containing `}`/`;`/`<` — common when tokens come from imported design-token JSON — can no longer break out of the rule block or the surrounding `<style>` element. The shared `stringifyDeclarations` (used by the web runtime, the compiler, and `@keyframes`) escapes values the same way, keeping runtime and compiler output byte-identical. `@font-face` `src`/`format`/`tech` and the freeform descriptors are likewise escaped to prevent `url('…')` quote-breakout. Legitimate values are unchanged and render identically.

## 1.1.2

### Patch Changes

- Patch release rolling up 32 bug, security, and accessibility fixes from a full-codebase audit (issues #81–#111 and follow-up #143).

  Highlights: fixed a `Box` conditional-hook crash on style-prop toggles; `Show`/`Hide` now react to viewport resize; default themes ship the `durations`/`easings`/`animations` scales so the `animation` prop resolves; the compiler now matches the runtime's class output (pseudo-override lifting + canonical rule order); Calendar/TreeView keyboard navigation moves real DOM focus; Combobox/Select can be cleared to `undefined`; and `themeToCssBlock` escapes the theme name (CSS-injection hardening). Plus React-Native layout-animation/theme-persistence/loading-indicator fixes, numerous headless a11y fixes (Dialog, Menu/ContextMenu, HoverCard, NavigationMenu), and compiler/codemod/build-script robustness fixes. See the v1.1.2 release notes for the full list.

## 1.1.1

### Patch Changes

- Lockstep version bump — no functional changes. Released alongside the v1.1.1 patch so every `@usemotif/*` package stays on a single version line.

## 1.1.0

### Minor Changes

- 6de6ff7: Add the text-flow style props — `whiteSpace`, `wordBreak`, `overflowWrap`, `hyphens`, `textOverflow` — to the typed style-prop surface. Previously rejected at the type level and silently dropped at runtime; the canonical single-line ellipsis triplet `whiteSpace: 'nowrap' / overflow: 'hidden' / textOverflow: 'ellipsis'` now flows through the resolver. Enum-string passthrough, no scale.
- 417e4ba: Add the `background-*` family — `background`, `backgroundImage`, `backgroundPosition`, `backgroundRepeat`, `backgroundSize`, `backgroundOrigin`, `backgroundClip`, `backgroundAttachment`, `backgroundBlendMode` — to the typed style-prop surface. Previously accepted by TypeScript via the `HTMLAttributes` widening but silently dropped at runtime, so gradient fills couldn't be authored without the `style={{ … }}` escape hatch. Pure pass-through (CSS-function-string values); no scale in v1.
- c98082a: Add transform shorthand style props — `x`, `y`, `z`, `rotate`, `rotateX`, `rotateY`, `rotateZ`, `scale`, `scaleX`, `scaleY`, `skew`, `skewX`, `skewY`. Each one composes into a single `transform` declaration at resolution time, so multiple shorthand props on the same Box merge into one canonical-order CSS `transform` (web) or RN transform-array (native).

  ```tsx
  // Static:
  <Box x={10} rotate={45} scale={0.9} />;
  // → web:    transform: translateX(10px) rotate(45deg) scale(0.9);
  // → native: transform: [{ translateX: 10 }, { rotate: '45deg' }, { scale: 0.9 }]

  // Motion-value driven (composes coalesced per frame):
  const x = useSpring(0);
  const rotate = useSpring(0);
  <Box x={x} rotate={rotate} />;
  x.set(100); // recomposes the entire transform; sibling axes preserved

  // Theme-resolved translate via the space scale:
  <Box x="$space.4" />;
  ```

  Canonical emission order is `translate → rotate → scale → skew` to match framer-motion (matrix multiplication is non-commutative, so the order is load-bearing). `x` / `y` / `z` use the `space` token scale; rotations and skews are unitless numerics treated as degrees by the composer.

  Literal `transform="..."` wins when set alongside shorthand — author-explicit override beats compositional intent; the shorthand is silently dropped on that element. Mixing requires composing into the literal manually.

  Motion-value integration: the 13 new props join `MotionValueWidenedProp` so each accepts a `MotionValue<number>`. The runtime treats axis MVs specially — multiple axes on one Box share the single `transform` slot, and the per-axis subscriber re-composes the whole `transform` string (web) or array (native) on every change instead of issuing per-axis writes that would clobber each other. The default `animatedDriver` keys one `Animated.Value` per axis and composes the RN array; the `noopDriver` snaps to the composed array; the `reanimatedDriver` composes on the JS thread (worklet-thread composition is a follow-up).

  New exports from `@usemotif/core`:

  - `composeTransformAxesWeb(axes)` — compose to a CSS `transform` string
  - `composeTransformAxesNative(axes)` — compose to RN's transform array
  - `TRANSFORM_AXIS_NAMES`, `TRANSFORM_AXIS_SET` — canonical-order list + membership set
  - `TransformAxis`, `TransformAxes`, `NativeTransformEntry` types

  Pseudo-state interop (`_hover={{ x: 5 }}`) works through the existing flat resolver — the same composer rewrites the pseudo bag's `transform` slot.

- 352e0e9: Real interpolation in `useTransform` for non-numeric output ranges — color and unit-matched strings now blend across segments instead of step-functioning at the boundary.

  ```tsx
  // Color: hex / rgb / rgba — interpolated in sRGB
  const heroColor = useTransform(
    scrollYProgress,
    [0, 1],
    ["#ff0000", "#0000ff"]
  );
  // At t=0.5 → 'rgb(128, 0, 128)'

  // Unit-matched length strings — strip unit, lerp, re-append
  const radius = useTransform(progress, [0, 1], ["8px", "16px"]);
  // At t=0.5 → '12px'

  // Mixed / unrecognised strings — still step at boundaries (v1 behaviour preserved)
  const display = useTransform(t, [0, 1], ["flex", "block"]);
  ```

  The output range is classified once at hook setup (memoised against array identity):

  - **`numeric`** — all entries are numbers; piecewise-linear lerp (unchanged).
  - **`color`** — all entries parse as hex (`#rgb` / `#rrggbb` / `#rrggbbaa`) or `rgb()` / `rgba()`. Interpolation is linear in sRGB; alpha interpolates too. Output collapses to `rgb(...)` when both endpoints are fully opaque.
  - **`unit-matched`** — all entries match the same CSS length unit (`'8px' / '16px'`, `'1rem' / '2rem'`, `'25% / '75%'`). The unit is stripped, the numeric part is lerped, the unit is re-appended.
  - **`step`** — anything else falls back to the segment's starting value (the v1 behaviour, unchanged).

  The classifier handles a mix of hex and `rgb()` in the same range (both parse as colors), but mixing colors with non-color strings, or mixing units (`'8px' / '1rem'`), drops to step.

  Out of scope for this PR (filed as separate follow-ups):

  - Token-string outputs (`'$colors.brand.red'`) — `useTransform` doesn't read the theme. Use the function form (`useTransform(source, (v) => …)`) with theme-aware logic in the meantime.
  - HSL / OKLab / OKLCh inputs.
  - Perceptually-uniform interpolation (OKLab) — v1 uses linear sRGB which can produce muddy mid-points for high-saturation hue shifts.

  New exports from `@usemotif/core`:

  - `classifyOutputRange(outputRange)` — returns `'numeric' | 'color' | 'unit-matched' | 'step'`
  - `interpolateOutputs(kind, low, high, t)` — interpolate a single segment via the classification
  - `OutputRangeKind` type

- 900176f: Add `target` + `offset` to `useScroll` — progress advances `0 → 1` as a specific element enters / exits the viewport (or scroll container). framer-motion-compatible offset shape.

  ```tsx
  // Web — pass any ref to the tracked element.
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"], // default
  });
  ```

  ```tsx
  // Native — useScrollTarget yields a { ref, onLayout } handle to spread
  // onto the tracked element so the hook can read its layout without
  // hopping the UI thread per scroll tick.
  const scrollRef = useRef<MotifScrollViewRef>(null);
  const target = useScrollTarget();
  const { scrollYProgress } = useScroll({ container: scrollRef, target });

  <ScrollView ref={scrollRef}>
    <Box ref={target.ref} onLayout={target.onLayout}>
      tracked
    </Box>
  </ScrollView>;
  ```

  Offset entries accept the keyword forms (`'start'`, `'center'`, `'end'`), percentages (`'25%'`, `'100%'`), and bare 0..1 fractions. Default offset is `['start end', 'end start']` — element-top entering viewport-bottom → element-bottom exiting viewport-top.

  Web also adds `ResizeObserver` plumbing so target-layout changes (font / image load, dynamic content) refresh the progress anchors without a scroll event.

- eac9df7: `useTransform` now resolves `$...` token references in its output range against the active theme at hook setup, so theme-aware color interpolation works directly without a manual `resolveToken` hop.

  ```tsx
  const heroColor = useTransform(
    scrollYProgress,
    [0, 1],
    ["$colors.brand.red", "$colors.brand.blue"]
  );
  ```

  - Token entries resolve to their literal theme values (`#ff0000` etc.); literal colors / unit strings / numbers pass through unchanged.
  - Unresolved tokens (typo, no theme in scope) pass through as the raw `$…` string and fall into the existing step-function fallback.
  - Resolved range is cached against `(outputRange identity, theme identity)`, so the classifier only walks the range when either flips.
  - Adds `resolveOutputRangeTokens(outputRange, theme)` to `@usemotif/core` as the shared helper.

- 6769ac7: `useTransform` color interpolation now recognises more formats and can interpolate in perceptually-uniform color spaces.

  **New parsed formats:** `hsl()` / `hsla()`, `oklab()`, `oklch()`, and the 148 CSS named colors (`red`, `steelblue`, `rebeccapurple`, etc.).

  **New `colorSpace` option** on the range form:

  ```tsx
  useTransform(progress, [0, 1], ["#ff0000", "#0000ff"], {
    colorSpace: "oklab",
  });
  ```

  - `'srgb'` (default) — linear lerp of 8-bit channels, same as v1.
  - `'oklab'` — perceptually uniform; saturated hue rotations stay vivid instead of muddying through grey.
  - `'oklch'` — same as `oklab` but interpolates hue along the shortest arc.

  Output is always emitted as `rgb()` / `rgba()` so every renderer accepts it without further work. Conversion math lives in the new `@usemotif/core` `color-spaces` module (uses Ottosson's OKLab matrices); also exports `parseColor`, `srgbToOklab`, `oklabToSrgb`, `interpolateInSpace`, and the `ColorSpace` / `ParsedColor` types.

- cef1dab: **Motion values** — a reactive animatable value primitive that lives outside React's render cycle.
  `createMotionValue(initial)` returns an object with `.get()`, `.set()`, and `.on('change', cb)`;
  `useMotionValue(initial)` and `useTransform(source, …)` are the React-facing hooks. On web, a
  `<Box opacity={mv} />` subscribes to `mv` and writes `element.style.opacity` directly when
  `mv.set(...)` fires — no React render. On native, motion values route through the active motion
  driver (`Animated.Value` for the default driver, Reanimated shared values when registered) so
  60fps updates bypass JS-thread reconciliation.

  `useTransform(source, inputRange, outputRange)` does piecewise-linear interpolation for numeric
  outputs and a step function for string outputs (token strings included; real colour interpolation
  is a follow-up). The function form `useTransform(source, transformer)` runs an arbitrary mapping.

  Motion-value-bound style props in v1 are: `opacity`, `width` / `height` (and `min*` / `max*`),
  `top` / `right` / `bottom` / `left` / `start` / `end`, `borderRadius`, `fontSize`, `zIndex`,
  and `transform`. The widening is additive — embedding a motion value inside a responsive object
  (`<Box opacity={{ base: mv, md: 1 }}>`) is rejected; consumers wanting per-breakpoint MV behaviour
  use `useTransform` to derive a value.

  Motion-value writes are imperative and bypass the `transition` prop (matching framer-motion). For
  eased writes on `.set()`, watch for a future `useSpring`. Drag (#25) and scroll-linked animation
  (#26) build on this primitive.

> Renamed from `@motif-js/core` in v3 as part of the `@motif-js/*` → `@usemotif/*` consolidation.

## 1.0.2

### Patch Changes

- Version sync. No behavioral changes in this package; released alongside the cross-platform `Button` fixes ([#22](https://github.com/foo-stack/usemotif/issues/22)) for version uniformity across the workspace.

## 1.0.1

### Patch Changes

- **RTL / logical layout support.** `px` / `mx` now map to the logical `paddingInline` / `marginInline` rather than physical left/right. Adds logical style props `ps` / `pe` / `ms` / `me`, `start` / `end` insets, and the `paddingInline*` / `marginInline*` / `insetInline*` long forms, plus a `Direction` type. Physical `pl` / `pr` / `ml` / `mr` / `left` / `right` remain as escape hatches.

## 1.0.0

### Major Changes

- **Fresh v1.0.0 on the `@usemotif/*` scope.** No behaviour change in this package; bumped to track the workspace rebrand (renamed from `@motif-js/core`). See the [v2 → v3 migration guide](https://usemotif.dev/migrating/v2-to-v3).

## 2.0.0

### Major Changes

- **v2 cut: package rename across the workspace.** No behavior change in this package; bumping the major together with the rest of the linked group to track the renames of `@motif-js/react-web` → `@motif-js/react` and `@motif-js/react` → `motif-js`. See the [v1 → v2 migration guide](https://usemotif.dev/migrating/v1-to-v2).

## 1.7.0

### Minor Changes

- **Grid layout style props.** Plain string-passthrough props for declaring grid containers and placing children: `gridTemplateColumns`, `gridTemplateRows`, `gridTemplateAreas`, `gridTemplate`, `gridColumn`, `gridColumnStart`, `gridColumnEnd`, `gridRow`, `gridRowStart`, `gridRowEnd`, `gridArea`, `gridAutoRows`, `gridAutoColumns`, `gridAutoFlow`, `placeItems`, `placeContent`, `placeSelf`. All participate in the responsive object / array / DSL syntax — `gridTemplateColumns={{ base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}` works unchanged. Native renderer accepts the props and emits nothing (RN's flexbox engine has no grid equivalent).

  ```tsx
  <Box
    display="grid"
    gridTemplateColumns={{
      base: "minmax(0, 1fr)",
      md: "220px minmax(0, 1fr)",
      lg: "244px minmax(0, 1fr) 220px",
    }}
    gap={{ base: 0, md: 40, lg: 56 }}
  >
    {/* … */}
  </Box>
  ```

- **`transform` and friends.** `transform`, `transformOrigin`, `transformBox`, `transformStyle`, `perspective`, `perspectiveOrigin`, `backfaceVisibility` are now first-class style props. String passthrough — accepts the full CSS `transform` value (`translateY(-1px)`, `scale(0.985)`, composed chains, `matrix(...)`, etc.). Composes with the existing `transition` / `_hover` / `_active` surfaces:

  ```tsx
  <Box transition="all 200ms ease" _hover={{ transform: 'translateY(-1px)' }} />
  <Pressable transform={{ base: 'none', md: 'scale(1)' }} _active={{ transform: 'scale(0.985)' }} />
  ```

- **Conformance harness gains `baseClassRule`.** `RendererOutput` now exposes a `baseClassRule` field carrying declarations from the bare `.<class> { … }` block emitted by 1.6's responsive cascade fix. `ConformanceCase` gains the matching `expectBaseClassRule` for tests that assert the new emit shape directly. Web adapters fold the base block into `style` (mirroring what visually renders at base viewport) so existing `expectStyle` assertions keep working.

## 1.6.0

### Minor Changes

- **Responsive prop overrides now win the cascade.** Previously the `base` slot of a responsive prop went into inline `style` (specificity 1,0,0,0) while breakpoint overrides emitted as class-scoped `@media` / `@container` rules (specificity 0,0,1,0). The inline value clobbered every override — `<Box display={{ base: 'none', md: 'flex' }} />` rendered as `display: none` at every viewport.

  Now: when a responsive prop has at least one non-`base` key, its `base` value emits as a class-scoped declaration (no at-rule wrapper) alongside its breakpoint overrides. All four levels (base, media, anonymous container, named container) sit at the same specificity, and CSS source order — emitted base-first — picks the winner. Inline `style` keeps non-responsive props and per-element `style={…}` overrides; nothing about its semantics changes.

  ```tsx
  <Box display={{ base: "none", md: "flex" }}>
    now correctly hides on mobile, shows at md+
  </Box>
  ```

  Internals: `ResolveResponsiveResult.atRules` may now contain entries with `atRule: ''` (the **base class block** sentinel). `buildAtRulesCss` emits these as bare `.<class> { … }` selectors. `hashAtRules` includes the empty-atRule entry in its serialization so two boxes with identical overrides but different bases get distinct class names. Compile-output and runtime emission stay byte-identical.

  No API change at the call site; the `{ base, sm, md, lg, xl, '2xl', '@<bp>', '@<name>.<bp>' }` syntax is unchanged. A responsive prop with only a `base` key (no overrides) still emits inline — saves a class-rule byte for the no-cascade-fight case.

## 1.5.0

### Minor Changes

- **`containerType` and `containerName` style props.** Plain string-passthrough props for opting an element into a CSS containment context that descendants can query. `containerType` accepts `'inline-size'` / `'size'` / `'normal'`; `containerName` accepts an arbitrary identifier so multiple named contexts can coexist. The `@<bp>` and `@<name>.<bp>` responsive-prop syntax already targets these contexts (shipped in 1.2 — the resolver work was always in place; this minor closes the loop by making the _declaring_ end ergonomic too).

  ```tsx
  // Declare the container.
  <Box containerType="inline-size" containerName="card">
    <Box p={{ base: "$2", "@card.md": "$4" }}>…</Box>
  </Box>
  ```

## 1.4.0

### Minor Changes

- **`fontVariationSettings` style prop with a typed object form.** Accepts the CSS string passthrough you'd write by hand (`"'opsz' 36, 'wght' 600"`), or a typed object keyed by OpenType axis tag — common axes (`opsz`, `wght`, `wdth`, `ital`, `slnt`, `GRAD`, `SOFT`) are typed for autocomplete; foundry-specific axes flow through the index signature. The resolver serializes the object to the CSS shorthand. Responsive object syntax works as well: `{ base: { wght: 380 }, md: { wght: 720, slnt: -6 } }` emits a base inline value plus a media-query override.

  ```tsx
  <Box fontVariationSettings={{ opsz: 36, wght: 600 }}>display heading</Box>
  // → font-variation-settings: 'opsz' 36, 'wght' 600;
  ```

  New exports: `FontVariationAxisSettings`, `serializeFontVariationSettings`. The `StylePropDefinition` schema gains an optional `serialize: (value: object) => string` hook so future shorthand-shaped props can plug into the same machinery without changing the resolvers.

- **`maskImage` / `WebkitMaskImage` / `clipPath` style props.** Plain string-passthrough props for visual masking and clipping. Pair `maskImage` with `WebkitMaskImage` at the call site for older-Safari coverage — the schema does not auto-emit the prefixed property to keep the resolver predictable. Web-only on the type level; the native renderer accepts the props and emits nothing (RN does not support either CSS property).

  ```tsx
  <Box
    maskImage="linear-gradient(to right, black 60%, transparent)"
    WebkitMaskImage="linear-gradient(to right, black 60%, transparent)"
    clipPath="polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)"
  />
  ```

## 1.3.0

### Minor Changes

- **`_before` / `_after` pseudo-element style props.** Same shape as `_hover` / `_focus` (any style prop accepted, plus `content`). Browsers require `content` for `::before` / `::after` to render — the runtime defaults it to `'""'` when omitted. Quote literal text in the value: `_before={{ content: '">"' }}` produces `content: ">"` in CSS. Selector emission piggybacks on the existing `buildPseudoCss` machinery, so identical bags hash to identical class names just like state pseudo rules.

  ```tsx
  <Box
    _before={{
      content: '"▸ "',
      color: "$colors.accent.base",
      fontWeight: "$bold",
    }}
    _after={{ content: '" ↗"', display: "inline-block" }}
  >
    nav item
  </Box>
  ```

  New exports: `PSEUDO_ELEMENT_PROP_NAMES`, `PSEUDO_ELEMENT_PROPS`, `PSEUDO_ELEMENT_SELECTOR`, `isPseudoElementProp`, `PseudoElementPropName`, `PseudoElementStyleBag`, `PseudoElementStyleProps`.

- **`keyframes(...)` helper** for `@keyframes`-driven animation. The pure `keyframesToCss(def)` returns `{ name, css }` with a stable hash-based name (`m-anim-<hash>`), so identical definitions across files dedupe to a single emitted rule. Token references inside step values (`$colors.fg.base`) resolve to `var(--…)`, so animation colors flip with the active theme.

  ```ts
  const spin = keyframes({
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  });
  ```

  New exports: `keyframesToCss`, `makeKeyframe`, `KeyframeDef`, `Keyframe`, `keyframeBrand`, `isKeyframe`. Use `keyframes(...)` from `@motif-js/react` (or `@motif-js/react-web`) to also handle the runtime-side `@keyframes` injection through the style cache.

- **`animation` prop accepts an object form.** The existing `animation: 'quick'` (theme `animations` token reference, expands to a CSS `transition`) is preserved unchanged. New object form `animation: { name, duration, easing, iterationCount, direction, fillMode, delay, playState }` assembles a CSS `animation` shorthand. Pass a `Keyframe` as `name` to drive the animation from a `@keyframes` rule (the renderer injects the rule once via the style cache, deduped by name).

  ```tsx
  <Box
    animation={{
      name: spin,
      duration: "1s",
      easing: "linear",
      iterationCount: "infinite",
    }}
  />
  ```

  New exports: `AnimationObject`, `AnimationValue`, `buildAnimationShorthand`, `extractKeyframeFromAnimation`. The native renderer accepts the object form and reads `duration` / `easing` for its entry-driver timing; the keyframes themselves don't run on native (RN has no `@keyframes`).

## 1.2.0

### Minor Changes

- **`createTheme` accepts `fonts`, `root`, and `reducedMotion`.** Three new optional fields drive web-side runtime emission from `<ThemeProvider>` (no-ops on native):

  - `fonts: FontFace[]` — `@font-face` declarations registered with the theme. Emitted once at the document root by `<ThemeProvider>`, deduped across themes by `(family, weight, style, src)`. Light + dark almost always reference the same assets, so registering on one theme is enough.
  - `root: ThemeRootStyles` — `body` and `::selection` resets (background, color, font-family, etc.). Token references like `'$colors.bg.base'` resolve via the CSS-variable cascade so a single declaration tracks the active theme automatically.
  - `reducedMotion: 'guard' | 'off'` — when any theme requests `'guard'`, motif emits a `@media (prefers-reduced-motion: reduce)` block that forces all animations and transitions to ~0ms. Default is no emission.

  ```ts
  import { createTheme } from "@motif-js/react";

  export const light = createTheme({
    name: "light",
    tokens: { colors: { bg: { base: "#fafafa" }, text: { primary: "#111" } } },
    fonts: [
      {
        family: "Inter",
        src: [{ url: "/fonts/inter.woff2", format: "woff2" }],
        weight: "400 700",
        display: "swap",
      },
    ],
    root: {
      background: "$colors.bg.base",
      color: "$colors.text.primary",
      fontFamily: "Inter, system-ui, sans-serif",
      selectionBackground: "$colors.accent.base",
    },
    reducedMotion: "guard",
  });
  ```

  New helpers `fontFacesToCss`, `rootResetsToCss`, `reducedMotionGuardCss`, and `themesRuntimeCss` are exported for users assembling stylesheets outside the React provider path.

## 1.1.2

### Patch Changes

- Version sync with [@motif-js/compiler-swc@1.1.2](../compiler-swc/CHANGELOG.md#112). No behavioral changes in this package; released alongside the compiler fix for version uniformity across all `@motif-js/*` packages.

## 1.1.1

### Patch Changes

- **Publish-pipeline fix.** v1.0.0 and v1.1.0 shipped with `workspace:*` strings unrewritten in their published `dependencies` because `scripts/publish.mjs` invoked raw `npm publish` instead of `yarn npm publish` (Yarn 4 only rewrites workspace deps when going through its own publish command). Both broke installs with `EUNSUPPORTEDPROTOCOL`. v1.1.1 ships with the script fixed; published manifests now resolve `workspace:*` to concrete versions.

## 1.1.0

### Minor Changes

- **`createTheme` factory.** A pass-through factory that narrows the `tokens` type so `$`-references against specific scales are typed in callers. Pairs with the existing `Theme` interface — themes are still plain objects, the factory just gives docs a single canonical construction path and gives users token-shape inference. Re-exported from `@motif-js/react`, `@motif-js/react-web`, and `@motif-js/react-native`.

  ```ts
  import { createTheme } from "@motif-js/react";

  export const light = createTheme({
    name: "light",
    tokens: {
      colors: { brand: { 500: "#C2410C" } },
      space: { 1: 4, 2: 8, 4: 16 },
    },
  });
  ```

## 1.0.0

### Minor Changes

- 8ac4dd5: **Primitives buildout.**

  35 new primitives ship on both renderers. Same prop schema, same
  behaviour where the platform supports it, deliberate divergence
  (with comments) where it doesn't. Every primitive composes the
  existing Box / Pressable / Text foundation, so theme + responsive

  - pseudo-state plumbing all flow through automatically.

  Layout: `ZStack`, `Spacer`, `Center`, `Wrap`, `AspectRatio`,
  `Grid`, `Flex`, `SafeArea`.

  Typography: `Heading` (level 1–6), `Paragraph`, `Code`, `Kbd`,
  `Blockquote` (with optional `cite`).

  Interaction: `Button` (full variant × intent × size matrix +
  loading / icon slots / fullWidth), `IconButton` (square Button +
  required a11y label), `Link` (`<a href>` web; `Linking.openURL`
  native; auto-injects `rel='noopener noreferrer'` on
  `target='_blank'`).

  Media: `Avatar` (image-with-initials fallback), `Icon` (token-
  sized SVG wrapper), `Svg` (typed primitive with Phosphor-friendly
  defaults). Plus a 12-icon starter set in `@motif-js/icons`: Plus,
  X, Check, ChevronUp / Down / Left / Right, Search, Trash, Heart,
  Star, ArrowRight. The full ~200-icon Phosphor-inspired set lands
  as a v0.4.x patch.

  Scroll & lists: `ScrollView` (direction / hideScrollbar),
  `Sticky` (web only — RN's `stickyHeaderIndices` integration is a
  follow-up), `VirtualList` (prop shape shipped; v0 renders non-
  virtualised so the eventual Virtuoso / FlashList integration is
  a drop-in).

  Forms: `Input`, `TextArea`, `NumberInput`, `PasswordInput` (all
  forwardRef'd; PasswordInput ships with a togglable eye), and the
  Field family — `Field` / `Label` / `FieldHelp` / `FieldError` /
  `Fieldset` — that auto-wires `aria-describedby` / `aria-invalid`
  / `aria-required` so callers get a11y right by default.

  Overlay & a11y: `Portal` (web `createPortal`, native `<Modal
transparent>`), `Overlay` (full-viewport scrim + tap-outside
  hook), `VisuallyHidden` (sr-only span web; zero-size accessible
  Box native), `LiveRegion` (`aria-live` / `accessibilityLiveRegion`),
  `FocusScope` (autoFocus + restoreFocus on mount/unmount; full
  Tab-cycling trap arrives with Dialog), and `Show` /
  `Hide` for declarative responsive visibility.

  Style-prop schema gains 17 new entries: `outline*` (5: outline,
  outlineStyle / Width / Color / Offset) for focus rings, and
  `border{Top,Right,Bottom,Left}{Width,Style,Color}` (12) for
  per-side border control needed by Blockquote and other
  typography accents.

  `@motif-js/react` re-exports the full primitive surface so
  cross-renderer apps import from a single package; package-field
  routing picks the right implementation per platform.

  What's not in this release:

  - **Real virtualisation** (Virtuoso / FlashList) for
    `VirtualList`. v0 renders every item; the prop shape is final
    so callers don't migrate when the integration ships.
  - **Native sticky headers via `stickyHeaderIndices`**. Native
    `Sticky` is a documented passthrough today.
  - **Real `react-native-svg` integration** for native `Svg` /
    `Icon`. v0 accepts a `SvgComponent` prop where callers can
    pass `Svg` from `react-native-svg`; the default is a sized
    Box that's useful for testing / emoji fallback.
  - **Tab-cycling focus trap** in `FocusScope`. v0 only
    autoFocuses + restoreFocuses; full Tab cycling lands with
    `Dialog` / `AlertDialog`.
  - **Full ~200-icon Phosphor-inspired set**. 12-icon starter
    ships now; the rest lands as a v0.4.x patch.

  Workspace test count: 469 → 491 passing + 3 skipped. New tests
  focus on Button (web 17 / native 8), layout extras (web 9 /
  native 8), typography (web 8 / native 7), IconButton + Link
  (web 10 / native 4), media (web 10), forms (web 10).

## 0.3.0

### Minor Changes

- a63a59b: **Compiler.**

  motif-js's progressive compiler ships. The runtime keeps working as
  before; opt-in compile-time extraction folds static motif call sites
  into baked `style` + `className` + at-rule CSS, and the runtime
  fast-paths the result. Compiled output is **byte-identical** to what
  the runtime would render, so half-compiled half-runtime apps dedupe
  to one set of `m-<hash>` classes rather than two.

  What's in:

  - **`@motif-js/compiler-core`** — the renderer-agnostic analysis
    layer. Babel-AST classifier (`classifyJsxAttributes`) splits each
    motif JSX call site into static / partial-static / dynamic;
    `evaluateLiteral` pulls compile-time values out of strings,
    numbers, negative numerics, no-substitution template literals,
    object/array expressions, and `const`-bound identifiers with
    literal initialisers. `extractWeb` produces the inline style +
    class name + at-rule CSS by reusing `@motif-js/core`'s
    `resolveResponsiveStylesToVars`, so compiler and runtime always
    agree. `extractNative` extracts literal-only base values; tokens
    and responsive overrides stay at runtime since theming + viewport
    are dynamic on native. Differential parity is proven against 15
    of the 18 cross-renderer standard cases (3 Pressable pseudo-state
    cases skipped — they need a separate extractor and land in a
    later release).

  - **`@motif-js/compiler-babel`** — the canonical Babel plugin (164
    code-only LOC). Walks JSX, drops consumed style props, merges
    baked `style` / `className` into any user-supplied attribute
    (user values win, mirroring the runtime's
    `{ ...baseStyle, ...inlineStyle }` merge). Aggregates per-file
    CSS through an `onCss` callback so host build tools can route
    it to a stylesheet output.

  - **`@motif-js/compiler-swc`** — universal bundler shim (107 LOC)
    via `unplugin@3`. Despite the package name it's not an SWC plugin
    (those have to be WASM); it exposes `vite` / `rollup` / `webpack`
    / `rspack` / `esbuild` / `farm` builders from one source, all
    routing to the canonical Babel pass. Layers BEFORE the host's
    SWC pass when used with Next or `@vitejs/plugin-react-swc`.

  - **`@motif-js/compiler-metro`** — Metro/Expo wrapper (41 LOC).
    Default-exports a function returning a `[plugin, options]`
    Babel-tuple ready to drop into `babel.config.js`'s `plugins`
    array. `target` defaults to `'native'`. Future StyleSheet
    hoisting will land here.

  - **Box fast-path** in `@motif-js/react-web`. After the babel plugin
    strips static style props, `rest` carries no style props, so
    `<Box>` early-returns a plain `createElement(as, ...)` instead
    of routing through the resolver + class-injection round-trip.
    Cascades to Stack / HStack / VStack / Text / Pressable since they
    all delegate to Box. The slow path is unchanged for
    runtime-only callers.

  - **Shared CSS-emission helpers** moved into `@motif-js/core`
    (`hashAtRules`, `buildAtRulesCss`, `stringifyDeclarations`, etc.).
    Both runtime and compiler consume the same source — the parity
    guarantee is structural, not aspirational.

  Performance, measured on a 200-Box render-heavy bench
  (`benchmarks/render`):

  - runtime: 1,096 hz (mean 0.91 ms / render). 1.00× baseline.
  - compiled: 1,895 hz (mean 0.53 ms / render). **1.73× faster**.
  - vanilla `<div>`: 2,303 hz (mean 0.43 ms / render). 2.10× faster
    (theoretical floor). Compiled closes 80% of that gap.

  What's not in:

  - Wrapper-stripping (replacing `<Box>` with `<div>` in compiled
    output) — would push compiled speedup higher. Open lever for a
    future release.
  - Pseudo-state extraction (`_hover` / `_focus` / `_active`) on
    Pressable — bring the 3 skipped differential cases into the
    passing set in a later patch.
  - Native StyleSheet hoisting in `compiler-metro` — currently the
    native target is a Babel-side no-op while the runtime keeps
    resolving styles. Future minor will hoist a single
    `StyleSheet.create({...})` per file.
  - Cross-library bench rows (Tamagui, NativeWind, Stitches) —
    legitimacy data, not a release gate.

## 0.2.0

### Minor Changes

- fc38fd6: **Native parity.**

  `@motif-js/react-native` reaches feature parity with the web renderer.
  The same prop schema, the same theming model, the same responsive
  shapes, the same container-query semantics — running on RN's
  `StyleSheet`, with theming via JS context, and container queries
  polyfilled via `View.onLayout`.

  The cross-renderer conformance suite (`@motif-js/test-utils`'
  `standardCases`) passes 18/18 against **both** renderers' adapters.
  "Same input → same resolved values" holds across the two trees.

  What's in:

  - **`@motif-js/react-native`** — `Box`, `Stack` / `HStack` / `VStack`,
    `Text`, `Pressable`, `Image`, `Container`, `ThemeProvider`,
    `<Theme name>`, `useTheme` / `useThemeName` / `useViewportWidth` /
    `useContainerInfo`. Same prop schema as `@motif-js/react-web`;
    literal-mode style resolution (no CSS variables — RN doesn't have
    a CSS cascade equivalent).
  - **Viewport-driven responsive resolution** — every responsive shape
    (object / array / DSL) resolves against the current viewport width
    via `Dimensions.addEventListener('change', …)`. Same mobile-first
    cascade as web. Re-renders on rotation / split-screen / window
    resize.
  - **Container-query polyfill** — `<Container name?>` measures itself
    via `View.onLayout`, exposes width via React context.
    `@<bp>` / `@<name>.<bp>` keys resolve against the matching
    container's width. `rateCapMs` prop tunes re-measure throttle
    (default 16ms = 1 frame; opt out with `0`).
  - **`@motif-js/test-utils`** — `RendererAdapter` contract is unchanged
    from v0.1; the native renderer ships its own adapter with the
    package's tests.

  What's not in:

  - Native renderer is published as JS source + types only — no
    pre-built dist for the native target (Metro transforms motif's
    source directly via the `react-native` field in `exports`).
  - Visual regression (Detox + Playwright) — deferred to v0.8+.
  - Bare RN demo app — Expo Router demo at `apps/playground-native`
    covers the same surface.
  - Compiler — still placeholder stubs.

## 0.1.0

### Minor Changes

- 8321b3e: **v0.1.0 — first public preview** (web-only).

  The initial npm publish. The web renderer is feature-complete;
  native and the compiler are placeholders. Treat as **pre-alpha** — APIs may
  shift before v1.

  What's in:

  - **`@motif-js/core`** — token resolver, style-prop schema, theme types,
    responsive (object / array / DSL), media + container queries.
  - **`@motif-js/react-web`** — Box, Stack, Text, Container, Pressable,
    Image. ThemeProvider with CSS-variable theming and nestable
    sub-themes. SSR collector with Sync + AsyncLocalStorage backends.
    Conformance + snapshot test infrastructure.
  - **`@motif-js/react`** — re-exports the web primitives + `styled()`
    factory (variants + compoundVariants).
  - **`@motif-js/tokens`** — opinionated default light / dark themes plus
    validation fixtures for Primer, Atlassian, and Material 3.
  - **`@motif-js/test-utils`** — `ConformanceCase` / `RendererAdapter`,
    `standardCases`, `assertConformance`, `motifMatchers`.
  - Stub packages (`react-native`, `compiler-*`, `primitives`, `forms`,
    `headless`, `icons`, `color`, `reset`) ship with package metadata but
    no runtime yet — placeholders for upcoming releases.

  What's not in:

  - Native renderer
  - Static compiler
  - Headless components and full primitives roster
