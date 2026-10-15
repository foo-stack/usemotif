---
'@usemotif/icons': minor
---

`usemotif-icons build <folder> --out <folder>` turns SVG files into tree-shakable icon components drawn through the cross-platform SVG primitives, keeping the `viewBox` and the root's presentation attributes. SVGs that need what React Native cannot draw (text, images, `use`, gradients, masks, clip paths, filters, CSS) are skipped with the reason, and the command exits non-zero.
