# @usemotif/recipes

## 1.9.0

### Minor Changes

- 7f00850: `badgeRecipe` gains a `dot` variant. The kit `Badge` adds `count` with `max` (above it the badge reads, for example, "99+"), `dot`, and a `label` that gives the badge an accessible name.
- f9d9353: `cardRecipe` gains an `interactive` variant (pointer cursor, hover border and shadow, a focus-visible ring) for a card rendered as a link or button. The kit `Card` adds `Card.Header`, `Card.Body`, `Card.Footer` and `Card.Media` parts.
- f0f6896: Token references accept fallback chains: `'$components.button.primary.bg ?? $colors.action.primary.bg'` resolves to the first alternative the theme defines, with a trailing literal as the default. On web a chain emits nested `var()` fallbacks. Themes gain an optional `components` scale, and every colour and radius in the recipes now reads `$components.<recipe>.<variant>.<prop>` before its semantic token, so a theme can restyle the kit without forking it. Strict token paths and the lint rule check the last alternative of a chain.
- 5115958: `Chip` can be a filter toggle: with `selected`, `defaultSelected` or `onSelectedChange`, its label is a button with `aria-pressed`, and the remove button stays a separate target. `chipRecipe` gains a `selected` variant for the toggled fill.

## 1.8.0

## 1.7.0

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
