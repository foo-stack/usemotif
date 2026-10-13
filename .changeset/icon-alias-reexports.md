---
'@usemotif/icons': patch
---

Lucide alias names such as `ActivitySquare` are now re-exports of their target glyph (`SquareActivity`) instead of a second copy of it. Every name still resolves and renders the same icon; the full barrel is about 4 KB smaller gzipped, and an alias now shows its target's name in React DevTools.
