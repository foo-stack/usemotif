---
'@usemotif/react-native': minor
'usemotif': minor
---

`useThemeChain()` works on React Native, returning the theme names from the root `ThemeProvider` down to the current scope as it does on web: `<ThemeProvider active="dark"><Theme name="red">` yields `['dark', 'red']`. `usemotif` now exports `useThemeChain` from both its web and native entries.
