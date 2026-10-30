# ADR-0004 — Measurements with provenance; graph identity by stable key

Status: accepted (owner decisions RT-14 and RT-15, 2026-10-30 12:59 CT) · Phase: P2

## Context

RT-14: the demonstrator carried measured values as free text inside a test result (`instrument`, a note), without unit, method,
calibration state, uncertainty or an approval state, and nothing stopped a value simulated by a model or inferred from a recording from
being read as a field measurement. RT-15: graph edges (`app.relationship`) were keyed by display codes (`R-PLN-0001`, `A-0001`), so a
renamed or re-issued code silently detached or re-attached relationships. The owner approved stable tenant-scoped entity ids with versioned
relationships, and measurements that preserve provenance, units, calibration status, method, timestamp, location, source, uncertainty and
approval state — never conflating simulated, observed, inferred and physically measured values.

## Decision — measurements (migration `0013_measurements.sql`)

1. `app.measurement` records one value with: `metric`, `value`, `unit`, `method`, `instrument_id`, `calibration_status`
   (`CALIBRATED` / `EXPIRED` / `UNKNOWN` / `NOT_APPLICABLE`), `calibration_due`, `measured_at`, `location`, `source`, `uncertainty` +
   `uncertainty_unit`, `provenance` (`DESIGN_SPECIFIED` / `SIMULATED` / `INFERRED` / `OBSERVED` / `FIELD_MEASURED`), `approval_state`
   (`UNREVIEWED` / `VERIFIED` / `REJECTED`), the recorder and the approver, and an optional link to the test result it supports.
2. **Provenance never changes** and the value fields are immutable after recording (trigger `app.measurement_approval_only()`, EM006:
   only the approval columns may change, once).
3. **Only a field measurement from a calibrated instrument is ever VERIFIED** (CHECK on the table; the API refuses with an audited rule
   refusal and says why). A `FIELD_MEASURED` value names its instrument (CHECK). Rejecting is always allowed.
4. **The verifier is not the recorder** (CHECK `approved_by <> recorded_by`; API `ctx.separate`). Verifiers are the result verifiers of
   `commissioning.ts` plus the discipline verifiers (`test.verify.audio|video|control`).
5. **A level read from a digital file (dBFS) is never recorded as a sound pressure level** (`dB SPL`, `dB(A)`, `LAeq`, …): refused at
   the API with the correction ("record it in dBFS, or measure with a calibrated meter").
6. Routes: `GET/POST /v1/rooms/:room/measurements`, `POST /v1/measurements/:id/verify`; site scope applies through the room.

## Decision — graph identity (migration `0014_graph_identity.sql`)

1. `app.relationship` gains `from_key uuid`, `to_key uuid` and `rev`. Every entity table already has a tenant-scoped uuid primary key
   and a display `code`; the code stays for people, the key is the identity.
2. New edges carry both keys (`rooms.relate` resolves them for Room, PlannedAsset, Building, RoomIssue, Site, Project). Existing edges
   were back-filled where the code resolved; the rest keep NULL keys and the graph read reports them as `LEGACY_CODE_ONLY` in
   `identity` rather than pretending they are keyed.
3. The graph read (`GET /v1/graph/:type/:id`) still accepts display codes as the start node for legacy route compatibility (RT-17); the
   response's `identity` block states how many edges are keyed.

## Consequences

- A measurement is a first-class, reviewable record; the test result keeps its label (`PASS_VERIFIED` …) and may cite measurements.
- The engine's result labels are unchanged; nothing in the 92 golden cases changed.
- Full re-keying of the read side (edges addressed by key in the client) is a later step; today the API resolves codes and reports coverage.

## Evidence

`tests/security/governance.test.mjs` MEAS-1: 403 for a non-recorder role; dBFS-as-SPL refused (422); field value without instrument
refused (400); SIMULATED recorded but never VERIFIED (422); EXPIRED calibration not VERIFIED but may be REJECTED; recorder cannot verify
(422); calibrated field value verified by QA; EM006 on provenance change; CHECK on self-approval; refusals audited.
`tests/integration/relationship.test.mjs` (5) unchanged; graph identity coverage reported in `GET /v1/graph`.
