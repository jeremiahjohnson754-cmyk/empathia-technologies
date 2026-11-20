# The maps on a phone, measured (19 Nov 2026)

**Directive:** founder, 19 Nov 2026 20:16, with two phone screenshots of Lite's campus: "the building labels, route contrast, and controls
need to remain readable on a real mobile viewport, not just in a scaled screenshot. Also, the image correctly labels the aerial
environment as synthetic, which matters for investor credibility."

**How it was measured:** `scripts/verify/mobile-maps.mjs` opens the built demonstration in Chromium with Playwright's phone profiles
(iPhone SE 320 px at 2×, iPhone 13 390 px at 3×, Pixel 7 412 px at 2.625×: their CSS width, pixel ratio, touch and mobile layout). That is
an emulated phone, not a physical handset. It visits seven views: Lite's campus, the campus with the visitor lens and with the engineer
lens, a building's floors (Atlas), one floor (Atlas 4), the start page's map and the campus page. In each view it measures:

- every label's box: inside the picture, clear of the other labels and of the map's controls, and its type size;
- every control's size;
- whether the line saying the picture is synthetic is shown in full;
- each lens line's contrast, from the screenshot's own pixels. Each side of the line is measured separately. A side passes on whichever
  is higher: the line against the ground beside it, or its casing against both the line and the ground (WCAG ratio). The sample points
  under the phone's tab bar are not measured.

## What it found, and what changed

| Phone | View | Label problems before → after | Controls under 44 px before → after | Synthetic line | Lens-line contrast, median per line, before → after |
|---|---|---|---|---|---|
| iPhone SE | Lite campus, visitor | 11 → 0 | 4 → 0 | cut → full | 2.26 → 5.5 |
| iPhone SE | Lite campus, engineer | 8 → 0 | 4 → 0 | cut → full | 2.06 / 4.23 / 2.08 → 4.1 / 3.83 / 5.05 |
| iPhone SE | Atlas, floors | 8 → 0 | 7 → 0 | cut → full | — |
| iPhone SE | Atlas floor 4 | 10 → 0 | 7 → 0 | cut → full | — |
| iPhone SE | start page map | 8 → 0 | 9 → 0 | cut → full | — |
| iPhone 13 | Lite campus, visitor | 6 → 0 | 4 → 0 | cut → full | 1.86 → 4.47 |
| iPhone 13 | Lite campus, engineer | 4 → 0 | 4 → 0 | cut → full | 1.83 / 2.04 / 1.78 / 2.49 → 4.03 / 3.73 / 3.81 / 5.1 |
| iPhone 13 | Atlas, floors | 6 → 0 | 7 → 0 | cut → full | — |
| iPhone 13 | Atlas floor 4 | 7 → 0 | 7 → 0 | cut → full | — |
| iPhone 13 | start page map | 8 → 0 | 9 → 0 | cut → full | — |
| Pixel 7 | Lite campus, visitor | 5 → 0 | 4 → 0 | cut → full | 1.83 → 4.63 |
| Pixel 7 | Lite campus, engineer | 3 → 0 | 4 → 0 | cut → full | 1.79 / 2.04 / 2.01 / 2.4 → 4.03 / 3.85 / 3.79 / 5.04 |
| Pixel 7 | Atlas, floors | 5 → 0 | 7 → 0 | cut → full | — |
| Pixel 7 | Atlas floor 4 | 7 → 0 | 7 → 0 | cut → full | — |
| Pixel 7 | start page map | 8 → 0 | 9 → 0 | cut → full | — |

The campus page and the plain Lite campus behaved like the rows above: 3–8 label problems before, 0 after; 4–9 small controls before, 0
after.

Before, on a phone:

- the map's search and the "Campus" level button sat over the map, covering Beacon and Northstar;
- pins overlapped each other and ran off the edge;
- the visitor lens's "From the visitor car park" sat under the layer switch;
- the line saying the imagery is synthetic was cut to "…of a fictional campu…";
- on a building and a floor, that line was printed over the camera buttons, and the room labels on a floor covered one another;
- the layer and camera buttons were 38–40 px.

Now:

- **The Empathia Map** (Lite's campus, the start page, the campus page and everywhere else it appears):
  - On a phone, the search, the level and the layers (Aerial, Map, 3D) form a toolbar above the map, so only the zoom stays on the
    picture. Every control is 44 px.
  - The line saying what the map is (synthetic aerial imagery of a fictional campus; heights and floor layouts modeled) sits under the
    map in full.
  - A pin or a lens label that would cover another, a control or the edge moves to the nearest free place: up first, then down, then a
    little to the side. Its pointer stays over its building, and a thin leader joins the two.
  - Each lens line is drawn as a bright stroke on a dark casing, so it stands out on grass, paving and roofs alike.
- **Lite's own 3D scenes** (a building's floors, one floor, the campus without WebGL):
  - Labels are kept apart by their measured sizes, placed from the bottom of the picture up, and moved only as far as they must, so the
    stack of floors keeps its order. They are kept inside the picture's edges.
  - On a phone, a room's tag shows its number (its name on the room's own page and for the marked room).
  - The synthetic line sits under the camera buttons in full, and the buttons are 44 px.

## What stays as it is, said plainly

- **Not a physical handset.** This is an emulated phone in Chromium; Safari on an iPhone was not run.
- **Contrast is a median.** Some sample points along the lines stay lower: the lowest single points are 1.5–2.5 : 1, at bends and where
  a dash ends. The medians are 3.7–5.5 : 1.
- **The smallest phone drops a floor label.** On the iPhone SE the top floor's label of Atlas does not fit above the others and is not
  drawn. Its floor is still a button, and its name is in the list under the picture.
- **The film and the website's still captures are unchanged.** They are pictures taken at desktop size. The website shows them as
  pictures of the product, labelled so, not as the map itself.

## Found by the full regression on 99cfa62, fixed in the next commit

demo-lite-spatial failed two checks at 412 px:

- **LS-phone-01: Lite's campus started at 463 px on a 915 px screen.** The test wants the scene in the top half, as the page's hero. The
  toolbar above the map had taken two rows. The search, the level and the layers now share one row where they fit (412 px, and the
  iPhone 13), so the campus starts at 176–236 px. On the smallest phones the toolbar still wraps to two rows.
- **LS-phone-04: on floor 4 the Lifts and Stairs tags were dropped instead of moved.** Lite's placement gave way-finding tags no moves
  at all. They now move like a room's tag. On the 320 px iPhone SE, Lifts and 4.128 still touch at a corner by a few pixels: both read,
  and that width is below the three the test checks.

After the fix, demo-lite-spatial is 74/74 and demo-map 35/35. The phone check above is clean on all seven views and three phones, apart
from that corner on the iPhone SE.

## The tests that keep it

- `tests/browser/demo-map.test.mjs` MAP-read-360, MAP-read-390 and MAP-read-412 check, at 360, 390 and 412 px, on Lite's campus with
  each lens, a building's floors and one floor:
  - every label is inside the picture, clear of the others and of the controls, at 11 px or more;
  - every control is 44 px;
  - the synthetic line is shown in full;
  - every lens line has its casing.
- Run on the build before these changes, the three checks fail with the problems above. They pass on this one.
