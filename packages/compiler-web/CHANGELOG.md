# @usemotif/compiler-web

## 1.9.0

### Minor Changes

- b463e7f: `atomic: true` compiles each static declaration to one shared `a-<hash>` class instead of an inline style. Declarations that override another on the same element (a shorthand and its longhand, a base value and its breakpoint or state value) keep the default output, so the cascade is unchanged. A new `css-size` benchmark measures it against the default output, StyleX and Panda; on that corpus it is not smaller, and the compiler page says so.
- ba8d7c6: `cache: true` (or a directory) keeps each module's compiled code, source map and extracted CSS on disk, keyed by its source, the compiler options and the compiler version, and replays them on the next build. Transforming 300 components went from 282 ms to 22 ms from the cache.
- f2a241f: Add `@usemotif/compiler-web/turbopack`, a loader that runs motif extraction under Turbopack, which runs loaders but not bundler plugins. Each module's extracted CSS is written to a content-hashed file and imported by the module, in `next dev` and `next build` alike. The loader ships as ESM and CommonJS.

### Patch Changes

- fa19dce: The compiler extracts literal `_before` and `_after` bags into `::before` and `::after` rules, so an element that uses them can still be stripped to a plain tag on web; a dynamic bag keeps the wrapper. The rules hash and print exactly as the runtime's do, because both now build them with `resolvePseudoElementBag`, which core exports.
- Updated dependencies [b463e7f]
- Updated dependencies [fa19dce]
  - @usemotif/compiler-babel@1.9.0

## 1.8.0

### Patch Changes

- @usemotif/compiler-babel@1.8.0

## 1.7.0

### Patch Changes

- @usemotif/compiler-babel@1.7.0

## 1.6.0

### Patch Changes

- 55e262b: Add an `onBail` option that reports each motif element the compiler left to the runtime: its file, line, column, element name, the reason (`dynamic-props`, `has-spread`, or why the wrapper had to stay), and the dynamic props. The bundler plugin and the Metro transformer pass it through. Setting it never changes the output.
- Updated dependencies [55e262b]
  - @usemotif/compiler-babel@1.6.0

## 1.5.0

### Patch Changes

- 79ae317: Stop `@usemotif/compiler-web` advertising a CommonJS entry it cannot provide.

  The package declared a `require` condition and a `main` field, but `unplugin`
  publishes a single ESM export and no CommonJS build, so
  `require('@usemotif/compiler-web')` threw ERR_REQUIRE_ESM from inside that
  dependency on any Node without `require(esm)`. The webpack guide documented that
  exact call, so the documented setup could not have worked there.

  The package is now ESM only and the guide shows an ESM config. Bundling the
  dependency instead was tried and rejected: it takes the output from 4.7 KB to
  139 KB and still fails at load, because unplugin reads `import.meta`, which has
  no meaning in a CommonJS bundle.

  Nothing goes from working to broken. A CommonJS consumer already crashed; it now
  gets a resolution error naming the package instead of a runtime error naming a
  file inside `node_modules`.

  `@usemotif/headless` has no behaviour change. Its compound components are now
  declared once, in the entry that assembles them, rather than also as an object
  in each component module. The objects had no consumers left beyond the package's
  own tests, which now exercise the entry, so they were testing a shape no
  consumer receives.

- cf149f6: Apply the writing rule across the repository.

  No behaviour changes and no API changes. Published bytes move, because JSDoc is
  emitted into `.d.ts` and the package descriptions and READMEs render on npm.

  Em dashes become hyphens, the ellipsis character becomes three dots, and en
  dashes in ranges become hyphens. A character standing alone inside quotes is
  left as it is: that is a symbol rather than punctuation, such as the
  indeterminate mark on a checkbox or the elision in a code sample.

  `yarn writing:check` now fails when one reaches tracked source, so this is a
  rule rather than a one-time sweep.

- Updated dependencies [cf149f6]
  - @usemotif/compiler-babel@1.5.0

## 1.4.0

### Minor Changes

