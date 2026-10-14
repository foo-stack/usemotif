---
'@usemotif/core': minor
'@usemotif/react': patch
'@usemotif/compiler-core': minor
'@usemotif/compiler-babel': patch
'@usemotif/compiler-web': patch
---

The compiler extracts literal `_before` and `_after` bags into `::before` and `::after` rules, so an element that uses them can still be stripped to a plain tag on web; a dynamic bag keeps the wrapper. The rules hash and print exactly as the runtime's do, because both now build them with `resolvePseudoElementBag`, which core exports.
