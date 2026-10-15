---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

CommandPalette commands can open nested pages: a command with `children` shows them as a page with its own search, Backspace on an empty input or Escape goes back (the Android back button on native), and the new `CommandPalette.Breadcrumb` part shows the trail. The kit renders a themed breadcrumb. `Command.onSelect` is now optional, since a command with `children` does not need one.
