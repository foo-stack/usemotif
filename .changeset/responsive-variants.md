---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
---

`styled()` variant props accept responsive values in the object, array and string DSL forms, as in `size={{ base: 'sm', md: 'lg' }}`. A component resolves its variants once per breakpoint the value names, so compound variants match per breakpoint, and folds the result into responsive style props, state bags included. `VariantProps` now takes the component itself, `VariantProps<typeof Button>`, as well as a variants config. `styled()` returns the new exported `StyledComponent<V>` type, and core exports `resolveResponsiveVariants`. Variant prop types widen to include the responsive forms.
