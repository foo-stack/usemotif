---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`modal={false}` on `Dialog.Root`, and so on Drawer, Sheet and the kit Modal, Drawer and Sheet, leaves the page usable while the dialog is open. It drops the background `inert` and scroll lock and `aria-modal`, uses a click-through layer around the surface, and removes the focus trap. Focus still moves in on open and back on close, and Escape and a press outside still close it. On React Native the dialog stays in RN's `Modal`, and `modal={false}` only stops marking it modal to assistive tech.
