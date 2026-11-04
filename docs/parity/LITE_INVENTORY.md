# Empathia Lite — inventory (uplift/lite, 2026-11-04)

What Lite holds in the investor demonstration, where each record comes from, and what each screen computes. Synthetic data only;
nothing is measured, nothing leaves the page. Every V2.5.3 `#/lite…` address lands on a finished screen.

## Addresses (`apps/demo/src/registry.spaces.ts` → `lite/LiteApp.tsx`, one lazy chunk)

| Address | Screen | V2.5.3 authority |
|---|---|---|
| `#/lite` | Campus scene (six extruded buildings, readiness by record), lenses, Buildings list, Explore tiles, the fifteen plan rooms, Scouter card (D41) | `lite` |
| `#/lite/b/<B>[/<floor>]` | Building and floor browsing: floor chips, floor plan, room cards; regional sites LKS and RDG | `lite` |
| `#/lite/room/<id>?mode&state&ov&ly&cfg&device` | Interactive 3D room (orbit, tilt, plan, zoom, drag), 8 layers, 5 overlays, 4 states, lens panel, metrics, configurations, scenario, fleet wall (tower) | `lite` + `AZ_LENS[mode]` |
| `#/lite/services` | The 14 spaces by group | `lite.services` |
| `#/lite/space/<id>` | One space in 3D (V2.5.3 layout), how / etiquette / issues / services, chapter link, QR | `lite` |
| `#/lite/guides[/<g>[/<ch>]]` | 3 guides, 25 chapters, chapter search, pager | `lite.guides` |
| `#/lite/way?to=` | Route to any of 45 rooms or 14 places | `lite` |
| `#/lite/visit?step=` | The ten V2.5.3 visit steps with check-in form, simulated host notice, badge with code | `lite` |
| `#/lite/qr` | The 7 QR types, drawn by the V2.5.3 encoder port (`lite/qr.ts`) | `lite` |
| `#/lite/commons?scene=` | The Commons in its 5 scenes with room-control copy | `lite` |
| `#/lite/scouter` | Scouter (shell registry alias; D41) | `scouter` |

## Records

- **45 rooms** — `campus/canon.ts`: `ROOMS` (30) + `PLAN_ROOMS` (rows 31–45 of `docs/recovery/ROOMS_PLAN.md`) = `CAMPUS_ROOMS`. Each plan room: archetype, template (with
  the "no X template in the catalogue" note), one scenario, deterministic seed, catalogue class templates only ("spec to verify"). Divisible: R-BCN-1-300 (A+B+C),
  R-LKS-2-120 (North+South). Non-operational: NOC, SOC, Global Operations Control Tower, EOC. Rows 40, 42, 45 sit on the fictional regional sites.
  `ROOMS` stays the thirty for the stories that speak of thirty (tours, Search Party S5, the website); the campus, rooms index, search index and estate
  graph read the 45. Storylines in `design.ts`: row 32 and 45 held in COMMISSIONING, rows 33 and 37 carry an open issue.
- **Lite data** — `lite/data/v253.ts`, extracted statically by `lite/data/extract-v253.py` from the V2.5.3 offline HTML (never executed): 6 modes, 4 states,
  8 layers, 5 coverage kinds, 14 spaces, 3 guides / 25 chapters, 7 space layouts (+ Commons and pods ported by hand in `LitePlaces.tsx`), 5 Commons scenes,
  10 visit steps, 7 QR types, visitor path and plaza.

## What `lite/model.ts` computes (unit-tested in `tests/unit/demo-lite.test.mjs`)

- Lenses and layers from `AZ_LENS` / `AZ_LAYER` through the policy; a role's home lens from `AZ_LENS_HOME`; overlays offered only where the role may see the layer.
- Coverage: seats from the catalogue seating blocks (or rows for assembly rooms); camera cones from `fov_deg`; microphone discs from `pickup_m` (assembly rooms:
  stage positions, worn channels counted); speaker zones from `coverage_m` over a 0.5 m grid; accessibility from ADA 2010 tables 221.2.1.1 / 219.3 and a 0.815 m
  clear route (planning reference); infrastructure fit from declared PoE, ports, rack units and outlets.
- States: Designed (design record), Commissioned (baseline, assets as installed at acceptance, or "not yet"), Current (open issues → attention, replaced units,
  moved furniture), Proposed (positions that close the current gaps; never approved; earlier records stay records-only).
- Readiness 0–100 from verified tests (70) and open issues (30 less by severity); building and campus averages.
- Routes from the Atlas entrance by building map distance and floor; regional sites say so.

## Tests

- `tests/unit/demo-lite.test.mjs` (9), `tests/unit/demo-spaces.test.mjs` and `demo-policy` unchanged.
- `tests/browser/demo-lite.test.mjs`: 3 viewports × 2 schemes × 41 checks + 6 D44 checks (visitor). `demo-campus` and `demo-rooms` now count 45.

## Not done (time-boxed)

- The inspiration frame's "3D Twin / Photo" toggle: no photos exist (none invented).
- Occupancy is simulated per room and labelled so; no environment readings exist for the Environment layer (the switch shows the layer's devices only).
