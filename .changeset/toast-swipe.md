---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

Toasts can be swiped away. A sideways drag, released more than 80 px from where it started or flicked faster than 500 px/s, dismisses the toast on web and React Native; anything less springs back. It is built on `useDrag`, keeps vertical scrolling on touch screens, and on the web leaves presses on a toast's own buttons and links alone. `Toaster` and the headless `Toast` take `swipeToDismiss`, default `true`; the kit's toasts get it with no change.
