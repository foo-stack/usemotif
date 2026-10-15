---
'@usemotif/core': patch
---

`parseMarkdown` runs in linear time on hostile input. Unclosed `**`, `_` and backticks, long runs of spaces, backslash runs inside link text, and runs of unclosed links no longer make it rescan or backtrack, so Markdown from a CMS or a user cannot stall a render.
