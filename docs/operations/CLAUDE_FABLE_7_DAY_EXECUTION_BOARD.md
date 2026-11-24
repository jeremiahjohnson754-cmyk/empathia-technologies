# Claude + Fable seven-day execution board (23–29 Nov 2026)

Each line is DONE (with its evidence), IN PROGRESS, or TO DO. A line is DONE only when a test or a captured screen shows it.

## Day 1 — Mon 23 Nov

| Item | State | Evidence |
|---|---|---|
| Confirm repository, branch, deployed commits for both Next sites | DONE | docs/audit/CURRENT_TRUTH.md |
| Live browser audit of both sites, 390 and 1440 px, 124 checks | DONE | docs/audit/e3-day1/LIVE_AUDIT.json, live-*-home-*.jpg |
| Baseline build and non-browser suites at 1bc57f91 | DONE: 154 pass, 0 fail | .local/logs/e3-day1-baseline-*.log (local) |
| Full exact-commit regression | NOT RUN (last: fe30ba9d, 287/0/2) | — |
| Inspect `restoration/sprint-0-1` | DONE: already merged into HEAD | CURRENT_TRUTH.md |
| Cross-site context: website `/voice` opens the same room's CallPath with the way back | DONE | launch-intents suite; demo-voice VC-15 |
| VOICE corporate page and products section | DONE | website suite 272/272; website-voice-*.jpg |
| VOICE demonstrator: overview, CallPath, report; three cases; perspectives; refusal | DONE | voice.test 9/9; demo-voice 30/30; voice-*.jpg |
| Responsive shared shell improvement | NOT DONE today. The audit found no shell defect at 390/1440; the open mobile item is the CallPath table (P0 list, 5) | — |
| Kickoff audit, VOICE blueprint, decisions, this board | DONE | docs/ |
| Deliverables of Directive 0.6 not yet written: DEPLOYED_VS_REPO_VS_HISTORICAL, PARITY_LEDGER.csv, MEDIA_AND_RIGHTS, ROUTE_INVENTORY.csv | TO DO (Day 2) | — |
| Fable track (shell and IA prototype, tokens) | NOT STARTED: no Fable design session has run; today's pages reuse the existing component kit | — |

Suites run after the change: voice 9/9; launch-intents and demo-policy 19/19; all non-browser suites 155/0; demo-voice 30/30; website
272/272; website-follow 19/19; website-fold 37/37; demo 110/110; demo-access 31/31; demo-route-sweep 145/145; demo-phoneshell 49/49;
demo-launch 13/13; demo-searchbar 120/120.

## Day 2 — worked on the evening of Mon 23 Nov, on the founder's decisions of 15:37 (E3-D1 to E3-D5)

| # | The founder's order | State | Evidence |
|---|---|---|---|
| 1 | VOICE mobile responsiveness; cross-site permission refusal | DONE | Sample windows read as cards at 390 px; site-scoped roles refused `#/voice/callpath/R-MER-1-140` in the page registry. demo-voice VC-04, VC-17, VC-18; voice.test "site scope" |
| 2 | VOICE on the shared room and device passport | DONE | Room: "Calling" is one of the room's places in the shared row on every room page, and the CallPath carries the same row back to Lite, Assurance, Commissioning and the rest (demo-room-jumps RJ-01, RJ-02; demo-voice VC-21). Device: the asset page of the room's calling endpoint links to its CallPath for a role that may open it (VC-24; voice.test "the device passport") |
| 3 | FLOW, and its relationship to VOICE | DONE | `#/flow`, `#/flow/link/<node>`; opens from the CallPath and returns with the case kept (VC-16; voice.test "FLOW (J6A)") |
| 4 | J6B steps 5–6: ServiceHands, independent verification, Assurance, MissionProof | DONE, except the Assurance drift record | The job panel reads the real service engine; the technician cannot verify their own work; MissionProof readiness follows the record (voice.test "J6B steps 5 and 6"; VC-12, VC-19, VC-20). An Assurance drift record written by the retest is SPECIFIED |
| 5 | The seven outstanding modules as functional, integrated synthetic experiences | DONE | FLOW, MissionProof, PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE: `docs/product/MODULES_BLUEPRINT.md`; modules.test 14/14; demo-modules 56/56 (desktop and phone) |
| 6 | Finish the audit files; run the full regression | Audit files DONE; regression: see below | `docs/audit/DEPLOYED_VS_REPO_VS_HISTORICAL.md`, `PARITY_LEDGER.csv`, `MEDIA_AND_RIGHTS.md`, `ROUTE_INVENTORY.csv` |
| 7 | Begin the design-to-code work | STARTED, small | The new screens use the existing kit and tokens; phone layouts were checked from captured screens (`docs/audit/e3-day2/`) and two defects found that way were fixed (a failed delivery step drawn with a tick; a control label cut off on a phone). No redesign of existing screens yet |
| — | E3-D2 UC / Voice Administrator | DONE | Seventeenth role, least privilege; twelve unit and four browser suites that counted sixteen roles updated, each with the reason |
| — | E3-D3 experimental estimate | DONE | Measurements lead; the estimate is marked experimental on the page, the website and in the test |
| — | E3-D1 families | DONE | Six families, seventeen capabilities, all built; `#/families`; website `/products#families` with catalogued launches |
| — | E3-D5 GitHub CI repair | PREPARED, NOT MERGED | Branch `ci/e3-d5-founder-studio-private-store`, draft pull request 3; the repaired workflow passed the build step on GitHub for the first time since 17 Nov; result of its test run is recorded on the pull request |
| — | E3-D4 isolated staging previews | See `docs/releases/STAGING_PREVIEW_E3.md` | Created only from a commit whose exact-commit regression passed; the canonical Next sites are unchanged at fe30ba9d |
| — | Repository visibility audit | DONE, reported privately | Not committed (it would be a public index of sensitive material). Nothing was changed. Open decision E3-D6 |

