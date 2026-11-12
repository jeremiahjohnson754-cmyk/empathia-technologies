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
  (`demo-journey`, 10/10 on the `b53515e` build). 70-0 waits for a connector record this session can show; 70-4 waits for the founder's
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
