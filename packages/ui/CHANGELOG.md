# @usemotif/ui

## 1.6.0

### Patch Changes

- 0f15ad0: `@usemotif/headless` exports `useControllableState`, the controlled-or-uncontrolled state hook its own components and the kit's `Select` now share. Pass `value`, `defaultValue` and `onChange`; pass `controlled` to keep `value={undefined}` controlled.
- ddaef6e: Add `alertRecipe`, `bannerRecipe`, `chipRecipe`, `statRecipe`, and `statDeltaRecipe` to `@usemotif/recipes`. The kit's Alert, Banner, Chip, and Stat now take their styling from these recipes, the way Card and Badge already do. Their rendered output is unchanged.
- Updated dependencies [ddaef6e]
  - @usemotif/recipes@1.6.0

## 1.5.0

### Minor Changes

- af404aa: Make every compound component renderable from a React Server Component.

  A client reference is a proxy that exposes named exports and nothing else, so
  reaching through one never worked: `Dialog.Root`, where `Dialog` was an object
  the client module exported, resolved to `undefined` and the render failed with
  an invalid element type. Every namespace in both packages had that shape, and
  the workaround was to wrap each use in a Client Component.

  Both packages now ship a directive-free entry over client code that carries the
  directive, and assemble their namespaces in that entry, so each property is
  itself a client reference and a valid element type on either side of the
  boundary. That covers all 17 namespaces in `@usemotif/headless` and all 7 in
  `@usemotif/ui`.

  Reuse between namespaces is resolved in the same place. `AlertDialog`, `Drawer`
  and `Sheet` share four of Dialog's parts, `Accordion` shares two of
  Collapsible's, `ContextMenu` shares Menu's separator, and `Select` and `Search`
  share Combobox's input and list. A shared part is the identical reference, not a
  copy.

  Nothing is added to or removed from either public surface. `Dialog.Root` and its
  peers stay the only documented way to reach a part, and the flattened parts the
  entries are built from are internal.

  Import cost falls, because a namespace built from plain bindings can be
  tree-shaken where an object of components could not. Importing one headless
  component drops by 14 to 24 percent depending on the component.

  Two components still cannot be rendered from a Server Component, for a reason
  unrelated to any of this: `CommandPalette` takes a `commands` array whose
  entries carry `onSelect`, and `MultiSelect.Chips` takes a `renderChip` callback.
  Functions cannot cross the boundary whatever shape the exports take.

  Consumers importing either package from a Client Component are unaffected.

### Patch Changes

- 1168d65: `Overlay` now isolates what is behind it.

  Background content is marked `inert` and `aria-hidden` while the overlay is
  open, and page scrolling is locked. These are the two WAI-ARIA modal
  requirements motif was missing: focus management (`trapFocus`, `captureFocus`,
  `restoreFocus`) already shipped, but a screen reader could still reach the page
  underneath and the background still scrolled.

  Both behaviours are on by default and independently opt-out:

  ```tsx
  <Overlay isolateBackground={false} lockScroll={false}>
  ```

  `Dialog`, `AlertDialog`, `Drawer`, `Sheet`, and `CommandPalette` compose
  `Overlay`, so they gain this with no code change on their side. `Popover`,
  `Menu`, `Tooltip`, `HoverCard`, and `ContextMenu` use `Portal` directly and are
  deliberately untouched: they are non-modal, and the page stays interactive and
  scrollable behind them.

  Details worth knowing:

  - Both effects are reference-counted, so a Dialog opened over a Drawer holds
    isolation until the outer one closes.
  - The scroll lock compensates for the removed scrollbar with matching
    `padding-right`, so locking does not shift the page.
  - `overflow: hidden` does not stop touch scrolling in iOS Safari, so a
    non-passive `touchmove` listener cancels the gesture unless it lands on
    something scrollable inside the overlay. Pinch-zoom is left alone.
  - A live region is never hidden, so toasts keep announcing while a modal is
    open.
  - Prior `inert` and `aria-hidden` attributes are restored rather than removed,
    and the release is idempotent so React strict mode's double cleanup in
    development cannot reveal the background early.

  Native is unaffected: `Portal` on React Native wraps `<Modal>`, which already
  isolates at the host-view level.

- cf149f6: Apply the writing rule across the repository.

  No behaviour changes and no API changes. Published bytes move, because JSDoc is
  emitted into `.d.ts` and the package descriptions and READMEs render on npm.

  Em dashes become hyphens, the ellipsis character becomes three dots, and en
  dashes in ranges become hyphens. A character standing alone inside quotes is
  left as it is: that is a symbol rather than punctuation, such as the
  indeterminate mark on a checkbox or the elision in a code sample.

  `yarn writing:check` now fails when one reaches tracked source, so this is a
  rule rather than a one-time sweep.

  - @usemotif/recipes@1.5.0

## 1.4.0

### Patch Changes

- 0d5c11b: Keep `'use client'` in the published output of `@usemotif/headless` and
  `@usemotif/ui`.

  Both packages carry the directive on their source files, but neither tsup config
  restored it after bundling, so it was absent from every `dist` artifact that
  shipped. Importing either package from a React Server Component failed the build
  rather than crossing a client boundary.

  ```
  Import traces:
    Server Component:
      ./node_modules/@usemotif/headless/dist/index.js
      ./app/page.tsx
  ```

  Only the barrel needs the directive. Both packages export a single `"."` entry,
  so the per-component entries and shared chunks below it cannot be addressed by a
  consumer, and the boundary the barrel declares covers everything reached through
  it.

  `yarn verify:publish` now reads each published entry back out of its tarball and
  fails when a client entry is missing the directive, when a server or native entry
  carries one it should not, or when an exports entry has not been classified at
  all. Adding a subpath export is therefore a deliberate decision rather than a
  silent regression.

  Note one limitation this does not remove: compound components exported as an
  object namespace (`Dialog`, `Popover`, `Menu`, and the rest) still cannot be
  rendered directly from a Server Component, because a client reference exposes
  named exports and `Dialog.Root` resolves to `undefined`. Use them from your own
  `'use client'` component.

  - @usemotif/recipes@1.4.0

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

- Updated dependencies [f008563]
  - @usemotif/recipes@1.3.0

## 1.2.3

### Patch Changes

- usemotif@1.2.3
- @usemotif/headless@1.2.3
- @usemotif/recipes@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [cf36d2f]
  - usemotif@1.2.2
  - @usemotif/headless@1.2.1
  - @usemotif/recipes@1.2.2

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

- Updated dependencies
  - @usemotif/headless@1.2.1
  - usemotif@1.2.1
  - @usemotif/recipes@1.2.1

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
