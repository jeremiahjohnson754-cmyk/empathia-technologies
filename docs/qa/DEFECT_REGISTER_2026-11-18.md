# Live defect register — mobile, navigation and Experiences (from 18 Nov 2026)

This register is for the mobile, navigation and Experiences work (tasks #223–#228). The register of 31 October stays as it was, in
`DEFECT_REGISTER.md`.

**Method.** These defects were found in first-time-visitor passes (task #228): the pages were opened cold at phone and desktop sizes and
used as a visitor would. They were then confirmed by measurement in a script.

**Environment and limits.**
- **Browser:** emulated viewports in headless Chromium with software rendering.
- **Not used:** real phones, other browser engines and screen readers. These limits apply to every row.

**Severity:**
- **P0** — security, tenant leak, corruption, or data loss.
- **P1** — a critical journey is broken.
- **P2** — significant usability, accessibility or compatibility.
- **P3** — polish.

The formal two-cycle destructive QA (task #225) has **not started**. Its own registers will be
`docs/qa/CYCLE_1_DEFECT_REGISTER.csv` and `CYCLE_2`.

## Defects

### D18-01 · P2 · Fixed in af1f13b
- **Product and viewport:** demo shell; 381–~410 px and 320 px.
- **What was wrong:** the top bar wrapped to a third row. The View as button sat alone, and the bar was 157 px tall instead of the 106 px reserved for it.
- **Root cause:** the wordmark is hidden only below 380 px. Brand, chip, Field Tools, notes and View as need about 406 px.
- **Fix:** the wordmark is hidden below 420 px, and the gaps tighten below 350 px.
- **Regression test:** `demo-core` CORE-bar-{320,360,375,390,412,430,768}.

### D18-02 · P2 · Fixed in af1f13b
- **Product and route:** Campus Life, `#/play/campus` (light theme).
- **What was wrong:** the intro text was drawn in the dark theme's pale colour, rgb(180,193,220), on the light page.
- **Root cause:** the game wrote its quest stage to `data-stage`. The design tokens read `[data-stage]` as "keep this a dark 3D stage", so the whole section took dark-theme tokens.
- **Fix:** the attribute is now `data-quest`.
- **Regression test:** `demo-campus-life` CL-19.

### D18-03 · P2 · Fixed in af1f13b
- **Product and viewport:** Campus Life; 390 px on a touch device.
- **What was wrong:** the quest card covered the player card, hiding the player's name and level.
- **Root cause:** both cards sat in absolute corners. The quest card was up to 60% wide, which overlapped on narrow stages.
- **Fix:** on narrow stages the cards stack, and the touch map moves below both.
- **Regression test:** `demo-campus-life` CL-20 (no two HUD pieces overlap).

### D18-04 · P2 · Fixed in af1f13b
- **Product and viewport:** shell Field Tools button; every width.
- **What was wrong:** the touch target was 40 px tall instead of 44 px. This was a pre-existing failure, P-*-03, in `demo-phoneshell`.
- **Root cause:** `min-height: 40px`.
- **Fix:** the button is now 44 × 44.
- **Regression test:** `demo-phoneshell` P-{360,390,768}-03.

### D18-05 · P1 · Fixed (this commit)
- **Product:** cross-product navigation. The journey is room → Search Party → ServiceHands → back.
- **What was wrong:**
  - Search Party opened part-way down the page, carrying the room's scroll, with its heading under the sticky bar.
  - Search Party had no way on to ServiceHands for the room.
  - Leaving the half-filled report lost it.
  - No way back to the room's tab and scroll except the browser's Back.
- **Root cause:**
  - The route focus called `h1.focus()` with scrolling on, which put the heading at y=0 under the sticky bar.
  - Nothing remembered scroll position per history entry.
  - Nothing kept the place of work.
  - The intake form kept its state in memory only.
- **Fix:**
  - `shell/trail.tsx` keeps the scroll per history entry: a new page starts at its top, and Back, Forward and refresh restore the position.
  - A return-trail chip goes back to the last place of work: room, work order, report, incident or chapter. It keeps the exact tab and scroll, and is offered only to roles that may open it.
  - Search Party's view of a room now has "Open the room" and "Report a problem in ServiceHands".
  - The intake draft is kept in the browser tab, says so, and is dropped once the report is sent.
  - `replaceState` now keeps the history state.
- **Regression test:** `demo-return-trail` RT-{phone,desktop}-01…10 and RT-role-01, in light and dark.

### D18-06 · P2 · Fixed (this commit, found while building D18-05)
- **Product:** the return-trail chip.
- **What was wrong:** the first version of the chip returned to the room at the top, not the remembered scroll.
- **Root cause:** a fragment navigation fires popstate and then hashchange. The first event used up the chip's pending scroll, and the second reset it.
- **Fix:** the scroll is written onto the new history entry at once. Both events read the entry's own state.
- **Regression test:** `demo-return-trail` RT-*-04, -07 and -08.

### D18-07 · P2 · Fixed (founder 13:53: "fix that commissioning and assurance button … that so bugs me")
- **Product and viewport:** corporate site product tiles, at 390 and 412 px.
- **What was wrong:** product names split inside words: "ServiceHand·s" and "Commissioni·ng & Assurance".
- **Root cause:** `.glass__txt a { overflow-wrap: anywhere }` allowed a break anywhere in a word.
- **Fix:** names now break only between words. On 381–430 px tiles the icon sits above the name, so whole words fit.
- **Regression tests (website):**
  - W-words: no word of four or more letters is split, in any link, button, heading or menu item, on any page at 320–768 px. It failed before the fix and passes after.
  - W-tilefit: every name fits inside its tile.

### D18-08 · P3 · Fixed
- **Product and viewport:** corporate home hero, phone.
- **What was wrong:** the nine-stage evidence ladder stacked to about 900 px. Its stages and the product rail repeat later sections, and the hero ran to 2,476 px (about three screens).
- **Fix:** on phones the ladder shows in two columns. Every stage and product stays. The hero is now 2,220 px.
- **Regression test:** visual check plus W-words and W-tilefit. A height budget is still to be set in the mobile design system (#226).

### D18-09 · P1 (founder 14:10: "Fix the campus maps … not the quality we're looking for") · Rebuilt
- **Product:** the campus map on the investor start, Mission Control, Campus and the Search Party map tab.
- **What was wrong:** a hand-drawn isometric SVG with six flat boxes. No imagery, zoom, rotate or tilt, no drill-down below the building, and no jumps to the room in other products.
- **Fix:** the Empathia Map (`apps/demo/src/map/`):
  - **Ground and buildings:** synthetic aerial imagery and our own street style, painted from the canonical footprints. Buildings in 3D with façades and rooftop units; 3D trees.
  - **Moving around:** pan, zoom, rotate and tilt by mouse, touch and keyboard. Fly-to camera.
  - **Drill-down:** campus → building (place card, floors) → floor (cutaway with a modeled room layout) → room. The room card links to the room record, Lite, Commissioning, Assurance, Core Replay, Search Party, ServiceHands and People.
  - **Also:** search, breadcrumbs, compass, and the place card below the map on phones.
  - **Fallback:** the SVG map where there is no WebGL2.
- **Labelling:** imagery, storey heights and room layouts are labelled synthetic or modeled.
- **Regression test:** `demo-map` MAP-01…15 and MAP-phone, MAP-p360, in light and dark.
- **Related test changes:** `demo-campus` CA-*-04 and `demo-core` CORE-reduced-motion now press Enter once for the place card and again to open, with the reason recorded. The campus checks wait for the map's code, which loads on demand.

### D18-10 · P2 · Fixed (found while building D18-09)
- **What was wrong:** the map slowed the pages around it. Painting the imagery in one go blocked the main thread for about 0.9 s in total. On a software renderer the opening flight took 70–100 ms per frame, so a page opened right after Mission Control could still be loading 350 ms later (`demo-phoneshell` P-*-08, intermittent).
- **Fix:**
  - The imagery is painted in steps that yield to the browser.
  - The map's code loads on demand (35 KB chunk), and its 3D starts after the page has painted.
  - A graphics tier: a software renderer gets no opening flight, standard resolution and short flights. The map records the tier as `data-gpu`.
- **Regression test:** `demo-phoneshell` 49/49 three runs in a row (it was failing 1–3 runs in 3). `demo-map` MAP-15. The P-*-08 failure message now names the condition that failed.

### D18-11 · P2 (founder 13:42: "add areas to pro failure heatmaps for issue intelligence"; 14:00: "Trustworthy heatmaps") · Built
- **What was wrong:** the map had no intelligence lenses. Pro Issue Intelligence had no map at all.
- **Fix:** lenses on the same Empathia Map:
  - **Health risk:** 100 − health. An unscored building shows no value, never a zero.
  - **Issues:** shown as a count, or as a rate per 10 rooms.
  - **Heat layer:** a sequential heat layer on the ground.
  - **Pins:** each pin shows its value.
  - **Legend:** the scale, the highest building by raw count and by rate (they differ: Atlas has the most issues, Beacon the highest rate), the source, "synthetic", and the time computed.
  - **Building card:** the numerator ÷ denominator behind the rate, with a drill-down to the building's rooms.
- **Pro:** Issue Intelligence now carries the same map, opened on the Issues lens ("Where it fails").
- **Regression test:** `demo-map` MAP-16…22. The phone checks include the lens and legend (no overlap, 44 px targets). Light and dark.

### D18-12 · P2 · Fixed (found by `demo-access` R1-03 after D18-11)
- **What was wrong:** on the investor start, the map's 3D start-up ran during an immediate keyboard navigation, so focus had not reached the new page's heading within 400 ms.
- **Fix:** the map starts its 3D when the browser is idle, and builds its trees in a later idle slot.
- **Regression test:** `demo-access` 31/31, two runs in a row.

### D18-13 · P1 · Fixed (a dead end introduced by D18-09, found in the first-time-viewer review of the room card)
- **What was wrong:** the map's room card offered Core Replay for all 140 rooms, but only four rooms had a replay. The other 136 opened "Room not found".
- **Fix:** every campus room now replays from its own canonical record:
  - The request shows as not held.
  - The design is labelled modeled (from a template, not surveyed), as a new status class, or reconstructed.
  - Dated events, installations, removals and baselines follow in date order.
  - Issues are listed without dates, because the record holds none, saying so.
  - The next step and its blockers show as not yet.
  - Nothing is invented. The four rooms with a deep history are unchanged. The replay index offers any of the 140 rooms.
- **Regression test:** `demo-replay` RP-20…22 (30/30) and `demo-map` MAP-23 (25/25, light and dark). `demo-destructive` 164/164 and `demo-hardening` 38/38 still pass.

## Observed, not yet fixed

### O18-01 · Task #219 / #220
- **Product and route:** Search Party "Who knows this room?" (`#/search?focus=Room:…`).
- **What was seen:** the "Working now" badges suggest live availability.
- **Why it matters:** this has to be checked against the directive's rule: "do not invent live availability".
- **Next:** the presence work in #220 decides how these badges are labelled, for example as synthetic or schedule-derived.
