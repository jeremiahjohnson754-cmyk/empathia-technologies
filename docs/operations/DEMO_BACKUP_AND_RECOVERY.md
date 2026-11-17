# Backup, export and recovery for the demonstration database

Founder, 17 Nov 2026: "I would also require automated database backup/export and recovery planning, because free-tier database
retention and availability are not suitable guarantees for valuable customer records."

The staged database holds demonstration sandboxes: synthetic organizations, people and rooms, and nothing else. This plan is written
for what real records would need, and says plainly where today's deployment falls short of it.

## Where it stands (17 Nov 2026)

| | State |
|---|---|
| The staged database | Render paid plan `0.1c-256mb` since 17 Nov 2026, 18:27 UTC (in place; the sandboxes already in it were kept). Before that: the free plan, with no backup and a 30-day life |
| A logical export made by us (`pg_dump`) | **Not possible with the service's own database user**, on any plan (below). Rehearsed: R-08 |
| Restoring an export and proving what came back | **Done on a real export from the platform, in an isolated database** (17 Nov, below): 12 checks passed, with two findings that changed the procedure. Also rehearsed on every test run (R-09, R-10) |
| Continuous backup with point-in-time recovery | **On**, by the platform, since the database went onto the paid plan. Not exercised: no recovery has been triggered. Its window is 3 days on a Hobby workspace, 7 on Pro; which this workspace is has not been read |
| A scheduled export and a scheduled restore drill | **Not built.** They need a platform API key that only the founder can create. One export has been made, by the founder, by hand (17 Nov 19:27 UTC) |
| Point-in-time recovery, exercised | **Not done.** It creates a second, billed database instance, so it waits for the founder's word |

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

## The controlled drill: what has been measured, and what has not

Founder, 17 Nov 2026: "There's still an important difference between backup capability existing and recovery being proven…
Perform a controlled recovery drill and document recovery time, data loss, and restore integrity."

### Measured, in the rehearsal (this workstation, a local PostgreSQL 16 cluster; **not the platform**)

Every test run, R-09, on a database with seven sandboxes (2,443 rows in 78 tables, 7 audit chains), with the export made the way the
platform makes it (a directory-format dump in a `.dir.tar.gz`). Figures from the run of 17 Nov, in
`tests/evidence/RENDER_DEMO_REHEARSAL.json` under `recovery`:

| | |
|---|---|
| Restore integrity | RV-01…04 pass against the source's manifest: every migration with its content hash, the same rows in every table, row-level security forced on the same tables, every audit row's hash recomputed and every chain head equal. The API then serves the copy and a sandbox opened before the export reads the same thread |
| Data loss | **everything recorded after the export was made.** Shown, not assumed: a mounting recorded after the export is version 2 on the source and version 1 in the copy |
| Recovery time | export 0.2 s (139 KiB); restore 0.6 s; verification 1.6 s; the service answering on the copy 0.6 s: about 3 s after the export is in hand. These are for a database this small on a local disk. **They are not the platform's figures** |

### Done on 17 Nov 2026: the drill on a real export from the platform

The founder created a logical export on the database's Recovery page at 19:27 UTC and attached it. It was restored and verified
here with `scripts/ops/platform-export-drill.mjs`, in a PostgreSQL cluster made for the drill on this workstation and removed
after it. **The staging database was not connected to** (it accepts no connection from outside its private network); the hosted API
was read over HTTPS for comparison, and one marker was written through it into the drill's own sandbox. Nothing was created on the
platform. Evidence: `tests/evidence/RECOVERY_DRILL_PLATFORM_EXPORT.json`.

