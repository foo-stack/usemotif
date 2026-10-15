---
'@usemotif/headless': minor
---

Add `useShortcut(combo, handler, options)`: global or element-scoped keyboard shortcuts that ignore typing in inputs by default, returning the shortcut's platform-formatted label (`⌘K`, `Ctrl+K`). `useCommandPaletteShortcut` is now an alias of it that still fires in inputs, and returns the label too.
