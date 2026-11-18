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

## Observed, not yet fixed

### O18-01 · Task #219 / #220
- **Product and route:** Search Party "Who knows this room?" (`#/search?focus=Room:…`).
- **What was seen:** the "Working now" badges suggest live availability.
- **Why it matters:** this has to be checked against the directive's rule: "do not invent live availability".
- **Next:** the presence work in #220 decides how these badges are labelled, for example as synthetic or schedule-derived.
