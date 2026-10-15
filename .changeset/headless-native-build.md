---
'@usemotif/headless': patch
---

React Native apps now get headless's native components. The package ships a prebuilt `dist/index.native.js`, with every `.native` variant in place, behind a `react-native` export condition. Before, Metro with package exports resolved the web build (pulling in `react-dom`), and the source route it pointed at failed to resolve.
