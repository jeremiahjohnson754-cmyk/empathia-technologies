# Test strategy (as implemented)

Scope: the production starter in this repository (engines, enterprise API, database, web app, integrations, Python service) and the
Founder Studio over the 2.5.4 demonstrator. Every count below was re-read from the test files on 2026-10-26; the unit counts were also
re-run that day (`node --test <package>/dist/test/**/*.test.js`). Counts change as tests are added — `node scripts/test.mjs` writes the
current numbers to `tests/evidence/TEST_RESULTS.md`, which is the authority over this table.

## The pyramid

| Layer | Suite | Path | Tests | Needs | Last observed |
|---|---|---|---|---|---|
| Unit | Commissioning engine (classification, checks, applicability, results, recording, lifecycle, design) — incl. **92 golden parity cases** extracted from the demonstrator build | `packages/commissioning-engine/test/parity.test.ts`, `design.test.ts` | 128 | build | 128/128 PASS |
| Unit | Event contracts (101 types; refuses `resultLabel: PASS`) | `packages/event-contracts/test/contracts.test.ts` | 3 | build | 3/3 PASS |
| Unit | Relationship engine (neighbourhood, impact, path, visibility hook) | `packages/relationship-engine/test/graph.test.ts` | 5 | build | 5/5 PASS |
| Unit | Assurance engine (17 dimensions, thresholds, gap vs drift, remedy precedence, unknown ≠ match) | `packages/assurance-engine/test/assurance.test.ts` | 13 | build | 13/13 PASS |
| Unit | Typed API client (paths, query, headers, problem details, binary upload) | `packages/api-client/test/client.test.ts` | 5 | build | 5/5 PASS |
| Unit | Harmony engine (authority, deny-by-default writes, dedupe, conflicts, matching, retries, token bucket, staleness, rotation) | `integrations/contracts/test/harmony.test.ts` | 7 | build | 7/7 PASS |
| Unit + contract | MOCK adapters + **adapter conformance suite**, fault injection, signed webhooks | `integrations/mocks/test/mocks.test.ts` (suite: `integrations/mocks/src/conformance.ts`) | 5 | build | 5/5 PASS |
| Unit | ML research prototype (encoding, sklearn parity, refusal, labelling, deterministic training) | `ml/tests/test_prototype.py` | 5 | dataset + training run | 5/5 PASS (main session) |
| Service | Python intelligence service over real HTTP (uvicorn child process) | `services/intelligence-python/tests/test_service.py` | 4 | Python | 4/4 PASS (main session) |
| Integration | Vertical slice over HTTP + PostgreSQL: create → device → graph → revisions/drawings → lifecycle → evidence → FAIL/deficiency → work order → PASS/verify → read model; audit; idempotency; outbox dead-letter; OpenAPI ↔ routes; organization/projects/reports; assurance; integrations sync; knowledge; AI request | `tests/integration/api.test.mjs` | 20 | database | 20/20 PASS (main session) |
| Integration | Typed client against the live API (response shapes, ApiProblem) | `tests/integration/api-client.test.mjs` | 3 | database | 3/3 PASS (main session) |
| Integration | Standalone integration worker (one round, three MOCK adapters) | `tests/integration/integration-worker.test.mjs` | 1 | database | 1/1 PASS (main session) |
| Security | Negative authentication, tenant isolation, site scope, least privilege (13 parameterised 403 cases), business rules no role can bypass, input handling, CORS/headers, RLS and append-only enforcement in SQL, rate limit | `tests/security/authz.test.mjs` | 45 (32 written + 13 generated from the `cases` table) | database | 44/44 PASS (main session) |
| End to end | Enterprise web app in Chromium over the real API and database (21 checks W-01…W-21, incl. a forged direct call refused 403) | `tests/browser/enterprise-web.test.mjs` | 21 | build + database + Chromium | 21/21 PASS (main session) |
| Browser | Founder Studio (27 destinations, persona switch, inspector, films, search, Engine Lab, snapshots, themes, tablet width, file:// open) | `tests/browser/founder-studio.test.mjs` | 19 + 1 NOT_RUN (S-09b: H.264 playback — the test Chromium has no H.264 decoder) | built studio + films | 19 PASS, 1 NOT_RUN (Stage 2) |
| End to end | Founder town hall on the Founder Edition (T-00…T-23 + T-16b) | `tests/e2e/founder-townhall.e2e.mjs` | 25 | built studio | 25/25 PASS (Stage 2) |
| Media | Full ffmpeg decode + SHA-256 of every curated film (stands in for S-09b) | `tests/media/decode-films.mjs` | 36 films | films on disk | see `tests/evidence/films/DECODE_RESULTS.json` |

"Last observed" is the most recent run recorded in this program; rows marked *main session* were run by the main build session, not
re-run while this document was written (this author was asked not to run the database suites, to avoid colliding with them).

## Running

```bash
node scripts/build.mjs                 # every TypeScript project, type-checks, OpenAPI check, web bundle
node scripts/db.mjs up                 # local PostgreSQL 16 on 127.0.0.1:55432
node scripts/test.mjs                  # unit + Python + integration + security
node scripts/test.mjs --browser        # + enterprise web E2E
node scripts/test.mjs --studio         # + Founder Studio browser test and town-hall E2E
node scripts/test.mjs --films          # + full film decode (slow)
node scripts/verify-all.mjs            # build + tests + secret scan + link check + frozen-release check → tests/evidence/VERIFY_REPORT.md
```

`scripts/test.mjs` reports every suite as PASS, FAIL or NOT_RUN (with the reason); a suite that did not run is never counted as passed.
Each database suite creates and drops its own database (`empathia_test_api`, `empathia_test_security`, `empathia_test_client`,
`empathia_test_worker`, `empathia_test_web`) through `tests/integration/harness.mjs`, so suites never share state.

## Contract tests

* **API contract.** The OpenAPI document is generated from the route table (`services/enterprise-api/src/openapi.ts`), so it cannot list
  an endpoint that does not exist. Two checks keep code and contract aligned: `scripts/api/export-openapi.mjs --check` fails if
  `docs/api/openapi.json` or `packages/api-client/src/generated.ts` differ from what the code generates (run by `scripts/build.mjs`),
  and the "OpenAPI" test in `tests/integration/api.test.mjs` checks every route is documented with its method and that every
  authenticated operation documents 401/403 and declares security.
* **Event contracts.** Every outbox event is validated against its contract before it is written (`services/enterprise-api/src/auth/context.ts:40`); a
  contract violation aborts the transaction.
* **Adapter conformance.** `integrations/mocks/src/conformance.ts` is the gate an adapter must pass before registration (and, against a
  vendor sandbox, before it may be marked VERIFIED).
* **Demonstrator parity.** The commissioning engine must reproduce the demonstrator's outputs on 92 golden cases; the golden file is never
  edited to make a test pass (`packages/commissioning-engine/test/parity.test.ts:2-4`).

## Role and tenant tests

`tests/security/authz.test.mjs` covers: no/malformed/tampered/`alg=none`/HS512/expired/foreign-key tokens (401); a validly signed token
naming a role the person does not hold (401, membership resolved server-side on every request); a disabled person (401 at once);
cross-tenant list/read/write/graph/read-model/evidence/audit/outbox (404 — existence is not disclosed); site-scoped technician and
site-scoped room creation (404); 13 least-privilege refusals (403, each audited as DENIED); and the same rules one layer down in SQL —
the runtime role sees nothing without a tenant, cannot read or write another tenant, is not superuser/BYPASSRLS, and append-only tables
refuse UPDATE/DELETE even for the owner. `tests/browser/enterprise-web.test.mjs` W-09 proves the browser is not the authority: a designer
calling the approval endpoint directly from the page receives 403.

## What is NOT tested

| Area | Status |
|---|---|
| Load, soak and performance (latency targets, connection-pool exhaustion, large tenants) | NOT_RUN — no load tool or targets yet |
| Chaos / failure injection beyond the outbox dead-letter test and the adapter fault injection | NOT_RUN |
| Accessibility audit (axe or manual WCAG 2.2 AA review); only keyboard tab navigation (W-17), skip link and phone width (W-21) are checked | NOT_RUN |
| Cross-browser (Firefox, Safari); H.264 playback inside a browser | NOT_RUN (Chromium only; no H.264 decoder in the test build) |
| External penetration test of the API and web app | **NOT VERIFIED — EXTERNAL TEST REQUIRED** |
| External page-API security assessment of the demonstrator editions | **NOT VERIFIED — EXTERNAL TEST REQUIRED** |
| Dependency vulnerability scan (npm audit, pip-audit) and SAST/DAST | NOT_RUN — no registry or scanner available offline |
| Container images (`Dockerfile`, `docker-compose.yml`) | `docker compose config` validated statically; build and run NOT_RUN (no Docker daemon) |
| Backup and restore | Drill RUN and PASS — see `docs/operations/BACKUP_AND_RESTORE.md` |
| OIDC, MFA, S3 object storage | not implemented, so not testable (see `docs/security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md`) |

## Rules for changing tests

A failing test is a FAIL. Expected values are changed only when the behaviour change is intended and reviewed, never to make a run pass;
golden data is regenerated only from a new demonstrator build. Evidence of every run goes to `tests/evidence/`.
