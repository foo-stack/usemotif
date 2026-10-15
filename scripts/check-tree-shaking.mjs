#!/usr/bin/env node
/**
 * Import-cost guardrail.
 *
 *   node scripts/check-tree-shaking.mjs
 *
 * For each target, bundles a synthetic entrypoint that imports a
 * single named export from a motif package, measures the bundled
 * output (esbuild + minify + gzip), and compares against a budget.
 *
 * The "real" tree-shaking question is: when I import `Plus`, do I
 * pay for the rest of `@usemotif/icons`? The answer in motif's
 * architecture is "no, but you do pay for the transitive
 * dependency chain to `<Icon>` → `<Svg>` → `@usemotif/react` →
 * `@usemotif/react`'s `Box`." That's the architectural cost,
 * and the budgets reflect it.
 *
 * If a target balloons past its budget, two things might be true:
 *  1. A genuinely-tree-shake-breaking change landed (a barrel
 *     module gained side effects, a re-export bridged unrelated
 *     code, etc.).
 *  2. A dependency added real new functionality and the budget
 *     should rebaseline.
 *
 * Phase G batch 2: this is the runtime-side complement to
 * `scripts/check-sizes.mjs` (which budgets the full package).
 * Together they catch both "bundle grew" (size budget) and "this
 * single import pulls in the whole bundle anyway" (tree-shaking).
 */

import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

