# Experience refinement changelog (deliverable C)

What changed for the person using the product, newest first. Each item names the defect it closes (UX_UI_DEFECT_REGISTER.md) and the
test that checks it. Earlier work of this round: 19 Nov, the maps readable on a real phone and the website's "Follow one device" tabs
(docs/qa/MOBILE_MAPS_2026-11-19.md; staged in 2a5b185).

## 20 Nov 2026

### Maps and 3D worlds: the page scrolls, the picture moves when you mean it (D-01, D-02, D-04, D-06, D-12)
- **Interaction.** One finger over the campus map, Expo LIVE, Stadium LIVE or Campus Life now scrolls the page, as on any website with a
  map; two fingers pinch, twist and move the picture. A short hint says so the first time a finger tries to drag it. A tap still opens a
  building or a booth; a drag never does.
- **Desktop.** The plain wheel scrolls the page instead of zooming the picture under the pointer; Ctrl/⌘ with the wheel, or a trackpad
  pinch, zooms; a hint says so. Mouse drag still pans the map and orbits the worlds; right-drag or Shift-drag does the other.
- **Full screen.** The map and each world have a Full screen button: the picture fills the window, one finger and the plain wheel move it,
  and Done or Escape returns to the page where it was.
- **Lite's room in 3D.** A vertical swipe scrolls past it on a phone; a sideways swipe turns it (as Lite's campus already did).
- One module (`apps/demo/src/map/gestures.ts`) now carries the rule for all four pictures, so they behave alike.

### Expo LIVE: the booth you press is the booth you get (D-03, D-05)
- Pressing a stand in the hall chooses it, flies the camera to it and opens its card; in full screen a small card keeps it in view.
- Four buttons on the hall (turn left, turn right, nearer, farther) and the keyboard (arrows, + and −, Shift with the arrows to move along)
  move the camera without dragging. Stadium LIVE has the same buttons and keys.

### Search keeps your place (D-07, D-08, D-09)
- Search Party remembers what you searched, the type you filtered to, the record you chose and the one you inspected, in its own address:
  Back, a refresh, a shared link and the trail all return to it.
- The trail beside the page now offers "Your search: …" as well as "Back to …" (the last place of work), so after Search Party → room →
  Lite → Commissioning the search is one press away.
- The results page keeps the facet you chose when you come back to it.
- Every search field has a visible clear control; focus stays in the field.

### Verification added
- `tests/browser/demo-gestures.test.mjs`: real touch (DevTools touch input in a phone context) and mouse input on the map, the three
  worlds and Lite's room.
- `tests/browser/demo-search-journey.test.mjs`: the directive's product-to-product journey at two widths, and the search cases no other
  suite pressed (partial, multiword, case, building, issue and work order numbers, clear, a tap on a phone).
- `tests/browser/demo-route-sweep.test.mjs`: every registered route opened at 390 and 1440 px.
- `scripts/audit/site-audit.mjs`: `--widths=` for the directive's eight widths; the flagship pages added to the demo's list.
