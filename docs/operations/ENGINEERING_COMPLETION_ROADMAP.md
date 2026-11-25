# Engineering completion roadmap

One roadmap for everything the founder has directed since 24 Nov 2026. It extends the seven-day board
(`CLAUDE_FABLE_7_DAY_EXECUTION_BOARD.md`), which stays the record of the Enterprise 3.0 sprint; it does not replace it.

**Sources (founder directives, kept privately, not in this repository):** Master Engineering Completion (24 Nov 05:32); Six Worlds,
Spatial Intelligence 3.0 and ExpoSpace Live (24 Nov 05:32); Festival, the seventh world (24 Nov 06:10); Community, the eighth world
(24 Nov 06:10); E-Waste: Living Facility, the ninth world, with SIGNAL: The Second Life inside it, and its addendum that the expansion is
strictly additive and that an earlier directive wins on any conflict (24 Nov 09:16). Earlier decisions E3-D1 to E3-D5 still apply.

**Words used here.** Planned · In progress · Implemented · Unit-tested · Browser-tested · Exact-commit validated · Staged (on E3) ·
Released (on the canonical Next sites) · Blocked · Not run. A line is never moved to a later word than its evidence supports.
P0: security, data integrity, fundamental function, release-blocking. P1: major function, integration, usability. P2: meaningful
improvement. P3: recorded for later.

## Where the project stands (reconciled against the repository, 24 Nov 2026)

| Thing | State | Evidence |
|---|---|---|
| `main` (production) | `27c74695`, untouched this sprint | Render production services follow `main` |
| Canonical Next sites | `phase3/legendary-experience` at `fe30ba9d`, untouched this sprint | `docs/releases/STAGING_PREVIEW_E3.md` |
| E3 staging pair | `preview/enterprise-3` at `1dae3703`, live-checked 28 of 28 on 24 Nov 13:57 UTC | same |
| Working branch | `v18/continuation` at `1dae3703` (draft pull request 2 into `phase3/legendary-experience`) | board |
| Last exact-commit regression that passed | `1dae3703`: PASS 293 · FAIL 0 · NOT_RUN 2 (24 Nov 13:47 UTC). It includes the design pass on the room, the job, the work order and the APEX case | `tests/evidence/TEST_RESULTS.md` |
| GitHub CI | Green on the repair branch (`ci/e3-d5-…`, draft pull request 3, based on `main`): PASS 286 · FAIL 0 · NOT_RUN 4. The repair is merged into `v18/continuation` (not into `main`); no run on this branch has been read yet | `docs/operations/CI_REPAIR_E3-D5.md` |
| Worlds that exist | Four (Enterprise, Stadium, University, Convention) in `apps/demo/src/worlds`, 52 role configurations. Airport, Hospital, Festival, Community (with Collaboro-Sing and the shelter-resource network) and E-Waste are planned, not built | `registry.worlds.ts` |
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
| R6 | B12: E-Waste: Living Facility and SIGNAL: The Second Life | journeys A–G and the E-Waste acceptance matrix (at least 50 browser journeys), staged |
| Final | A18: release gates, then both canonical Next sites together | post-deployment verification recorded |

## Workstream A: completing and hardening what exists

