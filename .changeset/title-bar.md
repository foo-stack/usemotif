---
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
'@usemotif/test-utils': minor
---

Add `TitleBar`, a custom window title bar for frameless desktop windows. On web it drags the window under Electron's `app-region` and Tauri's `data-tauri-drag-region`, keeps its `leading` and `trailing` slots clickable, and pads clear of the OS window controls under Window Controls Overlay. On React Native desktop it lays out the same slots. `TitleBar` joins the conformance suite's primitives.
