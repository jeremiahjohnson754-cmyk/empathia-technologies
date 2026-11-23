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
| 2 | VOICE on the shared room and device passport | DONE for the room; PARTLY for the device | "Calling" in the shared room jumps for a role that may open the CallPath (VC-21); the CallPath names the endpoint's position and asset. The asset's own page does not yet link to VOICE |
| 3 | FLOW, and its relationship to VOICE | DONE | `#/flow`, `#/flow/link/<node>`; opens from the CallPath and returns with the case kept (VC-16; voice.test "FLOW (J6A)") |
| 4 | J6B steps 5–6: ServiceHands, independent verification, Assurance, MissionProof | DONE, except the Assurance drift record | The job panel reads the real service engine; the technician cannot verify their own work; MissionProof readiness follows the record (voice.test "J6B steps 5 and 6"; VC-12, VC-19, VC-20). An Assurance drift record written by the retest is SPECIFIED |
| 5 | The seven outstanding modules as functional, integrated synthetic experiences | DONE | FLOW, MissionProof, PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE: `docs/product/MODULES_BLUEPRINT.md`; modules.test 14/14; demo-modules 56/56 (desktop and phone) |
| 6 | Finish the audit files; run the full regression | Audit files DONE; regression: see below | `docs/audit/DEPLOYED_VS_REPO_VS_HISTORICAL.md`, `PARITY_LEDGER.csv`, `MEDIA_AND_RIGHTS.md`, `ROUTE_INVENTORY.csv` |
| 7 | Begin the design-to-code work | STARTED, small | The new screens use the existing kit and tokens; phone layouts were checked from captured screens (`docs/audit/e3-day2/`) and two defects found that way were fixed (a failed delivery step drawn with a tick; a control label cut off on a phone). No redesign of existing screens yet |
| — | E3-D2 UC / Voice Administrator | DONE | Seventeenth role, least privilege; twelve unit and four browser suites that counted sixteen roles updated, each with the reason |
| — | E3-D3 experimental estimate | DONE | Measurements lead; the estimate is marked experimental on the page, the website and in the test |
| — | E3-D1 families | DONE | Six families, seventeen capabilities, all built; `#/families`; website `/products#families` with catalogued launches |
| — | E3-D5 GitHub CI repair | PREPARED, NOT MERGED | Branch `ci/e3-d5-founder-studio-private-store`, draft pull request 3; the repaired workflow passed the build step on GitHub for the first time since 17 Nov; result of its test run is recorded on the pull request |
| — | E3-D4 isolated staging previews | TO DO after a passing exact-commit regression | No preview has been created; the canonical Next sites are unchanged at fe30ba9d |
| — | Repository visibility audit | DONE, reported privately | Not committed (it would be a public index of sensitive material). Nothing was changed. Open decision E3-D6 |

### Regression on the day's work

| Run | Result |
|---|---|
| All non-browser suites after the UC / Voice Administrator change (3cea0f52) | PASS 155 · FAIL 0 |
| Exact-commit regression started on 3cea0f52 | **STOPPED after part 1 of 5, not a result.** Part 1: PASS 57 · FAIL 1 · NOT_RUN 1. The failure was `demo-worlds` W-27, which still counted sixteen View-as roles; corrected in the next commit with the reason. The run was stopped so that one full regression runs on the commit that also holds the five modules |
| Exact-commit regression on the commit that follows | See `tests/evidence/TEST_RESULTS.md` at the evidence commit. Until that file names this commit, the full regression is NOT RUN |

## Days 3–7

- Day 3 (Wed 25 Nov): walk J1, J2, J4, J5, J10 and J12 step by step against the Enterprise 3.0 text on the existing screens and repair
  what the walk finds (`docs/audit/PARITY_LEDGER.csv` marks them NOT WALKED); the asset page's link to VOICE; the APEX case record of
  the VOICE hypothesis; the guided all-module tour (`#/tour`).
- Day 4: redaction tests for search and exports; out-of-order events and double closure; Assurance drift record from a retest.
- Day 5: corporate site pages for the capability families; OpenAPI paths, events and SDK contracts for the eight capabilities;
  algorithms register (QM-G107-S1 as experimental); security matrix; the 90–105-day board.
- Day 6: QA across widths and themes, security negatives, repair.
- Day 7: release candidate, handoff documents, founder review.
