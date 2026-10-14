---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'@usemotif/compiler-core': patch
---

`layoutTransition` on Box sets the duration and easing of `layout` animations, as literals or `$durations` / `$easings` tokens, defaulting to 300ms ease-in-out. The web `useLayoutAnimation` hook's `duration` and `easing` also accept a CSS time string and `$durations` / `$easings` tokens. On React Native, layout animations now honour `cubic-bezier(...)` easings, and token easings in an `animation` object no longer fall back when they resolve to a cubic-bezier. The compiler no longer strips a Box that uses `layout` or `layoutTransition` to a plain element, which had dropped the animation.
