# Known defects register

Defects found while building and testing the production starter. Each row says where it comes from, what it does, and its state.
A defect stays here until a change fixes it **and** a test that fails without the fix passes with it.

| ID | Where | Defect | Inherited from | Severity | State |
|---|---|---|---|---|---|
| KD-01 | `rooms.transition` (DESIGN_APPROVED) | Design approval records `approved_revision = max(rev_no)` even when the current design has unsaved changes after that revision, so the approved revision can differ from the design on screen. Reproduce: create a room, add a device without saving a revision, approve. | Demonstrator 2.5.4 (`v25RoomLifecycle`, `src/v25-60-room.js` line 464) — the starter ports the rule unchanged for parity | Medium (integrity of the approval record) | OPEN — proposed fix: refuse DESIGN_APPROVED while the current design hash differs from the latest saved revision ("save a revision first"), with a parity note against 2.5.4. Needs the founder's decision because it changes a demonstrated rule. |
