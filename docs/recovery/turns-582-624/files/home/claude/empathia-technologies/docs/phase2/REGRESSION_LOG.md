# Phase 2 regression log

Each row is a full run on the integrated branch `phase2/living-universe` after a build (`node scripts/build.mjs`). The counts are the test
runners' own. NOT RUN means not executed; it is never counted as passed.

## 2026-11-01 14:40Z · tip 1a4773f (Slice 2 and the owner's reference-room decisions integrated)

| Suite | Result |
|---|---|
| Unit · `packages/campus` | 40/40 |
| Unit · `packages/spatial` 11 · `field-intelligence` 4 · `commissioning-engine` 145 · `assurance-engine` 18 · `search-party` 5 · `service-engine` 5 · `event-contracts` 3 · `kpi-engine` 4 · `apex-engine` 4 | all pass |
| Unit · `apps/demo/test` | 84/84 |
| Unit · ElevenLabs guard rails (`scripts/media/elevenlabs/test`) | 14/14 |
| Browser · demo-decisions | 40/40 |
| Browser · demo-search-scenarios | 67/67 |
| Browser · demo-replay | 53/53 |
| Browser · demo-fi-scan | 62/62 |
| Browser · demo-campus | 48/48 |
| Browser · demo | 163/163 |
| Browser · demo-ux | 24/24 |
| Browser · learn-labs | 41/41 |
| Browser · demo-enquiry | 21/21 |
| Browser · website | 197/197 |
| Site audit `--strict` (164 page × width checks) | PASS 164 · FAIL 0 · **P0 0 · P1 0** · P2 41 (was 113 at bbb4bf3) · P3 321 |
| Enterprise integration, security and e2e (needs local PostgreSQL), enterprise-web E2E, staging header check, fresh-clone CI | **NOT RUN** in this pass (scheduled for the release-evidence run) |
