# @usemotif/migrate

> Codemod toolkit for motif-js.

Rewrites motif-js import specifiers between major versions, and moves code over from other styling libraries. Ships four transforms:

- **`rename-v3`** (primary) - Rewrites v1 or v2 specifiers to their v3 (`@usemotif/*`) names in one pass.
- **`rename-v2`** (back-compat) - Rewrites v1 specifiers to their v2 names. Use this before `rename-v3` if your project is still on v1 and contains cross-platform code (see [the gotcha](#the-motif-jsreact-ambiguity-for-v1-consumers) below).
- **`from-styled-components`** - Converts styled-components templates with no interpolations to `styled()` configs.
- **`from-tamagui`** - Moves Tamagui imports, state props and `styled()` configs to motif.

The `from-*` transforms leave what they can't convert under a `// usemotif-migrate:` comment that says why. See [Migrate](https://usemotif.dev/reference/migrate#migrating-from-another-library) for what each converts.

## Use

```sh
# In your project root, with v1 or v2 imports:
npx @usemotif/migrate rename-v3

# Or point at a subtree:
npx @usemotif/migrate rename-v3 src/

# Preview without writing:
npx @usemotif/migrate rename-v3 --dry-run
```

## What rename-v3 does

| Before (v1 or v2)        | After (v3)               |
| ------------------------ | ------------------------ |
| `@motif-js/react-web`    | `@usemotif/react`        |
| `@motif-js/react`        | `@usemotif/react` ⚠      |
| `@motif-js/react-native` | `@usemotif/react-native` |
| `@motif-js/core`         | `@usemotif/core`         |
| `@motif-js/compiler-swc` | `@usemotif/compiler-web` |
| `@motif-js/<other>`      | `@usemotif/<other>`      |
| `usemotif` (meta)        | (unchanged)              |
| `@usemotif/*`            | (unchanged)              |

Subpaths survive - `@motif-js/react/server` becomes `@usemotif/react/server`, the renamed DOM bindings still own those exports.

The bundler plugin is redirected rather than scope-swapped: it shipped as `compiler-swc` through v1.1, kept that name as an alias, and now lives only at `@usemotif/compiler-web`.

Covers every form an import specifier appears in:

- `import { X } from '...'` (named, default, namespace, type-only)
- `import('…')` (dynamic)
- `require('…')` (CommonJS)
- `dependencies` / `peerDependencies` / etc. keys in `package.json`
- Code fences in `.md` / `.mdx`

## The `@motif-js/react` ambiguity (for v1 consumers)

`@motif-js/react` meant two things across the v1 and v2 epochs:

- **v1** - the cross-platform aggregator (re-exported `@motif-js/react-web` on web and `@motif-js/react-native` on native).
- **v2** - the DOM bindings package (renamed from `@motif-js/react-web` in v2).

Source alone can't tell the two apart. `rename-v3` always treats `@motif-js/react` as the v2 DOM bindings and maps it to `@usemotif/react`. For v1 web-only code, that's correct. For v1 cross-platform code, the right target is the unscoped `usemotif` meta package - and you need `rename-v2` first:

```sh
# v1 → v2 (disambiguates @motif-js/react vs @motif-js/react-web)
npx @usemotif/migrate rename-v2

# v2 → v3 (consolidates everything under @usemotif/*)
npx @usemotif/migrate rename-v3
```

## What rename-v2 does (kept for back-compat)

| Before (v1)              | After (v2)          |
| ------------------------ | ------------------- |
| `@motif-js/react-web`    | `@motif-js/react`   |
| `@motif-js/react`        | `usemotif`          |
| `@motif-js/react-native` | (unchanged)         |
| `@motif-js/react/server` | (unchanged subpath) |

## Files scanned by default

```
**/*.{ts,tsx,js,jsx,mjs,cjs,md,mdx,json}
```

Skips: `node_modules`, `dist`, `.next`, `.vorge`, `.turbo`, `.cache`, `build`, `out`, `coverage`, `__visual__`.

## Programmatic API

```ts
import { applyRenameV3, needsRenameV3 } from '@usemotif/migrate';

const src = `import { Box } from '@motif-js/react';`;
if (needsRenameV3(src)) {
  const out = applyRenameV3(src);
  // → `import { Box } from '@usemotif/react';`
}
```

`applyRenameV3` (and `applyRenameV2`) are string-in, string-out functions. Pass any kind of file content - TypeScript, JavaScript, MDX, JSON - it matches import specifier strings, not parsed AST nodes.

## Docs

<https://usemotif.dev/migrating/v2-to-v3>

## License

[MIT](../../LICENSE)
