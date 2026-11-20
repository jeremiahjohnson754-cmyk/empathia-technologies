# End-to-end test results (deliverable G)

Everything here was run in this workspace on 20 Nov 2026, in headless Chromium (Playwright), against the built sites served locally,
unless it says "live". NOT RUN is never counted as PASS.

## Targeted runs while the work was done

| Command | Result | Notes |
|---|---|---|
| `node tests/browser/demo-gestures.test.mjs` | first run 3 passed, 1 failed, then stopped on a missing element; after fixes **38 passed, 0 failed** | the first runs found D-15 (full-screen map squeezed by the building card); the other failures were the test's own (a control under the phone's bottom tab bar; a hint shorter than a software-rendered frame; a zoom check starting at the nearest distance), each fixed with its reason in the file |
| `node tests/browser/demo-search-journey.test.mjs` | first run **27 passed, 2 failed** (SC-09, SC-11); after fixes **29 passed, 0 failed** | the failures were real: D-13 (a building not offered for its name), D-14 (work orders not found in the header bar) |
| `node tests/browser/demo-route-sweep.test.mjs` | first run **137 passed, 5 failed**; after fixes **142 passed, 0 failed** | real: D-16 (Lite studio 114 px sideways on a phone), D-17 (three labs without an h1), D-18 (a missing request without a heading) |
| `node tests/browser/demo-mixlab.test.mjs`, `learn-labs.test.mjs` (after D-17) | 31/31, 29/29 | |
| `node --test tests/unit/signal-cinematic.test.mjs` (Season 2 complete) | 7/7 | thresholds raised to the delivered coverage: 11 chapters, ≥ 320 takes |
| `node scripts/audit/site-audit.mjs --widths=320,360,390,430,768,1024,1440,1920` | **464 page × width checks: P0 0, P1 0**, P2 360, P3 367 | evidence `SITE_AUDIT_8_WIDTHS.json`; every P2 is a target under 24 px where WCAG 2.5.8's spacing or inline exception may apply (inline links, Expo's plan at 320 px); Expo's booth tags were raised to 24 px after it |
| `node scripts/verify/experience-shots.mjs` (after; before from live staging) | 72 after + 12 before screenshots | RESPONSIVE_VISUAL_EVIDENCE/ |
| `tsc -p apps/demo/tsconfig.json --noEmit` | exit 0 | after each code change |

| Regression of 0f08b3e (stopped in part 3) | part 1: PASS 55 · FAIL 2 · NOT_RUN 1; part 2: PASS 58 · FAIL 0; part 3 stopped | real failures of this work: WEL-02, WEL-03 and T-01 (Search Party rewrote addresses that already said what was on screen: `%20` became `+`, a record's colon became `%3A`), fixed in ba8a867; demo-expo-live stopped on a test id collision (the new turn-left button was `xpo-left`, which Expo already uses), fixed in 84e8191. Rerun on the fix: demo-expo-live 12/12, demo-welcome 11/11, demo 110/110, demo-searchparty-bar 29/29, demo-search-parity 7/7, demo-searchbar 120/120, demo-return-trail 21/21, demo-search-journey 29/29, demo-gestures 38/38 |

## Full regression on the exact commit

`node scripts/build.mjs`, then `node scripts/test.mjs --browser --studio --part=n/5` for n = 1..5, then `--merge=5`, with nothing else
running, on **13fd15f**: **PASS 287 · FAIL 0 · NOT_RUN 2** (parts 57/0/1, 58/0/0, 57/0/1, 58/0/0, 57/0/0). Not run, as in every
regression: the Python ML prototype (its dataset is not generated here) and the full decode of every curated film (`--films`).
Evidence: `tests/evidence/TEST_RESULTS.json` / `.md` (commit e34a01d); logs `.local/logs/regress-13fd15f-*`.

## Live checks after staging 13fd15f

| Check | Result |
|---|---|
| live pages in a browser, LV-01..24 (new: LV-21 the map on a phone with touch, LV-22 an Expo booth from the hall, LV-23 Search Party's search kept across Back, LV-24 Season 2's second run served) | 24/24 |
| `scripts/staging/demo-smoke.mjs` | 12/12 |
| `scripts/staging/demo-edge.mjs` | 6 passed, 1 not run (EG-02, as before) |
| `scripts/staging/connected-browsers.mjs` | 9/9 |
| `scripts/audit/public-exposure.mjs`, built and live | PASS 9 · FAIL 0 |

Recorded in `docs/releases/STAGING_2026-11-19.md`.

## The website's four-perspective pass, staged as fe30ba9

website 269/269, website-fold 37/37, website-follow 19/19, website-opening 19/19 on its build. Exact-commit regression of fe30ba9:
first run stopped after part 1 (demo-campus-life CL-05..07, a timing flake: D-19); rerun **PASS 287 · FAIL 0 · NOT_RUN 2** (evidence
c051462). Live after staging: pages 25/25 (new LV-25), smoke 12/12, edge 6 + 1 not run, two browsers 9/9, exposure 9/0.

## Live checks on production after the release of 27c7469 (fe30ba9)

On the founder's approval (20 Nov, 15:31), both production static sites deployed 27c7469, live at 21:35 UTC. Against
https://empathia-website.onrender.com and https://empathia-demo.onrender.com: live pages LV-01..25 **25/25**; SIGNAL's library and four
of its chapters (S01E00, S01E01, S02E01, S02E11) open with their titles and no console error; public exposure **9/0**; the security headers are served. Not applicable:
demo-smoke, demo-edge and connected-browsers, which test the staging API (production has none). Recorded in
`docs/releases/PRODUCTION_2026-11-20.md`.

## Not run

- Real devices (an iPhone with Safari, an Android phone): not available here. Touch was driven through Chromium's own touch input.
- axe-core: not installable here; `site-audit.mjs` applies in-house rules A1–A10, which are not an axe report.
- Frame-rate measurements of the 3D worlds: headless Chromium draws WebGL in software here.
