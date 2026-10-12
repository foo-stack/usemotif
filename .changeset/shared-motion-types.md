---
'@usemotif/core': minor
'@usemotif/react': patch
'@usemotif/react-native': patch
---

Define the spring and drag option types once, in `@usemotif/core`. `SpringConfig`, `DragAxis`, `DragConstraints`, `DragInfo`, `DragSpringConfig` and `UseDragOptions` are now exported from `@usemotif/core`, and `@usemotif/react` and `@usemotif/react-native` re-export the same types under the same names, so existing imports keep working.
