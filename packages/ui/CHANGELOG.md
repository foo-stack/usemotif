# @usemotif/ui

## 1.9.0

### Minor Changes

- bfe42c2: `collapsible={false}` on `Accordion.Root` keeps one item always open in single mode: the open item's trigger no longer closes it and is marked disabled (`aria-disabled` on web, `accessibilityState.disabled` on native). Collapsible stays the default.
- 41a5764: `Alert` gains `action` and `onDismiss`, rendered by the same trailing action slot and dismiss button as `Banner`.
- 7f00850: `badgeRecipe` gains a `dot` variant. The kit `Badge` adds `count` with `max` (above it the badge reads, for example, "99+"), `dot`, and a `label` that gives the badge an accessible name.
- 89ef075: `Breadcrumb` gains `maxItems`: past it, the middle crumbs fold into a `...` button that opens a menu of them. `onNavigate` routes a crumb picked from that menu, defaulting to `location.assign`.
- f9d9353: `cardRecipe` gains an `interactive` variant (pointer cursor, hover border and shadow, a focus-visible ring) for a card rendered as a link or button. The kit `Card` adds `Card.Header`, `Card.Body`, `Card.Footer` and `Card.Media` parts.
- 5b602d5: `Sparkline`, `LineChart`, `AreaChart` and `BarChart`: single-series charts on the cross-platform SVG primitives. Colours come from tokens (`$components.chart.color`, then `$colors.action.primary.bg`), and each chart is one image to assistive technology, labelled with its title and its values.
- 309f57d: `ColorPicker` takes `swatches`, preset colours shown as a keyboard-navigable radio group with the matching swatch checked. It also takes `eyeDropper`, which adds a button that picks a colour from the screen through the browser EyeDropper API, shown only where the browser supports it. On React Native the swatches render as pressable radios and there is no eyedropper. The kit ColorPicker themes both.
- 77db1ad: CommandPalette commands can open nested pages: a command with `children` shows them as a page with its own search, Backspace on an empty input or Escape goes back (the Android back button on native), and the new `CommandPalette.Breadcrumb` part shows the trail. The kit renders a themed breadcrumb. `Command.onSelect` is now optional, since a command with `children` does not need one.
- 7ef707d: Add `DataTable`: a `role="grid"` data table with sortable columns, single or multiple row selection, resizable columns, windowed rows for large data sets, and the grid keyboard model. Headless ships it unstyled; the kit ships a themed version. Web only for now.
- d850fb1: `FileUpload` takes `maxSize` and `maxFiles`, and an `onReject` callback that receives every refused file from a pick or drop with every rule it broke: `type`, `size` or `count`. A file counts against `maxFiles` only once it passes the type and size rules. One rule set applies on web and native, including to dropped files. Without `multiple`, extra files are now reported as `count` rejections instead of being dropped silently. The kit `FileUpload` passes all three through, and `FileRejection` and `FileRejectionReason` are exported.
- 5115958: `Chip` can be a filter toggle: with `selected`, `defaultSelected` or `onSelectedChange`, its label is a button with `aria-pressed`, and the remove button stays a separate target. `chipRecipe` gains a `selected` variant for the toggled fill.
- c3b14ff: `Stepper` takes `onStepChange`, which makes each step a button (a Pressable on React Native) reporting the id clicked, and `linear`, which allows going back to earlier steps but not skipping ahead. `renderStep` receives `selectable`. Without `onStepChange` the Stepper renders as before. The kit Stepper passes both props through.
- bf5611c: `keepMounted="activity"` on `Tabs.Panel`, `Dialog.Content` and `Drawer.Content`, and on `Show` and `Hide`, keeps hidden content mounted through React's `<Activity>`: its state survives, its effects pause, and its updates run at low priority. It is feature-detected, so on React before 19.2 the content unmounts as before. Native Dialog and Drawer render a React Native `Modal`, which cannot stay mounted while closed, so the prop is web-only there.
- c6b1d44: Add `Button` (the button recipe over `Pressable`) and `TextField` (the input recipe over an `<input>`, with `invalid` setting `aria-invalid`) to the kit.
- 9210451: The kit's display components render on React Native: a `react-native` export condition serves a native build with Card (and its parts), Badge, Alert, Banner, Chip, Spinner, Skeleton, Progress, ProgressCircle, Button and TextField. `@usemotif/ui` now depends on `@usemotif/core`, which `usemotif` already brings in.
- 6fc3a26: The kit's form controls render on React Native. Checkbox, Switch, Radio and RadioGroup take their headless twins' `value`, `defaultValue` and `onValueChange` on native; the rest keep their props. The web CSS the kit passes to headless parts is converted for native (token variables resolved, shorthands split), and web output is unchanged.
- 57a93e6: The kit's navigation and disclosure components render on React Native: Tabs, Accordion, Collapsible, Breadcrumb, Pagination, Stepper, Toolbar, NavigationMenu, TreeView and CommandPalette, plus Separator, Stat, EmptyState, Timeline and AvatarGroup. Links open with `Linking` on native, and Breadcrumb's `onNavigate` defaults to it there. Web output is unchanged.
- 78fa288: The kit's overlays render on React Native: Modal, AlertDialog, Drawer, Sheet, Popover, Tooltip, HoverCard, Menu, ContextMenu and the Toaster, over headless's native components. Text inside surfaces and menu items is wrapped in `Text` on native; web output is unchanged.
- f7f8db4: `modal={false}` on `Dialog.Root`, and so on Drawer, Sheet and the kit Modal, Drawer and Sheet, leaves the page usable while the dialog is open. It drops the background `inert` and scroll lock and `aria-modal`, uses a click-through layer around the surface, and removes the focus trap. Focus still moves in on open and back on close, and Escape and a press outside still close it. On React Native the dialog stays in RN's `Modal`, and `modal={false}` only stops marking it modal to assistive tech.
- 9b6bed7: Options take a `group`. Select, Combobox, Search, MultiSelect and Listbox wrap each consecutive run of a group in a `role="group"` labelled by its heading, which `renderGroupLabel` restyles. Options keep flat indexes, so keyboard navigation and type-ahead move straight through, and filtering drops empty groups. A grouped list renders every row instead of windowing. On React Native the options sheets show each heading above the first option of its group. The kit lists render themed headings.
- 658c058: An `Arrow` part for Popover, Tooltip and HoverCard: `Popover.Arrow`, `Tooltip.Arrow` and `HoverCard.Arrow`. It sits on the edge facing the trigger and points at the trigger's centre, moving to the other edge when the surface flips and staying on the trigger when it shifts. `computePosition` and `useFloatingPosition` report the arrow position as `arrow`. Headless arrows take `size`, `borderColor`, `borderWidth` and `style`. The kit's arrows match each surface. On React Native the part renders nothing. `FloatingArrowProps` is exported.
- 0971b08: Pagination gains `boundaries`, the count of pages always shown at each end, and an optional page-size part (`pageSize`, `pageSizeOptions`, `onPageSizeChange`, plus `renderPageSize` in headless). Changing the size reports the page that keeps the first item of the current page in view. The kit renders it as a themed select.
- d33aaec: Add `ProgressCircle`: a ring progress indicator with the same ARIA as `Progress`. A value fills the arc, `null` spins a quarter arc, and the spin stops under `prefers-reduced-motion`.
- c48c8f6: `Skeleton` gains `lines`: stacked text-line bars, one `em` of the font size tall (`$fontSizes.md` by default), with the last line shorter.
- 1b5f02d: `Alert` and `Banner` show an intent-matched icon from `@usemotif/icons` by default (`Info`, `CircleCheck`, `TriangleAlert`, `CircleAlert`; none for `neutral`). Pass `icon` to replace it or `icon={null}` to remove it. `@usemotif/ui` now depends on `@usemotif/icons`.
- 5bc0f7e: New `TagsInput`, an input that turns entries into tags. Enter or a delimiter (a comma by default) adds the typed entry, a paste adds every entry in it, and Backspace in an empty input removes the last tag; entries are trimmed and de-duplicated, and `validate` and `max` filter them. With `suggestions`, the input becomes the headless Combobox's input and a picked suggestion becomes a tag. It works on web and React Native, and the kit draws each tag as a removable `Chip`. `Chip` gains `removeLabel` to name its remove button.
- 7c72245: `Timeline` items take an `icon`, drawn in a ring in place of the marker dot, and `layout="alternate"` puts events on either side of the line from the `md` breakpoint up, falling back to one column below it.
- c1ebaa0: The web `Toaster` takes a `placement`: `'top'` and `'bottom'` centre the list, as on React Native, and four corner placements are web-only. The default stays `'bottom-end'`. Its default list pauses every toast's dismiss timer while the pointer is over it or focus is inside it, and resumes each with its remaining time. A new `renderToast(item, { dismiss })`, the signature React Native already has, renders each toast's content inside the default list. The kit `Toaster` now renders through it, so it gains placement, pausing, and the default list's swipe and exit handling.
- 3051f6e: `Tooltip.Provider` groups tooltips. Once one is showing, moving to another trigger in the group opens that tooltip at once and hides the first. The delay returns when no tooltip in the group has been open for `skipDelayDuration`, which defaults to 300ms. On React Native the Provider renders its children unchanged. The kit `Tooltip` namespace exposes it too.
- d75bb04: Add `MessagesProvider` and `useMessages` to translate every accessible label and placeholder motif writes itself, in headless, the kit and the primitives: landmark names, dismiss and remove buttons, list and picker messages, colour picker and date picker labels, the password toggle and the rest of `MotifMessages`. English stays the default, nested providers layer, and a component's own prop still wins. Pagination's previous and next buttons now have accessible names, and MultiSelect's remove button names its option.