| | Result |
|---|---|
| D-01 the archive | sound: 258,591 bytes (SHA-256 `38c5d07f…`), 85 members, all plain files in relative paths; a directory-format dump of `empathia_demo`, 938 entries, from PostgreSQL 16.15; requested 19:27, written 19:28:14 UTC |
| D-02 what it holds | 6,361 rows in 81 tables (48 of them empty), counted in the archive's own data files |
| D-03 restore | into an empty database, as an owner who is **not** a superuser, with `--exit-on-error`: 1.0 s. Every table and function is that owner's |
| D-04 row integrity | the database holds exactly the 81 tables of the archive, and every table exactly the archive's rows: 6,361 of 6,361 |
| D-05 migration hashes | 35 recorded, 35 in the checkout, each with the same SHA-256 (the hosted API also reports 35) |
| D-06 audit chains | 430 sealed rows in 18 tenants' chains; every hash recomputed from its content and its predecessor: 0 differ, 0 broken links, 0 gaps |
| D-07 row-level security | forced on 68 tables, 80 policies, as the migrations make it |
| D-08 privileges | **the export carries none** (finding F-1). The service started on the copy as restored answers `503 unhealthy` and refuses a request with `503 unavailable`; the repair command run as the runtime role is refused and changes nothing; run as the owner it makes 210 statements; afterwards 0 of 192 privilege lines differ from a freshly migrated reference database |
| D-09 isolation in effect | as the service's runtime role: 0 rows with no tenant; exactly its own 31 audit rows as one sandbox, none of another's; another sandbox asked for by name: 0 rows; an update aimed at another sandbox's room: 0 rows changed. The runtime roles have no elevated attribute |
| D-10 the service on the copy | started with the Blueprint's own start command; `/health` ok, database reachable, 35 migrations, nothing new applied |
| D-11 data-loss boundary | the drill's sandbox opens on the copy with its own key. Recorded at 19:02:41 UTC, before the export: **in the copy**. Recorded at 19:34:45 UTC, after it: **not in the copy** (staging holds it) |
| D-12 staging as it was | the hosted API answers on the same release (`688cf9f`) and still holds the later record |

**Recovery time, measured:** from the archive in hand to the service answering on the verified copy, **8.2 seconds**: validation 0.1,
restore 1.0, privileges 1.8, verification 4.7, the service 0.6 (the run of 20:2x UTC, after the fail-safe start was built; the first
run, with the earlier remedy, took 8.6). This is a 6,361-row database on a local disk. It is not the
platform's time, and it leaves out what a real recovery adds: creating a database instance, pointing the service at it and
redeploying. Those have not been measured.

**Data loss, measured:** everything recorded after the export was made is absent from the copy. The export's moment lies between
19:27 and 19:28:14 UTC; the proof is two records 32 minutes apart, one on each side of it. With exports made by hand, the loss in a
real incident would be everything since the last time someone made one.

#### Finding F-1: the platform's export carries no privileges

The archive has no privilege entry at all (0 of 938). Restored as it is, a copy has every table closed to the service's runtime
roles and every function open to every role: 168 of the 192 privilege lines of a migrated database are not what the copy has, 21
security-definer functions can be run by any role (5 in a migrated database), and a service started on it answers **degraded**:
`permission denied for schema app`. The migrations do not put the privileges back, because they are all recorded as applied.

The rehearsal had not caught this: its stand-in export was made by `pg_dump` with privileges in it. It now makes the stand-in the
way the platform does (`--no-privileges`) and checks the remedy on every test run (RV-05 inside R-09).

