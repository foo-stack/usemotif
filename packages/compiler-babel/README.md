# @usemotif/compiler-babel

> The Babel-plugin form of motif-js's static style-prop extractor.

Used by `@usemotif/compiler-metro` inside the React Native build pipeline, and consumable directly by Babel-driven web bundlers. Most web users want `@usemotif/compiler-web` instead - it wraps this plugin for the unplugin ecosystem (Vite, Rollup, Webpack, etc.).

## Install

```sh
yarn add -D @usemotif/compiler-babel
```

## Options worth knowing

- `onBail(event)` - called for each motif element left to the runtime, with `filename`,
  `line`, `column`, `element`, `reason` (`dynamic-props`, `has-spread`, or the reason the
  wrapper had to stay, such as `ref-attribute`), and the dynamic `props`. Setting it never
  changes the output. The bundler plugin and the Metro transformer accept it too.

## Docs

<https://usemotif.dev>

## License

[MIT](../../LICENSE)