### Patch Changes

- 06bd980: `parseColor`, `formatColor` and the `ColorFormat` type, documented on the headless ColorPicker page, are now exported from `@usemotif/headless`; the barrel had never listed them. `@usemotif/ui` exports the `BadgeProps` type.
- Updated dependencies [7f00850]
- Updated dependencies [d1eaf9d]
- Updated dependencies [f9d9353]
- Updated dependencies [81d9cbf]
- Updated dependencies [fa19dce]
- Updated dependencies [f0f6896]
- Updated dependencies [ea26ae5]
- Updated dependencies [5115958]
- Updated dependencies [092aaf6]
- Updated dependencies [cf1df67]
- Updated dependencies [a6f1773]
- Updated dependencies [9e1c29d]
- Updated dependencies [32e3ec9]
- Updated dependencies [f844a0f]
- Updated dependencies [91ff720]
- Updated dependencies [82ff67b]
- Updated dependencies [a4e22e2]
- Updated dependencies [d8df809]
- Updated dependencies [dd77382]
- Updated dependencies [ae8fca9]
- Updated dependencies [b1459c0]
- Updated dependencies [d75bb04]
- Updated dependencies [26edfd6]
  - @usemotif/recipes@1.9.0
  - @usemotif/core@1.9.0
  - @usemotif/icons@1.9.0

