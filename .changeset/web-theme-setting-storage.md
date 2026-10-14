---
'@usemotif/react': minor
---

`useThemeSetting` on web accepts a `storage` option, any object with synchronous `getItem`, `setItem` and `removeItem`, and persists the user's theme override there instead of `localStorage`. `storage: null` turns persistence off. The `SyncStorage` type is exported, with the same shape as the React Native one, so one store type-checks on both platforms.
