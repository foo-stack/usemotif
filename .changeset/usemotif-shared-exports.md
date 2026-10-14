---
'usemotif': minor
---

`usemotif` now re-exports every name `@usemotif/react` and `@usemotif/react-native` both export, from both of its entries. Newly available: `useThemeSetting` and its types (`ThemeMode`, `ResolvedTheme`, `SyncStorage`, `UseThemeSettingOptions`, `UseThemeSettingResult`), `Direction`, `DirectionContext`, `useDirection`, `PresenceContext`, `usePresence`, `getMotionDriver`, `registerMotionDriver`, `useBreakpointWidths`, `registerVirtualListImpl`, `SVG_PRIMITIVES`, and the types `DirectionProps`, `MotionPhase`, `PresenceContextValue`, `ThemeContextValue`, `SvgPrimitives`, `VirtualListImpl`, `MotionValueWideningOf` and `MotionValueWidenedProp`. A test now fails if a shared name is missing from either entry.
