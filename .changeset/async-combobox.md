---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

Combobox and Search support options fetched as the user types. `loading` on the root makes the list show `loadingMessage` (default "Loading...") while it has no options, and sets `aria-busy` on the web listbox; `filter={false}` shows `options` exactly as given, for results a server already matched. `onInputValueChange` already fires on every keystroke and is the hook to fetch from. Both work on React Native too. The kit's `Combobox` and `Search` pass through `loading`, `filter`, `inputValue`, `onInputValueChange`, `loadingMessage` and `emptyMessage`.
