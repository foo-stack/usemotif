---
'@usemotif/headless': minor
---

New `PinInput`, a one-time-code input with a box per character. Typing advances, pasting or autofilling a code fills every box (the first box offers the platform's one-time-code autofill), Backspace steps back, and `onComplete` fires once with the full code. Numeric or alphanumeric, with `mask` for password-style boxes, on web and React Native.
