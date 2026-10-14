# usemotif

## 1.7.0

### Minor Changes

- 0e9d616: `useThemeChain()` works on React Native, returning the theme names from the root `ThemeProvider` down to the current scope as it does on web: `<ThemeProvider active="dark"><Theme name="red">` yields `['dark', 'red']`. `usemotif` now exports `useThemeChain` from both its web and native entries.
- fc9500a: `usemotif` now re-exports every name `@usemotif/react` and `@usemotif/react-native` both export, from both of its entries. Newly available: `useThemeSetting` and its types (`ThemeMode`, `ResolvedTheme`, `SyncStorage`, `UseThemeSettingOptions`, `UseThemeSettingResult`), `Direction`, `DirectionContext`, `useDirection`, `PresenceContext`, `usePresence`, `getMotionDriver`, `registerMotionDriver`, `useBreakpointWidths`, `registerVirtualListImpl`, `SVG_PRIMITIVES`, and the types `DirectionProps`, `MotionPhase`, `PresenceContextValue`, `ThemeContextValue`, `SvgPrimitives`, `VirtualListImpl`, `MotionValueWideningOf` and `MotionValueWidenedProp`. A test now fails if a shared name is missing from either entry.
- d93f805: `useContainerInfo()` on web returns the measured widths of the enclosing `Container`s, `{ nearestWidth, named }`, in the same shape as React Native. A `Container` measures only while something below it calls the hook, through a `ResizeObserver` that stops when the last reader unmounts. `usemotif` exports `useContainerInfo` and `ContainerContextValue` from both its web and native entries.

### Patch Changes

- Updated dependencies [35cd26c]
- Updated dependencies [0e9d616]
- Updated dependencies [d93f805]
- Updated dependencies [ab3361a]
  - @usemotif/core@1.7.0
  - @usemotif/react-native@1.7.0
  - @usemotif/react@1.7.0

## 1.6.0

### Minor Changes

- fbf4759: Add `useScrollTarget()` on web. It returns `{ ref, onLayout }` like the native hook, and web `useScroll({ target })` now accepts that handle as well as a plain ref, so scroll-linked code written for native runs unchanged on web. Web `Box` accepts `onLayout={undefined}` and never forwards it to the DOM.

### Patch Changes

- Updated dependencies [ddc08ae]
- Updated dependencies [3fe366c]
- Updated dependencies [a3f3d7c]
- Updated dependencies [fbf4759]
  - @usemotif/react@1.6.0
  - @usemotif/core@1.6.0
  - @usemotif/react-native@1.6.0

## 1.5.0

### Minor Changes

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

- Updated dependencies [1168d65]
- Updated dependencies [2cfc425]
- Updated dependencies [7cdda63]
- Updated dependencies [8635edc]
- Updated dependencies [017a665]
- Updated dependencies [cf149f6]
  - @usemotif/react@1.5.0
  - @usemotif/core@1.5.0
  - @usemotif/react-native@1.5.0

## 1.4.0

### Patch Changes

- @usemotif/core@1.4.0
- @usemotif/react@1.4.0
- @usemotif/react-native@1.4.0

## 1.3.0

### Patch Changes

- 726f848: Stop publishing `workspace:*` dependency ranges to npm.

  `changeset publish` shells out to `npm publish`, which ships Yarn's
  workspace protocol into the registry verbatim, so every install of an
  affected package failed with `Workspace not found`. The hand publish path
  already rewrote those ranges to concrete versions; the CI path did not, and
  1.2.2 and 1.2.3 went out through it. Both paths now share one conversion
  (`scripts/workspace-protocol.mjs`), and `yarn verify:publish` packs every
  package and asserts no `workspace:` range survives into the tarball.

  `peerDependencies` were affected as well as `dependencies` — `@usemotif/ui`
  shipped `usemotif: workspace:*` as a peer.

  Fixes #327

- Updated dependencies [6f03572]
- Updated dependencies [991fcea]
- Updated dependencies [f008563]
  - @usemotif/core@1.3.0
  - @usemotif/react@1.3.0
  - @usemotif/react-native@1.3.0

## 1.2.3

### Patch Changes

- Updated dependencies [5928046]
  - @usemotif/core@1.2.3
  - @usemotif/react@1.2.3
  - @usemotif/react-native@1.2.3

## 1.2.2

### Patch Changes

- cf36d2f: Export `styled()` and `createStyledContext()` from the platform packages

  `styled()` and `createStyledContext()` were implemented in the `usemotif`
  umbrella package and exported only from there. They are now implemented in
  `@usemotif/react` (web) and `@usemotif/react-native` (native), alongside the
  `Box` they render, and the umbrella re-exports them like every other symbol.

  This closes a gap for anyone following the READMEs' advice to install a
  platform package directly for a web-only or tree-shake-sensitive build: that
  path previously had no styled factory at all, since it was the one part of the
  API the umbrella did not pass through.

  `usemotif`'s public surface is unchanged — `import { styled } from 'usemotif'`
  continues to work and continues to resolve to the correct platform
  implementation via the `react-native` export condition. No migration is needed.

  Consumers importing directly from a platform package gain two new exports:

  ```ts
  import { createStyledContext, styled } from "@usemotif/react";
  // or
  import { createStyledContext, styled } from "@usemotif/react-native";
  ```

