---
'@usemotif/compiler-babel': minor
'@usemotif/compiler-web': patch
'@usemotif/compiler-metro': patch
---

Add an `onBail` option that reports each motif element the compiler left to the runtime: its file, line, column, element name, the reason (`dynamic-props`, `has-spread`, or why the wrapper had to stay), and the dynamic props. The bundler plugin and the Metro transformer pass it through. Setting it never changes the output.
