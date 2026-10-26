# Independent review status

**No independent human security audit or code review of Empathia has taken place.** Nothing in this repository, the demonstrator or the
release packages is INDEPENDENTLY_AUDITED.

## What has happened

| Review | By | What it is | What it is not |
|---|---|---|---|
| 2.5.x "independent audits" of the demonstrator releases | a separate AI reviewer session, given the build without the builder's reasoning | a useful second reading that found real defects | not independent in the professional sense: same vendor's AI, no accountable human auditor, no audit standard. Never to be described as an independent audit |
| Production starter self-tests | the building session | unit, integration, security (44 negative tests), E2E, backup drill — see `docs/qa/TEST_STRATEGY.md` | a builder testing its own work |
| External page-API security assessment of the demonstrator editions | — | required by the owner before distribution | **NOT VERIFIED — EXTERNAL TEST REQUIRED** |
| External penetration test of the starter (API, web app, database configuration) | — | required before production (`docs/qa/RELEASE_ACCEPTANCE_CRITERIA.md` P2) | **NOT VERIFIED — EXTERNAL TEST REQUIRED** |

## What an auditor should receive

1. A commit hash of this repository and the release archive with its SHA-256 (`provenance/release-history/`).
2. `docs/security/THREAT_MODEL.md`, `KNOWN_VULNERABILITIES_AND_REMEDIATION.md`, `SECURE_DEVELOPMENT.md`.
3. `docs/api/openapi.json` and the role/authority table (`packages/domain-data/data/V25_PERSONAS.json`, route `x-authority` in the OpenAPI document).
4. The database schema (`database/migrations/0001…0008`), with RLS and trigger design.
5. Test evidence: `tests/evidence/TEST_RESULTS.md`, `tests/security/authz.test.mjs`, `docs/operations/BACKUP_RESTORE_DRILL.json`.
6. A running environment: `node scripts/dev.mjs` on an isolated machine with synthetic data only, plus development credentials
   delivered out of band (never by e-mail in the clear).
7. For the demonstrator page-API assessment: the frozen edition files and their hashes, and the owner's distribution conditions.

Scope suggestion: authentication and session handling, tenant isolation (API and SQL), authorization on every route, evidence upload and
download, idempotency and replay, outbox/worker privilege, integration write controls, CSP/XSS in the web app, secrets handling.
Findings go to `KNOWN_VULNERABILITIES_AND_REMEDIATION.md` with their remediation state; this file is updated with the auditor's name,
firm, dates, scope and report reference only once an audit has actually happened.
