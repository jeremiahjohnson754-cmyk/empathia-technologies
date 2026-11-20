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

## On the server: the durable thread (16 Nov 2026)

The founder, 16 Nov 2026: "a full enterprise-grade digital thread still needs durable records, relationship integrity, audit history,
and reliable cross-session persistence."

**A correction first.** An earlier note here said the deficiency-to-incident link was not on the server. That was wrong. The API has
held it since the service lifecycle was built: `POST /v1/issues/{issue}/work-orders` raises a work order bound to its deficiency, and
`POST /v1/issues/{issue}/apex` opens a case bound to it. What was missing was the thread itself as one read, and one proof of the
whole chain.

- **The read.** `GET /v1/rooms/{room}/thread` (`services/enterprise-api/src/domain/thread.ts`) assembles the six stages in one
  transaction from the rows the products write. No table stores the thread.
- **Durable records.** The room and its positions; the design revisions with their hashes; the register; the plan, results and
  verifications; the deficiencies with their workflow; the work orders with evidence and verification; the baselines; the APEX cases.
- **Relationship integrity.** `work_order.issue_id` and `apex_case.issue_id` are NOT NULL foreign keys. Every table forces row-level
  security, so a thread joins one tenant's rows only. A work order with no issue is refused by the database. Baselines are immutable
  versions.
- **Audit history.** The thread summarises the hash-chained audit trail of its room, issues, work orders and cases, allowed and refused.
  The tenant's chain is sealed and recomputed by `GET /v1/audit/integrity`.
- **Cross-session.** The thread is the same for a different person on a new session. It is read from the database each time.
- **The rule.** Closing a work order never resolves its deficiency. The deficiency is resolved by its retest, with evidence, verified
  by someone other than the retester.
- **Verified by** `tests/security/room-thread.test.mjs` TH-01…09, through the real API on a real database:
  - a failed test and its deficiency;
  - the handoff: a designer refused, the service manager allowed;
  - the work order run to CLOSED with the deficiency still OPEN;
  - the retest closing the deficiency;
  - every test verified, the acceptance, and baseline v1;
  - the APEX case, and the thread complete with all six links;
  - a second person's session reading the same thread;
  - the foreign keys;
  - another tenant refused (404);
  - the audit count equal to the database's, and the chain verified.

## Limits, stated

- **The public demonstration and the server are still two implementations of the same thread.** The public demonstration is a static
  site: its records are synthetic and are kept in the visitor's browser, and it does not call the server. Since 17 Nov 2026 a demo
  built with a server address has a page, `#/connected`, that takes one room through the same journey on the server in a sandbox of
  the visitor's own — see `CONNECTED_DEMO.md`. That build is tested locally and is not deployed: hosting the API is a paid service.
- **The field record is on the server** (17 Nov 2026: `0034_field_record.sql`, `FIELD_RECORD_AND_REDLINES.md`). The demo's own field
  record page still uses the browser's copy.
- APEX's hypotheses come from its symptom library. A symptom it has no branch for gets "insufficient evidence", not an invented cause.
- Technicians are hard-gated by site: a room in a building nobody is approved for cannot be assigned. That is why the slice room is in
  Atlas.
