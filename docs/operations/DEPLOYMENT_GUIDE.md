# Deployment guide (target, not done)

**Nothing has been deployed.** This is the intended topology for a first hosted pilot, written so that a platform engineer can start
from it. Each element names what the code already supports and what is missing.

```mermaid
flowchart LR
  U[Users] --> CDN[CDN / static hosting<br/>apps/enterprise-web/dist]
  U --> WAF[Edge: TLS, WAF, rate limiting]
  WAF --> API[Enterprise API ×2+<br/>WORKER=off]
  OW[Outbox worker ×1+<br/>same image, WORKER=on] --> PG
  IW[Integration worker ×1] --> PG
  API --> PG[(Managed PostgreSQL 16<br/>TLS, PITR backups)]
  API --> S3[(S3-compatible storage<br/>versioning + object lock)]
  API --> IDP[Customer OIDC IdP]
  API -. service token / mTLS .-> PY[Python service]
  SM[Secrets manager] -.-> API & OW & IW & PY
```

| Element | Today | Needed for the pilot |
|---|---|---|
| Web app | static bundle (`apps/enterprise-web/dist`), server sets CSP | host on a CDN with the same CSP headers; point `connect-src` at the API origin |
| API | stateless except the per-process rate limiter; `HOST`/`PORT` configurable; `WORKER=off` disables the in-process outbox worker (`services/enterprise-api/src/main.ts:34`) | ≥2 instances behind a TLS load balancer; health check `GET /health` |
| Outbox worker | runs in the API process; `FOR UPDATE SKIP LOCKED` lets several run safely (`worker/outbox.ts`) | run as its own deployment; it already connects as its own DB role `empathia_worker` (`WORKER_DATABASE_URL`, migration 0008) |
| Integration worker | `services/integration-worker/main.mjs` | dedicated non-human account; only after a VERIFIED adapter exists does it touch a real system |
| Database | migrations with sha256 guard; RLS; owner vs runtime roles | managed PostgreSQL 16, TLS `verify-full`, PITR, separate migration job using the owner role, `statement_timeout` |
| Evidence storage | `LocalObjectStore` | implement `S3ObjectStore` (CONTRACT_ONLY today) with versioning and object lock; malware scanning |
| Identity | dev IdP (refused in production) | OIDC (RS256/JWKS) behind `TokenVerifier`; backend-for-frontend with HttpOnly cookies |
| Secrets | generated files under `.local/` | secrets manager; rotation for DB passwords, service tokens, adapter credentials |
| Observability | JSON logs with correlation ids, `/health` | log shipping, metrics, tracing, alerts (`MONITORING_LOGGING_ALERTING.md`) |

Release procedure (to establish): build once in CI, run `node scripts/verify-all.mjs`, tag, build images with digests, run migrations as
a one-off job with the owner role, roll out API/workers, smoke-test `/health` and a sign-in, keep the previous images for rollback.
Database rollback is forward-only: write a corrective migration; never edit an applied one.
