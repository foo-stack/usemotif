---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`FileUpload` takes `maxSize` and `maxFiles`, and an `onReject` callback that receives every refused file from a pick or drop with every rule it broke: `type`, `size` or `count`. A file counts against `maxFiles` only once it passes the type and size rules. One rule set applies on web and native, including to dropped files. Without `multiple`, extra files are now reported as `count` rejections instead of being dropped silently. The kit `FileUpload` passes all three through, and `FileRejection` and `FileRejectionReason` are exported.
