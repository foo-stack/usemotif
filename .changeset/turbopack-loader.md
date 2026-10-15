---
'@usemotif/compiler-web': minor
---

Add `@usemotif/compiler-web/turbopack`, a loader that runs motif extraction under Turbopack, which runs loaders but not bundler plugins. Each module's extracted CSS is written to a content-hashed file and imported by the module, in `next dev` and `next build` alike. The loader ships as ESM and CommonJS.
