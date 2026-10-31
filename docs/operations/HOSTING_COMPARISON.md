# Hosting: Netlify vs Render for Empathia (2026-10-31)

Recommendation: **Render** for the whole platform (API + Postgres + worker + the three static apps). Nothing was provisioned on
either platform; both accounts were only read. The owner's authorization is still required before any service is created.

## What the platform needs (from the code, not a wish list)
| Need | Where it comes from |
|---|---|
| A **persistent Node 22 process** | `services/enterprise-api`: in-memory per-caller rate buckets, long transactions, the **outbox worker runs in-process** on a 500 ms poll (`WORKER=off` moves it to a separate process), graceful shutdown that flushes telemetry |
| **PostgreSQL 16 with three roles** (owner / app / worker) and RLS | `database/migrations/0001–0018`, `scripts/db.mjs`; the worker role is the only one admitted by the cross-tenant policies |
| A **scheduled integration worker** | `services/integration-worker` (scheduled syncs under a service identity) |
| **Static hosting** for `apps/enterprise-web`, `apps/website`, `apps/demo` with a CSP that names the API origin | each app's `build.mjs`; `tests/browser/enterprise-web.test.mjs` W-20 |
| Environment: `JWT_SECRET`, `DATABASE_URL`×3, `AUTH_MODE=oidc` + OIDC vars, `SENTRY_DSN`, `CORS_ORIGINS` | `services/enterprise-api/src/config.ts` |
| Source maps **not** in dist; release stamped from the commit | `scripts/build.mjs`, `scripts/verify/dist-hygiene.mjs`, `docs/operations/OBSERVABILITY.md` |

## Fit
| Criterion | Netlify (verified: free team, 0 sites) | Render (verified: workspace, 0 services) |
|---|---|---|
| Architecture | Static CDN + serverless functions (AWS Lambda): sync **60 s**, scheduled **30 s**, background **15 min**; **no persistent process**; ~4 KB combined env-var cap for all functions; files read from disk at runtime are not bundled (per the connector's own functions context) | Web services are long-running processes; background workers and cron jobs are first-class; static sites separate |
| The API as-is | Would have to be rewritten as functions: the outbox worker becomes a scheduled function (≤ 30 s, published deploys only), the rate limiter and idempotency would move to a store, request bodies capped at 6 MB (the API accepts 25 MB uploads), long transactions constrained by the 60 s limit | Runs unchanged: `node dist/src/main.js` with the env vars; the worker stays in-process or becomes a second service |
| Database | Netlify Database (Neon-backed, via extension) — a separate provider's Postgres; role/RLS setup possible but another vendor relationship | Managed Postgres in the same workspace, same region; three roles created by `scripts/db.mjs`-equivalent SQL |
| Security | Functions get `context.ip`; secrets via `Netlify.env`; CSP for static responses in `_headers` (function responses set headers in code) | Private networking between services and the database; env groups; the API already sets its own security headers |
| Compatibility with the tests | The E2E suites start the real API in-process; a Lambda-shaped API would need a second test harness | The same artifact the tests exercise is what gets deployed |
| Cost (pricing pages read 2026-10-31; verify before purchase) | Free / Personal $9 / Pro $20 per month, credit-based usage; the first page extraction of function limits was inconsistent and is **not** relied on here | Static sites free; web service Free (spins down) or $7/month (512 MB) or $25 (2 GB); Postgres Free (256 MB, 100 connections; limits apply) or $6 / $19 / $40 per month; cron from $0.00016/min |
| Migration later | — | The API is plain Node + Postgres; moving to another provider is configuration, not code |

## Recommendation and the minimum paid footprint
Render: one web service for the API ($7/month class is enough for the starter), one Postgres (Free for evaluation; a paid instance
before anyone relies on it), one static site each for the website, the demo and the enterprise web app (free), later one cron job
for the integration worker. Netlify is a good static host but would force an architectural rewrite of the API for no gain.

Not decided here: the region, the database size, backups, custom domains — those are owner decisions with cost attached.
The owner's standing rule applies: **no provisioning, public exposure or spend without explicit authorization.**
