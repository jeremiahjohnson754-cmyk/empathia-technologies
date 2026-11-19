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

### D18-14 · P3 · Fixed
- **What was wrong:** the tours page said "Four tours" when there were six. In the investor start's narrower map (496 px), the search box ran under the layer buttons.
- **Fix:** the heading counts the tours. The map's search area stops short of the layer buttons at every size.
- **Regression test:** `demo-tours` TR-*-00 and `demo-map` MAP-24.

### D18-15 · P1 (founder 16:41: "you made a bunch of videos and never used them for the story mode") · Built
- **What was wrong:**
  - Season 1's 35 reviewed footage clips and its recorded takes played only behind a secondary "Watch as a scene" button inside the written story.
  - The played-scenes page said "There is no recorded voice or generated video in this build yet", which was no longer true.
  - Nothing in the story offered a cinematic, interactive chapter.
- **Fix:**
  - **The SIGNAL Story Director (`#/film/<chapter>`).** It plays every chapter as an interactive film:
    - title card, act cards, footage, art under a camera move, voiced lines and subtitles;
    - decisions in the frame, with the canon's results and the ladder;
    - timed calls on the story's clock, with replay;
    - conversations;
    - credits with the calls, the evidence and the voices.
  - **Shared record.** Choices are the story engine's own record, so the film, the scenes and the comic agree.
  - **Replay.** A replay is a sandbox and changes nothing saved.
  - **Ten Seats playable scenes.** Five scenes stand where the canon investigates: measure the ten seats, plot the cards, four explanations, the fill test, and measure again after the re-aim.
    - The acoustics reproduce the canon's numbers.
    - A wrong first call changes what the measurement records.
  - **Entry points.** The SIGNAL library offers the film; the scenes page links to it truthfully.
- **Regression tests:** `demo-signal-film` FM-01…35 (light and dark), and the `signal-film` unit test (every chapter a valid film graph; Season 1 media placed).

### D18-16 · P2 · Fixed (found by FM-23)
- **What was wrong:** the analyzer drew the balcony front's first notch at an infinite frequency, logging an SVG error.
- **Root cause:** the balcony has no reflection path, so its path difference was 0.
- **Fix:** the balcony reads as a level, never as a comb.
- **Regression test:** FM-23 (no page error in the whole episode).

### D18-17 · P2 · Fixed (found by FM-29)
- **What was wrong:** on a 390 px phone the measurable seats overlapped (23 overlaps), so a tap could hit the wrong seat.
- **Fix:** the seating plan was re-spaced.
- **Regression test:** FM-29 (no overlap, every seat at least 24 px).

### D18-18 · P2 · Fixed (first-time-viewer pass of Tour G)
- **What was wrong:**
  - On a phone the tour panel docked over the spotlit element.
  - The narration's caption files were never visible, because an `<audio>` element draws no captions.
- **Fix:** the spot is placed in the part of the screen the panel leaves free. A compact player shows the caption of the moment while it plays.
- **Regression tests:** `demo-tours` TR-g-spot-*, TR-g-cue-*.

### D18-19 · P2 · Fixed (unit sweep)
- **What was wrong:** two unit suites failed after the day's slices, and the browser runs had not covered them:
  - `demo-spaces`: Tour G's count, and the word "live" in the stop text;
  - `vendor-claims`: Google named in a comment, and "Zoom" in the zoom buttons' labels.
- **Fix:** see commit e9f987f. All 90 unit files pass.

### D18-20 · P2 · Fixed (found before the exact-commit regression of d836752 could pass)
- **What was wrong:** two unit checks failed on the release candidate, so its regression was stopped after part 1's unit stage:
  - `connector-claims`: the Tour G takes' `source` lines and two comments named the voice tool outside the exempt `voice:` disclosure line;
  - `packages/ui` kit.css: SIGNAL's field calculator (restored that morning) drew with ten literal hex colours instead of tokens.
- **Fix:** the source lines say "generation flow …" (the tool is still named in each take's `voice:` line and in
  docs/media/BRIAN_NARRATION_SCRIPT_AND_LICENSE.md); the calculator's colours are tokens `--inst-*` in tokens.json, identical in both
  themes (it is one dark instrument by design), with a contrast check for each text colour on its grounds. Whole unit sweep: 873 pass.
- **Lesson:** run the whole unit sweep and every package's own tests before freezing a candidate, not only the suites of the day.

### D18-21 · P2 · Fixed (exact-commit regression of 47c40be, part 1; and the non-browser run that followed)
- **What was wrong:**
  - `security: public sites` failed: the built demo named hosts outside the reviewed list. These were AVIXA's own pages (avixa.org)
    and handbook PDFs (a-us.storyblok.com), cited by Learn's CTS study spaces since ce3ca01.
  - `unit: packages/api-client` still expected 213 operations. The OpenAPI document had been regenerated to 221 (7ffacce): the two
    report routes and the six platform-link routes.