## 1.8.0

### Minor Changes

- 08860b7: Combobox and Search support options fetched as the user types. `loading` on the root makes the list show `loadingMessage` (default "Loading...") while it has no options, and sets `aria-busy` on the web listbox; `filter={false}` shows `options` exactly as given, for results a server already matched. `onInputValueChange` already fires on every keystroke and is the hook to fetch from. Both work on React Native too. The kit's `Combobox` and `Search` pass through `loading`, `filter`, `inputValue`, `onInputValueChange`, `loadingMessage` and `emptyMessage`.
- 5d603cc: The web `ContextMenu` opens on a touch long-press as well as on right-click, as the React Native one already does. A touch held for `longPressDelay` (500 ms by default) opens the menu at the finger; moving more than 10 px, lifting, or a cancelled touch stops it, and the click a browser may send on release is swallowed. Mouse and pen input are unchanged.
- 1fc51a2: `Menu.CheckboxItem`, `Menu.RadioGroup` with `Menu.RadioItem`, and `Menu.Label`, with `ContextMenu` exposing the very same parts. The checkable items are `menuitemcheckbox` and `menuitemradio` with `aria-checked` and a `data-state` attribute, close the menu like `Menu.Item` unless `closeOnSelect` is `false`, and are arrow-key items; a `Label` is skipped. They work on React Native too. The kit draws a check or a dot in a fixed indicator column and exports `MenuCheckboxItemPropsThemed` and `MenuRadioItemPropsThemed`.
- f14dbb7: `Slider` and `RangeSlider` take `marks`, points along the track with optional labels, on web and React Native. Marks are hidden from assistive technology, flagged `data-active` on the web inside the filled range, and a string label becomes the value's `aria-valuetext` when the thumb sits on it. `RangeSlider` takes `orientation="vertical"`, placing its fill and thumbs from the bottom on the web and stacking its thumbs on native. The kit draws marks as ticks with labels and stands its RangeSlider upright when vertical. New type: `SliderMark`.
- 286d02b: `toast.promise(promise, { loading, success, error })` shows one toast that turns into the success toast, or an assertive error toast, when the promise settles, and returns the promise. `success` and `error` may be functions of the value or the error. It works on web and React Native, and through the kit's `useToast`. The web `Toaster` also takes `maxVisible`, dropping the oldest toasts past it as native already does; it defaults to no limit on web. New types: `ToastFn`, `ToastContent`, `ToastPromiseMessages`.
- dd04d88: Toasts can be swiped away. A sideways drag, released more than 80 px from where it started or flicked faster than 500 px/s, dismisses the toast on web and React Native; anything less springs back. It is built on `useDrag`, keeps vertical scrolling on touch screens, and on the web leaves presses on a toast's own buttons and links alone. `Toaster` and the headless `Toast` take `swipeToDismiss`, default `true`; the kit's toasts get it with no change.
- 416a00c: `TreeView` loads children on demand and selects several nodes, on web and React Native and in the kit. A node marked `hasChildren` is a branch whose children `loadChildren(node)` fetches the first time it expands; while that is pending the node is `aria-busy` and `renderNode` gets `isLoading`, and a rejected load collapses the node so expanding retries. `selectionMode="multiple"` takes an array `value`, toggles a node on activation, and marks the tree `aria-multiselectable`; `TreeViewProps` keeps its shape and `MultiTreeViewProps` is new. In the kit, clicking a row's chevron now only toggles it instead of also selecting the row, and a loading branch shows "Loading".