- Updated dependencies [d0148bd]
- Updated dependencies [a484292]
- Updated dependencies [cf36d2f]
  - @usemotif/react-native@1.2.2
  - @usemotif/react@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [f5b5b62]
- Updated dependencies [7ead388]
  - @usemotif/react-native@1.2.1
  - @usemotif/core@1.2.1
  - @usemotif/react@1.2.1

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
  - @usemotif/core@1.1.5
  - @usemotif/react@1.1.5
  - @usemotif/react-native@1.1.5

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

- Updated dependencies
  - @usemotif/core@1.1.4
  - @usemotif/react@1.1.4
  - @usemotif/react-native@1.1.4

## 1.1.3

### Patch Changes

- Updated dependencies [9d5bcf8]
- Updated dependencies [ba954af]
- Updated dependencies [e93baf1]
- Updated dependencies [cdd08ac]
- Updated dependencies [be72ce5]
- Updated dependencies [b0e2573]
- Updated dependencies [e23384f]
  - @usemotif/core@1.1.3
  - @usemotif/react@1.1.3
  - @usemotif/react-native@1.1.3

## 1.1.2

### Patch Changes

- Patch release rolling up 32 bug, security, and accessibility fixes from a full-codebase audit (issues #81–#111 and follow-up #143).

  Highlights: fixed a `Box` conditional-hook crash on style-prop toggles; `Show`/`Hide` now react to viewport resize; default themes ship the `durations`/`easings`/`animations` scales so the `animation` prop resolves; the compiler now matches the runtime's class output (pseudo-override lifting + canonical rule order); Calendar/TreeView keyboard navigation moves real DOM focus; Combobox/Select can be cleared to `undefined`; and `themeToCssBlock` escapes the theme name (CSS-injection hardening). Plus React-Native layout-animation/theme-persistence/loading-indicator fixes, numerous headless a11y fixes (Dialog, Menu/ContextMenu, HoverCard, NavigationMenu), and compiler/codemod/build-script robustness fixes. See the v1.1.2 release notes for the full list.

- Updated dependencies
  - @usemotif/core@1.1.2
  - @usemotif/react@1.1.2
  - @usemotif/react-native@1.1.2

## 1.1.1

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @usemotif/react@1.1.1
  - @usemotif/react-native@1.1.1
  - @usemotif/core@1.1.1

## 1.1.0

### Minor Changes

- 05c4fb1: Three drag improvements bundled together:

  **`dragElastic`** (closes #59) — rubber-band overshoot past `constraints`. `0` (default) clamps hard; values in `(0, 1]` scale the over-bound portion of the offset linearly, the canonical iOS-style over-scroll. Has no effect without `constraints`.

  ```tsx
  const { dragProps, x, y } = useDrag({
    constraints: { left: -100, right: 100 },
    dragElastic: 0.5,
  });
  ```

  **`dragMomentum` + `dragTransition`** (closes #58) — when `dragMomentum: true`, the released value continues with velocity-driven inertia and settles via a spring back into `constraints`. `dragTransition` tunes the settle spring (defaults `stiffness=200, damping=25, mass=1`). The spring also handles the elastic-return case (released past bounds while `dragElastic > 0`).

  ```tsx
  const { dragProps, x, y } = useDrag({
    constraints: { left: -100, right: 100 },
    dragMomentum: true,
    dragTransition: { stiffness: 300, damping: 30 },
  });
  ```

  **`drag` prop on `Box`** (closes #60) — declarative wrapper around `useDrag` with the full prop surface mirrored:

  ```tsx
  <Box
    drag // boolean | 'x' | 'y'
    dragConstraints={{ left: -100, right: 100 }}
    dragElastic={0.5}
    dragMomentum
    onDragEnd={({ offset }) => console.log(offset)}
  >
    drag me
  </Box>
  ```

  Internally `Box` dispatches to a wrapper sub-component that runs `useDrag` and binds its `x` / `y` motion values to the Box's transform shorthand. The drag pointer handler composes with any consumer-supplied `onPointerDown`. Native uses RN's PanResponder via the same hook; the panHandlers spread onto the underlying View.

- 3f50aea: Animate layout changes (FLIP) with the new `useLayoutAnimation` hook and a `layout` prop on `Box` that wires the hook for the declarative case.

  ```tsx
  // Declarative — most consumers want this:
  <Box layout>{children}</Box>
  <Box layout="position">{children}</Box>
  <Box layout="size">{children}</Box>

  // Hook for custom hosts:
  const { ref, onLayout, style } = useLayoutAnimation();
  <Box ref={ref} onLayout={onLayout} style={style}>…</Box>
  ```

  The hook returns a unified cross-platform shape: `{ ref, onLayout?, style? }`. Spread the relevant fields onto a Box (the `layout` prop does this internally). On web, the FLIP runs through `getBoundingClientRect()` inside `useLayoutEffect` — synchronous measurement before paint, inverse transform applied inline, then a `requestAnimationFrame` clears it under a CSS transition. On native, the FLIP runs through `onLayout` plus `Animated.timing` on four `Animated.Value`s (translateX / translateY / scaleX / scaleY) composed into `style.transform`; `useNativeDriver: true` keeps the interpolation off the JS thread on the default driver.

  Options:

  | Field      | Type                            | Description                                                                                                                               |
  | ---------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
  | `kind`     | `'all' \| 'position' \| 'size'` | Which axes to animate. Default `'all'`.                                                                                                   |
  | `duration` | `number` (seconds)              | Default `0.3`.                                                                                                                            |
  | `easing`   | `string`                        | Web: CSS easing function. Native: maps `linear`/`ease`/`ease-in`/`ease-out`/`ease-in-out` to RN's Easing curves. Default `'ease-in-out'`. |

  **Web FLIP** preserves the element's existing transform / transition / transformOrigin via save-and-restore around the animation, so layout animation doesn't leak into resting style.

  **Native FLIP** carries a one-frame visual delta between RN's layout commit and `onLayout` firing — for large layout deltas a brief flash is possible. Web's `useLayoutEffect` avoids this; RN has no synchronous equivalent. Most UI-scale layout changes (collapsing panels, resizing cards) are small enough that the flash isn't perceptible.

  Out of scope (separate follow-ups):

  - Shared-layout transitions (`layoutId` — morph-between-elements across mount/unmount).
  - Theme-token resolution for `duration` / `easing`.
  - Defined precedence rules between `layout` and `transform`-based `transition` / `animation` on the same element.
  - UI-thread native FLIP via Reanimated `useAnimatedReaction`.

- c5a3048: Add `useDrag` — general-purpose drag gesture hook for both web and native, composing with the existing motion-value surface.

  ```tsx
  const { dragProps, x, y, isDragging } = useDrag({
    axis: 'x',                                    // optional axis lock
    constraints: { left: -100, right: 100 },      // optional bounds
    onDragStart: ({ offset }) => console.log('start', offset),
    onDrag: ({ offset, velocity }) => …,
    onDragEnd: ({ velocity }) => …,
  });

  return <Box {...dragProps} x={x} y={y}>drag me</Box>;
  ```

  Returns:

  - `dragProps` — spread onto a `Box`. On web: `{ onPointerDown }`. On native: RN `panHandlers` bag.
  - `x` / `y` — `MotionValue<number>`s tracking the current offset. Compose with `useTransform`, `useSpring`, the transform-shorthand motion-value plumbing — drag offset → opacity / rotation / scale derives for free, no React render per move.
  - `isDragging` — boolean for affordance UI (cursor, shadow, etc.).

  Options:

  | Field                                  | Type                               | Description                                                |
  | -------------------------------------- | ---------------------------------- | ---------------------------------------------------------- |
  | `axis`                                 | `'x' \| 'y' \| 'both'`             | Lock to one axis. Default `'both'`.                        |
  | `constraints`                          | `{ left?, right?, top?, bottom? }` | Clamp offset bounds (pixels / DIPs). Each side optional.   |
  | `onDragStart` / `onDrag` / `onDragEnd` | `(info: DragInfo) => void`         | Lifecycle callbacks; `info` carries `offset` + `velocity`. |

  **Web** uses Pointer Events with `setPointerCapture` so drag tracks outside the element bounds. **Native** uses `PanResponder` on the JS thread (default driver); UI-thread tracking via Reanimated / `react-native-gesture-handler` is a follow-up.

  Out of scope for v1 (separate follow-ups):

  - Momentum / spring settle on release — pair with `useSpring` at the consumer site for now: `useSpring(0).set(0)` in `onDragEnd`.
  - `dragElastic` — rubber-band overshoot past constraints.
  - `drag` / `dragConstraints` props on `Box` — the prop-on-primitive surface; the hook is the primitive and consumers can wrap their own.
  - UI-thread native drag via the motion-driver registry.

- 6eb1a74: Add `useScroll` — scroll position as motion values that bypass React renders.

  ```tsx
  // Web — window scroll:
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Web — element scroll container:
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });
  <div ref={ref} style={{ overflow: "auto" }}>
    …
  </div>;

  // Native — bind to a motif ScrollView via ref:
  const ref = useRef<MotifScrollViewRef>(null);
  const { scrollYProgress } = useScroll({ container: ref });
  <ScrollView ref={ref}>…</ScrollView>;
  ```

  Returns four `MotionValue<number>`s: `scrollX`, `scrollY`, `scrollXProgress`, `scrollYProgress`. The `*Progress` values are `0..1` ratios of scroll position relative to the maximum scrollable distance on each axis. Compose with `useTransform` to drive parallax, scroll-linked opacity, sticky-reveal effects, and progress indicators.

  On native, the motif `<ScrollView>` now accepts a `ref` exposing a scroll publisher; `useScroll` subscribes through it. Consumer `onScroll` handlers still fire alongside.

  Out of scope for v1 (separate follow-up issue):

  - `target`-relative progress (element-into-viewport with `offset: ['start end', 'end start']` edge strings)
  - `ScrollTimeline` API path on web for off-main-thread updates

- 1795d1e: Add `useAnimate` — imperative animation controls scoped to a parent ref. Run animations from event handlers, sequence multiple animations with `await`, or target multiple descendants via CSS selectors.

  ```tsx
  const [scope, animate] = useAnimate();

  async function runIntro() {
    await animate(scope, { opacity: 1 }, { duration: 0.3 }).finished;
    await animate(".row", { x: 100 }, { duration: 0.4, delay: 0.1 }).finished;
  }

  return (
    <Box ref={scope}>
      {rows.map((r) => (
        <Row key={r.id} className="row" {...r} />
      ))}
      <Button onPress={runIntro}>Animate</Button>
    </Box>
  );
  ```

  `animate(target, keyframes, options?)` accepts:

  - **`target`** — the scope ref (animates the scoped root) or a CSS selector string (animates every element matching inside the scope). Multiple matches animate in parallel.
  - **`keyframes`** — a single style bag; the runtime animates from the element's current computed style to the provided values.
  - **`options`** — `{ duration, delay, easing }` — durations in seconds (matches framer-motion's convention); `easing` accepts any CSS timing function. Defaults: `0.3s`, `0`, `'ease-in-out'`.

  Returns `{ finished, cancel, pause, play }` — `finished` resolves when the animation settles so consumers can `await` sequences. Pause / play / cancel map to the underlying Web Animations primitives. In-flight animations cancel automatically on unmount.

  **Platform note:** `useAnimate` runs through the Web Animations API on web (off the main thread where supported). On native, v1 ships as a documented stub — calls log a one-time dev warning and resolve immediately. RN's pull-model architecture doesn't fit imperative animate cleanly without a driver-surface change; proper native imperative animation is a follow-up. Cross-platform consumers should drive props via `useSpring` (#34) or `useTransform` (#27) + motion-value-bound style props on `Box` for now.

  Out of scope here (filed as separate follow-ups):

  - Child staggering — declarative `stagger` prop on Stack / Box for staggered child entrances. The issue's open question whether to split was resolved as "split"; the stagger half tracks separately.
  - Native imperative animate via a `useImperativeAnimate` driver method (Reanimated `withTiming` / `withSequence`).
  - Theme-token resolution for `duration` / `easing` options — v1 accepts literal CSS values only.

- 99f46a9: Add `<Path>` with `pathLength` for SVG stroke-drawing animations. Cross-platform: web and native share the same surface.

  ```tsx
  import { Svg, Path, useMotionValue } from "@usemotif/react"; // or @usemotif/react-native

  function DrawingArrow() {
    const progress = useMotionValue(0);
    useEffect(() => {
      progress.set(1);
    }, []);
    return (
      <Svg viewBox="0 0 24 24">
        <Path d="M5 12h14M13 6l6 6-6 6" pathLength={progress} />
      </Svg>
    );
  }
  ```

  `pathLength` accepts a literal `number` in `0..1` or a `MotionValue<number>`. Internally motif emits SVG's intrinsic `pathLength="1"` on the underlying path along with `strokeDasharray="1 1"` and a `strokeDashoffset` that walks between hidden (`1`) and fully drawn (`0`) — so the same `0..1` range works regardless of the path's real geometry.

  Web maps to `<path>` directly. Native maps to `react-native-svg`'s `Path` when the peer dep is installed; degrades to `null` (under the existing `<Svg>` sized-Box placeholder) when it isn't.

  Reduced-motion handling stays consumer-side: branch on `useReducedMotion()` and pass `1` directly when reduced motion is on.

- 6de6ff7: Add the text-flow style props — `whiteSpace`, `wordBreak`, `overflowWrap`, `hyphens`, `textOverflow` — to the typed style-prop surface. Previously rejected at the type level and silently dropped at runtime; the canonical single-line ellipsis triplet `whiteSpace: 'nowrap' / overflow: 'hidden' / textOverflow: 'ellipsis'` now flows through the resolver. Enum-string passthrough, no scale.
- f3966c4: Add `lines` prop to `Text` — a typed, cross-platform line-clamp surface. On web it emits the canonical single-line ellipsis triplet (`white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis`) when `lines={1}`, or the `-webkit-line-clamp` set (`display: -webkit-box` + `-webkit-line-clamp: N` + `-webkit-box-orient: vertical` + `overflow: hidden`) when `lines>1`. On native it maps to `numberOfLines={N}` on the underlying RN `Text`. Replaces the per-consumer wrapper that web/native ports were authoring by hand.

  ```tsx
  // One typed prop, cross-platform:
  <Text lines={1}>This long string will truncate with an ellipsis.</Text>
  <Text lines={2}>This wraps to two lines then clamps.</Text>
  ```

  The line-clamp styles land via inline `style` on web, so consumer `style={{ … }}` overrides take precedence per-property — useful for opting out of an individual declaration on a specific instance.

- 417e4ba: Add the `background-*` family — `background`, `backgroundImage`, `backgroundPosition`, `backgroundRepeat`, `backgroundSize`, `backgroundOrigin`, `backgroundClip`, `backgroundAttachment`, `backgroundBlendMode` — to the typed style-prop surface. Previously accepted by TypeScript via the `HTMLAttributes` widening but silently dropped at runtime, so gradient fills couldn't be authored without the `style={{ … }}` escape hatch. Pure pass-through (CSS-function-string values); no scale in v1.
- d7d83cc: Add `useSpring` — a motion value whose `.set(target)` springs from the current value toward `target` over the spring's natural duration instead of snapping.

  ```tsx
  const x = useSpring(0, { stiffness: 200, damping: 18 });
  x.set(100); // springs from current to 100
  <Box style={{ transform: `translateX(${x.get()}px)` }} />;

  // Theme-aware config:
  const y = useSpring(0, "$animations.bouncy");
  ```

  The returned value is a `MotionValue<number>`, so it drops into every styled-primitive prop that already accepts a motion value — including `useTransform` for chaining and the existing motion-value bindings on `Box`. Mid-flight `.set()` smoothly redirects the spring without resetting velocity (the "drop the panel" / drag-release feel).

  Config is either a literal `SpringConfig` (`stiffness`, `damping`, `mass`, `restSpeed`, `restDistance`, `velocity`) or a theme-token name (`'bouncy'` or `'$animations.bouncy'`). Timing tokens and unknown names fall back to the default spring.

  Out of scope for v1 (separate follow-up):

  - Native driver acceleration — Reanimated `withSpring` / `Animated.spring` paths that take the spring off the JS thread. v1 ships a JS-thread `requestAnimationFrame` integrator on both platforms.

  Honour user reduced-motion preference at the consumer level — branch on `useReducedMotion()` (from `@usemotif/headless` or via `prefers-reduced-motion: reduce`) and bypass `useSpring` for an instant write when reduced motion is on.

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

- ed61344: Native `useSpring` now routes through the active motion driver when the driver implements `useSpringBacking`, moving the spring physics off the JS thread.

  - **`animatedDriver`** (default): backed by `Animated.spring`. Listener on the `Animated.Value` mirrors per-frame updates to motion-value subscribers.
  - **`reanimatedDriver`**: backed by `withSpring` on the UI thread. `useAnimatedReaction` + `runOnJS` bridges the shared value back to JS subscribers. JS-thread rAF integrator is used when the Reanimated peer isn't actually loadable, so the driver doesn't degrade harder than the default.
  - **`noopDriver`**: snaps to target (matches its no-animation contract).

  Drivers that don't implement `useSpringBacking` continue to drive the JS-thread `requestAnimationFrame` integrator that `useSpring` shipped with — same physics, same behaviour, no consumer changes needed.

  ```tsx
  import { useSpring } from "@usemotif/react-native";

  const x = useSpring(0, { stiffness: 200, damping: 18 });
  x.set(100); // spring math now runs on the driver's chosen thread
  ```

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

- f370a4a: Add a `stagger` prop to `Stack` (and `HStack` / `VStack`) for orchestrating per-child entry-animation delays.

  ```tsx
  <Stack stagger={0.05}>
    {items.map((item) => (
      <Box key={item.id} enterStyle={{ opacity: 0 }}>
        {item.label}
      </Box>
    ))}
  </Stack>
  ```

  Each direct child gets `index * stagger` seconds of delay added to its mount animation:

  - **Web** routes the delay through `transitionDelay` on the inline style, layered on top of the existing `transition` from each child.
  - **Native** forwards a new `delayMs` field on `MotionDriverEntryOptions`; `animatedDriver` and `reanimatedDriver` `setTimeout`-defer their animation kickoff; `noopDriver` honours it too for test determinism.

  Reduced-motion handling:

  - Web reads `(prefers-reduced-motion: reduce)` synchronously at render and collapses stagger to `0` when on.
  - Native v1 keeps reduced-motion gating consumer-side — branch on `useReducedMotion()` from `@usemotif/headless` and pass `0` when reduced motion is on. (Same policy the rest of motif's motion surface uses.)

  Children without `enterStyle` are unaffected. `stagger={0}` (or omitted) is a no-op — no context provider work, no per-child wrapping.

- 39126dc: Native `useAnimate` is now functional: replaces the v1 stub with a real driver-routed implementation.

  ```tsx
  const [scope, animate] = useAnimate();

  async function runIntro() {
    await animate(scope, { opacity: [0, 1] }, { duration: 0.3 }).finished;
    await animate(
      rowRef,
      { opacity: [0, 1], scale: [0.95, 1] },
      { duration: 0.4 }
    ).finished;
  }
  ```

  - New `useImperativeAnimate` optional method on `MotionDriver`. `animatedDriver` implements it: `Animated.Value` per (target × property), `Animated.timing` + `Animated.parallel`, per-frame `setNativeProps` writes to the target view.
  - Keyframes accept `[from, to]` tuples (explicit) or a single value (uses last-known cached value or a per-property identity default — `opacity: 1`, `scale: 1`, others fall back to the target value as the starting point on first call).
  - Returns the full `AnimationControls` shape (`finished` / `cancel` / `pause` / `play`).
  - Selector-string targets resolve to a no-op (RN has no `querySelectorAll`). Cross-platform code that relies on selectors should branch by platform.
  - Drivers that don't implement the method continue to fall back to the documented stub (immediate resolve + one-time dev warning).

- c91bd00: Add a `useDragBacking` seam on `MotionDriver` so native drag can opt into a UI-thread gesture pipeline. The default `animatedDriver` keeps the JS-thread `PanResponder` integrator; `reanimatedDriver` implements `useDragBacking` when both `react-native-reanimated` AND `react-native-gesture-handler` are loadable, wiring a `Gesture.Pan()` into shared values and bridging back to motion-value subscribers via `runOnJS`.

  ```tsx
  // App startup:
  import { registerMotionDriver } from "@usemotif/react-native";
  import { reanimatedDriver } from "@usemotif/react-native/reanimated";
  registerMotionDriver(reanimatedDriver);

  // Components — useDrag picks up the driver automatically:
  function Card() {
    const { Wrapper, dragProps, x, y } = useDrag({
      constraints: { left: -100, right: 100 },
      dragMomentum: true,
    });
    return (
      <Wrapper>
        <Box {...dragProps} x={x} y={y}>
          drag me
        </Box>
      </Wrapper>
    );
  }
  ```

  `useDrag`'s result now includes a `Wrapper` component. On the default driver `Wrapper` is a passthrough `Fragment` — consumer code keeps working unchanged. On the gesture-handler / reanimated path `Wrapper` is the required `<GestureDetector gesture={…}>` host. The canonical `<Wrapper><Box {...dragProps} … /></Wrapper>` pattern works uniformly under both drivers.

  `Box`'s declarative `drag` prop already wires this through internally; consumers don't need to touch the surface.

  If only one of the peers is installed, the driver omits `useDragBacking` and consumers transparently fall back to the JS-thread `PanResponder` integrator.

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

### Patch Changes

- ae6b56e: Add a dev-only warning when a `<Box>` has flex- or grid-only style props (`flexDirection`, `alignItems`, `gap`, …) set without an explicit `display="flex"` (or `inline-flex` / `grid` / `inline-grid`). `<Box>` defaults to `display: block`; in that mode the flex / grid props land on the element but have no effect — until now the only signal was the visual. Tolerates responsive `display` objects and arrays: if any breakpoint resolves to flex / grid, the warning skips. Dedups by `(elementType, sorted-triggering-props)` so re-renders don't flood the console. Tree-shakes in production.
- f7eb4c0: Fix the pseudo-state override cascade on `<Box>`. Previously, any base style prop emitted as **inline style** (specificity `1,0,0,0`) while pseudo-state rules emitted as `.class:state` (`0,1,1`) — inline always won, so declarations like `_disabled={{ boxShadow: 'none' }}` over a base `boxShadow="…"` never took effect. The bug was easy to miss because it bites the first prop a designer wants to _kill_ on a disabled / hovered / active surface (drop shadows, gradient fills) but is silent on `bg` and `color` only when the values happen to look indistinguishable.

  The fix: when a state-pseudo bag (`_hover`, `_focus`, `_active`, `_disabled`, `exitStyle`) overrides a base style prop, the base value is now lifted from inline style into the base class block (`.<class> { … }`, specificity `0,1,0`). The pseudo rule at `0,1,1` now wins per the spec.

  Pseudo-element rules (`::before` / `::after`) are NOT lifted — they target a different element and never compete with the parent's inline style.

  **SSR note**: consumers using `renderToString` / `renderToStaticMarkup` need an `SSRStyleCollector` in scope for class-block CSS to appear in the rendered HTML. This was already true for responsive props; it now extends to any Box with pseudo bags.

- e7bc1ad: Compose transform-shorthand motion values on the UI thread inside the Reanimated driver. Per-axis bindings now live under their own key in the driver's shared record (`x`, `y`, `rotate`, …) instead of being pre-composed into `transform` on the JS thread. The `useAnimatedStyle` worklet body walks an inline axis-order array and emits the RN `transform` array directly — no JS-thread round-trip per frame.

  When the Reanimated peer isn't loadable, the fallback path still uses the canonical JS-thread `composeTransformAxesNative` so the produced overlay matches what the default `animatedDriver` emits.

  ```tsx
  import {
    registerMotionDriver,
    Box,
    useMotionValue,
  } from "@usemotif/react-native";
  import { reanimatedDriver } from "@usemotif/react-native/reanimated";

  registerMotionDriver(reanimatedDriver);

  function Demo() {
    const x = useMotionValue(0);
    const rotate = useMotionValue(0);
    return (
      <Box x={x} rotate={rotate}>
        …
      </Box>
    ); // transform composed on the UI thread
  }
  ```

- Updated dependencies [05c4fb1]
- Updated dependencies [3f50aea]
- Updated dependencies [c5a3048]
- Updated dependencies [6eb1a74]
- Updated dependencies [1795d1e]
- Updated dependencies [99f46a9]
- Updated dependencies [6de6ff7]
- Updated dependencies [f3966c4]
- Updated dependencies [ae6b56e]
- Updated dependencies [417e4ba]
- Updated dependencies [d7d83cc]
- Updated dependencies [c98082a]
- Updated dependencies [352e0e9]
- Updated dependencies [f7eb4c0]
- Updated dependencies [900176f]
- Updated dependencies [ed61344]
- Updated dependencies [e7bc1ad]
- Updated dependencies [eac9df7]
- Updated dependencies [6769ac7]
- Updated dependencies [f370a4a]
- Updated dependencies [39126dc]
- Updated dependencies [c91bd00]
- Updated dependencies [cef1dab]
  - @usemotif/react@1.1.0
  - @usemotif/react-native@1.1.0
  - @usemotif/core@1.1.0

> Name history: `@motif-js/react` (v1, cross-platform aggregator) →
> `usemotif` (v2.0.0 onward; original v2 plan was unscoped `motif-js`,
> blocked by npm). v3 kept the unscoped `usemotif` name while
> consolidating the sibling packages from `@motif-js/*` to `@usemotif/*`
> and resetting the workspace to a fresh `1.0.0`. Entries dated **2.0.0
> and below** reference the historical `@motif-js/*` scope; the **1.0.0**
> entry below is the v3 cut.

## 1.0.2

### Patch Changes

- Re-exports the `1.0.2` renderers, which carry the cross-platform `Button` fixes ([#22](https://github.com/foo-stack/usemotif/issues/22)). No change to this package's own surface.

## 1.0.1

### Patch Changes

- **Version bump only.** Re-exports the linked `@usemotif/*` packages at v1.0.1 — RTL / logical layout, `prefers-reduced-motion` support, default border-width / letter-spacing token scales, the native `lineHeight` fix, and smaller icon imports. See the component packages for details.

## 1.0.0

### Major Changes

- **Fresh v1.0.0 on the `@usemotif/*` scope.** The unscoped `usemotif` meta package keeps its name; the 13 sibling packages move from `@motif-js/*` to `@usemotif/*`, anchoring a fresh v1 line on the new scope. v2 (`@motif-js/*@2.0.0`) and v1 (`@motif-js/*@1.7.0`) versions stay on npm with deprecation notices pointing at the v3 names. The runtime is unchanged; cross-platform routing via the `react-native` exports condition still picks `@usemotif/react` for Vite/Next/etc. and `@usemotif/react-native` for Metro. See the [v2 → v3 migration guide](https://usemotif.dev/migrating/v2-to-v3) or run `npx @usemotif/migrate rename-v3` for the mechanical rewrite.

## 2.0.0

### Major Changes

- **Renamed from `@motif-js/react` to `usemotif`.** This package was previously the platform-aware aggregator under the `@motif-js/react` npm name; v2 promotes it to an unscoped, top-level package. The original v2 plan was to ship as `motif-js`, but npm blocked that name at publish time as too similar to an existing `motif.js` package; the meta package landed on `usemotif`, matching the docs domain at usemotif.dev. The platform-routing logic (`react-native` exports condition picking the right renderer for the bundler) is unchanged. See the [v1 → v2 migration guide](https://usemotif.dev/migrating/v1-to-v2) or run `npx @motif-js/migrate rename-v2` for the mechanical rewrite.

## 1.7.0

### Minor Changes

- **Re-exports the M-6 grid + transform props.** `<Box>` and every other primitive accept the new grid-layout and transform style props from [@motif-js/react-web@1.7.0](../react-web/CHANGELOG.md#170). Native entry accepts the props and emits nothing (RN has no grid surface and treats `transform` via its own RN-specific `[{ translateY: -1 }, { scale: 0.985 }]` array form, not the CSS string).

## 1.6.0

### Minor Changes

- **Responsive prop overrides now win the cascade.** Cross-platform surface for the [@motif-js/react-web@1.6.0](../react-web/CHANGELOG.md#160) fix: when a responsive prop has at least one non-`base` key, the `base` value emits as a class-scoped declaration so the breakpoint overrides (already class-scoped) actually apply. Native entry is unaffected — the at-rule machinery is web-only.

## 1.5.0

### Minor Changes

- **Re-exports the M-4 container props.** `<Box>` and every other web primitive accepts `containerType` and `containerName` from [@motif-js/react-web@1.5.0](../react-web/CHANGELOG.md#150). Native renderer accepts the props and emits nothing (RN has no equivalent CSS containment surface).

## 1.4.0

### Minor Changes

- **Re-exports the M-3 display props.** `<Box>` (and every other primitive on web) accepts the new `fontVariationSettings`, `maskImage`, `WebkitMaskImage`, and `clipPath` style props from [@motif-js/react-web@1.4.0](../react-web/CHANGELOG.md#140). New type re-export: `FontVariationAxisSettings`. The native entry mirrors the type re-export so cross-platform code stays compileable, but the renderer emits nothing for the props (RN has no equivalent CSS surfaces).

## 1.3.0

### Minor Changes

- **Re-exports the M-2 chrome surface.** `keyframes(...)` is available directly from `@motif-js/react` (web entry routes to `@motif-js/react-web`'s implementation; native entry routes to `@motif-js/core`'s `makeKeyframe`, which produces the same branded shape but doesn't inject anything because RN has no `@keyframes`). New types: `AnimationObject`, `AnimationValue`, `Keyframe`, `KeyframeDef`, `PseudoElementStyleBag`, `PseudoElementStyleProps`. Cross-platform code can call `keyframes(...)` once and pass the result through `<Box animation={{ name: keyframe, duration, easing }} />` — animation runs on web; the `duration` / `easing` slots are still picked up by the native entry driver.

## 1.2.0

### Minor Changes

- **Re-exports the new createTheme fields.** `FontFace`, `FontSource`, `ReducedMotionMode`, `ThemeRootStyles`, and `TokenMap` types are now available directly from `@motif-js/react`. The runtime emission itself ships with [@motif-js/react-web@1.2.0](../react-web/CHANGELOG.md#120) (web only — native has no global stylesheet to emit into).

## 1.1.2

### Patch Changes

- Version sync with [@motif-js/compiler-swc@1.1.2](../compiler-swc/CHANGELOG.md#112). No behavioral changes in this package; released alongside the compiler fix for version uniformity across all `@motif-js/*` packages.

## 1.1.1

### Patch Changes

- **Publish-pipeline fix.** v1.0.0 and v1.1.0 shipped with `workspace:*` strings unrewritten in their published `dependencies` because `scripts/publish.mjs` invoked raw `npm publish` instead of `yarn npm publish` (Yarn 4 only rewrites workspace deps when going through its own publish command). Both broke installs with `EUNSUPPORTEDPROTOCOL`. v1.1.1 ships with the script fixed; published manifests now resolve `workspace:*` to concrete versions.

## 1.1.0

### Minor Changes

- **Cross-platform via package-exports routing.** Previously the `react-native` exports condition pointed at the web-targeted dist, which would silently produce a non-working module under Metro. The package now ships parallel `dist/index.js` (web → `@motif-js/react-web`) and `dist/index.native.js` (native → `@motif-js/react-native`) builds. A single `npm install @motif-js/react` works for both web and React Native; the bundler picks the right renderer via the exports condition.

- **`createTheme` re-export.** The factory from `@motif-js/core` is now available directly from `@motif-js/react` so docs and consumers have a single import surface for theme construction.

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
  - @motif-js/core@1.0.0
  - @motif-js/react-web@1.0.0

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
  - @motif-js/core@0.3.0
  - @motif-js/react-web@0.3.0

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

### Patch Changes

- Updated dependencies [fc38fd6]
  - @motif-js/core@0.2.0
  - @motif-js/react-web@0.2.0

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

### Patch Changes

- Updated dependencies [8321b3e]
  - @motif-js/core@0.1.0
  - @motif-js/react-web@0.1.0
