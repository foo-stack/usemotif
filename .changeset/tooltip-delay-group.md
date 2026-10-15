---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`Tooltip.Provider` groups tooltips. Once one is showing, moving to another trigger in the group opens that tooltip at once and hides the first. The delay returns when no tooltip in the group has been open for `skipDelayDuration`, which defaults to 300ms. On React Native the Provider renders its children unchanged. The kit `Tooltip` namespace exposes it too.
