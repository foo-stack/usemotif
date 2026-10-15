# @usemotif/migrate

## 1.9.0

### Minor Changes

- e4e9911: Add `import-tokens`, which turns a W3C Design Tokens file into a typed `createTheme` module. Each token lands in the motif scale its type names, aliases become `$`-references so the file's primitive and semantic layers carry over, and composite types with no single scale are skipped with a warning. `designTokensToTheme` and `printThemeModule` expose the same conversion to code.
- 7ee32db: Add `from-styled-components` and `from-tamagui` codemods. They parse each file and convert what maps directly: static styled-components templates become `styled()` configs with state props, and Tamagui imports, state props and `styled()` configs move to motif. What they can't convert stays in place under a `// usemotif-migrate:` comment that says why, and the CLI reports how many each file has left.

### Patch Changes

- 81d9cbf: `usemotif-icons build` strips SVG comments until none are left, so removing one cannot form another. The styled-components codemod strips CSS comments in linear time, where a string of unclosed `/*` used to take quadratic time.

## 1.8.0

## 1.7.0

## 1.6.0

## 1.5.0

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

### Minor Changes

- 9923951: `rename-v3` now redirects `@motif-js/compiler-swc` to `@usemotif/compiler-web`.

  Every other specifier is a 1:1 scope swap, so the bundler plugin used to come
  out of the codemod as `@usemotif/compiler-swc` — a package that no longer
  receives releases now that the alias is gone. A v2 consumer running the
  codemod landed on a dead name through no fault of their own.

  ```diff
  - import motifExtract from '@motif-js/compiler-swc';
  + import motifExtract from '@usemotif/compiler-web';
  ```

  Handled as a whole-specifier remap, which is safe because neither package ever
  exposed a subpath export.

  Also fixes the hand-rolled `perl` fallback in the v2 → v3 migration guide. Its
  `@motif-js` and `@usemotif` sigils were unescaped, so perl read them as array
  interpolations and expanded them to nothing — the one-liner rewrote every
  import to `@motif/<name>` instead of `@usemotif/<name>`.

## 1.3.0

## 1.2.3

## 1.2.1

### Patch Changes

- Stop the codemod from following symlinks out of the target directory, and
  correct `rename-v2`'s documentation.

  The file walker no longer follows symbolic links that resolve outside the
  directory it was pointed at, so running the migration can't reach and rewrite
  files elsewhere on disk. `rename-v2`'s description no longer claims it touches
  import specifiers only — it also rewrites the matching identifiers.

## 1.2.0

### Minor Changes

- Version bump to keep the workspace aligned for the 1.2.0 release.

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

- c56dddd: Fix Markdown fence parsing in the codemod scoper. The fence matcher only understood exactly-three-character fences, so a 4+-backtick block (which CommonMark allows precisely so it can contain a ``` example) — or a longer-tilde fence — matched only up to the first inner triple fence, leaving the real code unrewritten and mis-bucketing the trailing prose. A length-aware line scanner now matches an opener of N≥3 fence chars and a close of at least N of the same char.

## 1.1.2

### Patch Changes

- Patch release rolling up 32 bug, security, and accessibility fixes from a full-codebase audit (issues #81–#111 and follow-up #143).

  Highlights: fixed a `Box` conditional-hook crash on style-prop toggles; `Show`/`Hide` now react to viewport resize; default themes ship the `durations`/`easings`/`animations` scales so the `animation` prop resolves; the compiler now matches the runtime's class output (pseudo-override lifting + canonical rule order); Calendar/TreeView keyboard navigation moves real DOM focus; Combobox/Select can be cleared to `undefined`; and `themeToCssBlock` escapes the theme name (CSS-injection hardening). Plus React-Native layout-animation/theme-persistence/loading-indicator fixes, numerous headless a11y fixes (Dialog, Menu/ContextMenu, HoverCard, NavigationMenu), and compiler/codemod/build-script robustness fixes. See the v1.1.2 release notes for the full list.

## 1.1.1

### Patch Changes

- Lockstep version bump — no functional changes. Released alongside the v1.1.1 patch so every `@usemotif/*` package stays on a single version line.

## 1.1.0

### Patch Changes

- Version sync. No behavioral changes in this package; released alongside the motion-system roadmap across the rest of the `@usemotif/*` packages.

> Renamed from `@motif-js/migrate` in v3. The CLI bin renamed from
> `motif-js-migrate` to `usemotif-migrate`. The `rename-v2` transform
> is kept for back-compat; the new primary command is `rename-v3`.

## 1.0.2

### Patch Changes

- Version sync. No behavioral changes in this package; released alongside the cross-platform `Button` fixes ([#22](https://github.com/foo-stack/usemotif/issues/22)) for version uniformity across the workspace.

## 1.0.1

### Patch Changes

- **Version bump only.** No changes in this package; bumped to keep the linked `@usemotif/*` group on a single version.

## 1.0.0

### Major Changes

- **Fresh v1.0.0 on the `@usemotif/*` scope (renamed from `@motif-js/migrate`).** Bin renamed from `motif-js-migrate` → `usemotif-migrate` to match the new package name.
- **New `rename-v3` transform.** Rewrites v1 OR v2 import specifiers to their v3 (`@usemotif/*`) names in one pass. The regex is a single alternation: `@motif-js/react-web` → `@usemotif/react`, every other `@motif-js/<name>` → `@usemotif/<name>`. Subpaths (`@motif-js/react/server`, `@motif-js/react/tanstack-virtual`) survive — the renamed DOM bindings package still owns those exports under `@usemotif/react`.
- **The `@motif-js/react` ambiguity.** `@motif-js/react` was the cross-platform aggregator in v1 and the DOM bindings in v2; `rename-v3` always maps it to `@usemotif/react` (the v3 DOM bindings). For v1 cross-platform code that needs the unscoped `usemotif` meta package instead, run `rename-v2` first to disambiguate, then `rename-v3`.
- **CLI changes.** `usemotif-migrate rename-v3 [path] [--dry-run]` is the new primary command. `rename-v2` retained for back-compat (v1 holdouts who want to go v1 → v2 → v3 in two steps). HELP text updated.
- **Programmatic API.** `applyRenameV3` and `needsRenameV3` exported alongside the v2 functions.

## 2.0.0

### Major Changes

- **Initial release.** New workspace package providing the `rename-v2` codemod for migrating v1 import specifiers to their v2 names. Both CLI (`npx @motif-js/migrate rename-v2`) and programmatic (`applyRenameV2`, `needsRenameV2`) surfaces. Single-pass alternation regex rewrites `@motif-js/react-web` → `@motif-js/react` and bare `@motif-js/react` → `usemotif` in one walk, sparing `@motif-js/react-native` and subpath imports like `@motif-js/react/server`. Joins the linked-version group at 2.0.0.
