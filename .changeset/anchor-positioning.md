---
'@usemotif/headless': minor
---

Popover, HoverCard, Menu and its submenus, Select, Combobox and NavigationMenu submenus open in the top layer through the browser Popover API and are placed by CSS anchor positioning where the browser supports both, so they escape `overflow: hidden` and stacking contexts and track their trigger without script. Other browsers keep the script positioning. Arrows and `data-side` follow the side the surface actually landed on in both cases.
