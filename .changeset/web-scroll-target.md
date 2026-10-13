---
'@usemotif/react': minor
'usemotif': minor
---

Add `useScrollTarget()` on web. It returns `{ ref, onLayout }` like the native hook, and web `useScroll({ target })` now accepts that handle as well as a plain ref, so scroll-linked code written for native runs unchanged on web. Web `Box` accepts `onLayout={undefined}` and never forwards it to the DOM.
