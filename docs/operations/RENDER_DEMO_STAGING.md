# The connected demonstration on staging (Render)

Founder, 17 Nov 2026: "establish a repeatable staging deployment with the required API and database, validate cross-browser persistence,
and test both correct permissions and attempted unauthorized access."

What this is: the demonstration API (ADR-0013) and a database of its own on Render, and the staging demo site built with that API's
address so that `#/connected` exists there. Free plans; no charge. Production is not touched.

## The parts

| Resource | What | Plan |
|---|---|---|
| `empathia-demo-db` (created as `empathia-demo-db-l04n`) | PostgreSQL 16, private network only. Holds sandboxes and nothing else | free |
| `empathia-demo-api` (created as `empathia-demo-api-l04n`) | the enterprise API with `AUTH_MODE=demo`, built from `deploy/render/Dockerfile` | free |
| `empathia-demo-next` (exists) | the static demo; connected by `DEMO_API_URL` | free static site |

Declared in **`deploy/render/demo.render.yaml`**. No secret is in the file: Render generates the session secret and the two runtime-role
passwords, and gives the owner URL from the database it creates.

## Why it is repeatable

- **One file, one start command.** The service's start command (`deploy/render/demo-start.sh`, copied into the image) is the whole
  preparation, in order, on every start: the runtime roles
  (gate V-1: it refuses, and the API does not start, if the database's owner cannot create roles), the migrations, sandboxes enabled
  with the role catalogue, then the API. There is no seed, no bootstrap and no step done by hand.
- **The database is disposable.** A new one needs nothing but a new sync of the file. That matters: a free database expires 30 days
  after it is created, and the API never deletes a sandbox.
- **Rehearsed from the file.** `node deploy/render/rehearse-demo.mjs --assemble` reads the start command and the environment out of
  the Blueprint and runs them from the assembled runtime tree (what the image contains) in production mode: R-01…R-07, part of
  `node scripts/test.mjs`. The database is a PostgreSQL cluster created for the run and removed after it, and its owner is what the
  platform gives: not a superuser, allowed to create roles. Evidence: `tests/evidence/RENDER_DEMO_REHEARSAL.json`.
- **Checked statically.** `scripts/staging/validate-blueprints.py` P3-1…14: free plans only, demonstration mode only, private
  database, generated secrets, the start command's order, one allowed browser origin, a buildable image context.
- **Checked when deployed.** `node scripts/staging/demo-smoke.mjs <api-url> --origin=<demo-site>`: SM-01…12 over HTTP only, from
  any machine that can reach the service. Where none can, the same file runs inside the service (below).
  `node scripts/staging/demo-edge.mjs <api-url> --origin=<demo-site>`: EG-01…07, the edge around it (TLS, headers, CORS on a real
  request, authentication, failure handling). It opens no sandbox.

## The branch

The API deploys from **`staging/demo-api`**, not from `phase3/legendary-experience`. The two static sites deploy on every push to
`phase3/legendary-experience`, and that branch moves only to a commit that passed the full regression. A deployment fix (this
directory, `.dockerignore`) must not redeploy the sites from an unregressed commit, so the API has its own branch. Rule for moving it:
`git diff <regressed commit> <new commit> -- services packages database apps integrations` is empty, and the unit, integration and
security tests pass on the new commit.

One exception has been made, and it is named here so that it is not mistaken for the rule: `14d1f45` differs from the regressed
`99cb84b` in `services/enterprise-api/src/db/bootstrap.ts` (the role step: seven lines). Without it the service could not start a
second time. No route, domain code or migration differs. The unit, integration, security and deploy suites passed on it (125, 0).

## What the deployment check covers (SM-01…12)

| | |
|---|---|
| Up, in demonstration mode | `/health`: demonstration mode, database reachable, release named |
| Nothing else served | the development sign-in and the public forms answer 404; no token and a made-up token get 401 |
| Correct permissions | the installer records a mounting and a field move; the systems engineer approves the move |
| Unauthorized by role | the designer cannot record a mounting; the installer cannot approve their own move or start commissioning; the requestor cannot create a room; nobody lists people — each a 403 with its reason; the register gate holds |
| Unauthorized by identity | a wrong key, an unknown sandbox, another sandbox's key and a privileged role get no session |
| Isolation | one sandbox's session cannot read or write another's room |
| Persistence | a new session from the key alone, as a different person, reads the same field record and thread |
| Not a file store | a binary upload and an oversized note are refused |
| Cross-origin | the demo site's origin is allowed, with PUT; any other origin is not |
| Reset | the old session and key stop at once; the new sandbox has nothing recorded |

The rehearsal adds: a restart, after which the role step finds the roles and re-passwords them, nothing else changes, and a sandbox
opened before it still opens with its key (a free instance sleeps and wakes); the database holds no tenant that is not a sandbox and
nobody who could sign in any other way; the runtime roles have no attribute but LOGIN, and the API's role cannot read the sandbox
table, change the setting or create a tenant; V-1; the self-check switch.

## The same check from inside the service

`DEMO_SELF_CHECK=on`, set on the service for one deploy, makes the start script run `demo-smoke.mjs` inside the container against
the API's own address once it answers, and write every line to the service's log prefixed `SELF-CHECK`. The Blueprint declares it
`off`. It opens three sandboxes each time it runs, so it is switched off again afterwards. It exists because the workstation this was
built on is not allowed to reach `*.onrender.com`, by shell or by fetch.

What it proves: the deployed image, with the platform's database, its generated secrets and its real roles, grants and refuses what
it should. What it does not: it does not pass through the platform's edge (TLS, the forwarded caller address, a browser's
cross-origin request), and it is not a browser.

