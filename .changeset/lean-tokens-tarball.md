---
'@usemotif/tokens': patch
---

Stop shipping the Material 3, Primer and Atlassian validation themes in the published tarball. They are test fixtures, never exported, and now live under `src/__fixtures__/`, which the package already excludes from `files`.
