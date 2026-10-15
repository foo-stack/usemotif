---
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
---

Add `IconProvider`, which sets the default `size` and `strokeWidth` for every `Icon` and `@usemotif/icons` glyph in its subtree. A prop on the icon still wins, and nested providers override only what they set.
