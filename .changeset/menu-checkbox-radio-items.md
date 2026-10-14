---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`Menu.CheckboxItem`, `Menu.RadioGroup` with `Menu.RadioItem`, and `Menu.Label`, with `ContextMenu` exposing the very same parts. The checkable items are `menuitemcheckbox` and `menuitemradio` with `aria-checked` and a `data-state` attribute, close the menu like `Menu.Item` unless `closeOnSelect` is `false`, and are arrow-key items; a `Label` is skipped. They work on React Native too. The kit draws a check or a dot in a fixed indicator column and exports `MenuCheckboxItemPropsThemed` and `MenuRadioItemPropsThemed`.