### Regression on the day's work

| Run | Result |
|---|---|
| All non-browser suites after the UC / Voice Administrator change (3cea0f52) | PASS 155 · FAIL 0 |
| Exact-commit regression started on 3cea0f52 | **STOPPED after part 1 of 5, not a result.** Part 1: PASS 57 · FAIL 1 · NOT_RUN 1. The failure was `demo-worlds` W-27, which still counted sixteen View-as roles; corrected in the next commit with the reason. The run was stopped so that one full regression runs on the commit that also holds the five modules |
| Exact-commit regression started on 24da3050 (the five modules) | **STOPPED in part 1 of 5, not a result.** 47 of 48 suites run had passed; `demo-room-jumps` failed: the room row now lists Calling, and the CallPath did not carry the row back. Both were real: the page now carries the row, and the suite's list of places names VOICE, with the reason |
| **Exact-commit regression on 8597d2ea** (build, five parts with the browser and Founder Studio suites, merge; run alone) | **PASS 291 · FAIL 0 · NOT_RUN 2.** The two not run are named with their reasons: the ML research prototype (its dataset is not generated in this workspace) and the full decode of every film (run with `--films` before a media release). Evidence: `tests/evidence/TEST_RESULTS.md` and `.json`, which name the commit |

## Day 3 — begun on the night of Mon 23 Nov, on the founder's message of 19:22

"The next milestone should be less about adding pages and more about proving all the products work together. Every product and
workflow." Positioning: "One platform, six product families, shared engineering intelligence."

| # | The founder's order | State | Evidence |
|---|---|---|---|
| 1 | Complete the exact-commit regression | DONE on 8597d2ea: PASS 291 · FAIL 0 · NOT_RUN 2 | `tests/evidence/TEST_RESULTS.md` (committed in 6f97ce6d) |
| — | Staging previews (E3-D4) | DONE, live-checked | `docs/releases/STAGING_PREVIEW_E3.md`: two isolated static sites on `preview/enterprise-3` at 8597d2ea; the canonical Next sites and production untouched |
| 2 | Walk the 12 end-to-end journeys | DONE: thirteen walks (J6 is two), hop by hop on real links with role hand-overs, two also on a phone | `tests/browser/demo-journeys.test.mjs`; `docs/audit/JOURNEY_WALKS.md`; ledger rows J1–J12 |
| 3 | Repair the remaining Assurance and APEX links | DONE | Assurance reads the room's calling from VOICE; APEX shows VOICE's reading beside its hypotheses and links to VOICE and FLOW (`voice/job.ts callingReading`; voice.test; JW-J5, JW-J6B). One shared job row (`rooms/JobJumps.tsx`) on the work order, Investigate, the scan and the Learn case |
| — | What the walks found | REPAIRED: ten places where one product did not lead to the next for the same record | `docs/audit/JOURNEY_WALKS.md`, the table "What walking found" |
| — | No page offers a role a link it may not open | DONE. Audit: 977 pages as seventeen roles, 29 kinds of link led to the access page. Now held for every page by `shell/linkGuard.ts` | `tests/browser/demo-links.test.mjs` (the 29 cases, a walk of every remaining link on those pages, and a role switch on the same page) |
| 4 | Begin a genuine design-to-code refinement pass | BEGUN, on the platform's own pages | Website: the platform drawn as one figure (seventeen blocks in six columns on what they share, on one record), the six families as six questions in rows instead of a card grid, the issue thread as one path, each family shown in its place in the figure on its own page. Demo: the same figure and path on `#/families`; the job row; record links on KPI passports. Checked from captured screens at 1440 and 390 px, light and dark |
| 5 | The corporate website: investors understand the 17 capabilities without 17 startups | DONE at three levels and no more: the platform, six families, each family's members | Home `#platform`, `/platform`, six pages `/platform/<family>`; website.test WP-home, WP-plate, WP-plate-links, WP-questions, WP-thread, WP-families, WP-390, WP-390-thread. Both sites read `packages/ui/src/families.ts`, so they cannot name the platform differently |
| — | E3-D5 CI repair, second run | STILL NOT GREEN: PASS 278 · FAIL 8 · NOT_RUN 4 (first run 274 · 12 · 4). Third commit pins two missing Python packages; six failures remain open and named | Branch `ci/e3-d5-founder-studio-private-store` (b57e3d29), draft pull request 3; not merged |

Open after this slice: a narrated all-module tour (needs approval for voice generation; `#/tour` opens the platform map); the APEX
case record written by VOICE's hypothesis (it is cited, not written); an Assurance drift record from a retest; redaction tests for
search and exports; `/v1/...` contracts for the eight capabilities; what a V2.5.3 address served by another product's screen should
show a role that may open the address but not the product (noted in `JOURNEY_WALKS.md`).

## Days 3–7

- Day 3 (Wed 25 Nov), remaining: the APEX case record of the VOICE hypothesis; a second design pass on the screens the journeys
  cross most (room, work order, APEX case); the regression on the Day 3 commit and the preview update.
- Day 4: redaction tests for search and exports; out-of-order events and double closure; Assurance drift record from a retest.
- Day 5: corporate site pages for the capability families; OpenAPI paths, events and SDK contracts for the eight capabilities;
  algorithms register (QM-G107-S1 as experimental); security matrix; the 90–105-day board.
- Day 6: QA across widths and themes, security negatives, repair.
- Day 7: release candidate, handoff documents, founder review.
