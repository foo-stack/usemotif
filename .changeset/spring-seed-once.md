---
'@usemotif/react': patch
---

Apply `useSpring`'s configured `velocity` on the first `.set()` only, as documented. On web the seed was re-applied every time a settled spring started moving again, so a later `.set()` could kick the value away from its new target before it turned around. The React Native hook already behaved this way.
