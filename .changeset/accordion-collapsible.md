---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`collapsible={false}` on `Accordion.Root` keeps one item always open in single mode: the open item's trigger no longer closes it and is marked disabled (`aria-disabled` on web, `accessibilityState.disabled` on native). Collapsible stays the default.
