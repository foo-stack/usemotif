---
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
---

`Input` takes `startElement` and `endElement`, shown inside the field before and after the text. With either set, the field renders as a row that carries the border, background and, on web, focus ring, around a borderless input, so the adornments take the width they need and the field keeps a plain Input's height. Without them the Input renders exactly as before. On React Native, string adornments are wrapped in `<Text>`.

The form components' `forwardRef` exports are now marked pure, so a bundle that imports only `Box` no longer carries the forms module. "Box only" falls from 11816 to 10806 gzipped bytes on web, and from 15285 to 14161 on React Native.
