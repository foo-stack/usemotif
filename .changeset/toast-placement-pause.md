---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

The web `Toaster` takes a `placement`: `'top'` and `'bottom'` centre the list, as on React Native, and four corner placements are web-only. The default stays `'bottom-end'`. Its default list pauses every toast's dismiss timer while the pointer is over it or focus is inside it, and resumes each with its remaining time. A new `renderToast(item, { dismiss })`, the signature React Native already has, renders each toast's content inside the default list. The kit `Toaster` now renders through it, so it gains placement, pausing, and the default list's swipe and exit handling.
