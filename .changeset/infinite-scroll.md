---
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
---

`ScrollView` and `VirtualList` take `onEndReached` and `onEndReachedThreshold`, with FlatList's semantics: the callback fires within the threshold, in visible lengths, once per content length, and also when the content does not fill the view. The TanStack and FlashList `VirtualList` implementations wire them up. On React Native, `ScrollView` and the FlashList implementation take typed `onRefresh` and `refreshing` for pull to refresh. The web accepts both and ignores them, so shared code typechecks.