- **Fix:** both hosts are named in the test with the reason: links a reader opens, never fetched. The expected count is 221, and the
  routes that changed it are listed in the test.
- **Why the day's checks missed it:** the package tests run from each package's compiled `dist/test`, which a source-only sweep does
  not reach. Before freezing a candidate, run the whole non-browser runner (`node scripts/test.mjs`).

### D18-22 · P2 · Fixed (link check with the Firecrawl connector, 18 Nov evening)
- **What was wrong:** two of the AVIXA pages the CTS study space cites now answer 404: the "Change in availability for online
  proctoring" notice and the "About the Certified Technology Specialist (CTS) credential" page. The three handbook PDFs answer 200.
- **Fix:** AVIXA's current CTS page is cited instead
  (www.avixa.org/training-certification/certification/cts-certification). Its FAQ says: "AVIXA exams are only delivered at secure,
  in-person, Pearson testing centers." The delivery line says the same, and still sends the reader to AVIXA before booking.
  `certs.test.mjs` passes 7/7.

### D18-23 · P1 · Fixed in d380481 (exact-commit regression of acbe026, part 4: the public sites audit, 180/196)
- **What was wrong:** seven deterministic P1 findings in `scripts/audit/site-audit.mjs --strict`:
  - AUD-001: APEX at 320 px was 9 px too wide; a long option in a select set the row's width.
  - AUD-002..004: on the investor start, the flagship card's text was measured against the page. It had only a gradient, with no
    solid colour beneath it, and its small label was 4.2:1 at the gradient's lightest stop.
  - AUD-005: the Search Party graph caption took the stage's light text but sat on the light page (2.55:1).
  - AUD-006: the FieldLink hero eyebrow used the light scheme's accent on the dark stage (3.35:1).
  - AUD-007: on /pilots, a focused radio showed its ring on its option only, not on itself.
- **Fix:** `min-width: 0` on build-row fields. The flagship card gets a solid colour under its gradient, and its text lightens to
  4.9:1 at the lightest stop. The graph figure gets the stage background. The hero eyebrow uses `--fl-stage-teal` (10.1:1). The radio
  shows its own ring.
- **Verified:** website-pilot 54/54 in light and dark. The full audit reruns on the next candidate.

### D18-24 · P1 · Open, needs the founder's file (exact-commit regression of acbe026, part 4: founder town hall T-00)
- **What is wrong:** the Founder Studio embeds the **2.5.3 Private Engineer Edition** under the Founder Edition's name. The page's
  SHA-256 `604cc748…` is the Private Engineer Edition's (apps/engineer-demo/README.md), and its `__EMPATHIA_EDITION__.kind` is
  `engineer-private`. The town-hall test expects the 2.5.4 development build. This has been so in this tree's studio build since 12
  Nov, and the 17 Nov private-store snapshot carried it into `PRIVATE_ASSETS.json`. The 24 functional steps of the town hall pass on
  it; only the edition check fails.
- **Why it is open:** the 2.5.4 development build (`Empathia_V25/work/source-254/dist/Empathia-Living-Campus-v2.5.4-nomedia.html`)
  is only on the founder's machine. The test is not changed. The founder was asked for the file on 18 Nov at about 21:10.
- **Impact:** the Founder Studio is internal and is not deployed. The public sites do not use it.

### D18-25 · P3 · Under watch (exact-commit regression of acbe026, part 5: demo-campus-life CL-13)
- **What was seen:** 5 fps at 1280 × 860, against a budget of 8 on this machine's software renderer. The run overlapped website builds
  and browser suites run in the main tree at the same time.
- **Next:** the next candidate's regression runs with nothing else on the machine. If CL-13 fails there too, it is a real slowdown.

## Observed, not yet fixed

### O18-01 · Task #219 / #220
- **Product and route:** Search Party "Who knows this room?" (`#/search?focus=Room:…`).
- **What was seen:** the "Working now" badges suggest live availability.
- **Why it matters:** this has to be checked against the directive's rule: "do not invent live availability".
- **Next:** the presence work in #220 decides how these badges are labelled, for example as synthetic or schedule-derived.

### O18-02 · demo-story ST-17 (intermittent)
- **What was seen:** "progress survives a reload" failed once in two runs on 18 Nov. The reached count differed after the reload, and it passed on the rerun (99/99).
- **Status:** not yet reproduced deliberately. The change made the same day only added links to the story page.
- **Next:** stress it 10 times and find the race.
