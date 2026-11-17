# The vertical slice: one room, end to end

Status, 16 Nov 2026. The founder's bar, the same day: "a demonstrably functioning vertical slice: Lite → Engineering → Commissioning →
ServiceHands → Assurance → APEX, with real persisted records, traceable evidence, meaningful interaction, and successful browser
testing".

## What it is

One accepted room of the synthetic campus (Atlas 7.112, the Strategy Room) is carried through all six products by their own pages. No
record is preloaded for the slice: every step below is taken on the page, and each product reads the others' records by id.

| Step | Product | What happens | The record |
|---|---|---|---|
| 1 | Lite | The furnished room opens; a device leads to its field record. | room `R-ATL-7-112`, its device positions |
| 2 | Engineering | The installer records how the device is mounted. | the field record, kept per room |
| 3 | Commissioning | The room's deficiency is handed to service. The Commissioning Engineer is refused; the Service Manager does it, once. | incident `ISS-…` with `source: deficiency` |
| 4 | ServiceHands | The incident runs the service machine to RESOLVED: triage, work order, assigned technician, accept, preflight, start, field evidence, hand-over, verification by someone else. | the incident, its work order and its evidence |
| 5 | Commissioning | Resolving the job does **not** close the deficiency. The fix is recorded, the retest carries evidence, the retester cannot verify, and a different engineer closes it. | the deficiency, with retest evidence `EV-…` |
| 6 | APEX | A case opens on the incident: ranked hypotheses, each with what is against it. Never a verified fault. | case `APX-…` on the incident |
| — | Assurance | The accepted baseline v1, and the deficiency closed by its retest evidence. | baseline v1; the closing evidence |

## Where to see it

`#/thread?room=R-ATL-7-112` ("One room, end to end").

- It opens from a room's commissioning record, from the deficiency workbench and from a ServiceHands incident that came from a
  deficiency. Any room with an open deficiency can be chosen.
- The page shows the six stages. Each has its facts, its records by id, the way into the product and the next thing to do.
- It lists the ids that tie each stage to the next: the room, `deficiency → incident`, the retest evidence, `incident → case`.
- It says "the thread is whole" only when all of these are true: a deficiency was handed over, the job was resolved, a verified
  retest closed the deficiency, and a case exists. Otherwise it lists what is missing.
- The Service Manager and the Operations Lead hand a deficiency over from this page. The role matrix does not admit them to the
  commissioning pages.

## Rules it holds

- A deficiency of a design still on paper is not handed to service: it gets a design change. The refusal is logged.
- One incident per deficiency: a second handoff returns the same incident.
- Handoff needs `issue.assign` or `service.triage`. Every refusal is written to the workspace's ledger.
- Nothing is copied into the thread: `apps/demo/src/thread/slice.ts` reads the campus record, the field record, the deficiency store
  and the workspace. A stage with no record says so.

## Verified

- `tests/unit/thread-slice.test.mjs` TS-01…05, through the stores and engines.
- `tests/browser/demo-vertical-slice.test.mjs` VS-01…10, in the browser. It covers every step in the table, a reload (the records
  are kept), the refusals, no console error, nothing requested off the page, and a phone width.

## Limits, stated

- The records are kept in this browser (synthetic). The server holds the room lifecycle, results, deficiency workflow and register
  (`tests/e2e/checkpoint-room-lifecycle.e2e.mjs`). The deficiency → incident link and the thread are not on the server yet.
- APEX's hypotheses come from its symptom library. A symptom it has no branch for gets "insufficient evidence", not an invented cause.
- Technicians are hard-gated by site: a room in a building nobody is approved for cannot be assigned. That is why the slice room is in
  Atlas.
