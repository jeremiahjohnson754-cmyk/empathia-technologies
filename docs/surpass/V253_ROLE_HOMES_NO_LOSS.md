# V2.5.3 role homes — what was carried over, and what was not (10 November 2026)

V2.5.3 gave every role its own home (`viewHomeFor`). The rebuild showed one Mission Control to every role until 10 November. This file
compares each V2.5.3 home, read as text from the offline edition, with the start page that now stands in its place
(`apps/demo/src/campus/rolehome.ts`, `pages/RoleHome.tsx`). "Not carried" is said plainly, with the reason where there is one.

Every start page also has what V2.5.3 did not: one thing to start with, a jump bar with keyboard shortcuts, and the rule that every
link is offered only if the role may open it (tested for all fifteen roles).

| Role | V2.5.3 home | What V2.5.3 showed | On the start page now | Not carried |
|---|---|---|---|---|
| Visitor | Welcome | Arrival sentence; a route map to the building; Check in, or the way to the host once checked in; Find the way | Welcome sentence; Find the way as the first action; jumps to wayfinding, places, the campus | The route map drawing. The state of the visit ("your host knows you are here") |
| Employee | Today | Your room with when it is free; Open the room, Room control; six rooms free now, nearest first; places around you; your requests; Report a problem, Ask for a change | Your room and whether a problem is on record; Open the room; rooms near yours, nearest floor first; what you reported; Report a problem as a jump | Availability ("free now", "free until"): the rebuild has no booking data, so it is not shown rather than invented. The places list (it is one jump away). Room control |
| Executive | Briefing | Lede (health, rooms ready, what the plan asks for, decisions waiting); four measures; a risk map by building; investment by year; decisions waiting for a sponsor; rooms not ready before the next session | Lede (health, healthy rooms, funding on record, what is approved and unfunded); four figures; decisions waiting for a sponsor; the portfolio by building, weakest first | Investment by year and "devices inside support": the rebuild has no portfolio plan and no support-end dates. The risk map drawing. "Before the next session": there are no sessions on record |
| Service Engineer | Today's work | Open issues in your work and how many are past target; where to start; the queue, past target first; inspections recommended; commissioning deficiencies | Your next job as the headline, with Accept or Continue; your work orders by window; the queue, most severe first; what changed and what matters | "Past target": the records hold no service targets. Inspections recommended. The deficiency list |
| Service Manager | Service delivery | Five measures with a trend; the week's work orders by day; escalations to decide; engineer load; insights | Four figures; what waits for triage, with Triage as the first action; engineer load per person; the three-column strip | Past-target and the share inside target; coverage gaps; known fixes applied; the week board; escalation recommendations |
| Systems Engineer | Drawing board | The build pipeline in six stages; the blocked room as a drawing with its dimensions; waiting for an engineer; standards not met | The pipeline in six stations (the same ones Mission Control uses); waiting for an engineer; rooms the engine has design findings on | The room drawing. "Standards not met" as bars. The Evaluate and Budget stages |
| Designer | Design desk | A sheet title block; AI concepts waiting for a verdict; deviations from the field; engineering checks on small work; a concept plan on the drawing board; designs in review | The pipeline; what waits for a designer; rooms on the desk; a part-way Build a Room draft offered first | The title block and the plan drawing. AI concepts and deviations: neither exists as a record in the rebuild |
| Installation Engineer | Field package | Today's room as the headline; the job card with its checklist; a deviation form; what comes next; open deviations | Today's job as the headline, with Accept or Continue; the package by window; rooms being installed and what holds them | Checklist progress on the card. The deviation form |
| Commissioning Engineer | Proof board | Four measures; the readings of the first room with its phases; who has each room and what it waits for; insights | Four figures; the board, blocked first, with what holds each room; the three-column strip | The readings: nothing in the rebuild is measured, so no reading is shown. Phase by phase progress |
| Integration PM | Delivery timeline | A timeline of projects; the next fourteen days; handoffs open; what is still being bought | Projects with their delivery state; rooms in installation, commissioning and acceptance; movements of the last thirty days | The timeline drawing. The fourteen-day agenda, handoffs and procurement: the programme holds no milestones or orders |
| Business PM | Business delivery | A charter card per project (need, phase, sponsor, cost, next milestone); decisions waiting; insights | A row per project (the need in the requester's words, governance, funding, last decision); decisions waiting, with Decide as the first action | Sponsor, cost ranges and the next milestone |
| Data Steward | Ledger | Not compared: this home is built by wrapping an earlier function, which was not read in full | Identity states of every device position; rooms with a gap in the record; changes that were refused | Unknown until the comparison is made |
| AV Operations Lead, Product Architect | Mission Control | Mission Control | Mission Control, as before, now with the jump bar | — |
| Document Reviewer | (not in V2.5.3) | — | Review desk: what waits for a review they neither recorded nor verified | — |

## What this means

The start pages carry each home's purpose and its queues on the records the rebuild has. They do **not** yet carry the drawings that
made the V2.5.3 homes look different from one another (the visitor's route, the executive's columns, the designer's sheet, the
engineer's plan, the project manager's timeline), and they leave out everything the rebuild has no record for rather than inventing it.
Carrying the drawings over is the next step for these pages; the missing records (availability, service targets, milestones,
deviations, support-end dates) are a data decision for the founder: model them synthetically as V2.5.3 did, or leave them out.
