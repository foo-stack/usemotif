---
'@usemotif/react': minor
---

Add `Form`, which checks the browser's native constraints before it submits and shows each failure through the field's `FieldError` (with `aria-invalid` and `aria-describedby` on the control) instead of the browser's bubble, focusing the first invalid control and rechecking fields as they're edited. A valid submit runs `action` as a React 19 form action; errors it returns, or passes in through `errors`, keyed by control name, land on their fields. An empty `FieldError` inside a `Form` now shows its field's message and renders nothing while the field is valid.
