---
'@usemotif/migrate': minor
---

Add `import-tokens`, which turns a W3C Design Tokens file into a typed `createTheme` module. Each token lands in the motif scale its type names, aliases become `$`-references so the file's primitive and semantic layers carry over, and composite types with no single scale are skipped with a warning. `designTokensToTheme` and `printThemeModule` expose the same conversion to code.