const targets = [
  {
    name: '@usemotif/react - Box only',
    // Box dispatches through wrappers for `drag` / `layout` / `stagger`
    // props (added in the motion-roadmap), so an `import { Box }`
    // statically pulls `useDrag`, `useLayoutAnimation`, and the stagger
    // context - even when consumers don't use those props. Tree-shaking
    // can't eliminate them because the conditional dispatch creates a
    // runtime reference at Box's entry point. Rebaselined in v1.1.0;
    // nudged in v1.1.5 by the reduced-motion enter-gating + SSR-safety
    // changes the web Box now carries. Nudged again when Box gained the
    // off-thread exit wiring (the exit shell + presence context, statically
    // referenced via the exit dispatch).
    code: `import { Box } from '@usemotif/react';\nconsole.log(Box);\n`,
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Lowered when the forms components' `forwardRef` calls were marked pure,
    // so the forms module stopped riding along with every Box import.
    // Bumped when the style cache's realm-shared state.
    // Bumped when Box gained layoutId (the shared-layout registry in useLayoutAnimation).
    // Bumped when Box reads the scroll-timeline slot (the compiler itself loads only with useScroll).
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 11700, // gzip bytes
  },
  {
    name: '@usemotif/react - Button only',
    code: `import { Button } from '@usemotif/react';\nconsole.log(Button);\n`,
    // Tracks the web Box growth above (Button composes Box).
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Lowered when the forms components' `forwardRef` calls were marked pure,
    // so the forms module stopped riding along with every Box import.
    // Bumped when Box gained layoutId (the shared-layout registry in useLayoutAnimation).
    // Bumped when Box reads the scroll-timeline slot (the compiler itself loads only with useScroll).
    // Bumped when Box's style resolution moved into a shared resolver the Server Component primitives also use.
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 12900,
  },
  {
    name: '@usemotif/react-native - Box only',
    // Same dispatch pattern as the web Box, plus the native motion-
    // driver registry pulls in via the drag / layout wrappers.
    // Rebaselined in v1.1.0; bumped again in v1.1.4 when Box gained the
    // native style translator (shadow/transform/web-only-key sanitisation),
    // which it imports unconditionally so shadows render on RN. Bumped
    // again in v1.1.5 when the exit path gained the presence-`active`
    // driver plumbing + expanded web→native style translation.
    code: `import { Box } from '@usemotif/react-native';\nconsole.log(Box);\n`,
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Raised again when Box gained keyframe animation: the stop sampler and
    // frame clock add about 1.5 KB. Colours parse through RN's
    // `processColor` rather than core's colour-space module, which would
    // have cost another 3 KB.
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Lowered when the forms components' `forwardRef` calls were marked pure,
    // so the forms module stopped riding along with every Box import.
    // Bumped when Box gained layoutId (the shared-layout registry in useLayoutAnimation).
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 15300,
  },
  {
    name: '@usemotif/headless - Dialog only',
    code: `import { Dialog } from '@usemotif/headless';\nconsole.log(Dialog);\n`,
    // Dialog brings Portal + Overlay + FocusScope + Box. The
    // architectural floor for any modal-style headless component.
    // Grew in v1.1.0 because Box itself grew (motion-roadmap dispatch);
    // rebaselined to match. Nudged in v1.1.4 alongside the web Box's
    // SSR-safe enter-overlay gating, and again in v1.1.5 with the
    // overlay/menu focus + a11y wiring fixes.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 17900,
  },
  {
    name: '@usemotif/headless - Tooltip only',
    code: `import { Tooltip } from '@usemotif/headless';\nconsole.log(Tooltip);\n`,
    // Tooltip pulls Portal + Box via @usemotif/react - the exact same
    // module set as Dialog (verified via esbuild metafile: no
    // Tooltip-only package is dragged in). It is simply a larger
    // component than Dialog. Grew in v1.1.0 alongside Box's growth, and
    // again in v1.1.3 by the core CSS-value escaping (#150 security fix)
    // that the shared `stringifyDeclarations` path now carries, and in
    // v1.1.5 tracking the shared Box + overlay growth.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18500,
  },
  {
    name: '@usemotif/icons - Plus only',
    code: `import { Plus } from '@usemotif/icons';\nconsole.log(Plus);\n`,
    // Plus → Icon → Svg via the dedicated `@usemotif/react/svg` entry,
    // which carries zero engine code. A single glyph now costs only the
    // glyph data + Icon/Svg (~550 B gzip) - it no longer drags in
    // `@usemotif/core` or the styled primitives. A regression back to
    // the barrel would jump this past ~6 KB and blow the budget (#10).
    budget: 1500,
  },
  {
    name: '@usemotif/compiler-core - extractWeb only',
    code: `import { extractWeb } from '@usemotif/compiler-core';\nconsole.log(extractWeb);\n`,
    // Bumped in v1.1.4 by the literal-extraction mutation guard, which walks a
    // const binding's reference paths to refuse extracting mutated objects, and
    // in v1.1.5 by the extraction precedence + bail-out correctness fixes.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by the `gradients` scale joining core's known scale names.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when styled() variants took responsive values.
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    // Bumped for atomic output (the per-declaration split in extractWeb).
    budget: 7400,
  },
  {
    name: '@usemotif/ui - Card only',
    code: `import { Card } from '@usemotif/ui';\nconsole.log(Card);\n`,
    // The kit is code-split per component, so a display component pulls only
    // its primitives (Box + styled + its recipe) - NOT Modal's
    // `@usemotif/headless` dependency. A regression that re-couples them (e.g.
    // losing the per-component split) jumps this ~5 KB to Modal's footprint.
    // Nudged when every style-prop component moved from a function
    // declaration to a const so its type can switch on strict token
    // paths. `var X = function (p) {}` is a few bytes wider than
    // `function X(p) {}`; nothing new is pulled in.
    // Bumped when Box's `layout` animation took `layoutTransition` timing.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when Card parts (Header, Body, Footer, Media) assembled on Card.
    // Bumped when Box gained layoutId (the shared-layout registry in useLayoutAnimation).
    // Bumped when Box's style resolution moved into a shared resolver the Server Component primitives also use.
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 13400,
  },
  {
    name: '@usemotif/ui - Modal only',
    code: `import { Modal } from '@usemotif/ui';\nconsole.log(Modal);\n`,
    // Modal legitimately pulls the headless Dialog + Adapt on top of the
    // primitives - the ~5 KB over Card-only is exactly that headless surface.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18600,
  },
  {
    name: '@usemotif/ui - Tooltip only',
    code: `import { Tooltip } from '@usemotif/ui';\nconsole.log(Tooltip);\n`,
    // Pulls the headless Tooltip behaviour + Box, NOT Modal's Dialog/Adapt or
    // Toast's toaster - proof the per-component split holds.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18700,
  },
  {
    name: '@usemotif/ui - Toast only',
    code: `import { Toaster } from '@usemotif/ui';\nconsole.log(Toaster);\n`,
    // Pulls the headless Toast system + Box/Text, NOT Modal's or Tooltip's
    // behaviours. Bumped from 17600 when the class-name hash widened to 53-bit
    // (cyrb53) to remove collisions - a few dozen bytes of core the Toast
    // bundle carries via the styling engine.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19100,
  },
  {
    name: '@usemotif/ui - Switch only',
    code: `import { Switch } from '@usemotif/ui';\nconsole.log(Switch);\n`,
    // Switch is a themed <Box as="input">, pure primitives - it must NOT pull
    // any `@usemotif/headless` behaviour, so it stays near the Card-only floor.
    // Bumped when the group states joined core's selector map and Box marks a group.
    budget: 12000,
  },
  {
    name: '@usemotif/ui - Tabs only',
    code: `import { Tabs } from '@usemotif/ui';\nconsole.log(Tabs);\n`,
    // Pulls the headless Tabs (disclosure) behaviour + Box, NOT Modal's or the
    // other components'.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18700,
  },
  {
    name: '@usemotif/ui - Checkbox only',
    code: `import { Checkbox } from '@usemotif/ui';\nconsole.log(Checkbox);\n`,
    // Like Switch, a themed <Box as="input"> styled via `_checked` - pure
    // primitives, so it must NOT pull any `@usemotif/headless` behaviour and
    // stays near the Card/Switch floor.
    // Bumped when four more state props joined core's selector map.
    // Bumped when the group states joined core's selector map and Box marks a group.
    budget: 12100,
  },
  {
    name: '@usemotif/ui - Radio only',
    code: `import { Radio } from '@usemotif/ui';\nconsole.log(Radio);\n`,
    // Radio + RadioGroup are pure primitives (a `_checked` <Box as="input"> plus
    // a small name-sharing context) - no headless, so they hug the same floor.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    budget: 12000,
  },
  {
    name: '@usemotif/ui - Popover only',
    code: `import { Popover } from '@usemotif/ui';\nconsole.log(Popover);\n`,
    // Pulls the headless Popover (floating positioning + dismiss) + Box, NOT
    // Modal's Dialog/Adapt or the other components'.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18400,
  },
  {
    name: '@usemotif/ui - Accordion only',
    code: `import { Accordion } from '@usemotif/ui';\nconsole.log(Accordion);\n`,
    // Pulls the headless Accordion (disclosure) behaviour + Box, NOT Modal's or
    // the other components'.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18500,
  },
  {
    name: '@usemotif/ui - Select only',
    code: `import { Select } from '@usemotif/ui';\nconsole.log(Select);\n`,
    // Pulls the headless Select/Combobox (listbox + floating position) + Box.
    // Combobox is a heavier behaviour than the single-overlay components.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19900,
  },
  {
    name: '@usemotif/ui - Menu only',
    code: `import { Menu } from '@usemotif/ui';\nconsole.log(Menu);\n`,
    // Pulls the headless Menu (roving focus, floating position, dismiss) + Box,
    // NOT Select's Combobox or the other components'.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18200,
  },
  {
    name: '@usemotif/ui - Slider only',
    code: `import { Slider } from '@usemotif/ui';\nconsole.log(Slider);\n`,
    // Sits at the shared headless-barrel + react/core baseline that every
    // headless-backed kit component pays (~16 KB) - importing from the
    // `@usemotif/headless` barrel pulls that floor regardless of the single
    // behaviour used. Still well under Modal's footprint and far above the
    // headless-free display floor (Card ~11 KB), which is what this gate guards.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18200,
  },
  {
    name: '@usemotif/ui - Progress only',
    code: `import { Progress } from '@usemotif/ui';\nconsole.log(Progress);\n`,
    // Same headless-barrel baseline, plus motif's `keyframes` (usemotif) for the
    // indeterminate sweep and the `useReducedMotion` hook.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18400,
  },
  {
    name: '@usemotif/ui - Drawer only',
    code: `import { Drawer } from '@usemotif/ui';\nconsole.log(Drawer);\n`,
    // Drawer + Sheet ship from one entry (they share the slide surface). Pulls
    // the headless Drawer (Dialog + Portal + Overlay + FocusScope) + Box on top
    // of the shared headless-barrel baseline - Modal-class footprint.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18500,
  },
  {
    name: '@usemotif/ui - AlertDialog only',
    code: `import { AlertDialog } from '@usemotif/ui';\nconsole.log(AlertDialog);\n`,
    // Dialog-based confirm dialog - Modal-class headless footprint, no Adapt.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18400,
  },
  {
    name: '@usemotif/ui - ContextMenu only',
    code: `import { ContextMenu } from '@usemotif/ui';\nconsole.log(ContextMenu);\n`,
    // Headless ContextMenu (roving focus, cursor positioning, dismiss) + Box, at
    // the shared headless-barrel baseline.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18200,
  },
  {
    name: '@usemotif/ui - Separator only',
    code: `import { Separator } from '@usemotif/ui';\nconsole.log(Separator);\n`,
    // Pure primitive (a themed Box) - NO headless. Hugs the display floor.
    // Bumped when four more state props joined core's selector map.
    // Bumped when the group states joined core's selector map and Box marks a group.
    budget: 11800,
  },
  {
    name: '@usemotif/ui - Skeleton only',
    code: `import { Skeleton } from '@usemotif/ui';\nconsole.log(Skeleton);\n`,
    // Pure primitive (Box + `keyframes` pulse) - NO headless. Display floor.
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 12100,
  },
  {
    name: '@usemotif/ui - Pagination only',
    code: `import { Pagination } from '@usemotif/ui';\nconsole.log(Pagination);\n`,
    // Headless navigation (page-window math) + Box, at the shared headless-barrel
    // baseline.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18600,
  },
  {
    name: '@usemotif/ui - Stepper only',
    code: `import { Stepper } from '@usemotif/ui';\nconsole.log(Stepper);\n`,
    // Headless navigation Stepper + Box, shared headless-barrel baseline.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18400,
  },
  {
    name: '@usemotif/ui - Breadcrumb only',
    code: `import { Breadcrumb } from '@usemotif/ui';\nconsole.log(Breadcrumb);\n`,
    // Headless navigation Breadcrumb + Box, shared headless-barrel baseline.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    // Bumped for anchor positioning and the Popover API in useFloatingPosition.
    budget: 18400,
  },
  {
    name: '@usemotif/ui - Toolbar only',
    code: `import { Toolbar } from '@usemotif/ui';\nconsole.log(Toolbar);\n`,
    // Headless Toolbar (roving focus) - themed via inline token CSS vars, so it
    // doesn't even pull Box. Shared headless-barrel baseline.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18300,
  },
  {
    name: '@usemotif/ui - NavigationMenu only',
    code: `import { NavigationMenu } from '@usemotif/ui';\nconsole.log(NavigationMenu);\n`,
    // Headless NavigationMenu (flat mode) + Box. A touch heavier than the
    // baseline - the barrel pulls navigation.tsx's tree-mode (submenu) code too.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19500,
  },
  {
    name: '@usemotif/ui - RangeSlider only',
    code: `import { RangeSlider } from '@usemotif/ui';\nconsole.log(RangeSlider);\n`,
    // Headless RangeSlider (range) - themed via inline token vars, no Box.
    // Shared headless-barrel baseline.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18500,
  },
  {
    name: '@usemotif/ui - RatingInput only',
    code: `import { RatingInput } from '@usemotif/ui';\nconsole.log(RatingInput);\n`,
    // Headless RatingInput (range) + Box (themed star). Shared baseline.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18400,
  },
  {
    name: '@usemotif/ui - Combobox only',
    code: `import { Combobox } from '@usemotif/ui';\nconsole.log(Combobox);\n`,
    // Combobox + Search ship from one entry. Headless Combobox (listbox + filter
    // + floating position) + Box, a touch over the baseline like Select.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19300,
  },
  {
    name: '@usemotif/ui - MultiSelect only',
    code: `import { MultiSelect } from '@usemotif/ui';\nconsole.log(MultiSelect);\n`,
    // Headless MultiSelect (chips + toggle listbox) + Box.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 20100,
  },
  {
    name: '@usemotif/ui - ColorPicker only',
    code: `import { ColorPicker } from '@usemotif/ui';\nconsole.log(ColorPicker);\n`,
    // Headless ColorPicker (HSV plane + sliders + format toggle + colour math) -
    // the heaviest single headless behaviour; themed via inline style hooks only.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 20400,
  },
  {
    name: '@usemotif/ui - FileUpload only',
    code: `import { FileUpload } from '@usemotif/ui';\nconsole.log(FileUpload);\n`,
    // Headless FileUpload (drag-drop) + Box. Shared headless-barrel baseline.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18600,
  },
  {
    name: '@usemotif/ui - TimeInput only',
    code: `import { TimeInput } from '@usemotif/ui';\nconsole.log(TimeInput);\n`,
    // Headless TimeInput is a native <input> wrapper - themed via inline vars,
    // no Box. Shared headless-barrel baseline.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18100,
  },
  {
    name: '@usemotif/ui - HoverCard only',
    code: `import { HoverCard } from '@usemotif/ui';\nconsole.log(HoverCard);\n`,
    // Headless HoverCard (hover/focus open + floating position + hover bridge) +
    // a themed surface Box - the same module set as Popover, NOT Modal's
    // Dialog/Adapt or the other components'.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18500,
  },
  {
    name: '@usemotif/ui - Collapsible only',
    code: `import { Collapsible } from '@usemotif/ui';\nconsole.log(Collapsible);\n`,
    // Headless Collapsible (the single-disclosure shape Accordion is built from)
    // + Box. Same disclosure baseline as Accordion.
    // Bumped by decimal token-key resolution in core (`$space.1.5`), which
    // every package inherits through `resolveToken` / `tokenRefToCssVar`.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18500,
  },
  {
    name: '@usemotif/ui - Calendar only',
    code: `import { Calendar } from '@usemotif/ui';\nconsole.log(Calendar);\n`,
    // Headless Calendar (month grid + keyboard nav + Intl labels) + a Box-painted
    // day cell. No Popover (that's DatePicker), so a touch under the overlay set.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19100,
  },
  {
    name: '@usemotif/ui - DatePicker only',
    code: `import { DatePicker } from '@usemotif/ui';\nconsole.log(DatePicker);\n`,
    // Headless DatePicker = Calendar + the headless Popover (floating position +
    // dismiss) + a Box-painted day cell. Calendar + Popover footprint.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19700,
  },
  {
    name: '@usemotif/ui - CommandPalette only',
    code: `import { CommandPalette } from '@usemotif/ui';\nconsole.log(CommandPalette);\n`,
    // Headless CommandPalette (fuzzy filter + grouped sections + recents) renders
    // inside the headless Dialog (Portal + Overlay + FocusScope) + Box - the
    // Dialog-class footprint plus the palette logic.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 19800,
  },
  {
    name: '@usemotif/ui - TreeView only',
    code: `import { TreeView } from '@usemotif/ui';\nconsole.log(TreeView);\n`,
    // Headless TreeView (flatten + roving focus + ARIA tree keyboard) + a
    // Box-painted node row. No overlay, so near the lighter behaviour set.
    // Bumped by overlay background isolation: Overlay marks background
    // content inert + aria-hidden and locks scroll, which every headless-
    // backed entry carries through the shared floor.
    budget: 18900,
  },
  {
    name: '@usemotif/ui - Stat only',
    code: `import { Stat } from '@usemotif/ui';\nconsole.log(Stat);\n`,
    // Pure presentational (Box + Text, no headless) - must hug the display floor,
    // NOT pull any `@usemotif/headless` behaviour. Stat takes its styling from
    // `statRecipe` and `statDeltaRecipe`, so the recipe data (every trend's
    // colour) ships with it; that is about 70 B over the hand-inlined version.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 12200,
  },
  {
    name: '@usemotif/ui - EmptyState only',
    code: `import { EmptyState } from '@usemotif/ui';\nconsole.log(EmptyState);\n`,
    // Pure presentational (Box + Text, no headless) - display floor.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    budget: 12000,
  },
  {
    name: '@usemotif/ui - Timeline only',
    code: `import { Timeline } from '@usemotif/ui';\nconsole.log(Timeline);\n`,
    // Pure presentational (Box + Text, no headless) - display floor.
    // Nudged when every style-prop component moved from a function
    // declaration to a const so its type can switch on strict token
    // paths. `var X = function (p) {}` is a few bytes wider than
    // `function X(p) {}`; nothing new is pulled in.
    // Bumped when Box's `layout` animation took `layoutTransition` timing.
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 12400,
  },
  {
    name: '@usemotif/ui - AvatarGroup only',
    code: `import { AvatarGroup } from '@usemotif/ui';\nconsole.log(AvatarGroup);\n`,
    // Composes the Avatar primitive (no headless) - display floor.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped when the component reads a built-in label from the translatable messages catalogue.
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 13200,
  },
  {
    name: '@usemotif/ui - Chip only',
    code: `import { Chip } from '@usemotif/ui';\nconsole.log(Chip);\n`,
    // Pure presentational (Box, no headless) - display floor.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped when the component reads a built-in label from the translatable messages catalogue.
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 13000,
  },
  {
    name: '@usemotif/ui - Banner only',
    code: `import { Banner } from '@usemotif/ui';\nconsole.log(Banner);\n`,
    // Pure presentational (Box + Text, no headless) - display floor.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped when Box's `layout` animation took `layoutTransition` timing.
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped when the four default status icons (Info, CircleCheck, TriangleAlert, CircleAlert) and Icon.
    // Bumped when the shared dismiss part as Pressable and Text, so it also renders on native.
    // Bumped when Box gained layoutId (the shared-layout registry in useLayoutAnimation).
    // Bumped when Box reads the scroll-timeline slot (the compiler itself loads only with useScroll).
    // Bumped when the component reads a built-in label from the translatable messages catalogue.
    // Bumped when responsive values resolve the @contrast-style preference keys (the store on native).
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 14100,
  },
  {
    name: '@usemotif/ui - FormField only',
    code: `import { FormField } from '@usemotif/ui';\nconsole.log(FormField);\n`,
    // Box + Text + a cloneElement, no headless - display floor. Nudged when
    // Box's pseudo-element resolver moved into core so the compiler could
    // share it (a couple of bytes).
    // Bumped when state bags took responsive values (nested at-rules).
    // Bumped when the group states joined core's selector map and Box marks a group.
    // Bumped for fallback chains in token refs and the recipes' component token paths.
    budget: 12200,
  },
  {
    name: '@usemotif/ui - SegmentedControl only',
    code: `import { SegmentedControl } from '@usemotif/ui';\nconsole.log(SegmentedControl);\n`,
    // Self-contained single-select (Box + useState, no headless) - display floor.
    // Bumped by cascade-layer support: `Box` now reads the active layer and
    // can emit base props as a class instead of inline styles.
    // Bumped when the group states joined core's selector map and Box marks a group.
    budget: 12300,
  },
];

