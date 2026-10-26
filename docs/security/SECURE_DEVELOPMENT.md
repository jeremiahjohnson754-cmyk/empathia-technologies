# Secure development controls

What is actually in place in this repository, and what is not. Each control names the file that implements it.

## In place

| Control | Where | Evidence |
|---|---|---|
| Strict TypeScript everywhere (`strict`, `noUncheckedIndexedAccess`) | `tsconfig.base.json:7-8` | every package builds with `tsc -b` (`scripts/build.mjs`) |
| Parameterized SQL only (extended protocol, bind parameters); no string-built values | `services/enterprise-api/src/db/pg.ts` (vendored client), every `q.query(sql, params)` call | code review; injection probes in `tests/security/authz.test.mjs` ("validation") |
| Request validation against a schema shared with the OpenAPI document; unknown query parameters refused | `services/enterprise-api/src/http/schema.ts`, `http/server.ts:73-75` | validation tests |
| Deny-by-default authority on every state-changing route, re-resolved from the database per request | `auth/context.ts:23-28`, `http/server.ts:55` | 13 least-privilege tests + E2E W-09 |
| Every authority refusal audited (DENIED) in its own transaction | `auth/context.ts:26` | test "every refusal by authority is itself audited" |
| Tenant isolation in the database (RLS FORCED; runtime role NOBYPASSRLS) | `database/migrations/0001_foundation.sql:22-27`, `scripts/db.mjs` | SQL-level tests; backup drill checks the flags survive restore |
| Append-only evidence, results, verifications, revisions, issue events and audit | `app.refuse_change()` triggers | SQL tests; backup drill |
| Business rules enforced twice (application and database): results only in COMMISSIONING (EM002), verify only a PASS (EM003), independent verification (CHECK), mocks store SYNTHETIC_MOCK only (EM004) | migrations 0003, 0007 | SQL tests |
| Security headers and CSP on API and web app | `http/server.ts:18`; `apps/enterprise-web/server/serve.mjs:17` | header tests |
| Production refuses development settings (dev IdP, missing/short JWT secret, synthetic seed) | `services/enterprise-api/src/config.ts:35-43`; `db/seed.ts` | code |
| No secrets in tracked files; scanner with an explicit, justified allow-list | `scripts/verify/scan-secrets.py`, `scripts/verify/secret-allowlist.json` | run by `scripts/verify-all.mjs` |
| Local secrets generated, never committed (`.local/` ignored, files mode 0600) | `scripts/db.mjs`, `config.ts`, `.gitignore` | `verify-all` checks `.local/pg/credentials.json` is ignored |
| Frozen releases verified byte for byte | `scripts/verify/verify-frozen.py` | `provenance/release-history/` |
| Dependency pinning: exact versions in the root `package.json` (except `@types/react ^19.2.0`, which is not installed offline) and `services/intelligence-python/requirements.txt` | those files | — |
| Pickle-free model inference | `ml/inference/predict.py` | `ml/tests/test_prototype.py` |
| Generated contract artefacts checked for drift | `scripts/api/export-openapi.mjs --check` | `scripts/build.mjs` |

## Not in place (gaps)

| Gap | Status | Next step |
|---|---|---|
| SAST (e.g. CodeQL, Semgrep) | NOT_RUN — no tool available offline | add to CI on a connected runner |
| DAST against the running API | NOT_RUN | part of the external penetration test |
| Dependency vulnerability scanning (`npm audit`/`pnpm audit`, `pip-audit`, OSV) | NOT_RUN — no registry access in the build environment | add to CI; fail on high/critical |
| Lockfile | absent (offline bootstrap links pre-installed packages) | generate `pnpm-lock.yaml` on a connected machine and commit it |
| Signed commits and release artefacts | absent | sign tags and release archives |
| CI pipeline | absent (scripts exist: `scripts/verify-all.mjs`) | run `verify-all` on every pull request |
| Code review by a second human | absent — the code was written with AI assistance under the founder's direction (`provenance/AI_ASSISTANCE_RECORD.md`) | require human review of security-sensitive changes |
| Secrets manager, key rotation | absent | see `docs/operations/CONFIGURATION_AND_SECRETS.md` |