## What deploying found

Three things that no local run had shown, each now covered by a check:

1. **The start command did not reach the shell intact.** `dockerCommand: sh -c "a && b && exec c"` exited with status 127
   (`sh: 1: a && b && exec c: not found`). The preparation is a script in the image; P3-4 reads it.
2. **The second start failed.** The role step ran `ALTER ROLE … NOSUPERUSER NOBYPASSRLS …` on an existing role. PostgreSQL 16
   refuses a role that is not a superuser any `ALTER ROLE` naming those attributes, even to deny them: `permission denied to alter
   role`. A free instance starts again every time it wakes, so the service would have stopped for good after its first sleep. The
   step now sets the password only and checks the attributes; R-03 rehearses it as an owner that is not a superuser.
3. **The rehearsal's restart was not a restart.** Since the command became a script, stopping it locally stopped a wrapper and left
   the API running; the "restarted" service was the one that had never stopped. The rehearsal now stops the process group and
   requires that nothing answers before it starts again.

## What the free plans mean

Read from <https://render.com/docs/free> on 17 Nov 2026.

- The API sleeps after 15 minutes without traffic and takes about a minute to wake. The first visit to `#/connected` after a quiet
  spell waits that long.
- No persistent disk: the short evidence notes of a sandbox do not survive a restart. Their records and hashes do; only downloading
  the note back would fail.
- The database: 1 GB, no backups, expires 30 days after creation (then 14 days before it is deleted). Recreate it by syncing the file.
- 750 free instance hours a month for the workspace.

Moving either resource to a paid plan is one line in the Blueprint and a spending decision that is the founder's. Render's list
prices on 17 Nov 2026: $7 a month for the web service, $6 a month plus storage for the database.

## Procedure

1. Push the commit; move `staging/demo-api` to it (rule above).
2. Create the Blueprint from `deploy/render/demo.render.yaml` on that branch; review the plan; approve.
3. When the deploy is live, run the deployment check against the API's URL with `--origin=https://empathia-demo-next.onrender.com`
   from a machine that can reach it; or set `DEMO_SELF_CHECK=on` on the service, read the `SELF-CHECK` lines in its log, and set it
   back to `off`.
4. Set `DEMO_API_URL` on `empathia-demo-next` to the API's URL and let it redeploy the same commit. If that site sends a
   Content-Security-Policy header of its own, its `connect-src` must name the API's origin too (the page's `<meta>` policy already does).
5. Open `https://empathia-demo-next.onrender.com/#/connected` in two different browsers: open a sandbox in one, copy the resume code,
   resume in the other.

## State

### 17 Nov 2026

**Created.** Blueprint `empathia-demo-staging` on `staging/demo-api`, synced three times. Render added a suffix to both names:
database `empathia-demo-db-l04n`, web service `empathia-demo-api-l04n`, <https://empathia-demo-api-l04n.onrender.com>. Both free.

**Live.** `14d1f45`; Render reports the deploy `live` (finished 14:13:38 UTC).

**Read from the service's log on Render:**

| | |
|---|---|
| First start on an empty database (`f9076a3`, 13:40 UTC) | V-1 PASS for the platform's user; both runtime roles created; 35 migrations applied; sandboxes enabled; listening in demonstration mode, production |
| Second start (`8dccc90`, 13:48 UTC) | **failed**: `roles refused: permission denied to alter role`. The previous deploy kept serving. Fixed in `14d1f45` |
| Start on the prepared database (`14d1f45`, 14:12 UTC) | roles: password set ×2; 0 migrations applied, 35 already; listening |
| Deployment check inside the service (`14d1f45`, 14:12 UTC) | SM-01…12: **12 passed, 0 failed**, against the platform's database |
| Start again with the self-check off (`14d1f45`, 14:13 UTC) | roles: password set ×2; listening; no check ran |

