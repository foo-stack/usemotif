---
'@usemotif/compiler-web': minor
---

`cache: true` (or a directory) keeps each module's compiled code, source map and extracted CSS on disk, keyed by its source, the compiler options and the compiler version, and replays them on the next build. Transforming 300 components went from 282 ms to 22 ms from the cache.
