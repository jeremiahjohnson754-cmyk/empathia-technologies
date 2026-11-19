# Film treatments — founder directive 18 Nov 2026 17:25, §13–15

Fourteen films. Each treatment states its story (§14: a clear narrative, never a pan over screens), the footage it is made from, what
is real and what is a labelled concept (§13 production rule), its versions, and its state today. Nothing here is a finished film
unless the state column says so.

**Production rules that apply to all fourteen**

- Software is shown only as **screen recordings of the running demonstration**, made by `scripts/media/record-product-film.mjs`:
  every step waits for its on-screen proof (a test id) before its words appear, so a caption can never describe something the screen
  does not show. Data is synthetic and every film says so in its label.
- Hardware (FieldLink) is shown only as **concept renders labelled "industrial-design concept, not a photograph"** and HTML/SVG
  motion graphics. No generated footage of a working prototype, no invented telemetry.
- Not-yet-built capability appears only as **labelled conceptual visualisation** ("Designed, not built yet").
- Sound: muted by default; narration is opt-in. The ElevenLabs credits are exhausted (18 Nov), so new films are **caption-led**
  (burned captions plus a WebVTT track and a transcript), as the founder allowed for the unvoiced Tour G stops ("silent with
  captions"). A narrated version is a later pass with the Brian voice when credits and the licence check allow.
- Versions: **desktop 16:9** (60–120 s), **mobile 9:16** (re-framed from the same recording at 390 × 844, not a crop of the desktop
  file), **short-form** (15–30 s, first three beats), **caption-led** (the default). Every version ships with captions and a
  transcript; the website player offers pause, mute and captions and never blocks navigation (§15).

## The fourteen

| # | Film | Story (beats) | Footage | Real vs concept | State today |
|---|---|---|---|---|---|
| 1 | Empathia Technologies — The Connected Ecosystem | One room (Atlas 4.218) → its floor → building → campus → the estate; a service event appears; each product lights up on the same record | Lite campus/building/floor/room drill (`#/lite` → `#/lite/room/R-ATL-4-218`), Mission Control `#/campus`, Pro failure map `#/pro/issues` | All real recordings; the estate step is the demonstration's synthetic estate, said on screen | **Retain** FA "The platform vision" (2 min) for the website; a new cut from the Lite drill is a recording task (below) |
| 2 | Empathia Pro — Operational Intelligence | A failure map shows burden per building → one building → one room's repeat issue → the job that fixed it → the measure that improved | `#/pro/issues` (failure map, per-10-room counts), `#/pro/ops`, `#/servicehands` | Real; figures are synthetic and labelled | **Retain** P-pro (0:3x, recorded, captions); new beats need the heat-map metrics (#236) first |
| 3 | Empathia Lite — The Living Digital Twin | Campus → building → floor → the furnished room → engineer lens → camera and microphone coverage → layers (designed / commissioned / current / proposed) → eye level → back up | `#/lite…` (the existing P-lite steps) | Real | **Retain** P-lite (recorded, proof-gated) |
| 4 | Commissioning and Assurance — From Design to Verified Reality | Designed → installed → a test fails → deficiency recorded → a qualified technician found → corrected → retested → independently verified → baseline → Core Replay keeps it | `#/commissioning/room/R-ATL-4-218`, `#/commissioning/deficiencies`, `#/search?focus=Room:R-ATL-4-218`, `#/replay/R-ATL-4-218?at=…` | Real; the evidence is synthetic and labelled | **Retain** P-commissioning and F02P; **new** recording "From design to verified reality" scripted below |
| 5 | Core Replay — The Life of a Room | Request → requirements → design → build → commissioning → baseline v1 → a camera change reopens only PA-0007's tests → baseline v2 → assurance | `#/replay/R-ATL-4-218?at=request … baseline2` (the Tour G stops) | Real | **New** — record from the Tour G stops (the founder's picked narration takes exist for G1–8, 10, 11, 14; the rest caption-led) |
| 6 | Search Party — Every Relationship Matters | A room has a problem → who supports it, who knows it → the exact asset AS-0112 → its history → straight to ServiceHands with the room filled in | `#/search?focus=Room:R-ATL-4-218`, `#/search?q=AS-0112` | Real; people are synthetic | **Retain** P-search-party |
| 7 | ServiceHands and Field Intelligence — From Incident to Resolution | A report → the job tied to room and device → diagnosis with the room's history → the fix → the field record → the room's state updated | `#/servicehands`, `#/here/R-ATL-4-218`, `#/install/redline`, `#/v25/fi` | Real; no collector is connected (said on screen) | **Retain** P-servicehands and IE |
| 8 | APEX — Executive Intelligence | A question → cited hypotheses → a bounded action → an outcome it may not take, blocked and said so | `#/v25/apex` | Real on simulated evidence (labelled) | **Retain** P-apex |
| 9 | SIGNAL — Cinematic Learning and Interactive Gameplay | Ten Seats: the case → the first call → a measurement you make → the wrong call's consequence → the fix verified → credits listing the calls | `#/film/s01e01` played (the Story Director), `#/labs/mix` | Real gameplay recording; the footage inside it is generated footage of a fictional setting, labelled in the film | **New** — record a played run of Ten Seats (quiet mode, captions) |
| 10 | Campus Life — Authentic Gameplay | Arrive on the plaza → find the building → the classroom → one quest step | `#/play/campus` | Real; only what is playable today | **New** — short recording; must not show anything not playable (§13) |
| 11 | Stadium LIVE — The Connected Venue | Game day clock → a camera feed fault → the incident on estate records → verified recovery | `#/gameday`, `#/gameday/incident/camera-feed` | Real | **New** — recording of The Critical Signal |
| 12 | Convention Expo — The Connected Event | Build the expo → a breakout's AV state → a change → its effect | `#/play/expo`, `#/world/convention` | Real | **New** — recording |
| 13 | FieldLink — Hardware That Extends Physical Intelligence | A room looks healthy on a dashboard → a local observation shows a change the telemetry does not describe → investigation → the observation is tied to the room → the team reviews evidence → the approved baseline is consulted → addressed. End card: *FIELDLINK — Extend what Empathia can observe. Preserve what your organization can prove.* | Lite room and Assurance recordings for the software half; FieldLink concept renders and an SVG "life of an observation" for the hardware half | Software real; hardware **concept**, labelled on every hardware frame; no invented readings — the observation is shown as a labelled illustration | **New** — treatment only; build after the FieldLink page review |
| 14 | FieldLink Nano, Edge and Pulse — Product Family Launch Film | The family on a dark stage → each device's role as the FieldLink page states it (Nano: portable diagnostics; Edge: local intelligence gateway; Pulse: distributed environmental sensing) → optional, never required → proposed prices labelled illustrative | `apps/website/media/fieldlink/` renders (PROVENANCE.json), CSS/SVG motion | All **concept**; "No FieldLink unit has been built" on the end card | **New** — treatment only |

