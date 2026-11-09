# Source reconciliation, 2026-11-09

Every 31 October artefact the founder supplied on 9 November was checked against its recorded SHA-256 and against the repository.
Nothing in them is newer than commit `ebcecb0`; all of it is now on GitHub.

| Artefact | SHA-256 (first 16) | Checksum file | Contains | Where it is now |
|---|---|---|---|---|
| `empathia-technologies.bundle` (two identical copies) | `29cfe9863adc6371` | matches | `main` at `ea84222`, complete history, 10 checkpoint tags | In history; the 10 tags pushed to origin on 9 Nov |
| `empathia-restoration-sprint-0-1.bundle` | `209e7f03b5150ac4` | matches | `restoration/sprint-0-1` at `27e3733` | `origin/restoration/sprint-0-1` (was already there) |
| `empathia-restoration-sprint-0-1_1.bundle` | `f257bdb92484d905` | matches | same branch at `7c18339` | An ancestor of `ebcecb0`; nothing extra |
| `empathia-restoration-sprint-0-1_2.bundle` | `b9cf8b07bd5637ad` | matches | same branch at `ebcecb0` (18 commits past `27e3733`: the release candidate) | `origin/restoration/sprint-0-1-rc`; merged into `v18/continuation` at `8eedd44` |
| `empathia-source-20261031-5436980.tar.gz`, `…-f85f805.tar.gz` | `d54a7a54be6e15d0`, `1790ea943f298ba2` | none supplied | Source snapshots of commits `5436980` and `f85f805` | Both commits are in history |
| `RELEASE_CANDIDATE_2026-10-31.md`, `CI_EQUIVALENT_TEST_RESULTS.md`, `ENGINEERING_READINESS_2026-10-31.md` | — | — | Reports | Byte-identical to the copies in the repository |
| `DEFECT_REGISTER.md` | — | — | Defects to D-18 | The repository copy is newer (to D-39) |
| `Empathia-Living-Campus-V2.5.3-offline.html` | `ecbde0bba17eafc9` | — | V2.5.3 original | Byte-identical to `legacy/source/v253/` (kept outside git) |
| v1.7 handoff zip | — | — | 1,009 requirements, 562 tests | Byte-identical to the copy inside the v1.8 zip; documents in `docs/handoff/v1_7` |

What the merge at `8eedd44` took from the release candidate: the backend, engines, schemas, migrations 0026 and 0027, and the integration,
security and end-to-end tests. What it did not take: the release candidate's front-end files, because the front ends were rebuilt after it
(Phase 3, 3–4 November) and the newer ones are kept.

Not recoverable from any of these: the Phase 3 working copy of 1–3 November (rebuilt from the conversation record; see `REBUILD_COMMON.md`).
The screenshot archives (`empathia-rc-screens.zip`, `empathia-sprint-0-1-screens.zip`) and `F-Droid.apk` were not opened or run.
