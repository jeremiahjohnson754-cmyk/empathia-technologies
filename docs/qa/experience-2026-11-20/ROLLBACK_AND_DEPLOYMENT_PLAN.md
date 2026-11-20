# Rollback and deployment plan (deliverable J)

Founder's master directive, 20 Nov 2026, release control: "Do not merge to main, publish new deployments, spend money, change paid-service
settings, or alter production data without explicit founder approval." The founder chose **staging only** on 19 Nov, and on 20 Nov at
15:31 approved the production release ("Yes I approve let's push to live"): fe30ba9 went to `main` as 27c7469 and is live on both
production sites (`docs/releases/PRODUCTION_2026-11-20.md`). This plan covers staging, and production from that release on.

## What deploys where

| Service | Render id | Branch it follows | Kind | Moves when |
|---|---|---|---|---|
| empathia-website-next | srv-dbl7hpm1egvs73e0uj0g | `phase3/legendary-experience` | static | the branch moves (auto-deploy) |
| empathia-demo-next | srv-dbl7hq0m7kps739gsgbg | `phase3/legendary-experience` | static | the branch moves (auto-deploy) |
| empathia-demo-api-l04n | srv-dbu5cvgae00c73ed860g | `staging/demo-api` | Docker | only when `services/` or `packages/db/` changed |
| empathia-website (production) | srv-dbj4hlu7bikc73ed96rg | `main` | static, Blueprint (`render.yaml`) | `main` moves (auto-deploy); only with the founder's word |
| empathia-demo (production) | srv-dbj4hlu7bikc73ed96q0 | `main` | static, Blueprint (`render.yaml`) | `main` moves (auto-deploy); only with the founder's word |

No paid resource is created, no plan changed, no environment variable edited by this work. The production release's Blueprint sync
changed only the two existing static sites (headers, two redirects, `--ignore-scripts`).

## Where it stands (20 Nov 2026)

- Branch: `v18/continuation`. Tested and staged commit: **fe30ba9** (exact-commit regression PASS 287 · FAIL 0 · NOT_RUN 2; live checks
  25/25, smoke 12/12, edge 6 + 1 not run, two browsers 9/9, exposure 9/0). `phase3/legendary-experience` = fe30ba9.
- Rollback targets, newest first: **13fd15f** (the experience work without the website pass), **ab22bb5**. `staging/demo-api` unchanged at a19216e.
- Production: `main` = **27c7469** (fe30ba9 merged; live 20 Nov 21:35 UTC; live pages 25/25, SIGNAL opens, exposure 9/0). Rollback target:
  **219d75f**, the 31 Oct build (website deploy dep-dbj4hm67bikc73ed9800, demonstration deploy dep-dbj4hme7bikc73ed9890).

## Deployment, in order

1. Work is committed and pushed on `v18/continuation`.
2. **One exact-commit regression with nothing else running:** `node scripts/build.mjs`, then
   `node scripts/test.mjs --browser --studio --part=n/5` for n = 1..5, then `--merge=5`. A FAIL stops here: no staging with a material
   failure (directive: "Do not stage or deploy while material release-blocking failures remain").
3. The evidence is committed (`git add -u tests/evidence`; the re-rendered `media/screenshots/enterprise-web` restored).
4. `phase3/legendary-experience` is fast-forwarded to that exact commit and pushed: both static sites redeploy.
   `staging/demo-api` moves only if `git diff <staged> <new> -- services packages/db` is not empty.
5. Render `list_deploys` shows both static deploys `live` for that commit.
6. The live checks run against the live URLs and are recorded in `docs/releases/STAGING_2026-11-19.md`:
   live pages in a browser (`$S/live-check.mjs`, LV-01…), `scripts/staging/demo-smoke.mjs`, `demo-edge.mjs`,
   `connected-browsers.mjs`, and `scripts/audit/public-exposure.mjs` on the built and the live sites.

## Rollback

| Situation | Action | Time |
|---|---|---|
| A staged static site is wrong | Render → the service → Deploys → the previous live deploy → **Rollback**; or move `phase3/legendary-experience` back to the previous staged commit (`git push --force-with-lease origin <prev>:phase3/legendary-experience`) so auto-deploy rebuilds it | minutes |
| The staging API is wrong | Render rollback of `empathia-demo-api-l04n` to the previous deploy (the image is rebuilt from the branch; move `staging/demo-api` back the same way) | minutes |
| A migration on the staging database is wrong | Forward-only: a corrective migration (docs/operations/RENDER_STAGING.md §10); never edit an applied one. None of the work in this directive touches the database | — |
| A production site is wrong | Render → empathia-website or empathia-demo → Deploys → the 31 Oct deploy (dep-dbj4hm67bikc73ed9800 / dep-dbj4hme7bikc73ed9890) → **Rollback**, each site on its own; or, with the founder's word, move `main` back to 219d75f so auto-deploy rebuilds. Production has no database and no API | minutes |

The previous staged commits, newest first, are kept in `docs/releases/STAGING_2026-11-19.md` (ab22bb5, 2a5b185, c347509, …), each with
its regression and live checks, so each is a known-good rollback target.

## What needs the founder

- Production (merge to `main`, a production deploy): the founder's explicit word, each time. Given once, on 20 Nov at 15:31, for 27c7469.
- Any spend or plan change on Render or any other paid service.
- Any change to production data.
