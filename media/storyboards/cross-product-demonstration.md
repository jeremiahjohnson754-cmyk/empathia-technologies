# Production package — Combined cross-product demonstration

**Status: NOT_RENDERED (and NOT FOUND unless the founder confirms that F03 “Empathia in Action” is this film).**

| | |
|---|---|
| Purpose | one story through several products on one record: a room is designed in Lite, commissioned, an issue is found in Assurance, ServiceHands fixes it, Search Party shows the impact |
| Length | 3:00 |
| Masters | 3840×2160 24 fps · 1920×1080 · 1080×1920 cut-down (0:60) |
| Audio | narration + bed, −16 LUFS integrated, true peak ≤ −1 dBTP; WebVTT captions |

## Script beats
1. Intake: a request for a 220-seat town hall arrives (Intake Portal).
2. Lite: the room is laid out; the engine classifies it a town hall and lists 86 applicable tests (Build a Room; numbers from the seed —
   recapture if the seed changes).
3. Drawing Intelligence: drawings generated; the engineer approves them.
4. Commissioning: results recorded with evidence; a pass waits for independent verification; one test fails and opens a deficiency.
5. ServiceHands: a work order is raised and closed — the test is still failed until a verified retest.
6. Assurance: after acceptance, a moved camera shows as spatial drift — a proposal to recommission, approved by an engineer.
7. Search Party: from the camera, everything connected and affected.
8. Close: one record, every product.

## Shot list
Each beat is a screen capture of the Founder Edition (persona switched through the page's own control) or the enterprise web app, with
cursor moves recorded by Playwright scripts (reproducible; see `tests/e2e/founder-townhall.e2e.mjs` for the exact click path of beats
2–7). Hold every result label on screen ≥ 2 s so “awaiting verification” and “passed, verified” are never confused.

## Editing specification
One continuous screen-space; transitions are camera moves across captures, not wipes; lower-thirds name the product and the role acting.

## Source requirements
Synthetic data only; no real customer, building or manufacturer names on screen; narration and music cleared in the ledger.

## Generation prompts
None needed: the film is made from screen captures of the software.
