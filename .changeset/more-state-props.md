---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'@usemotif/compiler-core': minor
---

Four more state props: `_invalid` (`[aria-invalid="true"]`), `_pressed` (`[aria-pressed="true"]`), `_focusWithin` (`:focus-within`) and `_readOnly` (`[readonly]`, `[aria-readonly="true"]`), alongside `_checked`, `_selected` and `_expanded`. The compiler extracts them like the other states. React Native ignores them, as it does the other ARIA states.
