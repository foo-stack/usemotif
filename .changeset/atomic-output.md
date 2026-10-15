---
'@usemotif/compiler-core': minor
'@usemotif/compiler-babel': minor
'@usemotif/compiler-web': minor
---

`atomic: true` compiles each static declaration to one shared `a-<hash>` class instead of an inline style. Declarations that override another on the same element (a shorthand and its longhand, a base value and its breakpoint or state value) keep the default output, so the cascade is unchanged. A new `css-size` benchmark measures it against the default output, StyleX and Panda; on that corpus it is not smaller, and the compiler page says so.
