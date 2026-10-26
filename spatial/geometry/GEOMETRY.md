# Room geometry

Source of truth: `packages/commissioning-engine/src/geometry.ts` and `design.ts` (ported unchanged from the 2.5.4 demonstrator
`src/v25-60-room.js`; parity enforced by `packages/commissioning-engine/test/parity.test.ts` over 92 golden cases).

## Frame and units
* **Units: metres** for every length and position, **degrees** for rotation. Feet are converted on entry: `toMetres(v, 'ft') = v × 0.3048`,
  rounded to 1 mm; `fromMetres` for display rounds to 0.01 of the display unit.
* **Plan frame:** origin at the outline's minimum corner after normalisation; `x` grows to the right and `y` grows down the page in every
  plan view (demonstrator `v25RbPlanSvg`, enterprise `FloorPlan.tsx`). `y` is the room's **length** axis and `x` its **width** axis
  (`lengthM` = extent in y, `widthM` = extent in x; the town-hall seed is 18 m wide × 26 m long).
* **Height:** `z` is metres above the finished floor; `ceiling` is the floor-to-ceiling height.
* **Rotation:** `rot` in degrees; positive turns clockwise as drawn on the plan (SVG `rotate(rot)` with y down).

## Typed lengths (`parseLength`)
Accepts feet-and-inches (`12' 6"`, `12ft 6in`, `12'`) or a positive bare number in the chosen unit. Anything else is **refused**
(`null`) — the API reports the field as UNREADABLE and substitutes nothing.

## Outlines
`points: [[x, y], …]`, first point not repeated, clockwise or counter-clockwise. Generated shapes (`shapes`):
`rect(w, l) = [[0,0],[w,0],[w,l],[0,l]]`; `lshape(w, l) = [[0,0],[w,0],[w,0.55l],[0.6w,0.55l],[0.6w,l],[0,l]]`.

A drawn or typed outline is accepted by `polygonCheck(points)` only when:
1. it is a list of corners with two finite numbers each;
2. after merging consecutive corners closer than **0.01 m** there are **3 to 40** corners;
3. it is translated so its minimum x and y are 0 (the shift is returned) and rounded to 1 mm;
4. its extent is **0.5 m to 200 m** on both axes;
5. no two non-adjacent edges cross or touch (orientation test with collinear-overlap handling);
6. it encloses at least **2 m²** (shoelace).
The API additionally requires (createRoom) a ceiling above 1.8 m and below 30 m, and length and width above 0.5 m and below 200 m.

## Measures
`area(g)` — shoelace area, m², rounded to 0.01. `box(g)` — extent `{ w, l }`. `inside(g, x, y)` — even-odd point-in-polygon with the
demonstrator's 1e-12 denominator guard; the design checks flag any non-furniture, non-rack device outside the outline (`checks.ts` 67).

## Provenance and confidence
Each dimension carries where it came from: `DECLARED` (typed by a person), `MODELED` (template default), `SCALED_PLAN` (measured on a
calibrated plan image), `PHOTO_INFERRED` (estimated from a photograph). Confidence is `declared` only when every dimension is declared,
else `modeled` (or `low`). **PHOTO_INFERRED values are never treated as known facts** by the applicability engine: a test that needs
the value stays pending information.

## Devices in space
`newDevice` places a device at `x, y` with the category's default `z` and `mount` (`wall | ceiling | floor | table | rack`);
`templateDevices` scales a template's relative positions to the outline's bounding box. Furniture is placed and drawn but is not part of
the relationship graph and not counted as a device.
