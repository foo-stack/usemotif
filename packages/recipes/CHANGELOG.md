# @usemotif/recipes

## 1.6.0

### Minor Changes

- ddaef6e: Add `alertRecipe`, `bannerRecipe`, `chipRecipe`, `statRecipe`, and `statDeltaRecipe` to `@usemotif/recipes`. The kit's Alert, Banner, Chip, and Stat now take their styling from these recipes, the way Card and Badge already do. Their rendered output is unchanged.

## 1.5.0

## 1.4.0

## 1.3.0

### Patch Changes

- f008563: Declare internal peer dependencies as `workspace:^` rather than `workspace:*`.

  Changesets resolves `workspace:*` to the dependency's _exact_ current
  version, so any minor bump left the declared peer range and escalated every
  peer dependent to a major — which the fixed version group then carried to all
  17 packages. A single minor changeset produced a major release for the whole
  suite, and `onlyUpdatePeerDependentsWhenOutOfRange` could not prevent it.

  `workspace:^` resolves to `^<version>`, which a minor still satisfies, so
  minors stay minors. Genuine major bumps still propagate. Publish output is
  unchanged: both ranges are rewritten to concrete versions at publish time.

  Fixes #321

## 1.2.3

### Patch Changes

- usemotif@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [cf36d2f]
  - usemotif@1.2.2

## 1.2.1

### Patch Changes

- usemotif@1.2.1

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
