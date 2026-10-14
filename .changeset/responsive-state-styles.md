---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'@usemotif/compiler-core': minor
---

State bags (`_hover`, `_focus` and the rest) accept responsive values in the object, array and DSL syntaxes. On the web each breakpoint or container query nests around the state selector, as in `@media (min-width: 768px) { .m-x:hover { ... } }`. The compiler extracts them to the same class the runtime builds. On React Native, `Pressable` resolves a state bag at the current viewport and container width. Flat bags emit and hash exactly as before. Core exports `resolveStateRules` and the `StateStyleValue` type.
