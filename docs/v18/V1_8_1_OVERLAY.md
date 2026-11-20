# v1.8.1 overlay — four living worlds on shared engines, as of 9 November 2026

v1.8.1 is **additive**. It changes nothing in the baseline: 1,099 requirements, 652 QA scenarios, the 52 role configurations and the
original Enterprise estate stay exactly as they were (`node scripts/verify/baseline-preserved.mjs`). Work of 1 to 5 November is intact:
`integrate/final` and every uplift branch are ancestors of `v18/continuation`.

Statuses use the directive's ladder: SPECIFIED → IMPLEMENTED → TESTED → RELEASED_VERIFIED. **TESTED** names the test that ran and
passed on this build. Nothing below is RELEASED_VERIFIED: none of it is deployed yet. NOT RUN is never PASS.

Tests named: `estates` = `tests/unit/demo-estates.test.mjs` (20), `estate` = `tests/browser/demo-estate.test.mjs`.

## The rule that makes it one ecosystem

Each world has one canonical record set (`apps/demo/src/estate/`). A place is one record with one stable identifier, on the hierarchy
World → Campus or Venue → District → Building → Level → Space → Room → Asset. Every engine reads that record; none keeps its own copy.

## Requirements

| ID | What it asks | Status | Evidence, and what is not done |
|---|---|---|---|
| V181-MODEL-01 | One canonical hierarchy for every world | TESTED | estates ES-01, ES-02, ES-08 |
| V181-MODEL-02 | Stable unique identifiers across worlds | TESTED | estates ES-02 |
| V181-MODEL-03 | All records synthetic, all worlds fictional, equipment by class not make | TESTED | estates ES-09, ES-10; estate E-12, E-22 |
| V181-MODEL-04 | Shared engines built once, not per world | IMPLEMENTED (two of seven) | The estate page (Lite across worlds) and Search Party in context are one implementation for three worlds. Space Optimizer, Showroom Builder, Experiences, Field Intelligence and Commissioning are not yet on the estate model |
| V181-MODEL-05 | Lite states DESIGNED / COMMISSIONED / CURRENT / PROPOSED | IMPLEMENTED (partly) | Designed, in commissioning and commissioned are recorded and shown to staff readers. CURRENT (drift from commissioned) and PROPOSED are not modelled outside Enterprise |
| V181-ENT-01 | Enterprise keeps its 90 rooms; no fabricated legacy rooms | SPECIFIED | The Enterprise estate stays in its own pages (45 rooms built). The remaining 45 come from the 90-room handoff as proposed scenarios; not started. The estate page hands over to the existing campus (estate E-23) |
| V181-UNI-01 | Three campuses | TESTED | estates ES-04; estate E-01 |
| V181-UNI-02 | Five schools, exactly 38 classrooms (10 / 8 / 8 / 6 / 6) | TESTED | estates ES-03 |
| V181-UNI-03 | Exactly four dormitory buildings | TESTED | estates ES-04; estate E-13 |
| V181-UNI-04 | Campus life places (union, library, dining, recreation, wellbeing, transit) | TESTED (as records) | estates ES-14 |
| V181-UNI-05 | Original explorable social campus: real software, a playable circuit activity, persistent progress | SPECIFIED | Not started. The existing learning quest (circuit rounds) is a journey screen, not yet an explorable space. No multiplayer is claimed or simulated |
| V181-STA-01 | Stadium: fan and public, premium, team, broadcast and technology, operations; 60,000 to 65,000 seats with a full space program (Surpass §20) | TESTED (as records) | estates ES-05, ES-13, ES-21; estate E-32. 62,200 seats counted from records |
| V181-STA-02 | Team and engineering areas never shown to fans | TESTED | estates ES-07, ES-18; estate E-14, E-15 |
| V181-CNV-01 | Superseded by Surpass §22: thirteen halls in four groups (about 2.9 million sq ft), exactly 225 meeting and breakout rooms, keynote, ballrooms, operations | TESTED (as records) | estates ES-06, ES-15, ES-21; estate E-20, E-33. The event schedule with collisions is not started |
| V181-CNV-02 | No real association, show or exhibitor | TESTED | estates ES-10; estate E-22. Exhibitors are invented and said to be |
| V181-LITE-01 | Lite in every world: what a place is, what it offers, how to reach it | TESTED | estate E-01, E-06, E-07, E-17 |
| V181-LITE-02 | Step-free routes can be asked for | TESTED | estates ES-11; estate E-17. Routes are recorded pairs, not computed paths |
| V181-SP-01 | Search Party in context; a found place is the browsed record | TESTED | estates ES-17; estate E-05, E-06 |
| V181-SP-02 | Search never returns what the role is not shown | TESTED | estates ES-18, ES-19; estate E-03, E-15 |
| V181-ROLE-01 | All 52 configurations resolve; selection grants nothing | TESTED | estates ES-16; estate E-02, E-26. Presentation only: the product's server decides real access |
| V181-JOURNEY-01 | Journey screens and the estate name the same places | TESTED (names) | estates ES-13, ES-14, ES-15. The journey screens still draw their own small plans; they do not yet read the estate records |
| V181-OPT-01 | Space Optimizer: nine dimensions, options A / B / C, one saved study per world | TESTED (three worlds) | optimizer unit SO-01..14; browser O-01..24. A study reopens from its address. Not done: Enterprise rooms, adjustable assumptions, saving a visitor's own proposal, the directive's A = minimal / B = balanced / C = maximum framing against a current baseline |
| V181-SHOW-01 | Showroom Builder on Build a Room: canvas, placement, versions, undo and redo, outputs | SPECIFIED | Not started |
| V181-FI-01 | Field Intelligence closed loop in every world | SPECIFIED | Exists for Enterprise only |
| V181-REF-01..04 | Four reference journeys (one per world) end to end | SPECIFIED | Not started as end-to-end paths |
| V181-COM-01 | Commercial link from each world to its pilot | SPECIFIED | Not started |

## What is deliberately not claimed

- No measurement, survey, coverage calculation or live reading exists for the three new worlds. Capacities, sizes and travel minutes
  are invented, plausible figures on fictional places.
- Reader levels (public, members, staff, restricted) are a demonstration device. The whole synthetic estate ships to the browser.
- A missing step-free route is said to be a gap in the record, never a statement that no such route exists.
