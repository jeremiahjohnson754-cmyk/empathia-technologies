# ADR-0019 · Another room on the same page, by the same rules

Date: 18 Nov 2026 · Status: accepted · Migration: none · Tests: `tests/security/second-room.test.mjs` SR-01…07;
`tests/browser/demo-flagship.test.mjs` FL-33

Founder, 17 Nov 2026, 19:05: "demonstrate the same workflow in another room." And earlier the same day: "the same engine can power
your enterprise rooms, stadium executive suites, and convention center spaces without creating separate engineering systems for
each world."

## Decision

1. **A sandbox opens with a second engineering room in another world**: Harbor 201, a 220-seat session room of the fictional
   Larkspur Exchange Convention Centre, by the identifier it has in the canonical estate (`CNV-MR-H201`, 22 × 16 × 5 m). It is made
   by the sandbox's own people through the same routes as the lecture theatre (`SECOND`, `domain/demo.ts`): its venue and
   building, the room from the town-hall template, drawings, approvals, installation, and one reverberation criterion of its own
   (at most 0.8 s; the theatre's is 1 s). Nothing in the server knows that it is "the second room".
2. **One page, any room.** `#/flagship` is the lecture theatre; `#/flagship/<identifier>` is another room of the sandbox, by its
   canonical identifier or its server code, and the page offers the sandbox's rooms in a list. Every request the page makes names
   the room in the address. No rule, label or step is decided by which room it is: the bench reads the room's own criterion, the
   register names are made from the room's own identifier, and the plan is drawn from the room's own geometry.
3. **The plan is drawn to the room.** Marks are a fixed size on the drawing; a room smaller than twenty metres is drawn larger so
   that they do not cover it. Every place stays in metres.
4. **A session room, not a boardroom.** The first choice was an executive suite. The catalogue applies the reverberation test to
   assembly rooms only (town hall, auditorium): in a boardroom there is no acoustic acceptance of this kind to fail, and the
   scenario was refused by the server when it tried to set the criterion. The room was changed, not the rule.

## What is demonstrated, and where

- **By the API, end to end** (SR-01…07): the camera recorded where it was installed (proposed, refused to its recorder, approved);
  registration and commissioning; a measurement the server works out itself, judged against this room's limit; PASS refused, FAIL
  and its deficiency; the work order done by the **second technician** once the steward verifies their credential, with the first
  technician refused each step; the retest as a new measurement; every other check; acceptance; baseline 1 with the designed
  place, the as-built place and the measured value. And the lecture theatre untouched throughout: no move, no measurement, no
  deficiency, no baseline; a measurement of one room carries no result in the other, through the API and at the table.
- **On the page** (FL-33): the room chosen on the page is the server's record of that room; its camera is moved and approved
  there; the theatre's record is exactly as it was; a refresh keeps the room; a room the sandbox does not have is said to be absent.
  The browser suite does not repeat the whole journey in the second room: the page is the same code for both, and FL-01…32 walk it.

## Not decided here, and known limits

- **Harbor 201 is its template as it comes**: 36 seats drawn for 220 (the page says so), and the town-hall template's devices.
  It has not been given the theatre's treatment (ADR-0018).
- **Only reverberation has a bench and a criterion**, in both rooms.
- A sandbox opens with three rooms and 105 audit rows of its own history, in about 1.8 s here (0.5 s before ADR-0018) and 2.4 to
  3.0 s in the deployment rehearsal's production-mode service. Not yet measured on the staging instance.
- The room list on the page is the sandbox's rooms as the acting person may see them. There is no search and no estate tree: three
  rooms do not need one.
- The stadium has no room on the server yet.
