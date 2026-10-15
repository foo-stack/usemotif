---
'@usemotif/react': minor
---

Add `renderStyles(element, theme)` at `@usemotif/react/testing`: it renders any element, a consumer's own `styled()` components included, and returns the `RendererOutput` that `toHaveStyle` and `toHaveStyleAt` from `@usemotif/test-utils` read. The style cache's state is now shared across the package's entry points, so a collector from one entry sees styles injected through another under CommonJS too.
