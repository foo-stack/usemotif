---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

Pagination gains `boundaries`, the count of pages always shown at each end, and an optional page-size part (`pageSize`, `pageSizeOptions`, `onPageSizeChange`, plus `renderPageSize` in headless). Changing the size reports the page that keeps the first item of the current page in view. The kit renders it as a themed select.
