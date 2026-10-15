---
'@usemotif/react': minor
---

`StyleIsland` server-renders its children with their own style collector and emits their CSS with them as a React 19 hoistable `<style>`, for frameworks that render each island separately, such as Astro with React islands. In the browser it renders its children alone.
