---
'@usemotif/react': minor
---

Add `@usemotif/react/rsc`: `Box`, `Stack`, `HStack`, `VStack` and `Text` that render in a React Server Component with no client boundary. Their styles resolve to class names on the server and their CSS ships as React's hoisted, deduplicated `<style precedence>`, collected into the head as the page streams. Props that need the client (event handlers, `ref`, `enterStyle`, `exitStyle`, `layout`, `drag`, motion values, `stagger`) hand the element to the client primitive. The client `Box` and the server one now share one style resolver.
