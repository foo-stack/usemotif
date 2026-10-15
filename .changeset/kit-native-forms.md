---
'@usemotif/ui': minor
---

The kit's form controls render on React Native. Checkbox, Switch, Radio and RadioGroup take their headless twins' `value`, `defaultValue` and `onValueChange` on native; the rest keep their props. The web CSS the kit passes to headless parts is converted for native (token variables resolved, shorthands split), and web output is unchanged.
