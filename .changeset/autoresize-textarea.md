---
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
---

`TextArea` takes `autoResize` and `maxRows`, and grows and shrinks with its content from `rows` lines up to `maxRows`. On web it uses `field-sizing: content` with `lh`-based bounds, and falls back to a measured height where the browser lacks `field-sizing`. On React Native the height follows `onContentSizeChange`, and the text scrolls once the cap is reached.