The remedy (founder, 17 Nov, 14:06: "The service should verify required privileges on startup. If privileges are missing, it
should report an unhealthy state and refuse sensitive operations. Repair should happen through a separate, tightly permissioned
migration or recovery process—not by giving the normal application account unrestricted authority to grant its own privileges."):

- **The service checks.** At start, and again while it runs, it compares the database's privileges with the list the migrations
  produce (`database/migrations/PRIVILEGES.json`). Too few and too many are both a mismatch. On a mismatch `/health` answers 503
  `unhealthy`, every other request is refused with 503, and the worker does not run.
- **The service does not repair.** `privileges.js repair` is a separate command that runs only as the owner of the schema; run as
  either runtime role it is refused by name and changes nothing. It is one transaction, rolled back unless the result is exactly
  the list.
- **The result is checked independently.** `restore-verify.mjs privileges()` lists every privilege in the copy and in a freshly
  migrated reference database; the two must be equal. **A restore of a logical export is not finished until that passes.**

`docs/operations/DATABASE_PRIVILEGES.md` is the procedure. Point-in-time recovery is a physical copy and should keep privileges;
that is expected, not verified. The fail-safe start is committed and rehearsed; **it is not deployed to staging until the full
regression of its commit has passed.**

#### Finding F-2: the export includes the platform's own extension

`pg_stat_statements` is in the export; Render adds it, no migration creates it, and an owner who is not a superuser cannot. A plain
`pg_restore --exit-on-error` stops on it. `restore()` now leaves out, by name, any extension that no migration creates, through
`pg_restore`'s own list, and says which. `btree_gist`, which a migration does create, is restored.

#### Also seen, not judged here

In a freshly migrated database five security-definer functions keep the default permission that lets every role run them:
`app.auth_memberships`, `app.auth_person`, `app.auth_person_by_email` and two trigger functions. Only roles that may use the schema
can reach them, and those are the service's own two; it is noted for the security review, not as an exposure.

### Not yet done: point-in-time recovery on the platform

Triggering a recovery needs the platform's dashboard or an API key, which are the founder's, and it creates a billed instance.

What is in place for it:

- **A marker is already in the hosted database.** `scripts/ops/recovery-drill.mjs mark` opened a sandbox there and recorded one
  mounting at **19:02:41 UTC on 17 Nov 2026**. It lasts until 19:02 UTC on 20 Nov. Its id and key are in `.local/` on this
  workstation, not in the repository.
- `mark-after` records a second mounting after the export or recovery point; `check` says which markers a database holds.
- `restore-verify.mjs` unpacks and restores the platform's archive format.

Founder, 17 Nov 2026, 13:17: "For the restore test itself, it should use an isolated database or disposable environment, keep the
existing staging database intact, and document actual recovery time and data integrity. The subsequent point-in-time recovery drill
may create billable infrastructure, so that should remain subject to your approval." Drill A is that test: the export is restored
into a throwaway PostgreSQL on this workstation, and the staging database is only read from (by the platform's export) and written
to through its own API (one more marker in the drill's own sandbox). Drill B is not started without the founder's word.

**Drill A, a logical export (integrity, data loss, time off the platform).** The founder: in the dashboard, the database's Recovery
page, *Create export*; when it is ready, download the `.dir.tar.gz` and attach it (it holds synthetic sandboxes only). Then, here:
`mark-after`; restore the archive into an empty local database as a non-superuser owner; RV-01…03; start the API on the copy;
`check` against it. Expected: the before marker present, the after marker absent. Recorded: the export's size and the time the
platform took to make it (from its own timestamps), the restore, verification and serving times, and the loss window (the time
between the export and the after marker).

**Drill B, point-in-time recovery (the real recovery path).** The founder: *Restore Database* to a time between the two markers.
The platform creates a **new** database instance, which is billed while it exists (the same $6.00 a month plan, by the second), so
it needs the founder's word; then the service's `DATABASE_URL` is pointed at it in the dashboard and the service redeploys. Here:
`check` and the deployment check through the public address, and the times read from the platform's events: from the trigger to the
new instance being available, and to the first good answer from the service. Then the founder decides which instance is kept; the
other is deleted by the founder.

Drill A was run on 17 Nov (above). Drill B has not been run. The honest statement today: **a logical export from the platform has
been restored, verified and served in an isolated database, with a remedy for the privileges it does not carry; recovery on the
platform itself (a new instance, the service pointed at it) has not been exercised, and no export is made or kept by any schedule.**

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
  3. optionally, a copy of each export kept off the platform, encrypted;
  4. (done in the code, not yet deployed) the service verifies its privileges at start and refuses to operate when they differ;
     the repair stays a separate command for the owner (finding F-1, `DATABASE_PRIVILEGES.md`).
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
- Verified once, on 17 Nov, on a real export from the platform: D-01…12 above.
- **Not verified:** recovery on the platform itself. No point-in-time recovery has been triggered, no database instance has been
  created from a backup, and the service has never been pointed at a recovered instance. The times above are a workstation's.
- **Not verified:** the copy against the staging database row by row. The staging database cannot be read from outside its network;
  the copy was checked against the archive, against its own hashes and chains, and against what the hosted API reports.
- **Not in place:** a scheduled export, a copy kept off the platform, a scheduled drill. The fail-safe start is not on staging yet.
- **Not exercised on the platform:** the repair command. On Render it is run by an operator in the service's shell or as a one-off
  job; that has not been done there.
