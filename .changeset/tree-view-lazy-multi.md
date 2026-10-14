---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`TreeView` loads children on demand and selects several nodes, on web and React Native and in the kit. A node marked `hasChildren` is a branch whose children `loadChildren(node)` fetches the first time it expands; while that is pending the node is `aria-busy` and `renderNode` gets `isLoading`, and a rejected load collapses the node so expanding retries. `selectionMode="multiple"` takes an array `value`, toggles a node on activation, and marks the tree `aria-multiselectable`; `TreeViewProps` keeps its shape and `MultiTreeViewProps` is new. In the kit, clicking a row's chevron now only toggles it instead of also selecting the row, and a loading branch shows "Loading".
