---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

New `TagsInput`, an input that turns entries into tags. Enter or a delimiter (a comma by default) adds the typed entry, a paste adds every entry in it, and Backspace in an empty input removes the last tag; entries are trimmed and de-duplicated, and `validate` and `max` filter them. With `suggestions`, the input becomes the headless Combobox's input and a picked suggestion becomes a tag. It works on web and React Native, and the kit draws each tag as a removable `Chip`. `Chip` gains `removeLabel` to name its remove button.
