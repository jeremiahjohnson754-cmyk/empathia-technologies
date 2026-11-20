# Spatial and map QA (deliverable E)

Founder, 20 Nov 2026 05:34: "the campus maps and maps everything in general are a little too sensitive especially for mobile users it's
hard to scroll down to the page"; of Expo LIVE: "It doesn't take me there, Hard to move around"; of the stadium and the expo: "looks
amazing but hard to experience them". Earlier (19 Nov 20:16): labels, route contrast and controls readable on a real phone; the synthetic
label kept (docs/qa/MOBILE_MAPS_2026-11-19.md).

## One gesture model for every picture

`apps/demo/src/map/gestures.ts` is now the only input code of the campus map (`EmpathiaMap`), Expo LIVE, Stadium LIVE and Campus Life.
It follows the pattern people know from maps on other websites:

| | On the page | In full screen |
|---|---|---|
| One finger | **scrolls the page**; the picture stays still and shows “Use two fingers to move the picture, or open it full screen.” | moves the picture (pan or orbit) |
| Two fingers | pinch zooms, twist turns, moving together pans (the map, Expo) or orbits (the stadium, Campus Life) | the same |
| Tap | opens what is under it, only if the finger moved under 10 px and lifted within 600 ms | the same |
| Mouse drag | moves the picture (pan on the map, orbit in the worlds); right-drag or Shift-drag does the other | the same |
| Plain wheel | **scrolls the page**; the picture shows “Hold Ctrl and scroll to zoom.” (⌘ on a Mac) | zooms |
| Ctrl/⌘ + wheel, trackpad pinch | zooms about the pointer | zooms |
| Click | opens what is under it only if the mouse moved under 5 px; a drag never opens anything | the same |

CSS gives the browser one-finger pans on the page (`touch-action: pan-x pan-y`) and takes them back in full screen (`none`). Full screen
is the picture filling the window (a fixed layer, the page behind it not scrolling), not the browser's Fullscreen API, which phones do not
all offer for an element; Done or Escape leaves it.

Lite's room and space scenes (`Scene.tsx` `useOrbit`) and Lite's campus/building/floor views (`l3.tsx`) keep V2.5.3's phone rule: a
finger moving up or down scrolls the page, a finger moving sideways turns the view, two fingers pinch. Before today the room and space
scenes took every touch (`touch-action: none`), so a phone could not scroll past them.

## Moves without dragging (WCAG 2.2, 2.5.7)

Expo LIVE and Stadium LIVE could only be turned and zoomed by dragging. Both now carry four buttons on the picture (turn left, turn right,
nearer, farther; `apps/demo/src/play/MovePad.tsx`) and answer the keyboard once the picture has focus (arrows turn and tilt, + and − zoom,
Shift with the arrows moves along the hall). The map already had zoom, north-up and keyboard moves; Expo's plan beside the hall picks any
booth with one press.

## Expo LIVE: a booth in the hall takes you there

A booth under a tap or click is found by projecting each booth's footprint, raised to its wall height, through the camera actually drawn,
and taking the nearest that contains the point (`boothAt`); the camera then flies to it (in reduced motion it jumps), the booth is outlined
and its card opens. In full screen a small card keeps the chosen booth in view with a Details button. Before, the hall itself chose
nothing: only the small name tags floating over the booths, the plan and the list did, and a press on a stand only started a drag (the
canvas said "Drag to look around; choose a booth on the plan or in the list").

## What is checked, and where

| Check | Test |
|---|---|
| Phone: one finger over the map scrolls the page, the map stays, the hint shows | GS-map-01 |
| Phone: pinch zooms, two fingers pan, the page stays | GS-map-02, GS-map-03 |
| Phone: a tap opens a building | GS-map-04 |
| Phone: full screen fills the window, one finger moves the map, every control inside the window, Done leaves | GS-map-05…07 |
| Mouse: plain wheel scrolls the page with the hint; Ctrl+wheel zooms; drag pans and opens nothing; right-drag turns; full screen wheel zooms; Escape leaves | GS-map-09…13 |
| Expo: a drag looks around and chooses nothing; the wheel scrolls the page; a click on a booth in the hall chooses it, flies to it, opens its card | GS-xpo-01…03 |
| Expo, phone: one finger scrolls; pinch and two-finger move; a tap on a booth takes you there; full screen with the booth card; Done | GS-xpo-05…09 |
| Expo and Stadium: buttons and keyboard move the camera without dragging | GS-xpo-11, GS-slv-07 |
| Stadium and Campus Life, phone: one finger scrolls; two fingers turn; full screen; Done | GS-slv-01…04, GS-cl-01…04 |
| Stadium, mouse: drag orbits, wheel scrolls the page, Ctrl+wheel zooms | GS-slv-05 |
| Lite's room in 3D, phone: a vertical swipe scrolls, a sideways one turns | GS-lite-01 |
| The map at 360/390/412 px: labels inside the picture, clear of each other and of the controls, ≥ 11 px; controls ≥ 44 px; the synthetic line whole; route lines cased | MAP-read-* (19 Nov) |
| Campus → building → floor → room drill and back, search, lenses, jumps that keep the building | MAP-01…, demo-map |
| Lite: campus, building, floor, room, 2D/3D, arranging | demo-lite, demo-lite-spatial, demo-lite-arrange |

`tests/browser/demo-gestures.test.mjs` is new today; results in END_TO_END_TEST_RESULTS.md.

## Limits

- Headless Chromium draws WebGL in software here: frame rate is not measured, and no claim is made about it.
- Touch is the browser's own touch input driven by DevTools, in Chromium only. Safari on an iPhone was not available to this work; the
  model uses standard touch events and `touch-action`, which Safari supports, but it has not been seen on a real iPhone.
- The aerial and street styles of the map are synthetic and say so on the picture; no real imagery is used.
