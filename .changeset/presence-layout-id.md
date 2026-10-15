---
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
'@usemotif/compiler-core': patch
---

Add `Presence`, which animates keyed children in and out: a child that leaves stays mounted until its `exitStyle` finishes, and `mode="wait"` holds a new child back until the old one has exited. Add `layoutId` to `Box` and `useLayoutAnimation`: when a Box with an id unmounts and another with the same id mounts, the new one animates from the old one's position and size. The compiler leaves a Box with `layoutId` in place.
