# motif

> One React styling library for **web**, **React Native** (Expo and bare), and
> **desktop** - all three treated as first-class equals, never one papered over
> another.

[![CI](https://github.com/foo-stack/usemotif/actions/workflows/ci.yml/badge.svg)](https://github.com/foo-stack/usemotif/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

motif gives you Tamagui-grade styling ergonomics, Radix-grade accessibility, and
modern CSS - container queries and cascade layers - in a single cross-platform
package. The bet: co-designing all three produces a better result than stitching
separate libraries together.

**[Read the docs →](https://usemotif.dev)**

---

## What it is

- A **style-prop API** and a **`styled()` factory** for authoring components.
- A **two-layer token system** - primitive palette plus semantic intent - with
  **nestable sub-themes**.
- **Container and media queries** through **three responsive syntaxes** -
  object, array, and a string DSL.
- A **progressive compiler** that statically extracts what it can. The runtime
  works without it; the compiler is an optimisation, not a contract.
- ~50 cross-platform **layout, typography, media, form, and a11y primitives**.
- ~38 fully accessible **headless behaviour components** - Dialog, Combobox,
  Menu, and the rest.

It renders **real DOM and real CSS** on the web and **real React Native** on
mobile. The same shared component runs on the desktop through **Electron** and
**Tauri** over the web bundle, both smoke-tested in CI. Shells for
**react-native-windows** and **react-native-macos** are scaffolded over the
native bundle but not yet runnable here: those projects lag the React Native
version this repo pins, so their CI lanes are currently off. See the
[desktop guide](https://usemotif.dev/guides/desktop).

---

## Install

```sh
yarn add usemotif @usemotif/tokens
```

`usemotif` is the single entry point for both platforms - its package exports
route to `@usemotif/react` under Vite, Next, and other web bundlers, and to
`@usemotif/react-native` under Metro, with no wiring on your part.
`@usemotif/tokens` ships an opinionated light/dark token set you can adopt as-is
or replace.

For a web-only or tree-shake-sensitive build, install `@usemotif/react`
directly; for native-only, `@usemotif/react-native`. Both ship the complete
styling API - `styled()` and `createStyledContext()` included - so the only
thing `usemotif` adds on top is the platform routing.

---

## Quick example

```tsx
import { Box, HStack, Text, ThemeProvider, Pressable } from 'usemotif';
import { darkTheme, lightTheme } from '@usemotif/tokens';

export function App() {
  return (
    <ThemeProvider themes={[lightTheme, darkTheme]} active="light">
      <Box bg="$colors.surface.base" p={{ base: '$3', md: '$5' }} borderRadius="$radii.md">
        <HStack gap="$3" alignItems="center">
          <Text fontSize="$lg" color="$colors.text.default">
            Hello from motif
          </Text>
          <Pressable
            px="$4"
            py="$2"
            borderRadius="$radii.md"
            bg="$colors.action.primary.bg"
            color="$colors.action.primary.fg"
            _hover={{ opacity: 0.9 }}
          >
            Get started
          </Pressable>
        </HStack>
      </Box>
    </ThemeProvider>
  );
}
```

The same component tree renders to the DOM on web and to React Native views on
native. Token references resolve to CSS variables on web and to a context-read
on native - the component code does not branch.

For Next.js App Router, add a style registry to `app/layout.tsx` so server-rendered
styles inline into the streamed `<head>`. Every component crosses the server
boundary, compound ones included: `Dialog.Root` and its peers render from a
Server Component directly. The full setup is in the
[server-rendering guide](https://usemotif.dev/guides/server-rendering).

---

## Versioning

motif ships under the `@usemotif/*` scope, which began at `1.0.0` - the
deliberate v1, after two namespace renames the docs call v2 and v3 - and is now
at `1.8.0`. The legacy `@motif-js/*` packages remain on npm, frozen, with
deprecation notices. To move an existing project,
run `npx @usemotif/migrate rename-v3` or follow the
[migration guides](https://usemotif.dev/migrating/v2-to-v3).

---

## Workspace

A Yarn 4 + Turborepo monorepo. Scripts at the repo root:

| Script           | What it does                         |
| ---------------- | ------------------------------------ |
| `yarn build`     | Build every package via Turbo + tsup |
| `yarn typecheck` | Run `tsc` across all packages        |
| `yarn lint`      | oxlint                               |
| `yarn format`    | oxfmt (write)                        |
| `yarn test`      | Vitest across all packages           |

See the [contributing guide](https://usemotif.dev/guides/contributing) for setup
and the conformance suite, which grades every primitive on both platforms on
each pull request.

---

## License

[MIT](./LICENSE) © 2026 Nate Irikefe
