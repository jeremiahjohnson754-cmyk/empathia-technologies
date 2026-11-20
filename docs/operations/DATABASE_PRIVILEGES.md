# Database privileges: verified at start, repaired only by the owner

Founder, 17 Nov 2026: "Make database startup fail safely. The service should verify required privileges on startup. If privileges
are missing, it should report an unhealthy state and refuse sensitive operations. Repair should happen through a separate, tightly
permissioned migration or recovery process—not by giving the normal application account unrestricted authority to grant its own
privileges."

## Why

Tenant isolation rests on two things in the database: row-level security, and the privileges that decide which role may touch
which table, column and function at all. The recovery drill on a real export from the platform (17 Nov 2026) found that the export
carries no privileges. A database restored from it has every table closed to the service's roles and every function open to every
role, and the migrations do not put that right, because they are all recorded as applied. A service must not operate on such a
database, in either direction: not with too few privileges (it fails request by request) and not with too many (it works, and the
boundary is not what was reviewed).

## The pieces

| | |
|---|---|
| The list | `database/migrations/PRIVILEGES.json`: every privilege on every schema, table, view, sequence, column and routine of the application's schemas (`app`, `app_meta`, `founder`), as the migrations leave them on an empty database. 373 lines at migration `0035`. Generated (`privileges.js expected --write`), never typed. The owner is written `<owner>`, so the list holds whatever the owner is called |
| Kept current | `privileges.js expected --check` fails when the list is not what the migrations produce, or is for another migration. It runs on every test run, in the rehearsal on an empty database with an owner that is not a superuser (R-13) and in `tests/security/privileges.test.mjs` (PRV-01). **After adding a migration: regenerate the list in the same commit** |
| The check | `src/db/privileges.ts`. The API reads the catalog as its ordinary runtime role (any role may read it; reading grants nothing) and compares. It checks before the first request, every five minutes while healthy, and at most every fifteen seconds while not, so a repair is noticed without a restart |
| The repair | `node services/enterprise-api/dist/src/db/privileges.js repair`, with `DATABASE_URL` the owner's. A command of its own: the API never calls it and the start command does not run it |

## What the service does on a mismatch

- `GET /health` answers **503** with `status: "unhealthy"` and `privileges: { state: "mismatch", missing, unexpected }`. Counts only:
  which privileges differ is written to the service's log, not to a public address.
- Every other route except `/v1/openapi.json` answers **503** `unavailable`. Nothing is read or written for any tenant.
- The outbox worker does no work: it asks before every tick, reports the refusal as its last error, and resumes by itself once the privileges are verified.
- If the privileges cannot be verified (the list is not in the image, the catalog cannot be read), the state is `unverified` and
  the service behaves the same way: not verified is not ok. If that is because the database cannot be reached at all, `/health`
  keeps the answer it always gave for that (`degraded`, with the reason), and requests are refused all the same.

On Render the health check is `/health`. A new deploy that finds a mismatch never receives traffic: the platform keeps the previous
instance. A running instance that becomes unhealthy is taken out of rotation. Both are the safe direction.

## The repair, and who can run it

- It connects with the owner's URL and first asks who it is. Unless it is the owner of the `app` schema it stops: `privileges are
  repaired by the owner of the schema (…) and by no one else; connected as empathia_app`. The runtime roles could not do it anyway:
  they own nothing and hold no grant option.
- It refuses a database at another migration than the list's.
- One transaction: for every object and grantee that differs, what is held is revoked and what the list names is granted. Then the
  privileges are read again. **Unless they are exactly the list, everything is rolled back.** It cannot grant anything the list
  does not name, and it cannot half-finish.
- It prints what it did (how many pairs differed, how many statements) and nothing else.

### Running it

| Where | How |
|---|---|
| Locally, or in a drill | `DATABASE_URL=<owner> node services/enterprise-api/dist/src/db/privileges.js repair` |
| On Render | In the dashboard, the API service's **Shell** (paid instance types have one): `node services/enterprise-api/dist/src/db/privileges.js repair`. The service's environment already holds the owner's URL, which its start command uses for migrations. Or the same command as a one-off job. **Not yet exercised on Render** |
| To look without changing | `privileges.js verify` (exit 1 when they differ; `--as-owner` to connect as the owner). The first ten differences are printed |

Who that is: whoever can open the service's shell on the platform, which is the founder's account. No credential is added for it,
and the application's own database users gain nothing.

## The recovery procedure after a restore from a logical export

1. Restore into an empty database as the owner (`scripts/ops/restore-verify.mjs restore`; it leaves out the platform's own extension).
2. Verify what came back: migrations and their hashes, rows, audit chains, forced row-level security (RV-01…04).
3. Start the service. It answers `unhealthy` and refuses. That is expected, and it is the signal that step 4 is needed.
4. Run the repair as the owner.
5. The service becomes healthy by itself within fifteen seconds. Confirm `/health` and run the deployment check.
6. In a drill, also compare the copy's privileges with a freshly migrated reference database (`restore-verify.mjs privileges()`).

## Verified, and not

- `tests/security/privileges.test.mjs` PRV-01…07: healthy on a migrated database; one privilege missing → 503 everywhere but health
  and the API description, with no object name in the public answer; the runtime roles refused by name and unable to grant by hand;
  the owner's repair exact, noticed by the running service, and a no-op the second time; a privilege too many (a restricted function
  opened to every role, a table opened to the worker) as unhealthy as one too few; every privilege reset at once and repaired
  (more than 150 statements); a database at another migration refused; a repair that cannot make the list true rolled back whole.
- The rehearsal R-09, every test run: an export without privileges → restored → the service unhealthy and refusing → the runtime
  role refused → the owner's repair → equal to the source → the same running service healthy again (about 15 s) → a sandbox opened
  before the export reads the same thread. R-13: the list is current.
- The drill on the platform's real export (17 Nov): the same sequence on the real copy; 210 statements; afterwards equal, line for
  line, to a freshly migrated reference database built separately.
- **Not verified:** any of this on Render. The fail-safe start is not deployed to staging until the full regression of its commit
  has passed, and the repair command has never been run in the platform's shell.
- **Not assessed:** whether each privilege in the list is the right one. The list is what the migrations make; the check keeps the
  database equal to it. Reviewing the list itself (for instance the 32 routines every role may run, most of them trigger functions,
  three of them sign-in lookups) is security-review work, noted for it.
