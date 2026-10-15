---
'@usemotif/migrate': minor
---

Add `from-styled-components` and `from-tamagui` codemods. They parse each file and convert what maps directly: static styled-components templates become `styled()` configs with state props, and Tamagui imports, state props and `styled()` configs move to motif. What they can't convert stays in place under a `// usemotif-migrate:` comment that says why, and the CLI reports how many each file has left.
