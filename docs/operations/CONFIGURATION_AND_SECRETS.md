# Configuration and secrets

Source of truth: `services/enterprise-api/src/config.ts` (API and workers), `apps/enterprise-web/server/serve.mjs` (web server),
`services/integration-worker/main.mjs`, `services/intelligence-python/app/main.py`, `scripts/db.mjs`, `.env.example`, `docker-compose.yml`.

## Variables

| Variable | Used by | Default (development) | Production rule |
|---|---|---|---|
| `NODE_ENV` | API | `development` (`test` in test runs) | `production` turns on every refusal below |
| `AUTH_MODE` | API | `dev` | `dev` is refused in production (`config.ts:35`); `oidc` is the target and is not implemented |
| `JWT_SECRET` | API | generated into `.local/jwt-secret` (mode 0600) | required in production (`config.ts:38`); ≥ 32 bytes always (`config.ts:43`) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | API | `empathia-dev-idp` / `empathia-enterprise-api` | set to the IdP's values under OIDC |
| `TOKEN_TTL_SECONDS` | API | 900 | keep short |
| `DATABASE_URL` | migrations, seed | from `.local/pg/env` | owner role; used only by the migration job |
| `APP_DATABASE_URL` | API, workers | from `.local/pg/env` | runtime role `empathia_app` (NOBYPASSRLS); TLS `verify-full` |
| `HOST` / `PORT` | API | `127.0.0.1` / 4100 | behind the load balancer |
| `CORS_ORIGINS` | API | `http://127.0.0.1:4310,http://localhost:4310,http://127.0.0.1:4200,http://localhost:4200` | exact production web origins only |
| `MAX_BODY_BYTES` | API | 26,214,400 (25 MiB) | size to the evidence policy |
| `RATE_LIMIT_PER_MINUTE` | API | 600 | per process; add edge limiting |
| `OBJECT_STORE_DIR` | API | `.local/objects` | replaced by S3 configuration when implemented |
| `WORKER` | API | on (`off` disables the in-process outbox worker, `main.ts:34`) | `off` on API pods; separate worker deployment |
| `WORKER_INTERVAL_MS` | API | 500 | — |
| `LOG_LEVEL` | API | `info` | `info` |
| `WORKER_ACCOUNT_EMAIL` / `WORKER_ACCOUNT_ROLE` | integration worker | seeded `secadmin` | dedicated non-human account with `adapter.allowlist` only |
| `WEB_HOST` / `WEB_PORT` / `API_URL` | web server | `127.0.0.1` / 4200 / `http://127.0.0.1:4100` | `API_URL` feeds the CSP `connect-src` |
| `INTELLIGENCE_TOKEN` | Python service | generated into `.local/intelligence-token` by `scripts/dev.mjs` | required: the service answers 503 without it |
| `EMPATHIA_PG_PORT` | `scripts/db.mjs` | 55432 | local only |
| `STUDIO_KEY`, `STUDIO_PORT` | Founder Studio launcher | random per launch / 4310 | local only |
| `POSTGRES_PASSWORD`, `EMPATHIA_OWNER_PASSWORD`, `EMPATHIA_APP_PASSWORD`, `MINIO_ROOT_*` | `docker-compose.yml` | none — compose refuses to start without them | from the secrets manager |

## Secrets handling rules

* No secret is committed: `.local/` and `.env` are git-ignored; `scripts/verify/scan-secrets.py` scans every tracked file
  (the only allow-listed hits are the documented synthetic development password in two test files).
* Generated local secrets are files with mode 0600 (`scripts/db.mjs`, `config.ts`).
* Logs never contain tokens, passwords or request bodies (`log.ts:1`).
* Adapter credentials are referenced, never stored in the integration row or sent to the browser (`integrations/contracts/src/contract.ts` `CredentialRef`).
* Rotation (production): database passwords and service tokens every 90 days or on staff change; `JWT_SECRET` disappears with OIDC;
  adapter credentials per their `rotateDays` (checked by `credentialProblems`). There is no secrets-manager integration yet — **GAP**.
