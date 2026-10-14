---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'@usemotif/compiler-core': minor
---

Group states: set `group` on a Box and its descendants can style themselves by its state with `_groupHover`, `_groupFocus` (`:focus-visible`) and `_groupActive`. The group renders a `data-motif-group` attribute, exported from core as `GROUP_ATTRIBUTE`, and the child's rule keys on it, as in `[data-motif-group]:hover .m-x`. Responsive values work inside group states too. The compiler extracts a child's group states and keeps a `group` Box as a wrapper. It is web-only for now: React Native ignores `group` and the three props.
