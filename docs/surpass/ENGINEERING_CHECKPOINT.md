# Engineering checkpoint

One page. Updated at every verified checkpoint. Read this first when resuming; do not reconstruct the history.

**Mode (founder, 11 Nov 2026 13:21):** one engineer, sequential, no AI workers or subagents. Scripts and automated tests are tools, not
agents.

## Where the source is

| | |
|---|---|
| Repository | `/home/claude/empathia-technologies` (GitHub `jeremiahjohnson754-cmyk/empathia-technologies`) |
| Working branch | `v18/continuation` — pushed at every commit |
| Staging branch | `phase3/legendary-experience` — Render deploys it (demo `srv-dbl7hq0m7kps739gsgbg`, website `srv-dbl7hpm1egvs73e0uj0g`) |
| Production | `main` at `219d75f`, untouched; needs the founder's word |
| The founder's directive of 11 Nov 01:22 | `/mnt/user-data/attachments/73b60a1b-854c-5a1e-99ae-d3ec61696e66/84a1e711-attachment.txt` (§00–§34; read the section before building it) |

## State (12 Nov 2026, morning CT)

| | Commit | Evidence |
|---|---|---|
| Staging (`phase3/legendary-experience`) | `1dced1e` | full matrix clean before it was pushed; Render demo and website live on it |
| Light matrix on `9db85b6` | `9db85b6` | 59 suites; one failure (demo D-04: the Lite studio lacked `data-native`, fixed in `af32ce9`), `founder-studio` NOT RUN in a public build — so `9db85b6` was not pushed |
| Light matrix on `6c8932a` | `6c8932a` | running (`.local/matrix-6c8932a/`) |
| Working branch | head of `v18/continuation` | restorations since `6c8932a` unit-tested; their browser checks run on the next build |

Restored 12 Nov (unit and browser checks named in `docs/restoration/`): Lite spatial drift, inspector rows, reverberation estimate,
reconfigure and send, Portfolio Optimize, the studio's Field Intelligence and SVG export; Scouter anatomy and standard kits; Design a
Space's verbs, versions, fixes, measures, rehearsal and hand-offs; Build a Room's edit verbs, outline and scale, redlines, workbook,
recorded files, commissioning deficiencies and the APEX hand-off; SIGNAL case files' Mastery gate; the A5 take's play check. 60/10 P0
baseline and ledgers started (`docs/design-transformation/`).

Browser-tested on `v18/continuation` since `be010f1` (suites light and dark; every page looked at, desktop and 390 px):

