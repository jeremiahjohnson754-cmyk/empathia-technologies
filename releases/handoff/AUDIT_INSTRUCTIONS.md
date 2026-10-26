# Instructions for an independent reviewer

**No independent audit of this program has taken place.** The 2.5.x release reviews were performed by a separate AI reviewer, which
is not an independent audit (`docs/security/INDEPENDENT_REVIEW_STATUS.md`). The external page-API security assessment of the
demonstrator remains **NOT VERIFIED — EXTERNAL TEST REQUIRED**. This document tells a qualified reviewer what to receive and what to check.
Engaging a reviewer, and what the reviewer may see, is the founder's decision.

## What to receive (from the master index, `releases/handoff/out/MASTER_INDEX.md`)
| Package | For |
|---|---|
| D — production source (`EMPATHIA_PRODUCTION_SOURCE_<rev>.zip`) | code review, local reproduction |
| E — engineering blueprint | architecture and threat model |
| H — QA and release evidence | the claims to re-verify |
| B / C — frozen investor and engineer editions, by hash | the external page-API assessment (separate engagement) |
| G — IP vault | **only** for a legal or diligence reviewer under NDA; contains personal data |

Check every file against `SHA256SUMS.txt` and the source revision in `MASTER_INDEX.json` before starting.

## Reproduce
On a machine with Node 22, PostgreSQL 16 and Python 3.11+: `GETTING_STARTED.md`, then `node scripts/verify-all.mjs --browser`.
Compare the result with `tests/evidence/VERIFY_REPORT.md`. A difference is a finding.

## Scope suggested for a security review of the starter
1. Authentication: dev identity provider (HS256), token handling (`services/enterprise-api/src/auth/jwt.ts`), membership resolution per request.
2. Authorization: every route's authority (`docs/api/RBAC_MATRIX.md`) against the handler code; deny-by-default; audit of denials.
3. Tenant isolation: row-level security (`database/migrations`, `docs/database/DATA_ARCHITECTURE.md`), composite foreign keys, the
   worker role (migration 0008), SECURITY DEFINER identity functions.
4. Evidence integrity: append-only triggers, content addressing, re-verification on read, retention.
5. Input handling, error mapping, idempotency, rate limiting, CORS and headers (`src/http/server.ts`).
6. Web app: token storage (sessionStorage — KV listed), CSP of `apps/enterprise-web/server/serve.mjs`.
7. Known items to confirm or refute: `docs/security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md`, `docs/qa/KNOWN_DEFECTS.md`.

Out of scope unless engaged separately: production deployment (none exists), load and performance, the demonstrator's page-API
assessment, legal review of the vault.

## Reporting
State the source revision and the package hashes reviewed, the method, and findings with severity. Do not mark anything PASS that
was not executed. A finding against a claim in `EMPATHIA_MASTER_COMPLETION_REPORT.md` should cite the claim.
