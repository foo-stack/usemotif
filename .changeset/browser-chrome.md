---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/tokens': minor
---

Themes can declare `colorScheme` (`'light'` or `'dark'`) and `themeColor`, a colour or `$`-token. On web the theme's CSS block emits `color-scheme`, and the root `ThemeProvider` sets `color-scheme` on `<html>` and writes the resolved colour to `<meta name="theme-color">` for the active theme, restoring what was there on switch or unmount. Metas with a `media` attribute are left alone. The `@usemotif/tokens` presets declare both, with `themeColor` set to `$colors.surface.base`. React Native ignores the two fields.
