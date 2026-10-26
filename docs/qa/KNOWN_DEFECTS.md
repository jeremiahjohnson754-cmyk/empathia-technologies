# Known defects register

Defects found while building and testing the production starter. Each row says where it comes from, what it does, and its state.
A defect stays here until a change fixes it **and** a test that fails without the fix passes with it.

| ID | Where | Defect | Inherited from | Severity | State |
|---|---|---|---|---|---|
| KD-01 | `rooms.transition` (DESIGN_APPROVED) | Design approval records `approved_revision = max(rev_no)` even when the current design has unsaved changes after that revision, so the approved revision can differ from the design on screen. Reproduce: create a room, add a device without saving a revision, approve. | Demonstrator 2.5.4 (`v25RoomLifecycle`, `src/v25-60-room.js` line 464) — the starter ports the rule unchanged for parity | Medium (integrity of the approval record) | OPEN — proposed fix: refuse DESIGN_APPROVED while the current design hash differs from the latest saved revision ("save a revision first"), with a parity note against 2.5.4. Needs the founder's decision because it changes a demonstrated rule. |
| KD-02 | `packages/design-tokens/tokens.json` (light theme `--warn` #8a5a00 vs `--bad` #b42318) | The two warm status tones are nearly indistinguishable under deuteranopia (ΔE 0.3) and below the normal-vision floor (ΔE 12.8) in charts (`Composition`); dark-theme tones sit above the chart lightness band. Status is never carried by colour alone (glyph + text + legend), so this is chart legibility, not a WCAG failure of the badges. Evidence: `packages/ui/gallery/PALETTE_CHECK.json`. | — (new design system) | Low | OPEN — re-step the light `--warn`, reorder Composition so bad and warn are not adjacent, re-run the validator |
