# Engineering completion roadmap

One roadmap for everything the founder has directed since 24 Nov 2026. It extends the seven-day board
(`CLAUDE_FABLE_7_DAY_EXECUTION_BOARD.md`), which stays the record of the Enterprise 3.0 sprint; it does not replace it.

**Sources (founder directives, kept privately, not in this repository):** Master Engineering Completion (24 Nov 05:32); Six Worlds,
Spatial Intelligence 3.0 and ExpoSpace Live (24 Nov 05:32); Festival, the seventh world (24 Nov 06:10); Community, the eighth world
(24 Nov 06:10). Earlier decisions E3-D1 to E3-D5 still apply.

**Words used here.** Planned · In progress · Implemented · Unit-tested · Browser-tested · Exact-commit validated · Staged (on E3) ·
Released (on the canonical Next sites) · Blocked · Not run. A line is never moved to a later word than its evidence supports.
P0: security, data integrity, fundamental function, release-blocking. P1: major function, integration, usability. P2: meaningful
improvement. P3: recorded for later.

## Where the project stands (reconciled against the repository, 24 Nov 2026)

| Thing | State | Evidence |
|---|---|---|
| `main` (production) | `27c74695`, untouched this sprint | Render production services follow `main` |
| Canonical Next sites | `phase3/legendary-experience` at `fe30ba9d`, untouched this sprint | `docs/releases/STAGING_PREVIEW_E3.md` |
| E3 staging pair | `preview/enterprise-3` at `26c81f0d`, live-checked 26 of 26 | same |
| Working branch | `v18/continuation` at `1dae3703` (draft pull request 2 into `phase3/legendary-experience`) | board |
| Last exact-commit regression that passed | `1dae3703`: PASS 293 · FAIL 0 · NOT_RUN 2 (24 Nov 13:47 UTC). It includes the design pass on the room, the job, the work order and the APEX case | `tests/evidence/TEST_RESULTS.md` |
| Not yet on E3 | `1dae3703` is exact-commit validated; it is Staged only once `STAGING_PREVIEW_E3.md` records its deploy and live check | `docs/releases/STAGING_PREVIEW_E3.md` |
| GitHub CI | Green only on the repair branch (`ci/e3-d5-…`, draft pull request 3, based on `main`): PASS 286 · FAIL 0 · NOT_RUN 4. Never run green on `v18/continuation` | `docs/operations/CI_REPAIR_E3-D5.md` on that branch |
| Worlds that exist | Four (Enterprise, Stadium, University, Convention) in `apps/demo/src/worlds`, 52 role configurations | `registry.worlds.ts` |
| Leftover branch | `wip/e3-day4-links` on GitHub: two commits, cherry-picked into `a43891c0`; kept, per the founder | — |

Open decisions that only the founder (or counsel) can make: E3-D6 repository visibility and the invention disclosures (A10);
E3-D7, D-10, D-19 (carried from the board); any new paid voice generation for the tour (A13).

## Release train

The founder's instruction is one coordinated release to the canonical Next sites at the end of the whole initiative. Until then every
validated step goes to E3 only.

| Train | Contents | Ends when |
|---|---|---|
| R1 | Workstream A: hardening, security, design, website, tour, documentation on the existing platform | integrated candidate passes CI and the exact-commit regression, staged on E3 |
| R2 | B1–B6: shared spatial engine, kiosk and QR handoff, Airport, Hospital | journeys A1–A12, H1–H12 executed by browser tests, staged |
| R3 | B7: ExpoSpace Live on the Convention world | X1–X18, staged |
| R4 | B8: Festival | F1–F35, staged |
| R5 | B9–B10: Community, cross-world reuse, eight-world website | C1–C40, staged |
| Final | A18: release gates, then both canonical Next sites together | post-deployment verification recorded |

## Workstream A: completing and hardening what exists