**Verified through the public address** (from 14:36 UTC, once the founder had allowed this workstation to reach it):

| | |
|---|---|
| `demo-smoke.mjs` against `https://empathia-demo-api-l04n.onrender.com` | SM-01…12: **12 passed, 0 failed**. Evidence: `tests/evidence/RENDER_DEMO_SMOKE_EXTERNAL.json` |
| `demo-edge.mjs` EG-01 TLS | TLS 1.3; certificate `*.onrender.com` issued by Google Trust Services (WE1), verified, 33 days left that day (the platform renews it) |
| EG-03 headers | HSTS one year, `nosniff`, no framing, a correlation id on every answer |
| EG-04 CORS | the demo site's origin named exactly, no credentials, `Vary: Origin`; another origin not named |
| EG-05 authentication | no token, a made-up token, a wrong signature, an expired-looking token, another scheme: 401 each, with a reason, naming nothing of the server |
| EG-06 failure handling | a body that is not JSON 400, an unknown path 404, a wrong method 405: JSON with a reason and a correlation id |
| EG-02 plain http redirected | **not run**: this workstation has no route for plain http. HSTS is present (EG-03) |
| The staging demo site's own headers | no Content-Security-Policy header (HSTS and `nosniff` only), so the page's `<meta>` policy governs and a connected build needs no header change |

Evidence: `tests/evidence/RENDER_DEMO_EDGE.json`. Run with `NODE_USE_ENV_PROXY=1` where the way out is a proxy.

**Two independent browsers on the hosted API** (14:43 UTC; `scripts/staging/connected-browsers.mjs --local-build`): two Chromium
processes with separate empty profiles, a desktop and a phone size. ST-01…08: **8 passed, 0 failed.** One opens a sandbox and does
three steps; the other, given nothing but the resume code, reads the same organization, thread and field record, does the next
step, and the first shows it when read again; a code with a wrong key opens nothing; at phone size nothing scrolls sideways and the
sandbox survives navigating away and back; neither browser asked anything but the site and the API; the API named the site's origin
on every cross-origin answer. Evidence: `tests/evidence/RENDER_DEMO_BROWSERS.json`.

Two limits, stated: the site is **not yet switched over**, so the demo was built here with the API's address and served to both
browsers under the site's address (its origin, its policy and the API's cross-origin rules are the real ones; the deployed files are
not). And both browsers are Chromium: the one engine installed here. The same script without `--local-build` runs against the
deployed site once it is switched.

**A real sleep and wake** (15:04–15:11 UTC). After fifteen idle minutes the platform stopped the instance (its log: `shutting down`,
15:04:31). At 15:11 a browser opened the page: the platform started the instance, the role step re-passworded the two roles, the
API was listening at 15:11:15, and the page was ready 23.2 seconds after it was opened. While it waited the page said: "The server
has not answered yet. One that has been idle can take about a minute to start. Still asking; there is nothing you need to do."
Then ST-01…08 passed as before. Evidence: `tests/evidence/RENDER_DEMO_BROWSERS_COLD_START.json`. This is the start that failed before
`14d1f45`. Looking at the page during that wait also showed a fault: the connection card read "No server in this build" until the
server answered. Fixed, and CN-11 now checks the card names the server while it waits.

**The site switched over** (17:58 UTC). After the full regression of `e3c8e9f`, that commit was pushed to
`phase3/legendary-experience` and `DEMO_API_URL` was set on `empathia-demo-next`. At 18:01 the deployed files were checked with
`connected-browsers.mjs` **without** `--local-build`: ST-00…08, 9 passed, 0 failed. The site's manifest names `e3c8e9f`; its policy
lets the page call exactly the API; two independent browsers shared a sandbox; the API had slept and woke in 17 seconds with the
page saying what it was waiting for. Evidence: `tests/evidence/RENDER_DEMO_BROWSERS_DEPLOYED.json`.

**Not verified, and why:**

- **The rest of the demo site.** Only `#/connected` uses the API. Every other page keeps its records in the browser.
- **A second browser engine.** Two independent Chromium browsers share one sandbox through the hosted API (above). Safari or Firefox
  has not been tried: neither is installed here.

**Later the same day.** `d60c49c` (this file and the check's own file; no product code) went live at 14:21 UTC: the fifth start,
roles re-passworded, listening.

**The database expires** 30 days after 17 Nov 2026 (free plan). Recreating it is a sync of the Blueprint.