### Patch Changes

- @usemotif/recipes@1.8.0

## 1.7.0

### Minor Changes

- e4e0b4b: `Calendar` and `DatePicker` take `mode="range"` to pick a start and an end date, in the headless components on web and React Native and in the kit. The value is a `DateRange`, `{ start, end }`, with `end` `null` until the second pick; a second pick earlier than the first swaps the two. Every day in the range is selected for assistive technology, and `renderDay` receives `isRangeStart`, `isRangeEnd` and `isInRange`. A range `DatePicker` stays open after the first pick, closes after the second, and labels the range with both dates. The kit paints the ends as selected and tints the days between. `CalendarProps` and `DatePickerProps` keep their shape; `RangeCalendarProps`, `RangeDatePickerProps`, `DateRange` and `CalendarDayInfo` are new exports.
- 381501c: `Menu.Sub`, `Menu.SubTrigger` and `Menu.SubContent` nest a menu inside a menu, and `ContextMenu` exposes the very same parts. On the web, ArrowRight, Enter or Space on a submenu trigger opens the submenu and focuses its first item; hovering or clicking opens it without moving focus; ArrowLeft or Escape closes only the submenu and returns focus to its trigger. Choosing an item at any depth closes the whole menu. On React Native a submenu expands inline within the menu sheet. `ContextMenu.Item` is now the same component as `Menu.Item`. The kit's Menu and ContextMenu gain themed `SubTrigger` (with a trailing chevron) and `SubContent`, and export `MenuSubTriggerPropsThemed`.

### Patch Changes

- @usemotif/recipes@1.7.0

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
