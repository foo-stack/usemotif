---
'@usemotif/react-native': minor
---

`renderStyles` in `@usemotif/react-native/testing` returns an element's resolved styles in the same shape as the web `renderStyles`, so `toHaveStyle` and `toHaveStyleAt` hold on both platforms. It renders with `test-renderer` (an optional peer), and simulates breakpoints by rendering at each breakpoint's width and press states through `testOnly_pressed`.
