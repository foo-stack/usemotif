# @usemotif/compiler-web

> Unplugin for Vite, Rollup, Webpack, esbuild, rspack, and farm. Statically extracts motif-js style props at build time.

## Install

```sh
yarn add -D @usemotif/compiler-web
```

## Vite

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import motifExtract from '@usemotif/compiler-web';

export default defineConfig({
  plugins: [motifExtract.vite(), react()],
});
```

Then add one import in your entry (root layout, `main.tsx`, etc.) so the bundler chunks the extracted CSS into a real asset:

```ts
import 'virtual:motif-extract.css';
```

Without that import the JSX rewrite still happens, but the resulting CSS has no asset to land in - styles fall back to motif's runtime path. With it, Vite chunks and hashes the CSS, and frameworks like React Router / Next inject the `<link rel="stylesheet">` automatically.

Rollup, Webpack, esbuild, rspack, and farm consume the same `motifExtract` instance - call the matching method (`.rollup()`, `.webpack()`, ...) per the unplugin convention. The `virtual:motif-extract.css` import works in all of them.

### Turbopack

Turbopack (the default for `next dev` and `next build` since Next.js 16) runs loaders, not plugins, so use the loader entry instead:

```ts
// next.config.ts
export default {
  turbopack: {
    rules: {
      '*.tsx': { loaders: ['@usemotif/compiler-web/turbopack'] },
      '*.jsx': { loaders: ['@usemotif/compiler-web/turbopack'] },
    },
  },
};
```

Each module's extracted CSS is written to a content-hashed file under `node_modules/.cache/usemotif/css` and imported by the module, so there is no virtual stylesheet to import.

## What it does

Walks every JSX call to a motif-js primitive, resolves literal-arg style props against the active theme at build time, and rewrites the call site so the runtime resolver can short-circuit. The result: atomic CSS classes (web) or hoisted `StyleSheet.create` ids (React Native, via `@usemotif/compiler-metro`) replace the per-render resolver work.

## Seeing what stayed at runtime

Pass `onBail` to log each motif element the extractor left to the runtime, with its file,
line, and reason - a dynamic style prop, a spread, a `ref`, and so on:

```ts
motif.vite({
  onBail: ({ filename, line, element, reason, props }) =>
    console.log(`${filename}:${line} <${element}> ${reason}`, props ?? ''),
});
```

Setting it never changes the build output.

## Docs

<https://usemotif.dev>

## License

[MIT](../../LICENSE)
