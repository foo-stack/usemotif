---
'@usemotif/react': minor
---

`motifStyleStream(collector)` in `@usemotif/react/server` is a Node stream to pipe a streaming React render through: it writes the collected CSS into `<head>` with the shell and ahead of each later chunk, so Suspense content arrives with its styles. The server-rendering guide shows it in a React Router 7 `entry.server`.