- 9c1cd10: Remove the deprecated `@usemotif/compiler-swc` alias package.

  `@usemotif/compiler-swc` was renamed to `@usemotif/compiler-web` in v1.2.0 —
  the plugin is a Babel-based `unplugin`, never an SWC plugin, so the old name
  described the wrong toolchain. The old package stayed on as a thin alias that
  re-exported this one unchanged. It is now removed; `@usemotif/compiler-swc`
  stops receiving releases at 1.3.0.

  ```diff
  - import motifExtract from '@usemotif/compiler-swc';
  + import motifExtract from '@usemotif/compiler-web';
  ```

  The API is identical — the import specifier is the only change.

### Patch Changes

- @usemotif/compiler-babel@1.4.0

## 1.3.0

### Patch Changes

- Updated dependencies [991fcea]
  - @usemotif/compiler-babel@1.3.0

## 1.2.3

### Patch Changes

- @usemotif/compiler-babel@1.2.3

## 1.2.1

### Patch Changes

- @usemotif/compiler-babel@1.2.1

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

- Updated dependencies
  - @usemotif/compiler-babel@1.1.5

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
  - @usemotif/compiler-babel@1.1.4

## 1.1.3

### Patch Changes

- a18e3af: Deduplicate aggregated virtual CSS across modules. `generateBundle` concatenated every module's extracted CSS with no cross-module dedupe, so a rule extracted in two modules (the common case for a shared design system) shipped twice. The `m-<hash>` scheme makes identical rule content produce an identical single-line rule, so the aggregate now collapses duplicate rule lines through a Set (first-occurrence order preserved). CSS was already idempotent, so this is a size win, not a behavior change.
- Updated dependencies [dc8be6f]
  - @usemotif/compiler-babel@1.1.3

## 1.1.2

### Patch Changes