## Scripts for the new recordings (proof-gated, same format as `scripts/media/product-films.mjs`)

**5. Core Replay — The Life of a Room** (`F-LIFE`, desktop 1440 × 900 and phone 390 × 844, caption-led)

1. `#/replay/R-ATL-4-218?at=request` — proof `[data-testid=rp-card]` — "Every room has a story. This one starts as a request."
2. `?at=requirements` — "Nine requirements; six are must-haves. Everything later is judged against them."
3. `?at=design` — "Designed: every device a numbered position."
4. `#/lite/room/R-ATL-4-218` — proof `[data-testid=lite-room-3d]` — "The same room in Lite: one record, another view."
5. `?at=build` — "Installed: position PA-0007 holds asset AS-0097."
6. `?at=commissioning` — "Each test recorded, then verified by someone else."
7. `?at=baseline1` — "Baseline v1: what the room was proven to do."
8. `?at=change` — "AS-0097 out, AS-0112 in. Only PA-0007's tests reopen."
9. `?at=baseline2` — "Re-accepted. Baseline v2 is current; v1 is kept."
10. `#/assurance/room/R-ATL-4-218` — "Assurance watches the baseline from here on."
End card: "One room. Every product. One record. — Synthetic demonstration data."

**4. Commissioning and Assurance — From Design to Verified Reality** (`F-CXA`)

1. `#/commissioning/room/R-ATL-4-218` — "The tests that apply to this room, from its design."
2. the failed check (proof: a FAIL row) — "A check fails. It becomes a deficiency, not a footnote."
3. `#/commissioning/deficiencies` — "The deficiency, with its evidence and who owns it."
4. `#/search?focus=Room:R-ATL-4-218` — "Who is qualified to fix it, and who knows this room."
5. back to the room record, retest recorded — "Corrected, retested, and verified by somebody else."
6. `#/replay/R-ATL-4-218?at=baseline2` — "Core Replay keeps the whole story."

**"Follow one microphone"** (`F-FOLLOW`, 45 s; the website's /platform#follow sequence as a film) — the five catalogued launches in
`packages/ui/src/launches.ts`, in order, each shown as its perspective, captions from each launch's `shows` line.

## QA before any of these reaches the website

Each finished file goes through `docs/media/VIDEO_QA_PROCESS.md` (proof log, caption sync, loudness if voiced, no off-canon or
off-record claim) and into `apps/website/films.json` with its rights recorded; the dist hygiene check refuses an unlisted film.
