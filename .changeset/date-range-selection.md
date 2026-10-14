---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`Calendar` and `DatePicker` take `mode="range"` to pick a start and an end date, in the headless components on web and React Native and in the kit. The value is a `DateRange`, `{ start, end }`, with `end` `null` until the second pick; a second pick earlier than the first swaps the two. Every day in the range is selected for assistive technology, and `renderDay` receives `isRangeStart`, `isRangeEnd` and `isInRange`. A range `DatePicker` stays open after the first pick, closes after the second, and labels the range with both dates. The kit paints the ends as selected and tints the days between. `CalendarProps` and `DatePickerProps` keep their shape; `RangeCalendarProps`, `RangeDatePickerProps`, `DateRange` and `CalendarDayInfo` are new exports.
