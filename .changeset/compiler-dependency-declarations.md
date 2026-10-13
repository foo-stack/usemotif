---
'@usemotif/compiler-core': patch
'@usemotif/compiler-metro': patch
---

Correct two dependency declarations. `@usemotif/compiler-core` no longer installs `@babel/generator`, which it never imported. `@usemotif/compiler-metro` now declares `@babel/core` as a peer dependency (`^7.20.0`, the same range `@usemotif/compiler-babel` requires) instead of installing its own copy; React Native projects already have it.
