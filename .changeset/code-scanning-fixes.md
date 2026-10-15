---
'@usemotif/icons': patch
'@usemotif/migrate': patch
---

`usemotif-icons build` strips SVG comments until none are left, so removing one cannot form another. The styled-components codemod strips CSS comments in linear time, where a string of unclosed `/*` used to take quadratic time.
