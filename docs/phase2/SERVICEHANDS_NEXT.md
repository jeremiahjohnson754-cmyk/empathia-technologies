# ServiceHands next generation and the operational workspaces — rebuild status (2026-11-03)

Rebuilt on `rebuild/demo-ops` after the original Phase 2 workspace was lost. Sources: the recovered briefs (`docs/recovery/turns-*`,
BRIEF_4C, the owner decisions of 2026-11-01), V2.5.3 read statically, and the shared engines. Synthetic data only; nothing is connected.

| Area | Status | What exists | What is missing or different |
|---|---|---|---|
| Intake (employee, site champion, technician; category; room and asset; guided checks; placeholder attachments) | DONE | `#/servicehands/new`, validated, focus to the first error | Attachments are placeholders by design |
| Classification, prioritization (severity + SLA), triage | DONE | Dispatch board, service engine guards | SLA business days counted as calendar days (stated on screen) |
| Resource matching with a reasoning panel; gates apart from preferences; preference override with an audited reason; hard gates never | DONE | `#/service` | The 4b dispatch engine was lost; rebuilt on `@empathia/service-engine` (`apps/demo/src/dispatch/engine.ts`) |
| Assignment (explicit, labelled), reassignment with reason to eligible people only, withdrawal | DONE | Dispatch board | — |
| Technician workspace (instructions, safety, preflight, parts, notes, blockers, escalation, evidence) | DONE | `#/servicehands/wo/<id>` | Parts are read from the stock table; no reservation |
| FI findings as provenance-labelled evidence (KNOWN / INFERRED / SIMULATED) | DONE | ServiceHands + `#/v25/fi/scan/<room>` | Scan replay is generic over room positions; richest for the reference room |
| Independent validation, resolution code and root cause, closure ("not recommissioning") | DONE | ServiceHands | — |
| Replacement → reopened tests by the shared rule | PARTIAL | Core Replay: the engine's applicable tests that name PA-0007 reopen | `reopenedBySubstitution` / `planReplacement` (packages/commissioning-engine) were lost and are not rebuilt; the counts come from the engine's own applicability rows, so they differ from the lost run (12 of 75) |
| Broader changes → pending change management (task #338, not authorized) | DONE (wording) | Closure screen | No change workflow (not authorized) |
| Learn: band recommendation (rule stated), lab completion as competency evidence | DONE | ServiceHands learning step, Learn labs | Learn case generation stays in the existing `#/v25/learn` page |
| Hero experiences A/B/C as guided tours | NOT DONE | The pieces exist and link to each other | Tour scripts were not recovered |
| Fictional additional sites for coverage | NOT DONE | ATL and NST only | Owner decision said "later in 4b" |
| Metrics from records | DONE | Five metrics with numerator and denominator | — |
| Core Replay (read-only playback, explicit scenario application, EXC-4218-01 pending) | DONE | `#/replay` | 3D view not rebuilt (2D plan, dark per D36) |
| Decisions (desk on project-governance; Decision Memory) | DONE | `#/v25/decisions`, `#/decisions` | Finance is not a demonstration perspective; the Product Architect shows the funding signature |
| Destructive-action safeguards | DONE | `SAFEGUARDS` registry, named confirmation, Undo | — |
| Learn labs | PARTIAL | Audio (Web Audio), Camera, Lighting labs; the 26 SIGNAL signal-flow labs with a simulator | The other 65 SIGNAL labs (physics, network, power, EQ, camera, RF, DMX, fill) run as calculation checks only, and say so |
| Hardening (chunk failure named alert + Try again at a fresh URL; drawing failure caught) | DONE | `#/hardening` | — |
