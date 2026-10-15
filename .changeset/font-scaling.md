---
'@usemotif/core': minor
'@usemotif/react-native': minor
---

Font-size tokens follow the reader's text size. On web, numeric `fontSizes` tokens are emitted in `rem` instead of `px` (`md: 16` becomes `1rem`), so the browser text-size setting applies; an app that changes the root `html` font size will see its font-size tokens scale with it. A new optional `fontScale: { max }` token caps the growth: `min(1rem, 24px)` on web for `max: 1.5`, and `maxFontSizeMultiplier` on native `Text` and `Input`, which already follow Dynamic Type and Android's font scale.
