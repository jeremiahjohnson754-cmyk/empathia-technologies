# Acceptance A3: an Enterprise room journey in a real browser, on staging

## Run 1 — 12 Nov 2026, against staging `25662c0`

How: a browser-automation run (TinyFish, a real browser on the internet) against `https://empathia-demo-next.onrender.com`, with the
founder's permission, following written steps and reporting what it saw. Claude in Chrome was not connected.

| Step | What was done | Observed |
|---|---|---|
| 1 | Lite, the room in engineer mode, as Product Architect | Atlas 4.218 (Executive Boardroom) |
| 2 | Search Party from the room's own link | `#/search?focus=Room:R-ATL-4-218`; the room's open issue, "Far-end audio drops out during long calls" (ISS-0417), among its records |
| 3 | The room's commissioning record | heading "Atlas 4.218 — Executive Boardroom" |
| 4 | ServiceHands as Service Manager, Triage on ISS-0417 | the incident, triaged |
| 5 | Assign the first eligible candidate | Ana Reyes assigned |
| 6 | As the technician, Accept the job | the dispatch preflight: room booked in the window (blocked), processor stock check 33 days old (blocked), tools unconfirmed (blocked); access, safety and authorization ok |
| 7 | The incident's room | `R-ATL-4-218`, the same identity throughout |

Result: **partly met.** The journey ran from Lite to an operational workflow on the same room, and the workflow reached its governed
preflight. It could not go further, and that exposed two findings:

- **F1, a dead end (fixed in the next release).** Nothing on the page let anyone re-plan the booked window or recheck the stale stock,
  so the seeded job could never pass its preflight through the page. The automated test had hidden this by editing storage directly.
  Fixed: a "Dispatch planning" card (`data-testid=dispatch-plan`) where the Service Manager proposes the next free three-hour window
  clear of the room's bookings and the manager or assigned technician rechecks stale stock, both refused to anyone else and recorded in
  the ledger (`replanWindow`, `recheckStock`; unit `service-dispatch-plan`; browser V-08b now does it through the page, then V-09 to V-15
  carry the job to CLOSED).
- **F2, an error seen once (not reproduced).** The automation reported the page's "ServiceHands stopped" error panel briefly at step 4,
  recovering after a role switch. Two local probes (the same path; all sixteen roles in each of four states) did not reproduce it and
  logged no page error. To be watched in run 2 with the console captured.

## Run 2 — after the next release reaches staging

To do: the same steps carried on to IN_PROGRESS, evidence, independent verification and CLOSED, with the console captured.

## Run 2 — 12 Nov 2026, 12:05–12:09 CT, against staging `14c35ca` (the release with the dispatch-planning fix)

TinyFish run `e6246719-…` (a real browser, 40 steps, the founder's permission). Every step through the page; no storage edited.

| Step | Observed |
|---|---|
| Lite, the room, as Product Architect | Executive Boardroom (Atlas 4.218) |
| Commissioning record | "Atlas 4.218 — Executive Boardroom" |
| ServiceHands as Service Manager: Triage, Assign | assigned to Ana Reyes |
| As the technician: Accept the job | ACCEPTED |
| As Service Manager: Dispatch planning (next free window; every stale stock check) | the planning card cleared |
| As the technician: tools confirmed, Start the work | IN_PROGRESS |
| Evidence (configuration snapshot, synthetic note), hand-over | VERIFYING |
| As the commissioning engineer: Verify the repair | RESOLVED |
| As Service Manager: requester confirmed, Close | **CLOSED** |
| The incident's room | **R-ATL-4-218**, the same identity as in Lite and the commissioning record |
| Errors at any point | **none seen** (the "ServiceHands stopped" panel did not appear) |

Result: **A3 met** — a real browser carried one Enterprise room from Lite through the commissioning record and a governed ServiceHands
workflow to an evidence-backed, independently verified, requester-confirmed closure on staging. The step-3 field reads ACCEPTED
because the run reported it after the later steps; the order of states above is from the run's own step reports.

F2 (the once-seen error panel): not seen in run 2 and not reproduced locally (two probes, sixteen roles × four states). Kept open as
"observed once, not reproduced"; a console capture needs Claude in Chrome, which was not connected.
