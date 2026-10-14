---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`Menu.Sub`, `Menu.SubTrigger` and `Menu.SubContent` nest a menu inside a menu, and `ContextMenu` exposes the very same parts. On the web, ArrowRight, Enter or Space on a submenu trigger opens the submenu and focuses its first item; hovering or clicking opens it without moving focus; ArrowLeft or Escape closes only the submenu and returns focus to its trigger. Choosing an item at any depth closes the whole menu. On React Native a submenu expands inline within the menu sheet. `ContextMenu.Item` is now the same component as `Menu.Item`. The kit's Menu and ContextMenu gain themed `SubTrigger` (with a trailing chevron) and `SubContent`, and export `MenuSubTriggerPropsThemed`.