const dir = mkdtempSync(join(tmpdir(), 'motif-treeshake-'));

async function bundleAndMeasure(code) {
  const entry = join(dir, 'entry.js');
  writeFileSync(entry, code);
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    treeShaking: true,
    write: false,
    target: 'es2022',
    external: [
      'react',
      'react-dom',
      'react-native',
      '@babel/core',
      '@babel/types',
      '@babel/parser',
      '@babel/traverse',
      'unplugin',
    ],
    absWorkingDir: ROOT,
    nodePaths: [`${ROOT}/node_modules`],
    logLevel: 'silent',
  });
  const out = result.outputFiles[0].contents;
  return { raw: out.length, gzipped: gzipSync(out, { level: 9 }).length };
}

function fmt(n) {
  if (n < 1000) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// Default the width when there are no targets: Math.max() with no args is
// -Infinity, which would turn every padEnd() width into NaN.
const W_NAME = targets.length > 0 ? Math.max(...targets.map((t) => t.name.length)) + 2 : 0;

let overruns = 0;
let errors = 0;
const rows = [];
for (const t of targets) {
  try {
    const { raw, gzipped } = await bundleAndMeasure(t.code);
    const status = gzipped <= t.budget ? 'OK' : 'OVER';
    if (status === 'OVER') overruns += 1;
    rows.push({ name: t.name, status, raw, gzipped, budget: t.budget });
  } catch (err) {
    // A target that fails to bundle (a renamed/removed export, an esbuild
    // resolve failure) is a hard failure, not a pass - track it so the exit
    // code below reflects it. A silently-skipped ERR would let the release
    // workflow treat a fully-broken tree-shaking check as green.
    errors += 1;
    rows.push({ name: t.name, status: 'ERR', error: err.message ?? String(err) });
  }
}

console.log('target'.padEnd(W_NAME) + 'status   raw       gzip      budget');
console.log('-'.repeat(W_NAME + 40));
for (const r of rows) {
  if (r.status === 'ERR') {
    console.log(`${r.name.padEnd(W_NAME)}ERR     ${r.error?.slice(0, 80) ?? ''}`);
    continue;
  }
  console.log(
    `${r.name.padEnd(W_NAME)}${r.status.padEnd(8)}${fmt(r.raw).padEnd(10)}${fmt(r.gzipped).padEnd(10)}${fmt(r.budget)}`,
  );
}

rmSync(dir, { recursive: true, force: true });

if (errors > 0) {
  console.error(`\n${errors} target(s) failed to bundle (see ERR above).`);
}
if (overruns > 0) {
  console.error(`\n${overruns} target(s) over budget.`);
  console.error('Tree-shaking might be broken - likely culprits:');
  console.error('  - `sideEffects: true` (or absent) in a package.json that should be `false`');
  console.error('  - top-level work in a barrel-export module');
  console.error('  - a re-export that pulls in the whole package transitively');
}
if (overruns > 0 || errors > 0) {
  process.exit(1);
}
