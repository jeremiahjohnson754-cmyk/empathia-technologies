# Backup, export and recovery for the demonstration database

Founder, 17 Nov 2026: "I would also require automated database backup/export and recovery planning, because free-tier database
retention and availability are not suitable guarantees for valuable customer records."

The staged database holds demonstration sandboxes: synthetic organizations, people and rooms, and nothing else. This plan is written
for what real records would need, and says plainly where today's deployment falls short of it.

## Where it stands (17 Nov 2026)

| | State |
|---|---|
| The staged database | Render free plan. **No backup of any kind, and it expires 30 days after 17 Nov 2026.** Acceptable only because every row is synthetic and the database is rebuilt empty by a sync of the Blueprint |
| A logical export made by us (`pg_dump`) | **Not possible with the service's own database user**, on any plan (below). Rehearsed: R-08 |
| Restoring an export and proving what came back | **Built and rehearsed**: `scripts/ops/restore-verify.mjs`, rehearsal R-09 and R-10 |
| Continuous backup with point-in-time recovery | Comes with a paid database. **Not switched on**: the paid plan is approved in principle (founder, 17 Nov) and waits for the item and total to be confirmed |
| A scheduled export and a scheduled restore drill | **Not built.** Both need the paid database and a platform API key that only the founder can create |

## What the platform provides

Read from <https://render.com/docs/postgresql-backups> and <https://render.com/docs/free> on 17 Nov 2026.

