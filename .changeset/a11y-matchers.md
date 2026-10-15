---
'@usemotif/test-utils': minor
---

`toHaveRole`, `toHaveAccessibleName` and `toBeExpanded` join `motifMatchers`. They accept a web DOM element or a React Native test instance and assert the same ARIA meaning on both: native role names such as `header` read as `heading`, and the name comes from labels, `accessibilityLabel` or text. `accessibleFacts` returns the role, name and expanded state together.
