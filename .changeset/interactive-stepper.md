---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`Stepper` takes `onStepChange`, which makes each step a button (a Pressable on React Native) reporting the id clicked, and `linear`, which allows going back to earlier steps but not skipping ahead. `renderStep` receives `selectable`. Without `onStepChange` the Stepper renders as before. The kit Stepper passes both props through.
