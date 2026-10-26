# Production readiness checklist

**Overall: NOT production-ready.** This is a production *starter*: real API, database, authorization and tests on synthetic data. The
OpenAPI document points here (`services/enterprise-api/src/openapi.ts`). Status per item: **MET**, **PARTIAL** or **NOT MET**, with the
evidence. Last reviewed 2026-10-26.

## Security

| Item | Status | Evidence / gap |
|---|---|---|
| Server-side authorization on every state change; deny by default | MET | `auth/context.ts:23`; 44 negative tests (`tests/security/authz.test.mjs`); E2E W-09 |
| Tenant isolation enforced in the database | MET | RLS FORCED (`0001_foundation.sql:22-27`); SQL-level tests; survives restore (drill) |
| Audit of allowed and denied actions, append-only | MET | `app.audit_event` + trigger; tests |
| Production identity (OIDC, MFA at the IdP) | NOT MET | dev IdP only; KV-01, KV-02 |
| Browser session without script-readable tokens | NOT MET | `sessionStorage` (KV-03) |
| TLS on every hop | NOT MET | local only (KV-05) |
| Secrets manager and rotation | NOT MET | generated files under `.local/` |
| Malware scanning of uploads | NOT MET | KV-07 |
| Dedicated DB role for workers | MET (starter) | KV-08 fixed by migration 0008 (`empathia_worker`); regression test in `tests/security/authz.test.mjs` |
| SAST, DAST, dependency scanning | NOT MET | NOT_RUN offline (KV-14) |
| External penetration test | NOT MET | **NOT VERIFIED — EXTERNAL TEST REQUIRED** (`docs/security/INDEPENDENT_REVIEW_STATUS.md`) |
| Threat model | PARTIAL | `docs/security/THREAT_MODEL.md` written by the builders, not reviewed by a security engineer |

## Reliability and data

| Item | Status | Evidence / gap |
|---|---|---|
| Reliable event delivery with retries and dead letters | MET | `worker/outbox.ts`; dead-letter test |
| Idempotent writes | MET | idempotency keys (`http/server.ts:78-89`); test |
| Schema migrations, forward-only with tamper guard | MET | `db/migrate.ts` sha256 guard; 8 migrations |
| Backup and restore | PARTIAL | drill PASS locally (`BACKUP_AND_RESTORE.md`); no automation, PITR, off-site copies or agreed RPO/RTO |
| Durable evidence storage (versioned, locked, replicated) | NOT MET | `S3ObjectStore` CONTRACT_ONLY (KV-06) |
| Query timeouts, pool sizing under load | NOT MET | KV-09 |
| Load and performance tested | NOT MET | NOT_RUN |
| Disaster recovery exercised | NOT MET | targets only (`DISASTER_RECOVERY.md`) |

## Operability

| Item | Status | Evidence / gap |
|---|---|---|
| Structured logs with correlation ids | MET | `log.ts`, `http/server.ts:26-27` |
| Health endpoint | MET | `GET /health` |
| Metrics, tracing, dashboards, alerting | NOT MET | `MONITORING_LOGGING_ALERTING.md` |
| Containerized build | PARTIAL | `Dockerfile`, `docker-compose.yml` statically valid; build/run NOT_RUN |
| Deployment automation (CI/CD, image digests, rollback) | NOT MET | `DEPLOYMENT_GUIDE.md` is guidance only |
| Tenant provisioning and offboarding | NOT MET | no tenant admin API (`CUSTOMER_ONBOARDING.md`) |
| Support and on-call | NOT MET | `SUPPORT_ESCALATION.md` — no people or contacts yet |
| Distributed rate limiting | NOT MET | per-process bucket (KV-04) |

## Product and compliance

| Item | Status | Evidence / gap |
|---|---|---|
| Domain rules ported with parity to the demonstrator | MET | 92 golden parity cases (`packages/commissioning-engine`) |
| Known defects resolved or accepted | NOT MET | KD-01 open (`docs/qa/KNOWN_DEFECTS.md`) |
| Accessibility audit (WCAG 2.2 AA) | NOT MET | keyboard/phone-width checks only |
| Data-protection review, retention and erasure procedure | NOT MET | evidence/audit are append-only; personal data in person and audit records; counsel input needed |
| Integrations with real systems verified | NOT MET | no VERIFIED adapter; three MOCKs only |
| Live monitoring of rooms | NOT MET | `liveHealth: NOT_MONITORED` by design |
| Machine-learning features | NOT MET (by design) | one research prototype on synthetic data, not used by any decision (`ml/`) |
| Release packaging traceable to a commit, signed | PARTIAL | hashes and manifests; no signing |

Production go-live requires every NOT MET item above to be MET or explicitly accepted in writing by the owner, plus an independent
penetration test with findings closed (`docs/qa/RELEASE_ACCEPTANCE_CRITERIA.md`, section B).
