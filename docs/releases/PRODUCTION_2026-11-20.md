# Production release record, 20 Nov 2026

The founder's approval, 20 Nov 2026 15:31 (America/Chicago), verbatim: "Yes I approve let's push to live" (in reply to the offer to
promote the tested staging build fe30ba9 to the production addresses). Before this, production had stayed on the 31 Oct build by the
founder's choice of 19 Nov (staging only).

| Service | Render id | Branch | Commit | Deployed (UTC) | State |
|---|---|---|---|---|---|
| empathia-website (static) | srv-dbj4hlu7bikc73ed96rg | main | 27c7469 | 20 Nov 21:35:32 | live (deploy dep-dc0bpcesn44s73e799a0) |
| empathia-demo (static) | srv-dbj4hlu7bikc73ed96q0 | main | 27c7469 | 20 Nov 21:35:48 | live (deploy dep-dc0bpc96ihac73c46qjg) |

The push first started a deploy of each site on the new commit (dep-dc0bpat9el5s739eobfg, dep-dc0bpat9el5s739eobcg); the Blueprint sync's
deploys of the same commit followed and are the live ones; Render's deploy list shows the first two as deactivated.

Previous production build, the rollback target: **219d75f** (31 Oct 2026; website deploy dep-dbj4hm67bikc73ed9800, demonstration deploy
dep-dbj4hme7bikc73ed9890, both blueprint syncs, now deactivated).

## What was released

27c7469 merges the tested staging build **fe30ba9** into `main`. Its application files are fe30ba9's exactly; the one conflict was
`.github/workflows/ci.yml`, resolved as fe30ba9's workflow with main's quoting of the concurrency group kept (unquoted, it is not valid
YAML: the founder's fa4c5fd fix). Main's other CI change (Python setup, the test database) was already in fe30ba9's workflow.

- Exact-commit regression of fe30ba9, run alone: PASS 287 · FAIL 0 · NOT_RUN 2 (evidence c051462).
- On staging before release: live pages 25/25, smoke 12/12, edge 6 + 1 not run, two browsers 9/9, exposure 9/0.

What it brings to the production addresses, against the 31 Oct build: everything recorded in `docs/releases/STAGING_2026-11-19.md` and
`docs/qa/experience-2026-11-20/`, among it SIGNAL (Seasons 1 and 2; Season 2 with 329 voiced lines and 10 captions), the maps and 3D
worlds that let the page scroll, Expo booths that take you there, Search Party that keeps its place, Intake, pricing (proposed list
prices, price book 3), FieldLink (a concept) and the website's four-perspective pass.

The Blueprint sync that the push to `main` triggered applied `render.yaml` to the same two static sites only: no new service and no paid
resource. It tightened their headers (object-src 'none' in the CSP, HSTS includeSubDomains, Permissions-Policy, Cross-Origin-Opener-
and Resource-Policy; for HSTS, Render serves its own stronger value, see below), added two permanent redirects of superseded product addresses, and installs without dependency scripts
(`--ignore-scripts`). Production builds with its defaults: the website links to https://empathia-demo.onrender.com, the demonstration to
https://empathia-website.onrender.com, and the demonstration names no API (its connected journey says it is not connected; the staging
API is not used by production).

## Checks on the live production services

| Check | Result |
|---|---|
| live pages in a browser, LV-01..25, run against the production addresses (`LIVE_WEBSITE`, `LIVE_DEMO`) | 25/25 |
| SIGNAL on production, opened in Chromium: `#/story` (h1 "SIGNAL"), `#/story/s01e00` ("Signal"), `#/story/s01e01` ("Ten Seats"), `#/story/s02e01` ("Advance"), `#/story/s02e11` ("Last Night of the Tour") | each opens with its title, no "Not migrated yet", no console error (before this release these addresses showed "Not migrated yet") |
| public exposure, built and live (both production sites) | PASS 9 · FAIL 0 |
| response headers on both production sites (`curl -I`) | the Blueprint's CSP (with object-src 'none'), Permissions-Policy, Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy are served; Strict-Transport-Security is served as Render's own `max-age=315360000; includeSubdomains; preload`; the demonstration also sends `X-Robots-Tag: noindex, nofollow` |
| demo-smoke, demo-edge, connected-browsers | not applicable: they test the staging API, which production does not use |

## Rollback

Render → the service → Deploys → the 31 Oct deploy → Rollback (each site independently), or move `main` back to 219d75f and let
auto-deploy rebuild. No database is involved.
