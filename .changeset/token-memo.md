---
'@usemotif/core': patch
---

`resolveToken` remembers each theme's resolved refs, so a screen that asks for the same tokens on every element resolves each one once. On a 300-box first screen measured without a JIT, token resolution fell from about 2.4 ms to 0.6 ms. Unresolved refs are not remembered, so the dev warning still fires.
