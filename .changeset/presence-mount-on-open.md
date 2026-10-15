---
'@usemotif/react': patch
'@usemotif/headless': patch
---

A Popover opened by a click, or a Tooltip opened by hover or focus, now appears beside its trigger instead of at the top-left corner of the page. `useExitPresence` reported `open` a render after `open` turned true, so the content mounted after the positioning had already run with nothing to measure. Content now mounts in the same render it opens.
