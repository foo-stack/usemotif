---
'@usemotif/headless': minor
---

Long option lists render only the rows in view. From 50 options, `Combobox.List`, `Select.List`, `Search.List`, `MultiSelect.List` and `Listbox` window their rows against the listbox's scroll. Spacers keep the scroll extent, rows carry `aria-setsize` and `aria-posinset`, and the highlighted row is scrolled into view and always rendered. Row height is measured from the first row, or set with the new `itemHeight` prop. On React Native the Combobox and MultiSelect sheets render through `FlatList`.