| Slice | Where | Unit | Browser |
|---|---|---|---|
| IT Onboarding Success Guide, four editions (founder §08 A) | `apps/demo/src/onboard/**`, `#/onboard/<edition>` | 10/10 | 33/33 |
| Instant Room (founder §11) | `apps/demo/src/instant/**`, `#/instant/<room>` | 9/9 | 27/27. The sharpness threshold has not met a real photograph |
| Drawing Intelligence (founder §10) | `apps/demo/src/drawing/**`, `#/drawings` | 10/10 | 21/21 |
| End User guide: eleven chapters (founder §08 B) | `apps/demo/src/guides/**`, `#/guide/topic/<id>` | 5/5 | 25/25 |
| Site Champion: recognition, handover; People profile shows contributions | `champion/recognition.ts`, `connect/PeoplePage.tsx` | 8/8 | 21/21 and 21/21 |
| Harmony: eighth tool (a champion's list) | `harmony/tools.ts` | 8/8 | 22/22 |
| A person's check result kept out of the shared ledger | `champion/store.ts`, `onboard/store.ts` | updated | in the suites above |
| **AV Engineering Standards & Design Manual (founder §08 C)** | `apps/demo/src/manual/**`, `#/manual`, `/ch/<chapter>`, `/build`, `/set/<id>`, `/exceptions`, `/edition` | 10/10, 17 mutations caught | 45/45 |
| Microsoft Graph document source (MOCK-TESTED, imported by no page) | `apps/demo/src/knowledge/graph.source{,.mock}.ts` | 11/11 | none needed |

Defects found by looking at the pages, not by the suites, and fixed (each now has a check):
a shared rule gave every in-page link inline padding, which broke cards and tabs built from links (guide room and chapter lists, the
onboarding edition tabs, Instant Room's steps): a neutral opt-out class `pa-own` was added; inputs and selects were 36 px tall on
phones in three pages; the manual's rule cards carried `data-stage`, which the design system reserves for dark spatial stages, so
their text could not be read (the attribute is renamed and a contrast check added); plan markers were too small to read on a phone.

The manual in one paragraph: 129 rules in 14 chapters, written fresh from general practice, naming nobody and **carrying no pass
mark**: 20 values are for the organisation to settle with a source, in its own edition, which comes into force only by an adopted
revision. A room's design requirements and commissioning template come from the room's own record and the commissioning engine's
applicable tests. Exceptions and findings are written and separated by role; 36 rules can never be excepted (the manual's own marks
plus anything a never-waived catalogue test checks). Its private source notes never entered the repository.

## Not merged, not started

| | State | Next |
|---|---|---|
| University `a0082db…`, Convention `a39a4d4…`, instruments, films 1–4 | early WIP on their branches | after the priorities below |
| Townhall flagship, SIGNAL, corporate polish | not started in this mode | after the above |

## Before any redesign: full experience restoration (founder, 11 Nov 2026 17:06; nonnegotiable)

"Restoration first. Transformation second. Verification throughout." The 60/10 assets set the visual direction; they do not authorise
removing a function or replacing an advanced experience with a simplified demonstration. **SIGNAL and Lite are not complete** until
their inventories are reconciled against the source and every supported experience has passed functional and visual testing.
R1’s first pass is written (`docs/restoration/SIGNAL_INVENTORY.md`) and the content bundle is in the canon package. Restored and tested since, inside the story with the reference's gate tiers: decisions recorded as the reference does (costly calls kept, timeouts, echoes); 470 quizzes and 148 lessons; 136 drills on the reference's six-kind rules (one runner for Learn, the enterprise app and the story); 121 live incidents on the reference's Service Mode rules (Learn's page too), every solver path replayed to proven. **Not yet:** labs (75), season reviews, boss levels and meltdowns in the story (71 hard gates still unplayed, so chapter locks stay off); ratings, loadout and Mission Control; eight lab simulators, thirteen challenges, six demos; Learn's pages reading the full bundle. R3's first pass is written (`docs/restoration/LITE_INVENTORY.md`); R2, R4, R5-Lite not started. Each line is a task in the list.

| | What | Source |
|---|---|---|
| R1 | Inventory SIGNAL: every season, chapter, panel, scenario, progression system, learning tool, interaction. Narrative kept exactly | `…/attachments/…/29e3f4ef-signal-standalone1.html` (byte-identical to the 3 Nov standalone, sha256 `80f8d992…`) |
| R2 | Audit every narration, video, cinematic and media reference: working, missing assets, incomplete, or proposed. "Working" only after playback is verified | the same, V2.5.3, and `MEDIA_MASTER_MANIFEST.md` |
| R3 | Inventory Lite: spatial navigation, Room Builder, Scouter, design optimisation, camera coverage, acoustics, current/proposed, asset relationships, digital twin | `…/attachments/…/9a7b2cf0-…V2.5.3-live2.html` (byte-identical to `legacy/source/v253/…-live.html`, sha256 `9d6e53ef…`) |
| R4 | One feature parity matrix for both: behaviour, interactions, data, visual presentation, tests | starts from `SIGNAL_CANON_DIFF_AND_PLAYABILITY_AUDIT.md`, `V253_LITE_CAMPUS_NO_LOSS.md`, `docs/legacy-parity.csv`; each line re-verified, not copied |
| R5 | Restore every gap; functional and visual tests, light and dark, desktop and phone | |

The legacy HTML files are read as text (`python3 -I`), never executed except through the offline, all-requests-blocked capture.
The 60/10 zip attached at 17:06 is byte-identical to the one of 16:46.

## Later: Empathia Signature 60/10 design transformation (founder, 11 Nov 2026 16:46)

For SIGNAL and Lite these phases follow R1 to R5 above.

"Continue working as you were, add these as tasks for you to do later." The handoff's reference components and mock-ups are
**design assets, not replacements for the existing working application.** Nothing below has started.

- The handoff is extracted, private and never executed, at
  `/tmp/claude-0/-home-claude/73b60a1b-854c-5a1e-99ae-d3ec61696e66/scratchpad/handoff-6010/EMPATHIA_SIGNATURE_60_10_REBUILT/`
  (the zip itself: `/mnt/user-data/attachments/73b60a1b-854c-5a1e-99ae-d3ec61696e66/42140358-EMPATHIA_SIGNATURE_60_10_COMPLETE_HANDOFF_REBUILT.zip`).
  Read `09_CLAUDE_HANDOFF/CLAUDE_MASTER_IMPLEMENTATION_PROMPT.md` first, then `03_DESIGN_SYSTEM/DESIGN_TOKENS.json`,
  `06_WEBSITE_BLUEPRINTS/`, `08_QUALITY_ASSURANCE/` and the concept images, before editing anything.
- Order of authority it sets: current code, then migrations and security rules, then test evidence, then the founder's approved copy and
  corpus, then the handoff's design system, then generated visuals. Its prototype and React concepts are not imported; no Tailwind
  migration; only fonts that may legally be self-hosted; its `CHI-204` room is a placeholder, not a record to create.
- Its phases, each a task in the list:

| Phase | What | Exit |
|---|---|---|
| P0 | `docs/design-transformation/BASELINE.md` from the real repository, before-change screenshots, eight ledgers started | baseline committed |
| P1 | Experience Language: tokens mapped onto the existing ones, type, five separate axes (condition, provenance, confidence, workflow, maturity) | component screenshots, dark, light, mobile |
| P2 | Corporate flagship pilot on `apps/website`. Not to be left until the end | homepage, a product page and the ecosystem at 1440 and 390, both themes, for the founder's review |
| P3 | Living Campus shared shell: command palette, product switcher, breadcrumb, persistent room and asset, mobile navigation | back, forward, reload and forbidden-route tests |
| P4 | Room golden path: Mission Control → Lite → Room Passport → Search Party → Commissioning → Knowledge Ledger → Room Passport, on a real room of the estate | one browser test, with a negative and a positive acceptance case |
| P5 | Pro, Connect, ServiceHands, Field Intelligence, APEX, Critical Signal, Harmony | a capability matrix per module: supported, simulated, planned, blocked |
| P6 | Learn and SIGNAL | corpus parity report; playable tests |
| P7, P8 | Motion and spatial polish; full QA at 320, 390, 768, 1200, 1440, 1920, both themes, roles, data modes | staging after a clean matrix; production only on the founder's word |

## Later: Empathia Signature 70/10 (founder, 12 Nov 2026 03:14)

"Continue working as you were, add these as tasks for you to do later." Nothing below has started. It builds on the 60/10 phases and
never replaces restored work: restoration (R1 to R5) stays first.

- Sources, private, never committed: the directive `/mnt/user-data/attachments/73b60a1b-854c-5a1e-99ae-d3ec61696e66/dfbdf490-attachment.txt`;
  a Drawing Intelligence concept image `03e04f39-image.png` and sixteen 60/10 reference images in the same folder. The founder's note:
  these were made by another AI tool as **references only** — layout and mood, never assets to ship, never evidence of a feature.
  The re-attached SIGNAL standalone and V2.5.3 are byte-identical to the held copies (SHA-256 `80f8d992…`, `9d6e53ef…`).
- Its rules kept here: no production deployment without the founder's word; no fabricated tests, media, deployments or integrations;
  no implied AVIXA certification and no copied standards text (display-size analysis uses sourced, reproducible arithmetic and says
  which method and which inputs; the published standard is cited by name, never reproduced); no multiplayer presence shown as live; the
  stadium and every venue fictional, never shown as a customer installation; narration and films only when a playable asset with rights
  exists; badges never imply accreditation.
- Started 12 Nov, after the restorations: 70-1 verified on paper (`docs/surpass/FOUR_WORLDS_VERIFICATION.md`); 70-2 first slice
  (display viewing analysis in `#/drawings`, carried into the Lite studio; unit `drawing-viewing`, browser DRB-50..52 to run); 70-3 the
  viewing overlay with labelled marks; 70-5 the five modes on the room page (LT-M1, M2 to run); 70-6 the first cross-product journey
  (`demo-journey`, 10/10 on the `b53515e` build). 70-0 done as a read-only probe record (`docs/surpass/CONNECTOR_INVENTORY.md`, unit `connector-claims`); 70-4 waits for the founder's
  content (a beat map over canon chapters is authorship, not engineering).
- Tasks, each in the list:

| # | What | Exit |
|---|---|---|
| 70-0 | Repository and connector audit: a capability inventory of every connector (invoked successfully, failed, not tried) | `docs/surpass/CONNECTOR_INVENTORY.md` |
| 70-1 | Four worlds on one shared core: Enterprise (exists), Stadium, University, Convention; tenant isolation tested | isolation tests, a negative case per world |
| 70-2 | Drawing Intelligence first vertical slice: a drawing → scale and geometry with human calibration → display viewing analysis (screen size against farthest viewer, compare e.g. 98, 110, 125 inch) → Lite room → recommendation | one browser test end to end; every number labelled measured, modeled, assumption or unavailable |
| 70-3 | Overlays with provenance labels (measured, modeled, simulation, assumption, proposed, unavailable); 2D and 3D kept in step; the nine-dimension Space Optimizer kept | overlay tests |
| 70-4 | One cinematic SIGNAL chapter in Story Mode (Observe → Reason → Act → Consequence → Evidence → Repair → Verify → Reflect → Competency), canon unchanged; character continuity notes; world-linked missions | playable test; captions; no audio claimed without a file |
| 70-5 | Lite advanced modes: Explore Space, Design Space, Explore Systems, Validate Space, Compare States | per-mode tests |
| 70-6 | Cross-product room journey (journeys A to H) and the visual system extended product by product | one journey test per product touched |

## The additive mandate of 12 Nov 06:23: Lite world intelligence, the Equipment Experience Engine, SIGNAL Story Mode

- Received 12 Nov 2026, 06:23 CT, as a founder directive (held outside the repository: it names the former employer whose workplace
  inspired the original Lite concept, and nothing from it that names that employer enters this repository). Added as later tasks; the
  current work continues. It extends, never replaces: the two websites, the four worlds, the 90-room Enterprise estate, the role
  configurations, prices and the SIGNAL canon stay as they are.
- **The founder's ordering, kept as the first rule of this work:** produce the first *verified* equipment-training films and one
  *playable* SIGNAL branching sequence before any bulk generation. A film that teaches the wrong control, or a scene that drifts from
  the canon, is worse than no film. Every room, device, lesson, scene and piece of evidence uses one shared architecture (the same
  room and asset identities, one content registry, one evidence model), so Lite, training and SIGNAL never disagree about a room.
- Rules carried from it, in addition to the standing ones: a QR scan establishes a place, never authority; no live position where no
  location source exists; a proposed design is never shown as the installation (DESIGNED / COMMISSIONED / CURRENT / PROPOSED);
  every lesson names vendor, model, generation, OS and firmware, installed software, audience, source document, reviewer and review
  date, and shows whether it applies to *this* room; a generated video is not a verified tutorial; no real device UI is imitated
  without rights (otherwise the simulation is labelled generic); a passing simulation never proves a device passed commissioning;
  SIGNAL keeps its canon (twelve seasons, four bands, Maya and Ray as written), and a branch without finished media keeps its working
  Classic Story form; no paid generation, subscription, GPU capacity or public upload without the founder's word; no production
  deployment; references to commercial interactive films and games are for pacing and choice design only, nothing copied.
- Tasks (each to the definition of done in the mandate; status starts NOT STARTED):

| # | What | Exit |
|---|---|---|
| 80-0 | Baseline and preservation record for this mandate: the starting SHA, the four worlds and role configurations re-verified, SIGNAL source counts re-derived from the held source (chapters, scenes, decisions, quests; definitions reconciled, canon untouched) | `CURRENT_BUILD_BASELINE_AUDIT.md`, `SIGNAL_CANON_AND_CHARACTER_AUDIT.md` |
| 80-1 | The original Lite vision preserved as authority, without the employer: the 17 interactions and the supporting hotspots as a crosswalk to fictional reusable archetypes; Employee and Engineer modes; Explore, Learn, Engineer, Operate lenses derived from policy, not a role switch | `LITE_ORIGINAL_VISION_PRESERVATION.md`, `LITE_17_INTERACTION_CROSSWALK.csv`, `LITE_ARCHETYPE_CATALOG.json`; archetype unit tests |
| 80-2 | Shared spatial contracts: the six questions (what is this place, where am I, what can I do, how do I use it, what is happening, who can help) answered from records; QR and deep links resolving to a canonical place with graceful fallback; route graph with accessible connectors and "take me back to my entrance" | `SPATIAL_EXPERIENCE_DATA_CONTRACTS.md`, `QR_WAYFINDING_AND_ACCESS_SPEC.md`; tests that a scan grants nothing |
| 80-3 | Equipment Experience Engine records: the device training catalog (families only, no vendor treated as integrated), the lesson record with the verification states (not researched → documentation identified → script drafted → technically reviewed → storyboard approved → video generated → media QA passed → device/lab verified → released), and room-to-lesson matching from the asset record only, with "unconfirmed device" and a review task where content is missing | `EQUIPMENT_TRAINING_CATALOG.csv`, unit tests for matching and states |
| 80-4 | Flagship training research: collaboration board and Surface Hub lesson matrices from the manufacturers' own published documentation, per model and software configuration; sign-in and saving behaviour stated exactly; every step cites its source | `MAXHUB_XBOARD_V7_TRAINING_MATRIX.md`, `SURFACE_HUB_TRAINING_MATRIX.md` |
| 80-5 | Interactive training player (watch, pause, practise, decide, feedback, retry, complete) and a whiteboarding practice lab labelled a generic simulation; learning evidence recorded apart from equipment validation | browser tests; the lab works with no media |
| 80-6 | Media connector matrix and production pipeline: what each creative connector actually does, rights, consent, cost, limits, test result (from the 70-0 probe record, extended per tool when used); the media metadata record and quality gates | `MEDIA_CONNECTOR_CAPABILITY_MATRIX.md`, `MEDIA_PRODUCTION_PIPELINE.md`, `EQUIPMENT_MEDIA_QA_REGISTER.csv` |
| 80-7 | Pilots, in this order, each stopped at the founder's quality review before the next is scaled: (1) a generic-room meeting quick-start; (2) the collaboration-board lesson for an identified model; (3) the Surface Hub lesson for an identified model; (4) the Lite QR-to-room journey; (5) one SIGNAL scene. Script and storyboard first, technically reviewed against the source; media generated only after approval, with captions, transcript and loudness checked | playable files with QA rows; where a tool is unavailable, the scripts, storyboards, manifests and blockers instead, said so |
| 80-8 | SIGNAL Story Mode: the branching graph read from the canon (chapter, scene, decision ids; prerequisites; consequences; trust and evidence state; save and resume); Classic, Cinematic and Hybrid modes over one state; one canon scene playable in Hybrid form with a real decision and consequence and the Classic fallback; character records from source evidence only, open details as founder decisions | `SIGNAL_BRANCHING_NARRATIVE_ENGINE.md`, `SIGNAL_CINEMATIC_SHOWRUNNER_BIBLE.md`, `SIGNAL_STORY_MODE_ACCEPTANCE_TESTS.csv`; a browser test of the branch |
| 80-9 | Both websites tell the honest version (concept, simulation, verified, live kept apart) and the enterprise lifecycle proof carries the same room through Intake → … → APEX → export; rollback report | `TWO_WEBSITE_INTEGRATION_MAP.md`, `END_TO_END_ENTERPRISE_LIFECYCLE_PROOF.md`, `RELEASE_REGRESSION_AND_ROLLBACK_REPORT.md` |

- Known limits stated now so no one is surprised later: there is no physical device or lab here, so no lesson can reach
  "device/lab verified" from this session; real device interface imagery and footage may be used only where a vendor's published training materials or licence allow it, which is assessed per vendor (task 95-4), not assumed either way; a UE5 or Pixel
  Streaming layer needs assets and an approved GPU cost model that do not exist yet (the 2D and SVG paths stay the working path).

## Risk review of 12 Nov 06:35: what would stop the two sites reaching the top grade

- Received 12 Nov 2026, 06:35 CT (the founder relaying an outside review). Added as later checks; current work continues. Each item is a
  check to run against what exists, with a test or a written finding as its exit, never a rewrite.

| # | Risk | Check | Exit |
|---|---|---|---|
| 90-1 | The corporate site explains too much in its first minute | Progressive disclosure audit of the home page and each product page: what a buyer learns in the first screen and the first minute (the immediate value), and where depth starts (products, industries, AI, integrations, vision one click or one scroll further, never removed). Measure first-screen word count and the number of products, industries and capabilities named above the fold | a written finding with before/after screenshots; a website test that the first screen names one promise and one action |
| 90-2 | Dead ends in the Living Campus | Every control on every native page either changes application state or changes a state clearly labelled simulated; a crawler presses each and records which. No screen that only looks like it works | a browser suite listing every control and its effect; failures fixed or labelled |
| 90-3 | Integrations read as proven when they are not | Every vendor or product name on either site is checked against evidence: a working, authorized, currently observed connector, or a label saying sample, planned or not connected. No logo wall | extend `connector-claims` and the claims tests to vendor names; a register of each name and its evidence |
| 90-4 | 3D and immersive work slows everyday tasks | Time-to-task on a mid-range phone profile with network throttling: find a room, open a room by QR link, scan an asset, read the room guide. 3D, films and any streamed layer load only when asked | performance budget tests (transfer size, time to interactive, time to task) in both apps; failures fixed |
| 90-5 | Feature catalogue instead of commercial clarity | Pricing understandable in one read (published prices only, unchanged); pilot outcomes stated as what a pilot measures, never results that did not happen; customer economics only as a model with its assumptions shown and the founder's approval before anything public (unit economics stay out of the repository) | a written finding; founder decisions listed |
| 90-6 | Security and reliability under serious testing | Role isolation, tenant boundaries, private documentation, media rights and equipment control: adversarial tests per boundary (forged role in storage, QR or link tampering, direct address of a denied page, cross-tenant search, simulated control without consent); reliability under reload, offline and slow network | a test suite per boundary with negative cases; a written threat review; NOT RUN listed honestly (no penetration test by a third party) |
| 90-7 | Many industries multiply commercial execution | The architecture is shared; sales, support, localization, compliance and implementation are not. For each world and each future industry: what is shared, what is per-industry (regulation, buyer, support model, languages), and what the site may claim today | a written per-industry readiness note; the sites claim only what that note supports |

## Next acceptance checkpoint (set by the founder, 12 Nov 07:12)

Staging today is `b53515e`, not the later work. The checkpoint is met only when all five hold, each with its evidence:

| # | Criterion | Evidence required | State |
|---|---|---|---|
| A1 | The latest commit passes the full light and dark matrices | `SUMMARY-light.txt` and `SUMMARY-dark.txt` for that commit, every suite exit 0 except `founder-studio` (covered by A4) | light matrix on `2c40f7f`'s build running |
| A2 | Both websites deploy the same intended release | Render shows both static sites live on that commit, and each served `BUILD_MANIFEST.json` names it in `sourceCommit` (added 12 Nov: Render's `RENDER_GIT_COMMIT`, else `git rev-parse HEAD`) | the field ships with the next build |
| A3 | A real browser completes an Enterprise room journey from Lite through an operational workflow, on staging | a recorded run against the staging URLs (Claude in Chrome when connected, otherwise a browser run with the founder's permission): one room opened in Lite, found in Search Party, its commissioning record, an issue raised and closed in ServiceHands with evidence, the same room identity throughout; steps and outcome recorded | not run |
| A4 | Founder Studio verified privately from the correct source | a `--studio` build from the V2.5.4 Founder Edition and the films, its suite run and recorded, never deployed | waits for the source files (95-3) |
| A5 | The first equipment-training video and one branching SIGNAL scene play and are tested | the file plays in the product with matching captions and transcript, measured loudness, its QA row; the SIGNAL scene's decision changes state and its Classic fallback works; both under browser tests | not started (80-7, 80-8, 95-5) |

## The founder's watch items of 12 Nov 06:38

| # | What | State | Exit |
|---|---|---|---|
| 95-1 | Staging healthy after `b53515e` | **Checked 12 Nov 06:43 CT.** Render: both static sites (`empathia-demo-next`, `empathia-website-next`) report the `b53515e` deploy **live** (finished 12:29 UTC). Fetched over the internet with the founder's permission (TinyFish, a real browser): the website's home page is served in full; the demo's `BUILD_MANIFEST.json` carries the 12:29 build time and `demo.js` is served; in a real browser `#/investor` finished loading, with its heading, the synthetic-data banner and its three start actions. Not checked: every route on staging (the full matrix runs against the identical local build) | done; repeat after each staging push |
| 95-2 | The six suites changed since `b53515e`, against `803bd89` | demo-lite (354 checks, no failure), demo-journey 10/10, demo-access 31/31, demo 107/107, demo-parity-areas 115/115 passed; demo-drawing 23/24: DRB-50's own check was wrong (closed `<details>`, hidden chip mark), corrected in `5267c81`, then 24/24 light and dark | done; the full matrix on the next head follows |
| 95-3 | The Founder Studio suite run in a private environment instead of NOT RUN | Needs `node scripts/build.mjs --studio --founder-edition=<the V2.5.4 Founder Edition HTML>` and the film files, neither held in this workspace (only V2.5.3 copies and the f51229b studio manifest, whose HTML and JS are not kept). In a private environment: build with `--studio`, run `tests/browser/founder-studio.test.mjs`, record the result; the studio is INTERNAL_ONLY and is never deployed publicly | the founder supplies the Founder Edition file and films (or confirms V2.5.3 stands in); then a recorded run |
| 95-4 | Vendor training material and UI rights assessed, not assumed | For each vendor in the training catalogue: what official training materials exist (videos, quick-start guides, adoption kits, press imagery), their published terms of use, whether reuse, embedding, linking or adaptation is allowed and with what attribution; the safest correct use (link to the vendor's own material, embed where permitted, or an original generic simulation). No reuse until the terms are recorded and, where a licence or permission is needed, the founder has it | a rights register per vendor and asset, with the source and terms quoted by link; founder decisions listed |
| 95-5 | Media delivered, not only prepared | Acceptance for task 80-7 is a playable file: video or audio that plays in the product, captions and transcript that match it, measured loudness, a working interactive choice where the lesson has one, and the QA row filled in. Scripts and storyboards are steps, never reported as delivery | per pilot, the file, its QA row and a browser test that it plays |

## Simulated, pending, blocked (say so everywhere)

- Room Control, the calendar, the document source for knowledge ingestion: **simulated**.
- Microsoft Graph: the calendar adapter and the document source are **mock-tested only**. Real tenant validation, actual event
  creation, live Teams, SharePoint: **pending**; needs what `M365_DEPLOYMENT_AND_TEST_GUIDE.md` lists. Five questions only a tenant
  answers are in that guide (first: whether `Sites.Selected` alone suffices).
- Instant Room: nothing looks at what a photograph shows; no label is read; no 3D model; photographs stay on the device.
- Drawing Intelligence: reads SVG plans and CSV tables as text. PDF, Visio, CAD and images: **not built**. No signal-flow review.
- Physical phones, screen readers, browsers other than Chromium: **not run**.
- Films: nobody has watched or heard them end to end. ElevenLabs: blocked at the gateway (403); do not retry in this session.
- All guide content (champion lessons, onboarding programme, end-user chapters) and Knowledge zones 1 and 2: written by the engineer,
  **not reviewed by a practising professional**, and labelled as drafts.

## Assumptions awaiting the founder (none blocks work)

1. Engineering review of a technical waiver comes from the Product Architect.
2. Phase 5 role lists (`apps/demo/src/docs5/roles.ts`): who assigns, submits, reviews, acknowledges.
3. Time zones per campus in Connect are modelling assumptions.
4. Empathia-authored knowledge needs his (CTS) review before it can be marked approved.
5. IT Onboarding Success Guide: which role stands for the starter (Service Engineer), the manager (Service Manager), the mentor
   (Systems Engineer) and the administrator (Data Steward, Product Architect) (`apps/demo/src/onboard/roles.ts`).
6. Drawing review: saved by V2.5.3's `build.design` roles, decided and approved by `design.decide`, never by the role that saved it.
7. The Product Architect holds the engineering standard (settles values, adopts revisions); exceptions and findings are decided by
   `design.decide` roles other than the one that asked or saved (`apps/demo/src/manual/roles.ts`).

## Next, in order

1. Full matrix light and dark on the head (the light matrix on `9db85b6` found one failure, demo D-04: the restored Lite studio lacked
   `data-native`; fixed in `af32ce9`, so `9db85b6` was not pushed). Then staging and the Render check.
2. Restoration still open (`docs/restoration/PARITY_MATRIX.md` says exactly what): Build a Room's remaining verbs (join rooms, outlines and
   scale, import a record, redline, workbook export, issues and retests, faults, APEX hand-off); the Optimize options A–C and estimate (an
   estimate needs a costing basis the founder accepts); acoustics beyond the reverberation estimate; Design a Space's measures panel;
   the SIGNAL opener (its words differ from the canon: the founder decides which stand).
3. 60/10 P0 (baseline) and P1; P2 corporate flagship pilot; then its other phases. For SIGNAL and Lite, after R5.
4. Manual: its chapters in the Knowledge Ledger as a source awaiting review; a room's saved set linked from its commissioning page.
5. Instant Room: real photographs for the sharpness threshold when a device is available; hand a proposal to Room Builder.
6. Townhall; University; Convention; corporate polish and films.
7. 70/10 tasks 70-0 to 70-6 (above), after restoration; 70-2 (Drawing Intelligence slice) first among them.
8. The 12 Nov 06:23 mandate, tasks 80-0 to 80-9 (above): verified pilots and one playable SIGNAL branch before any bulk media; enterprise lifecycle first.
9. The 06:35 risk review, checks 90-1 to 90-7 (above); 90-2, 90-3 and 90-6 first, as they protect what already exists.
10. The 06:38 watch items 95-3 to 95-5 (above): the studio run when its source files arrive; vendor rights assessed before any media pilot that shows a real device.

## Commands

```bash
cd /home/claude/empathia-technologies
flock /tmp/empathia-test.lock node scripts/build.mjs --public        # build both public apps (scripts/test.mjs does NOT build)
node node_modules/typescript/bin/tsc -p apps/demo --noEmit           # type-check the demo
node node_modules/typescript/bin/tsc -b packages/proof-registry && node --test packages/proof-registry/dist/test/*.test.js
node --test tests/unit/<name>.test.mjs                               # unit suites bundle TypeScript themselves; no build needed
node --test tests/unit/*.test.mjs                                    # all of them (about a minute)
flock /tmp/empathia-test.lock node tests/browser/<name>.test.mjs     # one browser suite, light
PW_COLOR_SCHEME=dark flock /tmp/empathia-test.lock node --import ./tests/browser/color-scheme.mjs tests/browser/<name>.test.mjs
.local/run-matrix.sh .local/logs/<dir> light [suites…]               # full or partial matrix → SUMMARY-<scheme>.txt ending DONE
node scripts/test.mjs                                                # every non-browser suite, against the existing build
git checkout -- tests/evidence media/screenshots                     # after any run
git push origin <verified-commit>:refs/heads/phase3/legendary-experience   # staging, only after a full matrix
```

Rules that bite: never rebuild or edit `tests/browser` while a matrix runs; a changed test carries its reason; NOT RUN is never PASS;
commit attribution lines are required; no credentials in chat, logs or commits; nothing from the private archive enters the repository.
A full matrix takes about ninety minutes: write source and unit tests while it runs, and keep drafted browser suites in the scratch
folder until it ends.