- Patch release rolling up 32 bug, security, and accessibility fixes from a full-codebase audit (issues #81–#111 and follow-up #143).

  Highlights: fixed a `Box` conditional-hook crash on style-prop toggles; `Show`/`Hide` now react to viewport resize; default themes ship the `durations`/`easings`/`animations` scales so the `animation` prop resolves; the compiler now matches the runtime's class output (pseudo-override lifting + canonical rule order); Calendar/TreeView keyboard navigation moves real DOM focus; Combobox/Select can be cleared to `undefined`; and `themeToCssBlock` escapes the theme name (CSS-injection hardening). Plus React-Native layout-animation/theme-persistence/loading-indicator fixes, numerous headless a11y fixes (Dialog, Menu/ContextMenu, HoverCard, NavigationMenu), and compiler/codemod/build-script robustness fixes. See the v1.1.2 release notes for the full list.

- Updated dependencies
  - @usemotif/compiler-babel@1.1.2

## 1.1.1

### Patch Changes

- Lockstep version bump — no functional changes. Released alongside the v1.1.1 patch so every `@usemotif/*` package stays on a single version line.
- Updated dependencies
  - @usemotif/compiler-babel@1.1.1

## 1.1.0

### Patch Changes

- @usemotif/compiler-babel@1.1.0

> Renamed from `@motif-js/compiler-swc` in v3 as part of the `@motif-js/*` → `@usemotif/*` consolidation.

## 1.0.2

### Patch Changes

- Version sync. No behavioral changes in this package; released alongside the cross-platform `Button` fixes ([#22](https://github.com/foo-stack/usemotif/issues/22)) for version uniformity across the workspace.

## 1.0.1

### Patch Changes

- **Corrected the package description.** `package.json` claimed an "SWC plugin wrapper"; the package is a universal `unplugin` running the Babel-based `@usemotif/compiler-babel` transform. Documentation only — no code change.
- **Tracks the `@usemotif/core` logical `px` / `mx` mapping.** Extraction now emits `paddingInline` / `marginInline` instead of physical left/right.

## 1.0.0

### Major Changes

- **Fresh v1.0.0 on the `@usemotif/*` scope.** No behaviour change in this package; bumped to track the workspace rebrand (renamed from `@motif-js/compiler-swc`). See the [v2 → v3 migration guide](https://usemotif.dev/migrating/v2-to-v3).

## 2.0.0

### Major Changes

- **v2 cut: package rename across the workspace.** No behavior change in this package; bumping the major together with the rest of the linked group to track the renames of `@motif-js/react-web` → `@motif-js/react` and `@motif-js/react` → `motif-js`. See the [v1 → v2 migration guide](https://usemotif.dev/migrating/v1-to-v2).

## 1.7.0

### Patch Changes

- Version sync with [@motif-js/core@1.7.0](../core/CHANGELOG.md#170). No behavioral changes in this package; released alongside the M-6 grid + transform style props for version uniformity across all `@motif-js/*` packages.

## 1.6.0

### Patch Changes

- Version sync with [@motif-js/core@1.6.0](../core/CHANGELOG.md#160). No behavioral changes in this package; released alongside the M-5 responsive cascade fix for version uniformity across all `@motif-js/*` packages.

## 1.5.0

### Patch Changes

- Version sync with [@motif-js/core@1.5.0](../core/CHANGELOG.md#150). No behavioral changes in this package; released alongside the M-4 container-query declaration props for version uniformity across all `@motif-js/*` packages.

## 1.4.0

### Patch Changes

- Version sync with [@motif-js/core@1.4.0](../core/CHANGELOG.md#140). No behavioral changes in this package; released alongside the M-3 display-prop additions for version uniformity across all `@motif-js/*` packages.

## 1.3.0

### Patch Changes

- Version sync with [@motif-js/core@1.3.0](../core/CHANGELOG.md#130). No behavioral changes in this package; released alongside the chrome-tier additions for version uniformity across all `@motif-js/*` packages.

## 1.2.0

### Patch Changes

- Version sync with [@motif-js/core@1.2.0](../core/CHANGELOG.md#120). No behavioral changes in this package; released alongside the runtime-emission additions for version uniformity across all `@motif-js/*` packages.

## 1.1.2

### Patch Changes

- **Closes [#5](https://github.com/foo-stack/motif-js/issues/5) — emit aggregated CSS as a virtual module asset.** Previously the unplugin's `transform` ran the babel extractor and pushed CSS chunks into an internal `aggregatedCss` array, but no hook emitted that array as a build artifact. The result: every Vite/Rollup/Webpack consumer got a working JSX rewrite but no CSS file — styles fell back to the runtime path silently.

  The fix wires three new hooks. `resolveId` claims the virtual id `virtual:motif-extract.css` (alias `motif-extract.css`); `load` returns a `/*!__motif_extract_placeholder__*/` sentinel so the bundler chunks it as a real CSS asset; `generateBundle` sweeps the bundle and substitutes the sentinel for the final aggregated CSS — by that point every `transform` has fired and `aggregatedCss` is complete. The two-phase trick avoids the load/transform race that would otherwise capture an empty CSS string.

  Consumers add one import to wire the asset into the bundle:

  ```ts
  // app/root.tsx (or main.tsx)
  import "virtual:motif-extract.css";
  ```

  Vite then chunks the CSS, hashes its filename, and (under React Router framework mode, Next, etc.) injects a `<link rel="stylesheet">` into the rendered HTML automatically.

## 1.1.1

### Patch Changes

- **Publish-pipeline fix.** v1.0.0 and v1.1.0 shipped with `workspace:*` strings unrewritten in their published `dependencies` because `scripts/publish.mjs` invoked raw `npm publish` instead of `yarn npm publish` (Yarn 4 only rewrites workspace deps when going through its own publish command). Both broke installs with `EUNSUPPORTEDPROTOCOL`. v1.1.1 ships with the script fixed; published manifests now resolve `workspace:*` to concrete versions.

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

### Patch Changes

- Updated dependencies [8ac4dd5]
  - @motif-js/compiler-babel@1.0.0

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

### Patch Changes

- Updated dependencies [a63a59b]
  - @motif-js/compiler-babel@0.3.0

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
