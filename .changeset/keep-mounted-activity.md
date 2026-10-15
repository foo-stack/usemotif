---
'@usemotif/headless': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'@usemotif/ui': minor
---

`keepMounted="activity"` on `Tabs.Panel`, `Dialog.Content` and `Drawer.Content`, and on `Show` and `Hide`, keeps hidden content mounted through React's `<Activity>`: its state survives, its effects pause, and its updates run at low priority. It is feature-detected, so on React before 19.2 the content unmounts as before. Native Dialog and Drawer render a React Native `Modal`, which cannot stay mounted while closed, so the prop is web-only there.
