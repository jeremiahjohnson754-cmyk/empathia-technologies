# Local development

Everything below has been run on the build machine (Linux, Node 22, PostgreSQL 16, Python 3.13). Synthetic data only.

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 22.x | `engines.node >= 22` in `package.json` |
| pnpm | 10.x (`packageManager`) | on a connected machine: `pnpm install`. Offline: `node scripts/bootstrap.mjs` links pre-installed packages |
| PostgreSQL | 16 (binaries on PATH or under `/usr/lib/postgresql/16/bin`) | `scripts/db.mjs` runs a private cluster; no system database is touched |
| Python | 3.13 with `services/intelligence-python/requirements.txt` | only for the intelligence service and `ml/` |
| ffmpeg, Chromium (Playwright) | optional | film decode test and browser tests |

## Ports

| Port | Process | Started by |
|---|---|---|
| 55432 | PostgreSQL (127.0.0.1 only, SCRAM-SHA-256) | `node scripts/db.mjs up` (`EMPATHIA_PG_PORT` overrides) |
| 4100 | Enterprise API + in-process outbox worker | `node scripts/dev.mjs` (or `npm run api`) |
| 4200 | Enterprise web app (static server with CSP) | `node scripts/dev.mjs` |
| 4300 | Python intelligence service (research prototype) | `node scripts/dev.mjs` (`--no-python` to skip) |
| 4310 | Founder Studio launcher | `node apps/founder-studio/dist/server/serve.mjs` |

Tests use their own ports (4194–4199, 4291, 4399) and their own databases, so they can run while the development stack is up.

## First run

```bash
node scripts/bootstrap.mjs        # offline; or: pnpm install
node scripts/build.mjs            # → .local/logs/BUILD_SUMMARY.json
node scripts/dev.mjs              # db up → migrate + seed → API, web, Python service
# open http://127.0.0.1:4200/ and sign in as any seeded role
```

`scripts/db.mjs` writes generated credentials to `.local/pg/credentials.json` and connection strings to `.local/pg/env` (mode 0600);
the API reads `.local/pg/env` when the variables are not set (`services/enterprise-api/src/config.ts`). The JWT secret is generated into
`.local/jwt-secret`, the Python service token into `.local/intelligence-token`. `.local/` is git-ignored.

## Database commands

| Command | Effect |
|---|---|
| `node scripts/db.mjs up` | create (first time) and start the local cluster |
| `node scripts/db.mjs status` | JSON state |
| `node scripts/db.mjs down` | stop the cluster (data kept) |
| `node scripts/db.mjs reset` | stop, delete and recreate the cluster — **destroys local development data only** |
| `node services/enterprise-api/dist/src/db/migrate.js` | apply pending migrations (refuses an edited, already-applied migration: sha256 guard) |
| `node services/enterprise-api/dist/src/db/seed.js` | idempotent synthetic seed (two tenants, sites, 20 people, three rooms, catalogue) |
| `node scripts/dev.mjs --reset` | reset the cluster, then seed and start everything |

## Everyday loop

* Edit TypeScript, then `node scripts/build.mjs` (or `npx tsc -b <package>` for one package).
* API contract changed? `node scripts/api/export-openapi.mjs` regenerates `docs/api/openapi.json` and the typed client; the build fails
  until you do (`--check`).
* New migration: add `database/migrations/000N_name.sql`; never edit an applied one (the migrator refuses), never weaken a trigger.
* Tests: `node scripts/test.mjs` (see `docs/qa/TEST_STRATEGY.md`). Full local verification: `node scripts/verify-all.mjs`.
* Backup drill: `node scripts/ops/backup-restore-drill.mjs`.
