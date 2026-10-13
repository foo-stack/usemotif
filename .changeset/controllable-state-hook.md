---
'@usemotif/headless': minor
'@usemotif/ui': patch
---

`@usemotif/headless` exports `useControllableState`, the controlled-or-uncontrolled state hook its own components and the kit's `Select` now share. Pass `value`, `defaultValue` and `onChange`; pass `controlled` to keep `value={undefined}` controlled.
