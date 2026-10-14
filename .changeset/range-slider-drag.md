---
'@usemotif/headless': minor
---

RangeSlider thumbs drag on both platforms. On the web, pressing the track moves the nearest thumb to the pointer and drags it. On React Native, the RangeSlider now renders its fill and two positioned thumbs, styled with new `thumbStyle` and `fillStyle` props, and each thumb drags through `useDrag`. Native thumbs now stop at their neighbour instead of swapping when pushed past it, as on the web.
