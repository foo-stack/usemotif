---
'@usemotif/react': minor
---

Scroll-linked motion values run as CSS scroll-driven animation where the browser supports `animation-timeline`. A Box bound to a `useScroll` progress value, directly or through a range-form `useTransform`, compiles the binding to `@keyframes` on a `scroll()` timeline (the page or a container) or a `view()` timeline (a target with the default offset), so it animates off the main thread. Other offsets, colour outputs, function transforms and browsers without scroll timelines keep the JS path, with the same values.
