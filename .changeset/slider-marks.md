---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`Slider` and `RangeSlider` take `marks`, points along the track with optional labels, on web and React Native. Marks are hidden from assistive technology, flagged `data-active` on the web inside the filled range, and a string label becomes the value's `aria-valuetext` when the thumb sits on it. `RangeSlider` takes `orientation="vertical"`, placing its fill and thumbs from the bottom on the web and stacking its thumbs on native. The kit draws marks as ticks with labels and stands its RangeSlider upright when vertical. New type: `SliderMark`.
