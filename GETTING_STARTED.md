# Getting started

Run the Empathia production starter on a development computer, sign in as different roles, and walk the vertical slice.
Everything runs locally on `127.0.0.1` with synthetic data.

## 1. Prerequisites

| Tool | Version used to build and test | Notes |
|---|---|---|
| Node.js | 22.x | required |
| PostgreSQL | 16 (server binaries: `initdb`, `pg_ctl`, `psql`, `pg_dump`) | `scripts/db.mjs` creates a private cluster under `.local/pg` |
| Python | 3.11+ (built with 3.13) | only for `ml/` and `services/intelligence-python`; packages in `services/intelligence-python/requirements.txt` |
| pnpm | 10.x | on a connected machine, instead of the offline bootstrap |
| Chromium via Playwright 1.56 | | only for the browser tests |
| ffmpeg | | only for the film decode test |

`scripts/db.mjs` looks for PostgreSQL in `/usr/lib/postgresql/16/bin` and on `PATH`.

## 2. Install and build

```bash
pnpm install                    # connected machine
# or, offline with a prepared node_modules folder:
node scripts/bootstrap.mjs --offline-deps=/path/to/node_modules

node scripts/build.mjs          # → .local/logs/BUILD_SUMMARY.json
```

## 3. Run

```bash
node scripts/dev.mjs            # first run: creates the cluster, migrates, seeds; then starts everything
```

| What | Where |
|---|---|
| Web app | http://127.0.0.1:4200/ |
| API health | http://127.0.0.1:4100/health |
| OpenAPI | http://127.0.0.1:4100/v1/openapi.json (also `docs/api/openapi.json`) |
| Python research service | http://127.0.0.1:4300/health |

`node scripts/dev.mjs --reset` re-seeds from scratch. `node scripts/db.mjs down` stops PostgreSQL.

## 4. Sign in

Choose a role on the sign-in page. Every seeded person uses the development password defined as `DEV_PASSWORD` in
`services/enterprise-api/src/db/seed.ts`. The development identity provider is refused when `NODE_ENV=production`.

## 5. Walk the vertical slice

1. **Designer** — Rooms → *New room* (pick a template) → Devices → *Add*. The room, its devices and its revision are rows in PostgreSQL.
2. **Systems engineer** — open the room → Drawings → *Generate drawings*, *Approve* each → Overview → *Approve* the room type → *Move to design approved*.
3. **Operations lead** → *Move to installation pending*; **Installer** → *Move to installed, unverified*; **Systems engineer** →
   *Move to commissioning*.
4. **Commissioning engineer** — Commissioning → *Record* a test with an evidence file (PASS becomes “awaiting verification”;
   FAIL opens a deficiency).
5. **Operations lead** assigns the deficiency; **Service manager** raises and closes a work order — the test stays failed.
6. **Commissioning engineer** records the retest; **QA reviewer** verifies it — the deficiency resolves.
7. Service & read model: the operational read model rebuilt by the outbox worker; live health is *Not monitored*.
8. Reports: KPIs with their definitions. Administration (security administrator): integrations, outbox, people, audit.

Try something your role may not do — the server refuses it and the refusal is audited (a steward or security administrator can see it).

## 6. Test

```bash
node scripts/test.mjs                    # unit + integration + security
node scripts/test.mjs --browser          # + enterprise web E2E
node scripts/verify-all.mjs              # everything, with a report in tests/evidence/
```

## 7. Containers (alternative)

`cp .env.example .env`, set the secrets, then `docker compose up --build`. The compose file has been validated with
`docker compose config`; it has **not** been run in the build environment (no container runtime there).

## Where next

* Founder Studio: `apps/founder-studio/README.md` (if present) or `node apps/founder-studio/build.mjs` and its launcher.
* Engineering handoff: `docs/engineering-handoff/CTO_HANDOFF.md`.
* All documents: `docs/README.md`.