| ID | Workstream | P | Blocks release | Depends on | Acceptance criteria and required tests | Status |
|---|---|---|---|---|---|---|
| A1 | Reconcile state; this roadmap; requirement-to-test traceability | P1 | no | — | Every board, ledger and register line agrees with the repository or is corrected with its reason | In progress |
| A2 | Evidence integrity: a standalone suite cannot overwrite the regression's evidence; failed runs archived; disk preflight and temp cleanup | P1 | yes | — | A standalone run leaves `tests/evidence` byte-identical (test); a failed run's evidence is kept under its commit; the regression refuses to start under a stated free-space floor | Planned |
| A3 | CI on the integrated candidate: bring the repair onto the release branch; pin Node, Python, Playwright, LibreOffice, sharp; clean install; prove CI fails on a planted defect | P0 | yes | A2 | GitHub run green on the candidate commit itself; a deliberately broken branch goes red; build requirements documented | Planned (repair green on its own branch only) |
| A4 | Dependencies: lockfile integrity, known vulnerabilities, licences | P1 | yes for any high-severity finding | A3 | Audit output recorded; each finding fixed, accepted with reason, or listed | Planned |
| A5 | Every NOT_RUN: ML prototype, film decode, three Founder Studio suites | P1 | no, if each is justified | — | Per suite: reason, risk, prerequisites, alternative validation, release impact; studio suites run locally where the private store is | Planned (studio suites already run in the local regression) |
| A6 | Test blind spots: refresh, back and forward, duplicate submission, out-of-order events, double closure, invalid input, stale or missing records | P1 | yes for any defect found | — | New browser checks, each shown red on a defective build and green after | Planned |
| A7 | Lifecycle integrity of the repair loop: a failed retest keeps the drift; repair is not readiness; the repairer cannot verify; a reopened or recurring job lowers readiness; stale or missing evidence reads Unknown | P0 | yes | — | Unit and browser checks for each rule; journey J6B extended with the negative paths | Partly implemented (verifier separation, drift kept on unchanged run, baseline untouched); the rest Planned |
| A8 | Relationship register for the seventeen capabilities: initiator, authoritative record, shared data, roles, events, persistence, failure handling; each relation classed navigation / shared reference / shared state / event / interoperation | P1 | no | A1 | Register in `docs/architecture`; every relation that claims more than it does is completed or relabelled | Planned |
| A9 | Authorization review for seventeen roles: direct address, search results, exports, attachments, audit log, record names; demonstration role switching stated as such | P0 | yes | — | Negative tests per boundary; redaction tests for search and exports; findings register with residual risk | Planned (link guard and access page exist; search and export redaction untested) |
| A10 | Confidentiality: exposure register (material, earliest verifiable public date, visibility, risk, action) across branches, history, bundles, source maps, public assets | P0 | yes | founder and counsel for any removal | Register kept privately; nothing new that is sensitive is published; no history rewritten | Planned; decision E3-D6 open |
| A11 | Design: audit by browser capture of every capability and role; shared tokens and components written down; measured WCAG 2.2 AA results; phone 3D view (selectable devices, tap to read a name, list in step with the drawing) | P1 | no | — | Captures at 320, 390, 768, 1024, 1440 px, light and dark; contrast and target-size measurements recorded, not claimed | In progress (two passes done; phone 3D names open) |
| A12 | Corporate website: each audience can tell what Empathia is; figure and issue thread match product behaviour; every call to action and link opens; metadata, social preview, performance budget | P1 | no | — | Link walk; claims checked against the readiness register (A15); size budget kept by structure, not by trimming bytes | Planned |
| A13 | Narrated tour of six families and seventeen capabilities, with captions, transcript, chapters, one end-to-end journey | P1 | yes (a release gate) | voice within existing authorization; approval before new spend | Every stop has a recorded take that plays; captions match; works on a phone | Planned. The voice method is checked first against `docs/training/RIGHTS_REGISTER.md` and the credit that remains authorized; any new paid generation is asked for before it is spent |
| A14 | Data and exports: KPI definitions and passports, dates and time zones, duplicates, drill-downs; Word, Excel, PDF, PowerPoint, Power BI exports respect the role | P1 | yes for a wrong figure | A9 | Each KPI recomputed from records in a test; export contents compared with the page for two roles | Partly tested (export formats 915 checks); role-scoped exports Planned |
| A15 | Integration and hardware readiness register: validated / awaiting live validation / simulated / adapter prepared / planned / blocked | P1 | no | — | Every integration named on a page has a row; pages use the same word | Planned |
| A16 | Reliability: large inventories, long histories, storage limits, interrupted sessions, restart recovery | P2 | no | — | Measured timings in this environment only; no enterprise-scale claim | Planned |
| A17 | Handoff: technical package for due diligence; sanitized investor package; adversarial review from twelve perspectives turned into tests | P1 | yes (documentation gate) | A8, A9, A15 | An engineer can build, test and deploy from the documents alone (dry run in a clean container) | Planned |
| A18 | Release gates and the canonical release, with rollback | P0 | — | everything above marked "yes" | The seventeen gates of the directive, each with its evidence | Planned |

