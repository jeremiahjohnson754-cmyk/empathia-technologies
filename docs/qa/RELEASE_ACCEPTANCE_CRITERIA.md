# Release acceptance criteria

Two different bars. The **starter bar** is what a build of this repository must meet before it is handed to an engineering team or shown
as a demonstration of the architecture. The **production bar** is what a commercial release must meet before any customer data or real
building system touches it. Today the starter bar can be met; **the production bar is NOT MET.**

## A. Starter (demonstration of the architecture, synthetic data)

| # | Criterion | How it is checked | Status at writing |
|---|---|---|---|
| S1 | Everything builds from a clean checkout | `node scripts/build.mjs` → `.local/logs/BUILD_SUMMARY.json` all PASS | met in the main session's runs |
| S2 | Every unit, integration and security suite passes; nothing NOT_RUN is counted as passed | `node scripts/test.mjs` → `tests/evidence/TEST_RESULTS.md` | see that file |
| S3 | The API contract matches the code | `scripts/api/export-openapi.mjs --check`; OpenAPI test in `tests/integration/api.test.mjs` | met |
| S4 | Server-side authorization negative tests pass | `tests/security/authz.test.mjs` 45/45 | met |
| S5 | The vertical slice persists in PostgreSQL and the read model is rebuilt by the outbox | `tests/integration/api.test.mjs` slice 1–9 | met |
| S6 | No secrets in tracked files | `scripts/verify/scan-secrets.py` (allow-list only for the documented development password) | met |
| S7 | Documentation links resolve | `scripts/verify/check-links.mjs` | met at writing |
| S8 | Frozen releases unchanged | `scripts/verify/verify-frozen.py` | PASS when run (see `provenance/release-history/`) |
| S9 | Backup and restore drill passes | `scripts/ops/backup-restore-drill.mjs` | PASS 2026-10-26 |
| S10 | Every limitation is written down | `docs/qa/KNOWN_DEFECTS.md`, `docs/security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md`, `docs/operations/PRODUCTION_READINESS_CHECKLIST.md` | met |
| S11 | No external distribution | the starter is not distributed; demonstrator editions remain unauthorized for external distribution | owner decision |

## B. Production release (customer data, real systems) — NOT MET

| # | Criterion | Status |
|---|---|---|
| P1 | Identity through the customer's OIDC provider (RS256/JWKS), MFA enforced by the IdP, no development sign-in reachable | NOT MET — dev IdP only (`services/enterprise-api/src/config.ts:35` refuses dev mode in production, but no OIDC verifier exists) |
| P2 | Independent external penetration test of API, web app and infrastructure, findings remediated or accepted in writing | NOT MET — **NOT VERIFIED — EXTERNAL TEST REQUIRED** |
| P3 | Threat model reviewed by a security engineer; every GAP in `docs/security/THREAT_MODEL.md` closed or accepted | NOT MET |
| P4 | Dependency vulnerability scanning and SAST in CI, no unresolved high/critical | NOT MET (not runnable offline) |
| P5 | TLS everywhere (clients, database, object store, service-to-service); secrets from a secrets manager with rotation | NOT MET |
| P6 | S3-compatible object storage with versioning/object lock for evidence; malware scanning of uploads | NOT MET (`S3ObjectStore` is CONTRACT_ONLY) |
| P7 | Distributed rate limiting and abuse protection at the edge | NOT MET (per-process in-memory bucket) |
| P8 | Monitoring, metrics, tracing and alerting with on-call ownership | NOT MET (structured logs and `/health` only) |
| P9 | Backups automated, encrypted, off-site, with a restore drill per quarter and RPO/RTO agreed | PARTIAL — the drill exists and passes locally; automation and targets do not exist |
| P10 | Load test against agreed latency/throughput targets | NOT MET |
| P11 | Accessibility audit to WCAG 2.2 AA of the enterprise web app | NOT MET |
| P12 | Data-protection review (personal data in audit, person records, evidence; retention; DPIA where required) | NOT MET |
| P13 | Tenant provisioning and offboarding through an audited admin path | NOT MET (seed only) |
| P14 | Every integration that touches a real system is VERIFIED with recorded evidence; control writes only through approved changes | NOT MET — no VERIFIED adapter exists |
| P15 | Known defects resolved or accepted by the owner (incl. KD-01) | NOT MET |
| P16 | Release packages hashed, signed and traceable to a commit; distribution authorized by the owner | PARTIAL — hashing exists; signing and authorization do not |
