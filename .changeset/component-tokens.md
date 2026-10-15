---
'@usemotif/core': minor
'@usemotif/recipes': minor
---

Token references accept fallback chains: `'$components.button.primary.bg ?? $colors.action.primary.bg'` resolves to the first alternative the theme defines, with a trailing literal as the default. On web a chain emits nested `var()` fallbacks. Themes gain an optional `components` scale, and every colour and radius in the recipes now reads `$components.<recipe>.<variant>.<prop>` before its semantic token, so a theme can restyle the kit without forking it. Strict token paths and the lint rule check the last alternative of a chain.
