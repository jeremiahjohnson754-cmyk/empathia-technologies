# Handoff specifications (kept outside this repository)

This repository is public. The founder's handoff packages (v1.2 to v1.8) hold unpublished pricing, commercial planning and the names of
real organisations used as inspiration, so their documents are **not** committed here. They are the founder's own files; in a working
session they are extracted to `.local/handoff/` (git-ignored), with this layout:

| Folder | Package | What the build reads from it |
|---|---|---|
| `v1_8/` | Empathia 110/10 full handoff v1.8 | Master handoff, ADR-021…025, contracts (proof claim, pilot activation, Film 13), the 90 new requirements and tests |
| `v1_7/` | Empathia 100/10 full handoff v1.7 | 1,009 requirements, 562 tests, pricing catalogue (34 SKUs, 7 bundles, 4 pilots, SIGNAL terms), destructive-QA perspectives, SIGNAL canon |
| `v1_6/` | Real SaaS: QR, import, export, executive commissioning v1.6 | QR resolver, import job and report snapshot contracts; the synthetic dossier example; reference designs |
| `v1_5/` | Commercial source v1.5 | Entitlement and payment contracts |
| `v1_4/` | Four Worlds v1.4 | `matrices/FOUR_WORLDS_ROLE_NAVIGATION_ALL_52_v1_4.csv`, the world and role authorization contract |
| `v1_3/` | Three Worlds v1.3 | Role selector configuration, world storyboard |
| `v1_2/` | Enterprise master specification v1.2 | Master spec, architecture review, federated source requirements |

Requirement and test identifiers from these packages are cited in code comments, tests and `docs/v18/TRACEABILITY.md`.
A specification is not a passed test: every row is NOT_RUN until a test in this repository runs it.

The first copy of the v1.7 and v1.8 documents was committed on 2026-11-09 (`bd102c7`) and removed in the next commits; it remains in
git history until the founder decides whether to make the repository private or have the history rewritten.
