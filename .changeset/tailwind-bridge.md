---
'@usemotif/core': minor
---

Add `toTailwindTheme` at `@usemotif/core/tailwind`. It generates a Tailwind v4 `@theme inline` block that points Tailwind's namespaces (`--color-*`, `--spacing-*`, `--radius-*` and the rest) at motif's token variables and copies motif's breakpoints, so Tailwind utilities paint motif tokens and follow theme switches, nested sub-themes included.
