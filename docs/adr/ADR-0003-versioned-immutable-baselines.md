# ADR-0003 — Versioned, immutable Assurance baselines

Status: accepted (owner decision RT-04, 2026-10-30 12:59 CT) · Supersedes the `app.room.baseline` jsonb column (kept, read-only fallback) · Phase: P2

## Context

The demonstrator stored the accepted baseline as one JSON blob on the room (`room.baseline`), overwritten on every acceptance. The
red team (RT-04) showed that a second acceptance silently replaced the first, that nothing bound a baseline to the exact design revision
and evidence objects it was accepted against, and that an exception to a baseline had no owner, no decision and no expiry. The owner
approved: versioned, immutable baselines bound to the exact room, design and commissioning evidence; superseded, never overwritten; one
clear current baseline; full lineage; authorized exception workflows.

## Decision

1. **A baseline is a row of `app.assurance_baseline`** (migration `0011_assurance_baseline.sql`) with `version` (1, 2, …), `state`
   (`CURRENT` / `SUPERSEDED` / `WITHDRAWN`), and what it binds: `design_revision` + `design_sha256` (the approved revision's hash),
   `plan_id` (the commissioning plan), `results` (every applicable test's result label at publication), `evidence_ids` (the evidence
   objects those results cite), `devices` (the non-furniture devices of the bound revision), `reason`, `published_by/at`, `supersedes`.
2. **Published by acceptance, never by hand.** Version 1 is written by the ACCEPTED transition itself (`rooms.transition` →
   `baselines.publish`). Later versions are written by a re-acceptance after a *recommissioning*: `ACCEPTED → COMMISSIONING` is a
   governed backward step (authority `plan.compile`, like any other lifecycle step; `commissioning-engine/lifecycle.ts`). While a room
   is being recommissioned the previous version stays `CURRENT`; the re-acceptance supersedes it and emits `assurance.baseline_superseded`.
   There is no explicit "publish a baseline" route: a baseline exists only because an authorized acceptor accepted the evidence.
3. **Immutable.** The trigger `app.baseline_transition_only()` (EM005) refuses any UPDATE that changes a binding field and allows only
   the state transition `CURRENT → SUPERSEDED|WITHDRAWN` with `superseded_at/by`; DELETE is refused (`app.refuse_change`). One `CURRENT`
   per room is a unique partial index.
4. **Separation of duties** (ADR-0005): the acceptor is never a recorder or verifier of the results the version binds.
5. **Exceptions** live in `app.baseline_exception` (`ACCEPTED_DEVIATION` / `TEMPORARY_WAIVER` / `KNOWN_GAP`, a dimension, a rationale,
   an optional expiry) against a named baseline version; requested by a verifier/recorder/approver, decided (`APPROVED`/`REJECTED`) by a
   holder of `baseline.approve` who is not the requester (API `ctx.separate` and the CHECK `decided_by <> requested_by`).
6. **Reads.** `GET /v1/rooms/:room/baselines` returns the lineage, the current version and the exceptions; `GET /v1/rooms/:room/assurance`
   assesses the current version (falls back to the legacy `room.baseline` for rooms accepted before this migration) and reports its id and
   version.

## Consequences

- The legacy `room.baseline` column is still written at acceptance for compatibility with the read model and the demonstrator's
  assurance view; it is no longer the source of truth. Removing it is a later migration once every reader uses the lineage.
- A re-acceptance always produces a new version even when every label is unchanged (the bound result objects differ), so the lineage
  records every acceptance. "Nothing changed" is visible by comparing versions, not hidden by suppressing them.
- `WITHDRAWN` exists in the schema for a future "withdraw acceptance" step; no route sets it yet (listed as NOT IMPLEMENTED in the ledger).

## Evidence

`tests/security/governance.test.mjs` BL-1 (v1 bound to revision, hash, plan, labels, evidence; `handoff.accepted` emitted once), BL-2
(EM005 on UPDATE/DELETE), BL-3 (recommissioning → v2 supersedes v1, lineage kept, `assurance.baseline_superseded` once), BL-4
(exception decided by a different person; the database refuses `decided_by = requested_by`).