| ID | Workstream | P | Blocks release | Depends on | Acceptance criteria and required tests | Status |
|---|---|---|---|---|---|---|
| A1 | Reconcile state; this roadmap; requirement-to-test traceability | P1 | no | — | Every board, ledger and register line agrees with the repository or is corrected with its reason | In progress |
| A2 | Evidence integrity: a standalone suite cannot overwrite the regression's evidence; failed runs archived; disk preflight and temp cleanup | P1 | yes | — | A standalone run leaves `tests/evidence` byte-identical (test); a failed run's evidence is kept under its commit; the regression refuses to start under a stated free-space floor | Implemented and unit-tested 24 Nov (`tests/unit/evidence-isolation.test.mjs` EV-01 to EV-05; `docs/engineering-handoff/TESTING_AND_EVIDENCE.md`); 12,661 leftover temp directories (4.3 GB) removed. Exact-commit validation: not run yet |
| A3 | CI on the integrated candidate: bring the repair onto the release branch; pin Node, Python, Playwright, LibreOffice, sharp; clean install; prove CI fails on a planted defect | P0 | yes | A2 | GitHub run green on the candidate commit itself; a deliberately broken branch goes red; build requirements documented | In progress: the repair branch was merged into `v18/continuation` on 24 Nov (workflow, runner packages, pinned Python packages, Playwright 1.63.0, the gate's private-store rule and its test), so GitHub now runs the matrix on pull request 2. Its first run on this branch: not yet read. Planted-defect proof and the dependency pins for Node and LibreOffice versions: Planned |
| A4 | Dependencies: lockfile integrity, known vulnerabilities, licences | P1 | yes for any high-severity finding | A3 | Audit output recorded; each finding fixed, accepted with reason, or listed | Planned |
| A5 | Every NOT_RUN: ML prototype, film decode, three Founder Studio suites | P1 | no, if each is justified | — | Per suite: reason, risk, prerequisites, alternative validation, release impact; studio suites run locally where the private store is | Planned (studio suites already run in the local regression) |
| A6 | Test blind spots: refresh, back and forward, duplicate submission, out-of-order events, double closure, invalid input, stale or missing records | P1 | yes for any defect found | — | New browser checks, each shown red on a defective build and green after | In progress. Done 24 Nov: three checks that measure time failed in two regressions and passed on rerun; one read the focus after a fixed delay and now waits for it (same assertion); the runner now measures machine stalls and runs a failed suite a second time only when one of three seconds or more overlapped it, both attempts recorded. Not yet done: refresh, back and forward, duplicate submission, out-of-order events, double closure, invalid input |
| A7 | Lifecycle integrity of the repair loop: a failed retest keeps the drift; repair is not readiness; the repairer cannot verify; a reopened or recurring job lowers readiness; stale or missing evidence reads Unknown | P0 | yes | — | Unit and browser checks for each rule; journey J6B extended with the negative paths | Implemented for the VOICE → APEX → Assurance → MissionProof loop, unit- and browser-tested 24 Nov: MissionProof reads the evidence on record instead of the address, the uplink is no longer ready from the address alone, calling is not ready while a drift record is open, a failed retest keeps the record, a reopen or a new report lowers readiness and a new run writes a new record. Evidence older than its freshness window reads Unknown (existing). Not yet done: the same rules for the other families' loops. Exact-commit validation: not run yet |
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
| A19 | Spatial rendering performance (the founder's stated biggest concern, 24 Nov): 30 frames a second on ordinary hardware as the target, 60 as the ideal; the test machine's 7 to 10 in software rendering is a regression floor, not a device figure, and no device frame rate has been measured | P1 | no for the demonstration; yes before any performance claim | B2 for larger environments | Per-frame cost reduced (draw calls, instancing, culling, level of detail, drawing only when something moves); an in-app performance check that runs on the viewer's own desktop or phone and exports frame rate, frame-time percentiles, navigation response, memory where reported, and a larger synthetic environment; results from real devices recorded separately; a budget per scene beside the floor | In progress. FIRST PIECE DONE (24 Nov): the shared renderer lowers its drawing detail when a scene cannot hold 24 frames a second, by the shortfall, never below half resolution, and restores full detail if fewer pixels buy less than 1.25 times the speed; `?detail=full` turns it off. Measured on the test machine only (two cores, no graphics processor, software rendering; not a device figure): campus 9 to 11 at full detail, 21 to 24 at half; expo 16 at full, 25 to 30 at 64 to 80%; stadium 5 to 6 at full, 8 to 9 at half. OPEN: the stadium is far from smooth there at any detail, so it is bound by more than pixels (its geometry and draw calls); none of the three reaches 30 at full detail in software; the picture at half detail is visibly softer. Exact-commit regression on this piece PASSED on 87956a57 (296 · 0 · 2, 25 Nov, no stall, no second run). Measured in that run: campus 10 at full and 23 adapted, 24 at phone size; stadium 6 and 8; expo 17 and 32 at 64%. FOUND THERE: each suite writes its figures per check under `tests/evidence/demo-shell`, which git ignores, so the committed record of a regression says PASS and not what was measured, and there is no history to compare run against run. NOT DONE: per-frame cost, the in-app performance check, real-device results, per-scene budgets. This environment has no graphics processor: representative figures need real devices. Checks: `tests/unit/render-detail.test.mjs` RD-01 to RD-04; `demo-campus-life` CL-21, CL-22; `demo-stadium-live` SLV-15; `demo-expo-live` XPO-13 |
| A18 | Release gates and the canonical release, with rollback | P0 | — | everything above marked "yes" | The seventeen gates of the directive, each with its evidence. The live check waits until the served `BUILD_MANIFEST.json` names the candidate commit and the served entry files match its hashes (finding of 24 Nov: the content network served the previous build for up to six minutes after "deploy live"); the live check script moves from the session's scratch area into `scripts/staging/` | Planned |

Risks and remediation for A: (1) GitHub CI has never run on the working branch; the repair is based on `main`, so integrating it
may surface new failures: do A3 early. (2) The demonstration keeps its state in the browser; role switching is a demonstration aid,
not authorization, and the documents must keep saying so (A9, A17). (3) A10 may need legal advice; engineering can prevent new
exposure but cannot undo a past one.

## Workstream B: Spatial Intelligence 3.0 and five new worlds

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
| B12 | E-Waste: Living Facility (a fictional Chicago-area electronics recycling facility; a ninth world) and SIGNAL: The Second Life (twelve chapters, inside the world and Learn; not a tenth world). Industrial entities by contract on the shared platform; one seeded event history that every KPI is derived from; chain of custody with holds and kept corrections; simulated read-only equipment telemetry with a capability matrix; safety-sensitive learning content with a provenance register and review status | P1; custody, authorization and safety-content rules P0 | B1, B2–B4; the Enterprise service, assurance and Learn engines | Journeys A–G; at least 50 browser-executed acceptance journeys, additional to every existing one; twenty documentation deliverables | Planned |
| B11 | Integrated validation of the worlds: authorization and cross-tenant negatives, accessibility, measured performance with a lower-complexity mode | P0 gate | B5–B10, B12 | Regression, CI and E3 live checks on the integrated commit | Planned |

Risks and remediation for B: (1) Scope. Five worlds with at least 167 acceptance journeys (A1–A12, H1–H12, X1–X18, F1–F35, C1–C40, and 50 or more for E-Waste) is far more than the Enterprise 3.0 sprint; it is
built as vertical slices, and a journey counts only when a browser test executes it. (2) Real places and organizations: every world is
an independent model with fictional operators; no partnership, accuracy or compliance is claimed. (3) External products (Frontline,
BiblefyMe, InfiniSpeak): public pages only until access is authorized; simulators are labelled as simulators. (4) Rendering: the
supported web stack sets the ceiling; a 2D mode is always available and performance is measured, not promised. (5) Commercial confidentiality: prospective partners, discussions and proposed terms named in the
directives are never written into this repository, the websites or any connected service; the design-partner package is kept
privately. (6) Safety-sensitive training content (E-Waste) stays awareness-level until a qualified reviewer and the employer approve it;
no certification is claimed for Empathia or the fictional facility.

## Order of work

1. Done: the design pass is exact-commit validated on `1dae3703` and staged on E3.
2. A2, then A3 (evidence integrity and CI on the working branch), because every later step leans on them.
3. A7 and A9 (the P0 integrity and authorization items), with A6 alongside.
4. A1 and A8 registers, A5, A14, A15; A11 and A12 design and website; A13 once voice is decided; A17.
5. R1 candidate: regression, CI, E3.
6. B1, then B2–B4, then the worlds in the order R2 to R6.
7. A18: gates and the canonical release.
