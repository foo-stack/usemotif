---
'@usemotif/react': minor
---

`viewTransition` on `Presence` and `ThemeProvider` hands keyed swaps and theme switches to the browser's View Transitions API where it is supported: the old render is snapshotted and crossfaded into the new one, and `layoutId` boxes morph between them. `enterStyle`, `exitStyle` and layout FLIP stand down during the swap and remain the fallback without the API or under reduced motion.
