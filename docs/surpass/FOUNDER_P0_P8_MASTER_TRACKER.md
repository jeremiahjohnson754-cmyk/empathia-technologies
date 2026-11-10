# FOUNDER-P0..P8 master tracker — Surpass directive, as of 9 November 2026 (late evening)

The repository had no earlier definition of delivery phases P0–P8 (P0/P1 appear only as defect severities and as LEI phase names), so
the founder's gates are recorded as **FOUNDER-P0..P8**. Branch `v18/continuation`. Statuses are the directive's: SPECIFIED,
IMPLEMENTED_NOT_VERIFIED, SYNTHETIC_DEMO (built, tested, synthetic data), BLOCKED, NOT_RUN. Nothing is RELEASED_VERIFIED: the new work
is not deployed. A phase is not complete because a document exists.

| Phase | What is true today | Evidence | Not done |
|---|---|---|---|
| **P0** Source and canon recovery | PARTLY. Repository, Render services and all 31 October bundles reconciled; baseline guard passes (1,099 requirements, 652 scenarios, 52 role configurations); 1–5 November work verified as ancestors of the working branch | `docs/recovery/SOURCE_RECONCILIATION_2026-11-09.md`, `scripts/verify/baseline-preserved.mjs` | The V2.5.3 and SIGNAL no-loss matrix is **not written**. SIGNAL standalone canon counts are **not re-derived** from the source file. Product census (34 SKUs, 7 bundles) exists as pricing data only |
| **P1** Functional restoration and foundations | PARTLY. Proof Registry (package, API, six routes, 12 security tests), tenant isolation tests, QR Hub, dossier engine | `packages/proof-registry`, `tests/security/proof-registry.test.mjs` | Pilot domain and routes; Harmony; federated source launch (External Resource Reference) are SPECIFIED only |
| **P2** Commissioning, Assurance, Field Intelligence authority | PARTLY. Reference dossier computed and consistent (27 / 3 / 2, 29 of 32, HELD); acceptance rules refuse a false green | `tests/browser/demo-proof.test.mjs` (56), 22 unit tests | Documentation Tracking and Submission gate; PDF / Word / Excel exports; six-phase model reconciliation |
| **P3** Universal Lite, Search Party, Space Optimizer, Showroom Builder | PARTLY. One estate model; one estate page for three worlds with search in context; Space Optimizer engine and page (nine dimensions, A / B / C, saved study per world) | `tests/unit/demo-estates.test.mjs` (21), `demo-optimizer.test.mjs` (14 unit, 36 browser), `demo-estate.test.mjs` (42) | Showroom Builder (not started). Enterprise not on the shared model. Optimizer has no adjustable assumptions or saved user proposals yet. No 3D |
| **P4** Four living estates and Experiences | PARTLY. University 38 classrooms / 4 dormitories / 3 campuses; Stadium 62,200 seats with a full program; Convention 13 halls, 225 meeting rooms, 1,248 booths | `docs/surpass/FOUR_WORLD_ESTATE_MANIFESTS.md` (generated from records) | Enterprise is 45 of 90 rooms. Game-day and expo state machines; explorable University social world; event schedule with collisions — not started |
| **P5** SIGNAL / Learn mastery and people intelligence | PARTLY. The whole canon is carried unchanged and readable at `#/story`: Prologue and 133 chapters, 1,610 panels with art, 387 gating decisions that can fail, hints, conversations, discoveries, progress, replay. Audio, camera and lighting labs already existed | `packages/signal-canon` (hash manifest), `tests/unit/signal-canon.test.mjs` (12), `tests/browser/demo-story.test.mjs` (33) | Drills, incidents, bosses and meltdowns launched from the story; Service Mode 0–5; Competency Engine V2; manager recommendation loop; narration and film; choices carried between chapters |
| **P6** Websites, media | PARTLY. Website: Proof page, short pricing page, pilot readiness. Film 13 continuity scene: picture recorded and narration composed in the Brian voice | `docs/media/film-13/SCENE_01_CONTINUITY.md`, `docs/surpass/MEDIA_MASTER_MANIFEST.md` | Founder review of the scene; the 180-second master; Collabora-SING source analysis; investor tours; Founder Studio text |
| **P7** Commercial readiness | SPECIFIED, with groundwork (`packages/commercial`, migration 0028) | 15 unit tests | Checkout sandbox end to end; entitlements; import and export |
| **P8** Independent validation and release | NOT_RUN. Continuous checks only: full browser matrix passed in both colour schemes on the build before the estate work | `.local/qa/v18/*.log` | QA Round One and Round Two, defect register closure, release packet |

## Stop-ship items open now

1. Enterprise shows 45 rooms where the directive requires the original 90.
2. Handoff documents remain in the public repository's history (removed from the branch on 9 November). Needs the founder's choice: make the repository private, or rewrite history.
3. No human has reviewed any film, claim wording or engineering rule. Every "review" in this repository is an automated check.
