---
'@usemotif/react-native': patch
---

With the Reanimated driver registered and gesture-handler installed, a drag no longer remounts the dragged element when it starts. The driver handed back a new `Wrapper` component on every render, so the re-render at gesture start swapped the subtree under the gesture.
