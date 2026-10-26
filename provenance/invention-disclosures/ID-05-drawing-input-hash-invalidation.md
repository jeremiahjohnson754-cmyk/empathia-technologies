# ID-05 — Input-hash invalidation of approved engineering drawings feeding design deficiencies

**Attorney-review material. Not a patent application, not a patent grant, no novelty or patentability opinion.**

## Technical problem
Generated drawings (plans, placement, schedules, signal and network diagrams) are approved by an engineer; the design then keeps changing. Approved drawings silently go stale, and the disagreement between the approved drawing and the current design is discovered on site.

## Proposed solution
Each drawing kind has a defined input projection of the design (`drawingInput`). On generation, the drawing revision stores the SHA-256 of its input. A drawing's state is derived, not stored: DRAFT (never generated), GENERATED, APPROVED, or **REVIEW_REQUIRED** whenever the current input hash differs from the hash of its latest revision. When an approved schedule or placement drawing becomes REVIEW_REQUIRED, the design analysis raises a correlated design deficiency ("drawing disagrees with the design"), which participates in the issue lifecycle like any other finding.

## Architecture
```mermaid
flowchart LR
  D[design change] --> H[drawingInput(kind) → sha256]
  R[(drawing_revision<br/>kind, rev_no, input_sha256, state)] --> S{hash equal?}
  H --> S
  S -->|no| RR[REVIEW_REQUIRED]
  S -->|yes| ST[stored state]
  RR -->|approved schedule/placement| I[design deficiency<br/>drawing-disagreement]
```

## Implementation details
- Input projection: `packages/commissioning-engine/src/design.ts:101` (`DRAWING_KINDS`), `:110` (`drawingInput`).
- Derived states: `services/enterprise-api/src/domain/rooms.ts:62–70` (`drawingStates`); findings `:85`; revisions written at generation `:361`.
- Demonstrator origin: `src/v25-60-room.js:432–434` (`v25RoomDrawingStates`, `v25RoomDrawingFindings`).

## Algorithms
For each kind: cur = sha256(canonical(drawingInput(design, kind))); latest = latest revision of kind; state = DRAFT if none, REVIEW_REQUIRED if latest.input ≠ cur, else latest.state. O(K) per analysis (K = 7 kinds).

## Development timeline (git)
2026-10-24 `f9ae2b4` (drawing set states in Build a Room); 2026-10-26 monorepo port (`03d9410`); covered by `tests/integration/api.test.mjs` slice 3 (`ad4ed25`).

## Prior-art questions (open)
1. BIM/CAD revision management that flags drawings out of date relative to the model (model-derived sheets) — overlap?
2. Hash-based staleness (build systems, content-addressed artifacts) applied to approvals — how close?

## Potential applications
Engineering document control in AV, MEP and fit-out; any approval workflow over derived artifacts.
