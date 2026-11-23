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

## What exists against the Enterprise 3.0 scope

| Module | In the demonstrator at fe30ba9d | Status |
|---|---|---|
| Core, Mission Control, Search Party, Intake, Pro, Lite, Scouter, Commissioning, Assurance, Field Intelligence, ServiceHands, APEX, Learn/SIGNAL | Working pages on synthetic data, role-aware, 287-suite regression | IMPLEMENTED, TESTED, SIMULATED |
| VOICE | Nothing before today. Today: see below | IMPLEMENTED (steps 1–4 of J6B), SIMULATED |
| FLOW, PRISM, SENTINEL, ACCORD, MissionProof, OMNIPRESENCE | No page, no fixture | NOT BUILT |
| FORGE | The word appears in SIGNAL content and docs; no workspace | NOT BUILT |

## P0 list

1. Seven accepted modules have no page on either site (FLOW, PRISM, SENTINEL, ACCORD, MissionProof, FORGE, OMNIPRESENCE). VOICE had none until today.
2. J6B-VOICE steps 5 and 6 (technician evidence, independent review, Assurance and MissionProof change) are not built.
3. Both sites say "nine products": the product taxonomy needs the founder's decision E3-D1 before the menus change.
4. No guided all-module tour address (`#/tour` has no page; the investor start and the scenario tours exist under other addresses).
5. The CallPath's sample table scrolls sideways inside its own frame on a phone; the judgement and estimate columns start off-screen.
6. GitHub CI on `main` is red (not caused by this sprint).

## Done today (Day 1)

See `docs/operations/CLAUDE_FABLE_7_DAY_EXECUTION_BOARD.md`.
