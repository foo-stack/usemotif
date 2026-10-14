---
'@usemotif/react': minor
'usemotif': minor
---

`useContainerInfo()` on web returns the measured widths of the enclosing `Container`s, `{ nearestWidth, named }`, in the same shape as React Native. A `Container` measures only while something below it calls the hook, through a `ResizeObserver` that stops when the last reader unmounts. `usemotif` exports `useContainerInfo` and `ContainerContextValue` from both its web and native entries.
