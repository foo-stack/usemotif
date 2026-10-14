---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

The web `ContextMenu` opens on a touch long-press as well as on right-click, as the React Native one already does. A touch held for `longPressDelay` (500 ms by default) opens the menu at the finger; moving more than 10 px, lifting, or a cancelled touch stops it, and the click a browser may send on release is swallowed. Mouse and pen input are unchanged.
