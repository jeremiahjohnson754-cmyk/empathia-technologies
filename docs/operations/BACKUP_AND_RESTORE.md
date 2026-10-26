# Backup and restore

Two things hold Empathia's state: the PostgreSQL database (every record, including evidence metadata and hashes) and the object store
(the evidence bytes, content-addressed by SHA-256). A backup is only complete with both, taken in that order: database first, then
objects — an object without a row is harmless; a row without its object is a lost piece of evidence.

## Drill — RUN, PASS (2026-10-26T13:10:43Z, PostgreSQL 16.15)

`node scripts/ops/backup-restore-drill.mjs` → `docs/operations/BACKUP_RESTORE_DRILL.json`

| Step / check | Result |
|---|---|
| Create `empathia_ops_g`, migrate and seed through the real code (3 rooms, 20 people), upload 3 evidence files through `POST /v1/evidence`, drain the outbox | done |
| `pg_dump -Fc` | 166,715 bytes in 160 ms |
| `pg_restore` into `empathia_ops_g_restore` | 1,596 ms |
| Row count of every table in `app` and `app_meta` (33 tables, 815 rows) | **PASS** — 0 mismatches |
| Evidence rows identical (id, sha256, bytes) — 3 rows | **PASS** |
| RLS flags identical: 27 tables ENABLED + FORCED; `tenant`, `person`, `membership` ENABLED only (by design) | **PASS** |
| User triggers identical (11, incl. every append-only trigger) | **PASS** |
| Runtime role sees 0 rooms without a tenant in the restored database | **PASS** |
| `DELETE FROM app.evidence_object` refused in the restored database (EM001) | **PASS** |
| Migration ledger identical (7 versions with sha256) | **PASS** |
| Object store copied; every object re-hashes to its name; every restored evidence row finds a valid object (3/3) | **PASS** |
| Both databases dropped, scratch files removed | done |

Scope of the proof: a logical dump and restore on the same PostgreSQL 16 cluster with the same roles, plus a file copy of the object
store, on synthetic data. **Not proven:** point-in-time recovery, restore onto a different server or major version, restore of a large
database within a time budget, off-site or encrypted backups, automated schedules. Those are NOT_RUN.

## Procedure — database

```bash
# backup (as the superuser or a role with pg_read_all_data; the custom format keeps ownership, grants, RLS policies and triggers)
pg_dump -h <host> -p <port> -U <admin> -Fc -f empathia-$(date -u +%Y%m%dT%H%M%SZ).dump empathia
sha256sum empathia-*.dump > empathia-dump.sha256

# restore into an empty database whose roles empathia_owner and empathia_app already exist (database/docker/init-roles.sh)
createdb -O empathia_owner empathia_restore
pg_restore -h <host> -p <port> -U <admin> -d empathia_restore --exit-on-error empathia-<stamp>.dump
```

After a restore, run the drill's checks against the restored database (row counts, RLS flags, triggers, migration ledger) before
pointing the API at it. Never restore over the live database; restore beside it and switch the connection string.

## Procedure — object store

`LocalObjectStore` keeps each object at `sha256/<first two hex>/<sha256>` with mode 0600 (`services/enterprise-api/src/storage/objectStore.ts:22-30`).
Objects are written once and never modified, so an incremental copy is safe:

```bash
rsync -a --ignore-existing .local/objects/ <backup-target>/objects/     # after the database dump
# verify: every file's sha256 equals its file name
find <backup-target>/objects -type f -exec sh -c 'test "$(sha256sum "$1" | cut -c1-64)" = "$(basename "$1")" || echo BAD "$1"' _ {} \;
```

The copy-and-re-hash part was exercised by the drill (Node `fs.cpSync` + SHA-256 per object); the `rsync` command itself and any off-site
target are NOT_RUN. In production the object store is S3-compatible (not implemented — `S3ObjectStore` is CONTRACT_ONLY): enable
bucket versioning and object lock (compliance mode, retention ≥ the 7-year evidence retention written to `retention_until`), and
replicate to a second region.

## Schedule (targets to be set by the owner)

| Item | Proposed starting point |
|---|---|
| Database | managed PITR (continuous WAL) + daily logical dump kept 35 days + monthly kept 7 years |
| Objects | versioned bucket with object lock + cross-region replication |
| Restore drill | quarterly, using `scripts/ops/backup-restore-drill.mjs` adapted to the target environment; results filed beside the JSON |
| Encryption | at rest by the provider; dumps encrypted before leaving the provider |
