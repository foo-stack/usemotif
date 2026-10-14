---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

Options take a `group`. Select, Combobox, Search, MultiSelect and Listbox wrap each consecutive run of a group in a `role="group"` labelled by its heading, which `renderGroupLabel` restyles. Options keep flat indexes, so keyboard navigation and type-ahead move straight through, and filtering drops empty groups. A grouped list renders every row instead of windowing. On React Native the options sheets show each heading above the first option of its group. The kit lists render themed headings.
