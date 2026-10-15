---
'@usemotif/tokens': minor
---

`generatePalette(color)` builds a 12-step light and dark scale from one brand colour in OKLCH. Step 9 is the colour itself, steps 11 and 12 are text held to 4.5:1 and 7:1 contrast against step 2, and chroma is reduced on any step that would leave sRGB.
