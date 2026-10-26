# ID-04 — Multi-dimension room assurance that separates drift from design gaps

**Attorney-review material. Not a patent application, not a patent grant, no novelty or patentability opinion.**

## Technical problem
After a room is commissioned, monitoring tools report "healthy/unhealthy" per device. They do not say whether the room still behaves as it was designed and commissioned, and they conflate two different situations: the room has changed since its accepted baseline (drift), versus the room never met the design standard in the first place (a gap that existed at handover).

## Proposed solution
Compare each room across **designed / commissioned (baseline) / current / proposed** states over a fixed set of assurance dimensions (presence, network, power, firmware, configuration, signal path, application, camera, audio, display, spatial, …). Each dimension gets a status (match, drift, fail, not applicable, not assessed, observed-by-people), an evidence class (MEASURED, INFERRED, …), a drift type (DEVICE, PERFORMANCE, CONFIGURATION, SPATIAL, DEPENDENCY, FIRMWARE, NETWORK), and — separately — a **gap** text when the baseline itself fell short of the standard. Layout differences between the commissioned and current spatial models (moved/added/removed objects, camera-preset aim changes) feed the spatial and camera dimensions. Baselines are versioned and archived, never overwritten. Remediation is proposed as a controlled action (recommission, restore preset, send support) requiring the right authority.

## Architecture
```mermaid
flowchart TB
  B[(accepted baselines<br/>versioned, archived)] --> X[assuranceOf(room)]
  L0[commissioned layout] & L1[current layout] --> DIFF[layoutDiff] --> X
  M[measurements, checks, signals, issues] --> X
  X --> R[17 dimension rows:<br/>status · drift type · evidence class · gap · fix]
  R --> INC[drift → incident (deduplicated)] --> APEX[hypotheses → reviewed action]
```

## Implementation details (demonstrator)
- `src/57-derive-assure.js:13` (`baselinesOf`), `:17` (`layoutDiff`), `:29` (`assuranceOf`), gap examples `:57`, `:86`.
- V2.5 baseline management and APEX workflow: `src/v25-093-assure.js:12` (`v25BaselineSnapshot`), `:24–29` (propose/accept/versions/compare), `:35` (`v25AssureRoom`), `:46` (`v25DriftToIncident`), `:57–67` (APEX open/review/act), `:88` (`v25IncidentDedupe`).
- Monorepo port (commit `41fb895`, 2026-10-26): `packages/assurance-engine/src/assess.ts:87` (`assess`), `:83` (`worse`), `:227` (`baselinesNewestFirst`); `packages/assurance-engine/src/layout.ts:19` (`layoutDiff`, thresholds `:7–9`); vocabulary `packages/assurance-engine/src/vocabulary.ts`; tests `packages/assurance-engine/test/assurance.test.ts`. Exposed as `GET /v1/rooms/:room/assurance`, which reports "unknown" where there is no evidence; the starter keeps live health NOT_MONITORED.

## Algorithms
Per dimension: worst-of(device states, assurance-check results, spatial/metric comparisons) → status; drift type chosen by cause; gap computed against the archetype standard independent of drift. Layout diff: objects matched by id; moved if displacement > 0.12 m or rotation > 3°; seats counted, not listed; presets compared by aim angle (> 1.5°). Cached per room and state sequence.

## Data caveat
All inputs in the demonstrator are synthetic and simulated ("Nothing contacts a device"). No real monitoring data has been used.

## Development timeline (git)
Present in the V1.4.0 baseline of `empathia-campus` (tag `v1.4.0`, 2026-10-14; earlier history not in any repository — FOUNDER_TO_SUPPLY); carried into V2.5 `1b16e44` (2026-10-22); V2.5 baseline/APEX module in `src/v25-093-assure.js`; ported to the monorepo `41fb895` (2026-10-26).

## Prior-art questions (open)
1. AV/IT room-monitoring platforms with "baseline" or "golden configuration" comparison — do any separate as-built gaps from post-handover drift?
2. Configuration-drift detection in infrastructure management (desired-state systems) — overlap?
3. Building-performance "ongoing commissioning" practice and tools.

## Potential applications
Post-handover assurance for meeting rooms and venues; service-level evidence for managed-service providers; recommissioning triggers.