Risks and remediation for A: (1) GitHub CI has never run on the working branch; the repair is based on `main`, so integrating it
may surface new failures: do A3 early. (2) The demonstration keeps its state in the browser; role switching is a demonstration aid,
not authorization, and the documents must keep saying so (A9, A17). (3) A10 may need legal advice; engineering can prevent new
exposure but cannot undo a past one.

## Workstream B: Spatial Intelligence 3.0 and four new worlds

| ID | Workstream | P | Depends on | Acceptance criteria and required tests | Status |
|---|---|---|---|---|---|
| B1 | Discovery: recover ExpoSpace Live and Home, Collaboro-Sing (ADR-005, SyncLab v0.2), and the shelter-resource concept; survey the four existing worlds and University Home gameplay for reuse | P1 | — | A recovery note per product listing what was found and what was not; no requirement invented | Planned |
| B2 | Spatial graph and routing: nodes, edges, floors, doors, lifts, closures, hours, access; step-by-step directions generated from the graph; preferences (fastest, step-free, low-sensory, multi-stop) | P1 | B1 | Graph validation (connected, no edge through a wall); route property tests; no route through an area the person may not enter; "no route" explained | Planned |
| B3 | Discovery engine: amenities and businesses with explainable ranking on labelled synthetic data; sponsorship labelled and outside organic rank | P1 | B2 | Ranking unit tests; every figure labelled synthetic | Planned |
| B4 | Kiosk framework, QR handoff with scoped expiring tokens, entitlements separate from administration | P0 for the token and session rules | B2 | A real code scanned between two browser sessions; expired and replayed tokens refused; kiosk clears its session; no sensitive payload | Planned |
| B5 | Airport (modelled, O'Hare-inspired, not official) | P1 | B2–B4 | Journeys A1–A12 as executed browser tests with permission checks | Planned |
| B6 | Hospital (modelled, UChicago Medicine-inspired, not official); visitor rules that never confirm a patient's presence improperly | P1, privacy rules P0 | B2–B4 | H1–H12 | Planned |
| B7 | ExpoSpace Live on the Convention world, with University Home gameplay | P1 | B1, B2–B4 | X1–X18 | Planned |
| B8 | Festival (modelled, fictional line-up): attendee, commerce, friends, artists, production engineering, executive | P1 | B2–B4, B7 gameplay | F1–F35 | Planned |
| B9 | Community: church and nonprofit campus, interoperability contracts for BiblefyMe and InfiniSpeak with labelled simulators, Collaboro-Sing, church production, citywide resource coordination | P1, safeguarding and assistance privacy P0 | B1, B2–B4 | C1–C40 | Planned |
| B10 | Cross-world reuse, website pages for eight worlds, tour extended | P1 | B5–B9 | One engine routes a person in each world (test); pages state implementation status | Planned |
| B11 | Integrated validation of the worlds: authorization and cross-tenant negatives, accessibility, measured performance with a lower-complexity mode | P0 gate | B5–B10 | Regression, CI and E3 live checks on the integrated commit | Planned |

Risks and remediation for B: (1) Scope. Four worlds with 117 acceptance journeys (A1–A12, H1–H12, X1–X18, F1–F35, C1–C40) is far more than the Enterprise 3.0 sprint; it is
built as vertical slices, and a journey counts only when a browser test executes it. (2) Real places and organizations: every world is
an independent model with fictional operators; no partnership, accuracy or compliance is claimed. (3) External products (Frontline,
BiblefyMe, InfiniSpeak): public pages only until access is authorized; simulators are labelled as simulators. (4) Rendering: the
supported web stack sets the ceiling; a 2D mode is always available and performance is measured, not promised.

## Order of work

1. Stage the design pass on E3 (its regression passed on `1dae3703`).
2. A2, then A3 (evidence integrity and CI on the working branch), because every later step leans on them.
3. A7 and A9 (the P0 integrity and authorization items), with A6 alongside.
4. A1 and A8 registers, A5, A14, A15; A11 and A12 design and website; A13 once voice is decided; A17.
5. R1 candidate: regression, CI, E3.
6. B1, then B2–B4, then the worlds in the order R2 to R5.
7. A18: gates and the canonical release.
