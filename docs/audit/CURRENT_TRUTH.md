# Current truth — Enterprise 3.0 kickoff audit, Monday 23 Nov 2026

Everything below was run or read on 23 Nov 2026. NOT RUN is never counted as PASS. Evidence: `docs/audit/e3-day1/`.

## Repository, branches, deployments

| What | Value | How confirmed |
|---|---|---|
| Repository | github.com/jeremiahjohnson754-cmyk/empathia-technologies (public) | `git remote get-url origin` |
| Working branch | `v18/continuation`, HEAD before today's work **1bc57f91** | `git rev-parse` |
| Corporate site, empathia-website-next.onrender.com | Render static site srv-dbl7hpm1egvs73e0uj0g, branch `phase3/legendary-experience`, deployed commit **fe30ba9d** (deploy dep-dc0a3jh5efls73b6f1v0, live 20 Nov 19:40 UTC) | Render deploy list |
| Demonstrator, empathia-demo-next.onrender.com | Render static site srv-dbl7hq0m7kps739gsgbg, same branch, **fe30ba9d** (dep-dc0a3jh5efls73b6f1r0, live 20 Nov 19:40 UTC) | Render deploy list |
| Staging API | srv-dbu5cvgae00c73ed860g, branch `staging/demo-api` at a19216e0 | `git fetch`; not re-tested today |
| Production (`main`) | 27c74695 = fe30ba9d merged, released 20 Nov on the founder's approval | docs/releases/PRODUCTION_2026-11-20.md |
| `restoration/sprint-0-1` (31 Oct release candidate, 27e3733f) | **Already contained** in `v18/continuation`: it is an ancestor of HEAD, 802 commits behind. Nothing to cherry-pick | `git merge-base --is-ancestor` |
| API inventory at HEAD | `docs/api/openapi.json`: OpenAPI 3.1.0, **221 operations** (the 31 Oct report said 156) | counted from the file |

Between the deployed commit (fe30ba9d) and HEAD before today, `git diff` shows release records, test evidence and the CI workflow
file only, and no file under `apps/` or `packages/`: the two Next sites show the same application as the repository.

## Live audit of both Next sites (real browser)

`scripts/audit/live-kickoff.mjs`, Chromium, 390 px and 1440 px: every address in the website's sitemap (32) and 30 demonstrator
addresses, 124 route × width checks. Result file: `e3-day1/LIVE_AUDIT.json`; home screenshots `live-*-home-*.jpg`.

- Website: 32 of 32 addresses return 200 with an h1, no console error, no failed request, no sideways overflow, at both widths.
- Demonstrator: 22 of 30 addresses open their page with no console error and no overflow at both widths.
- **Eight demonstrator addresses have no page** (the boundary page "This address is not part of the Living Campus"):
  `#/voice`, `#/flow`, `#/prism`, `#/sentinel`, `#/accord`, `#/missionproof`, `#/forge`, `#/tour`.
- The website has no page for VOICE, FLOW, PRISM, SENTINEL, ACCORD, MissionProof, FORGE or OMNIPRESENCE, and says "nine products".

Not done in this audit: 360/430/768/1024/1920 px on the live sites (the eight-width audit of 20 Nov covered the built sites:
`docs/qa/experience-2026-11-20/SITE_AUDIT_8_WIDTHS.json`), Firefox, Safari, real phones, screen reader, performance budgets.

## Baseline tests at 1bc57f91 (before any change)

| Run | Result |
|---|---|
| `node scripts/build.mjs` | PASS |
| `node scripts/test.mjs` (every non-browser suite) | PASS 154 · FAIL 0 · NOT_RUN 135 (the 135 are browser and studio suites, which need `--browser --studio`) |
| Full exact-commit regression (`--browser --studio`, five parts) | **NOT RUN today.** Last run: fe30ba9d, PASS 287 · FAIL 0 · NOT_RUN 2 (20 Nov, evidence c051462) |
| GitHub CI on `main` | FAILS at the Founder Studio build step (private store not on a runner); recorded in PRODUCTION_2026-11-20.md; fix needs the founder's word |

## What exists against the Enterprise 3.0 scope (updated after Day 2)

| Module | In the repository (`v18/continuation`) | On the two Next sites (fe30ba9d) |
|---|---|---|
| Core, Mission Control, Search Party, Intake, Pro, Lite, Scouter, Commissioning, Assurance, Field Intelligence, ServiceHands, APEX, Learn/SIGNAL | Working pages on synthetic data, role-aware | The same |
| VOICE | IMPLEMENTED, TESTED, SIMULATED: overview, CallPath, report, J6B steps 1–6, website `/voice` | Not deployed |
| FLOW, MissionProof, PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE | IMPLEMENTED, TESTED, SIMULATED: one page and one model each, connected through the shared record (`docs/product/MODULES_BLUEPRINT.md`) | Not deployed |
| UC / Voice Administrator (seventeenth role) | IMPLEMENTED, TESTED | Not deployed |
| OEM embedded experience | NOT BUILT; no document | — |
| Guided all-module tour (`#/tour`) | NOT BUILT (`#/families` is the map of all seventeen) | — |

Row by row, with evidence and what is missing: `docs/audit/PARITY_LEDGER.csv`. Routes: `docs/audit/ROUTE_INVENTORY.csv`.
Deployed against repository against historical: `docs/audit/DEPLOYED_VS_REPO_VS_HISTORICAL.md`. Media: `docs/audit/MEDIA_AND_RIGHTS.md`.
Screens captured on a desktop and a phone: `docs/audit/e3-day2/`.

## P0 list (after Day 2; items 1 and 2 updated 24 Nov)

1. The Next sites still show the 20 Nov build. Two isolated staging previews show 8597d2ea (`docs/releases/STAGING_PREVIEW_E3.md`);
   work after that reaches them only after its own exact-commit regression.
2. CLOSED 24 Nov: all twelve journeys are walked hop by hop on real links (`docs/audit/JOURNEY_WALKS.md`). What a walk does not press
   (a product's own state changes) is named per journey in `PARITY_LEDGER.csv`.
3. No `/v1/...` API path, event or SDK contract exists for the eight capabilities; every one of them is a browser-side simulation.
4. No guided all-module tour address.
5. GitHub CI on `main` is red until the repair (draft pull request 3) is approved and merged.
6. The repository is public (open decision E3-D6; private report).

Closed since Day 1: the seven modules without a page; J6B steps 5 and 6; the "nine products" wording (E3-D1); the CallPath table on a phone.

## Done

See `docs/operations/CLAUDE_FABLE_7_DAY_EXECUTION_BOARD.md`.
