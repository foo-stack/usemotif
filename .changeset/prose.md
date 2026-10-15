---
'@usemotif/react': minor
---

`Prose` styles rendered Markdown and CMS HTML with the theme's tokens on web: headings, paragraphs, lists, links, code, quotes, tables and images. Every rule is wrapped in `:where()` and sits in the theme's cascade layer, so an app's own CSS overrides it, and its colours read `$components.prose.*` before the semantic tokens.
