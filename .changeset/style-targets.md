---
'@usemotif/react': minor
---

`styleTarget` on `ThemeProvider` adopts motif's CSS into a shadow root or another document, such as an iframe's, through a constructable stylesheet: the theme, every rule emitted at runtime, and server-rendered rules. `registerStyleTarget` does the same outside React.