| | Free database | Paid database |
|---|---|---|
| Point-in-time recovery | none | continuous. The past **3 days** on a Hobby workspace, the past **7 days** on Pro or higher |
| How a recovery works | n/a | a **new** database instance is created at the chosen time; the original is left as it is. A time within the last ten minutes cannot be chosen |
| Logical exports | none | on demand, kept by the platform for **7 days**, downloaded as a `.dir.tar.gz` (pg_dump directory format) |
| Lifetime | expires 30 days after creation, then 14 days in which it can still be upgraded, then deleted | until deleted |
| By API | n/a | `POST /postgres/{postgresId}/export` (create), `GET /postgres/{postgresId}/export` (list), `POST` and `GET /postgres/{postgresId}/recovery` (present in the platform's public API description that day) |

Which window applies depends on the workspace's plan. It has not been read from the dashboard; the tables below assume Hobby,
the smaller of the two.

## A finding: the service's own user cannot export this database

Render's page says a free database can be exported with `pg_dump` from one's own machine. For this schema that does not work, on any
plan. Tenant isolation is enforced in the database: row-level security is **forced on the owner** as well as on the runtime roles,
so the owner reads no row without a tenant. `pg_dump` refuses rather than write an export with rows missing:

    pg_dump: error: query failed: ERROR:  query would be affected by row-level security policy for table "ai_request"

That is the isolation working, and it is not to be weakened for convenience (taking the force off during an export would open every
tenant's rows to the owner while it ran). The consequence is that an export has to be made by the platform, with the platform's
privileges: its export feature or point-in-time recovery, both of which need a paid database. **On the free plan there is no export
path at all.** The rehearsal checks this every run (R-08), so it is known before an incident and not discovered during one.

## The drill: restore and verify

An export that has never been restored is a hope. `scripts/ops/restore-verify.mjs` restores one into an **empty** database and
checks what came back:

| | |
|---|---|
| restore | `pg_restore --no-owner --exit-on-error`, run **as the owner the service uses**, so every table and every security-definer function is the owner's again. Privileges are restored with it, so the runtime roles must exist first (`bootstrap.js --roles`). It refuses a database that already has the schema |
| RV-01 | every migration of the checkout is recorded with the content hash it has in the checkout, and nothing else |
| RV-02 | the Evidence Ledger: every sealed audit row's hash is recomputed from its content and its predecessor; no broken link and no gap in any tenant's chain |
| RV-03 | tenant isolation came back with the data: row-level security forced on the same tables, with the same policies |
| RV-04 | against a manifest taken from the source: the same number of rows in every table and the same head of every tenant's chain |

The rehearsal (`node deploy/render/rehearse-demo.mjs`, part of `node scripts/test.mjs`) runs it end to end on a database with
sandboxes in it:

- **R-09**: an export made with the cluster superuser (standing in for the platform's export) is restored as the owner into an empty
  database. RV-01…04 pass against the source's manifest (2,443 rows in 78 tables and 7 audit chains on 17 Nov). Then **the API is
  started on the restored copy, and a sandbox opened before the export opens with its key and reads the same thread.**
- **R-10**: the check is not a formality. One audit row changed and one row removed in the restored copy are both reported: RV-02
  names one hash that differs, RV-04 names the table and its counts.

Verification has to read across tenants, so it needs a role that bypasses row-level security. The service's users cannot (above).
The drill therefore restores into a scratch PostgreSQL where a superuser exists, as the rehearsal does. The manifest is taken the
same way, or kept from the last verified drill; a chain head kept outside the database is also what makes a rewritten chain
detectable (ADR-0010).

## Recovery, by what was lost

| What happened | With the free database (today) | With a paid database |
|---|---|---|
| A table dropped, rows deleted or damaged | **Nothing to recover from.** Sync the Blueprint for an empty database; every sandbox is gone | Point-in-time recovery to just before it: a new instance. Check it (below), then point the service's `DATABASE_URL` at it and redeploy |
| The database instance is lost or expires | The same: an empty database | Point-in-time recovery if the platform still holds it; otherwise the newest export, restored with the drill's steps |
| The platform account or region is lost | Nothing | Only an export **copied off the platform** survives this. None is, until the scheduled export exists |
| The service will not start | The database is untouched; redeploy the last good commit (`staging/demo-api`) | the same |

Checking a recovered database before the service is pointed at it: `/health` on a service started against it reports the migrations
applied; a known sandbox (or, for real tenants, a known room) reads the same thread; the audit verification reports the same chain
head that was recorded outside the database.

## What can honestly be promised

| | Free (today) | Paid, Hobby workspace | What real customer records would need |
|---|---|---|---|
| Data that can be lost (RPO) | **all of it, at any time**; all of it for certain at day 30 | minutes, within the last 3 days (not the last ten minutes) | the same or better, with a 7-day window (Pro workspace) and a daily export kept off the platform for as long as the contract says |
| Time to be serving again (RTO) | minutes, **with an empty database** | **not measured.** It is the time to create the recovered instance, check it and redeploy; it will be measured in a drill on the paid instance, not estimated | measured in a drill, repeated on a schedule |
| Proof that a backup restores | the rehearsal, on a local copy | the same, plus a drill against a real export | a scheduled drill whose result is recorded each time |

## Automation: what is automatic, what is to be built, what it needs

- **Automatic the day the database is on a paid plan:** continuous backup with point-in-time recovery. Nothing to run.
- **To build, once that is so:**
  1. a daily job that asks the platform for an export (`POST /postgres/{id}/export`);
  2. a weekly job that downloads the newest export, restores it into a scratch PostgreSQL and runs RV-01…04, and fails loudly if
     any does not pass;
  3. optionally, a copy of each export kept off the platform, encrypted.
- **What that needs, and why it is not built yet:** a platform API key, held as a secret by whatever runs the schedule. Only the
  founder can create one, and it is never to be in the repository or in a chat. And a decision on where the schedule runs and where
  copies are kept.

## Decisions that are the founder's

1. **The paid database** (and service). Approved in principle on 17 Nov ("I'm okay with the $13 a month plan too"). Render's list
   prices that day: web service `0.5c-512mb` $7 a month; PostgreSQL `0.1c-256mb` $6 a month plus storage at $0.30 per GB a month,
   charged by the second. The switch is made only after the item and total have been confirmed.
2. **Where the scheduled export and drill run.** A cron job on the platform (inside the private network; a small monthly charge) or
   a scheduled workflow in the code host (no charge; the export is then processed on the code host's machines, which is a question
   of policy for real records and of none for synthetic ones).
3. **Where copies are kept off the platform, and for how long.** An object store means an account and a small charge.
4. **The workspace plan**, if seven days of point-in-time recovery are wanted instead of three.

## Verified, and not

- Verified locally, every run of the test suite: R-08 (the owner's `pg_dump` is refused), R-09 (export, restore as the owner, RV-01…04
  against the source, the API serving the restored copy), R-10 (damage is reported).
- **Not verified:** anything on the platform. No export has been created there and no recovery triggered: the staged database is on
  the free plan, where neither exists. The first drill against a real export is the first task after the paid plan is on.
