---
'@usemotif/headless': patch
---

Floating elements stay in the viewport. Popover, Menu and its submenus, HoverCard, Tooltip, the Combobox and MultiSelect lists, and NavigationMenu submenus now flip to the opposite side when their preferred side lacks room (to the roomier side when neither fits) and shift along the edge to stay inside the viewport, with no new dependency. `computePosition` reports the side used as `placement`, and `useFloatingPosition` returns it.
