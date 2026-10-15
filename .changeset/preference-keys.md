---
'@usemotif/core': minor
'@usemotif/react-native': minor
---

Responsive values take user-preference keys beside the breakpoints: `@contrast`, `@forcedColors`, `@reducedTransparency`, `@print` and `@landscape`. On the web each is a media query emitted after every width rule, so a preference wins; the compiler extracts them too. On React Native, `@contrast` and `@reducedTransparency` follow `AccessibilityInfo`, `@landscape` follows the window, and components re-render when a setting changes.
