# Rollback and deployment plan (deliverable J)

Founder's master directive, 20 Nov 2026, release control: "Do not merge to main, publish new deployments, spend money, change paid-service
settings, or alter production data without explicit founder approval." The founder chose **staging only** on 19 Nov; production stays on
the 31 Oct build. This plan covers staging, which is what the standing instruction allows ("deploy to staging only").

## What deploys where

| Service | Render id | Branch it follows | Kind | Moves when |
|---|---|---|---|---|
| empathia-website-next | srv-dbl7hpm1egvs73e0uj0g | `phase3/legendary-experience` | static | the branch moves (auto-deploy) |
| empathia-demo-next | srv-dbl7hq0m7kps739gsgbg | `phase3/legendary-experience` | static | the branch moves (auto-deploy) |
| empathia-demo-api-l04n | srv-dbu5cvgae00c73ed860g | `staging/demo-api` | Docker | only when `services/` or `packages/db/` changed |
| production | — | `main` / the 31 Oct build | — | **not touched**; needs the founder's word |

No paid resource is created, no plan changed, no environment variable edited by this work.

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
| Production | Not deployed by this work; nothing to roll back | — |

The previous staged commits, newest first, are kept in `docs/releases/STAGING_2026-11-19.md` (ab22bb5, 2a5b185, c347509, …), each with
its regression and live checks, so each is a known-good rollback target.

## What needs the founder

- Production (merge to `main`, a production deploy): the founder's explicit word.
- Any spend or plan change on Render or any other paid service.
- Any change to production data.
