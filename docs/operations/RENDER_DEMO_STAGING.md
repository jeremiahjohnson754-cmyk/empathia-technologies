# The connected demonstration on staging (Render)

Founder, 17 Nov 2026: "establish a repeatable staging deployment with the required API and database, validate cross-browser persistence,
and test both correct permissions and attempted unauthorized access."

What this is: the demonstration API (ADR-0013) and a database of its own on Render, and the staging demo site built with that API's
address so that `#/connected` exists there. Free plans; no charge. Production is not touched.

## The parts

| Resource | What | Plan |
|---|---|---|
| `empathia-demo-db` | PostgreSQL 16, private network only. Holds sandboxes and nothing else | free |
| `empathia-demo-api` | the enterprise API with `AUTH_MODE=demo`, built from `deploy/render/Dockerfile` | free |
| `empathia-demo-next` (exists) | the static demo; connected by `DEMO_API_URL` | free static site |

Declared in **`deploy/render/demo.render.yaml`**. No secret is in the file: Render generates the session secret and the two runtime-role
passwords, and gives the owner URL from the database it creates.

## Why it is repeatable

- **One file, one start command.** The service's start command is the whole preparation, in order, on every start: the runtime roles
  (gate V-1: it refuses, and the API does not start, if the database's owner cannot create roles), the migrations, sandboxes enabled
  with the role catalogue, then the API. There is no seed, no bootstrap and no step done by hand.
- **The database is disposable.** A new one needs nothing but a new sync of the file. That matters: a free database expires 30 days
  after it is created, and the API never deletes a sandbox.
- **Rehearsed from the file.** `node deploy/render/rehearse-demo.mjs --assemble` reads the start command and the environment out of
  the Blueprint and runs them from the assembled runtime tree (what the image contains) in production mode against an empty local
  database: R-01…R-06, part of `node scripts/test.mjs`. Evidence: `tests/evidence/RENDER_DEMO_REHEARSAL.json`.
- **Checked statically.** `scripts/staging/validate-blueprints.py` P3-1…13: free plans only, demonstration mode only, private
  database, generated secrets, the start command's order, one allowed browser origin, a buildable image context.
- **Checked when deployed.** `node scripts/staging/demo-smoke.mjs <api-url> --origin=<demo-site>`: SM-01…12 over HTTP only.

## The branch

The API deploys from **`staging/demo-api`**, not from `phase3/legendary-experience`. The two static sites deploy on every push to
`phase3/legendary-experience`, and that branch moves only to a commit that passed the full regression. A deployment fix (this
directory, `.dockerignore`) must not redeploy the sites from an unregressed commit, so the API has its own branch. Rule for moving it:
`git diff <regressed commit> <new commit> -- services packages database apps integrations` is empty, and the unit, integration and
security tests pass on the new commit.

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

The rehearsal adds: a restart changes nothing and a sandbox opened before it still opens with its key (a free instance sleeps and
wakes); the database holds no tenant that is not a sandbox and nobody who could sign in any other way; the runtime role cannot read
the sandbox table, change the setting or create a tenant; V-1.

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
3. When `/health` answers, run the deployment check against the API's URL with `--origin=https://empathia-demo-next.onrender.com`.
4. Set `DEMO_API_URL` on `empathia-demo-next` to the API's URL and let it redeploy the same commit. If that site sends a
   Content-Security-Policy header of its own, its `connect-src` must name the API's origin too (the page's `<meta>` policy already does).
5. Open `https://empathia-demo-next.onrender.com/#/connected` in two different browsers: open a sandbox in one, copy the resume code,
   resume in the other.

## State

See the dated entry at the end of this file for what has actually been created and checked.
