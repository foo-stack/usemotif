---
'@usemotif/headless': minor
---

The web `Calendar` and `DatePicker` take `minDate` and `maxDate`, as native already did: days outside are disabled, and keyboard focus stops at the bounds. Both platforms take `numberOfMonths` to show consecutive months side by side. On web, focus moves across them and the view slides when focus leaves the last one, and outside-month days are left blank when more than one month shows. The kit Calendar and DatePicker pass all three through.
