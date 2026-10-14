---
'@usemotif/core': minor
'@usemotif/react-native': minor
---

Keyframe animations run on React Native. A `Box` whose `animation` is an object with a `keyframes()` result as its `name` now animates its stops on native, honouring `duration`, `delay`, `easing`, `iterationCount`, `direction`, `fillMode` and `playState`. Numbers, colours, same-unit lengths and matching `transform` lists interpolate; other values switch halfway, as in CSS. `Keyframe` objects now carry the definition they were built from as `frames`.
