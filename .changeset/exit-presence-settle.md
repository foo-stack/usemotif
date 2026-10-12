---
'@usemotif/react': minor
'@usemotif/headless': patch
---

`useExitPresence` now returns `settle`, which ends the current exit immediately as if every registered exit had completed. `@usemotif/headless` builds its overlay exits on it instead of keeping its own copy of the presence state machine.
