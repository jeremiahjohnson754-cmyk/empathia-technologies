# Commissioning: release readiness

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive. It says what is ready, what is verified and how, and what is not, without rounding up. **NOT RUN is never PASS. Nothing here is production-ready by declaration.** Production (`main`) waits for the founder's word.

## The candidate

- **Commit:** `59acf12` on `v18/continuation`.
- **Staging:** after its full regression, `phase3/legendary-experience`, served by `empathia-demo-next` and `empathia-website-next`.
- **Regression:** run in an isolated worktree on the candidate commit itself, as the founder asked on 12 Nov: the final combined commit, not an earlier build. The results are recorded at the end of this file when the run completes.

## What the candidate adds to commissioning (14 Nov 2026)

| Area | Built | Verified by |
|---|---|---|
| Registers at the start of commissioning | room and device registers; installer entries; before and after photographs; retired register | `demo-registers`; `tests/security/device-register` (DR-01..06) |
| Asset ID as the spine | a retired ID is never reissued; asset life page; Search Party by asset | `asset-retirement` (AR), `demo-asset-life`, `search-asset-person` |
| Deficiency state machine | engine, demo workbench, server-side enforcement (0032) | engine tests (6), `demo-deficiencies`, `deficiency-workflow` (DW-01..07) |
| Rules engine explanations | every check's reason in and out of the plan | `demo-plan-why` |
| Instrument bench | reverberation (EDT, T20, T30) and STI with the intelligibility exception | `bench-reverb`, `demo-reverb`, `bench-sti`, `demo-sti` |
| Universal phase engine | commissioning unchanged on every room; ServiceHands job phase by phase | `universal-phases` (UP-02 on all rooms), `demo-service-phases` |
| Five reference journeys | A–E, request to assurance, read from the record | `demo-scenarios` |
| Analytics | commissioning, service and vendor, people, field, Pro | `demo-cx-analytics`, `demo-service-analytics`, `demo-people` and others |
| Exports | 28 reports × 6 formats | `export-formats`: 915 passed, 0 failed |
| Field UX | 24 px targets, every control named, no sideways scroll on seven field pages | `demo-field-ux` |

## Not ready, stated

- **Licensed standards registry.** Not built; it needs a licensing decision (`COMMISSIONING_STANDARDS_TRACEABILITY.md`).
- **Real-room acoustic reference datasets.** NOT RUN. The comparison with an established analyser is NOT RUN as well (`ACOUSTIC_MEASUREMENT_VALIDATION.md`).
- **The register as a hard server-side gate before commissioning.** Not built. Today it is shown and counted, but it does not block. Making it block is a policy decision.
- **Instruments other than reverberation and STI.** RTA and SPL need a calibration chain and a declared device capability. The video, network and control instruments are not built either.
- **A field trial.** A trial with installers for gloves, glare and one-handed use is NOT RUN.
- **Microsoft Office.** Not tested; LibreOffice and the format libraries are.

## Regression of `59acf12`

To be completed when the run ends.
