# ADR-0008 — The governed project lifecycle (P5)

Status: implemented 2026-10-31 (continuation directive, P5) · awaiting owner confirmation on two reconciliations (§Decisions for the owner)

## Context

The continuation directive asks for a governed project lifecycle: intake (nine request types) → review → engineering brief →
collaborative design → approval → execution/handoff → operational transition, with positive and negative tests, ledger rows and an
ADR. The Living Campus V2.5.3 demonstrator already carried two state machines for exactly this (`V25_STATE_MACHINES.project_governance`
and `.design_and_commissioning`), with authorized roles and named guards (`V25_GUARDS`), and the persona policy already carried every
authority they need (`request.submit`, `route.internal`, `pitch.submit`, `approver.select`, `project.decide`, `funding.authorize`,
`scope.revise`, `design.submit`, `review.dsp|camera|touch`, `rfi.resolve`, `design.release`, `plan.compile`, `field.authorize`,
`work.accept`, `tests.verify.all`, `documents.approve`, `customer.accept`, `handoff.accept`, `baseline.approve`). No authority, role or
state was invented.

## Decision

1. **The engine is the demonstrator's, verbatim.** `@empathia/project-governance` carries the 11 + 12 states, the 11 + 11 transitions
   (from, to, authorized role, guard) and the guards' wording. A guard returns every reason it is not clear; the API refuses with all of
   them and audits the refusal (nothing else is recorded by a refusal).
2. **Nine request types = the demonstrator's intake work types ∪ its project kinds**, de-duplicated: `new_room` (= new_install / "Room
   build"), `room_refresh`, `camera_replacement`, `dsp_upgrade`, `network_change` ("Network"), `lifecycle_replacement` ("Lifecycle"),
   `signage`, `break_fix`, `room_verification`. "Program" (a change across many rooms, one room at a time) is a flag on a request, not a
   type. Each type records its source in the engine.
3. **The brief is the demonstrator's pitch deck**: versioned (`rev`), bound to the project's `scope_rev`, authored by a named person. The
   author of the brief is never its approver; the person who selects the approver never selects themself; the approver must hold
   `project.decide`; a delegate decides only through a live delegation (ADR-0005) and the audit row says so.
4. **Funding before design.** The demonstrator's delivery machine starts at `ENGINEERING_REVIEW → DESIGN_DRAFT` with the guard
   `project_funded_and_scope_approved` ("an approved project without money is not field-authorized"). The directive lists collaborative
   design before approval; this implementation follows the demonstrator's order and reports the stage accordingly (`stageOf`).
5. **Execution facts are read from the rooms, never asserted.** `TESTS_VERIFIED`, `DOCUMENTS_APPROVED`, `CUSTOMER_ACCEPTED` and
   `BASELINED` are derived from each project room's own governed lifecycle (commissioning engine, verification, acceptance, baseline
   publication). The rule pack version is pinned from the engine that compiled the plans. The one attestation that is not computed is the
   service manager's field authorization (technician qualified, site access): the demonstrator computed hard gates against a staff
   skills registry that does not exist in the platform yet; the record names who attested and when.
6. **Operational transition stays honest.** A room becomes OPERATIONAL only with live monitoring evidence (commissioning engine); none
   exists, so a baselined project's rooms stay ACCEPTED and the readiness view says `NOT_MONITORED`.
7. **History is immutable.** Briefs, decisions, funding rows, design revisions, reviews and RFIs are appended; a scope revision reopens a
   HELD / REJECTED / SUSPENDED project by returning it to its recorded route for a new brief and a new approval chain (the old ones stay).

## Contract

| Item | Value |
|---|---|
| Migration | `database/migrations/0017_project_lifecycle.sql` — `project_request`, project columns (`governance`, `delivery`, `scope_rev`, approver, support owner, QA sign-off, rule pack version, field authorization), `project_brief`, `project_decision`, `project_funding`, `project_design_revision`, `project_design_review`, `project_rfi`; all tenant-RLS |
| Routes | `GET /v1/projects/catalogue`, `GET/POST /v1/requests`, `POST /v1/requests/{code}/submit|withdraw`, `GET /v1/projects/{code}`, `POST /v1/projects/{code}/route|brief|approver|decision|funding|funding/withdraw|scope|design-revisions|design-revisions/{rev}/review|design-revisions/{rev}/rfis|rfis/{rfi}/resolve|delivery` (17 operations; OpenAPI 97) |
| Events | the demonstrator's: `request.submitted`, `request.cancelled`, `vendor.request_acknowledged`, `project.pitch_deck_submitted`, `project.approval_requested`, `project.approval_decided`, `project.approval_reopened`, `project.funding_authorized`, `project.funding_withdrawn`, `design.revision_proposed`, `design.approved_for_install`, `handoff.accepted` — validated by their contracts on the outbox |
| Tests | `packages/project-governance` 9 unit tests (every guard, positive and negative); `tests/security/project-lifecycle.test.mjs` 12 tests over HTTP + PostgreSQL (one request carried the whole way, every gate tried the wrong way first; delegation; tenant and site isolation; the honest OPERATIONAL refusal); the authority matrix covers the 16 keyed routes |
| Not built | enterprise-web pages for intake/projects (next step); demonstration step pages; a staff skills registry for computed field gates; vendor quotes (`vendor.quote`); the documentation tracker's 36 columns (documents = approved drawings + QA photo sign-off today) |

## Decisions for the owner

1. The nine request types as derived above (the directive's list was not recoverable verbatim in this workspace after context compaction;
   the derivation is from the demonstrator's own two catalogues).
2. Approval before collaborative design (the demonstrator's order), rather than the directive's listed order.
