---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
'@usemotif/tokens': minor
---

`extendTheme(base, { name, tokens })` derives a theme by deep-merging token overrides onto a base theme. Leaves replace, `animations` presets replace whole, and `fonts`, `root` and `reducedMotion` are inherited unless given. The result is typed with the merged literal shape, so the base's and the overrides' `$`-paths both autocomplete. It is exported from `@usemotif/core`, `@usemotif/react`, `@usemotif/react-native` and `usemotif`.

The `@usemotif/tokens` presets (`lightTheme`, `darkTheme` and the high-contrast pair) are now typed with their literal token shape instead of the wide `Theme`. Their `$`-paths become visible to the token types, and they still satisfy `Theme`. Code that read a token key the preset does not have now fails to compile instead of typing as `undefined`.
