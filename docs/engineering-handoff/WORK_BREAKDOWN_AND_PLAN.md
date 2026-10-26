# Work breakdown and phased plan

A work breakdown structure and a phased plan from the production starter to a first supervised commercial pilot. Phases end on
evidence, not dates. Each milestone's acceptance criteria name the test or artefact that proves it; a milestone is not done while any
of its criteria is unmet. Estimates for each work package: `ESTIMATES.md`.

## WBS

| ID | Work package | Main folders | Depends on |
|---|---|---|---|
| WP1 | Reproducible build and CI (lockfile, `pnpm install`, CI running every suite, containers running) | root, `scripts/`, `Dockerfile`, `docker-compose.yml` | — |
| WP2 | Dependency swaps: `pg`, Fastify/NestJS, `@types/react`, TanStack Query (keep suites green) | `services/enterprise-api/src/db`, `src/http`, `apps/enterprise-web` | WP1 |
| WP3 | Identity: OIDC (RS256 + JWKS), MFA via the IdP, token handling in the web app (BFF or PKCE), service accounts | `src/auth`, `apps/enterprise-web/src/api.ts` | WP2 |
| WP4 | Platform: managed PostgreSQL with RLS, TLS, secrets manager, S3 object storage + malware scanning, observability (metrics, traces, alerts), backups and restore drill | `src/storage`, `docs/operations` | WP1 |
| WP5 | KD-01 decision and fix; drawing REVIEW_REQUIRED API test; acceptance-path test to ACCEPTED | `src/domain/rooms.ts`, tests | WP1 |
| WP6 | Commissioning field client (phone, offline drafts, photo evidence, re-authentication) | new app or `apps/enterprise-web` | WP3, WP4 |
| WP7 | Workbook export in the starter (JSON, CSV, .xlsx), ported from the demonstrator | `src/domain`, `packages/commissioning-engine` | WP1 |
| WP8 | Tenant administration (tenants, sites, buildings, memberships) with audit | `src/domain/org.ts`, migrations | WP3 |
| WP9 | First VERIFIED read-only adapter (identity/directory), then ITSM or device inventory | `integrations/verified-adapters` | WP3, WP4 |
| WP10 | Search Party UI in the web app over `/v1/graph`; Pro read models on real data | `apps/enterprise-web` | WP9 |
| WP11 | External penetration test and remediation | all | WP3, WP4 |
| WP12 | Pilot: real rooms, real instruments, independent verification, customer sign-off | domain engineer + all | WP5–WP7, WP11 |
| WP13 | Intake requests/decisions modules with server-side approval authority | `src/domain`, web | WP8 |
| WP14 | Assurance on accepted pilot rooms; observation ingest from VERIFIED sources | `packages/assurance-engine`, integrations | WP9, WP12 |

## Phases and milestones

### Phase 0 — Take over (WP1, WP2, start WP5)
Milestone M0 "reproducible":
* every suite listed in `docs/qa/TEST_STRATEGY.md` passes in CI on a clean machine (`tests/evidence/TEST_RESULTS.md` from CI);
* `docker compose up` brings up postgres, api, web, worker and intelligence, and the enterprise-web E2E passes against it (today NOT_RUN);
* `node scripts/api/export-openapi.mjs --check` passes after the HTTP framework swap;
* the 92 golden parity cases still pass after every swap.

### Phase 1 — Secure foundation (WP3, WP4, WP11)
Milestone M1 "secure enough to pilot":
* sign-in through OIDC with MFA; the development identity provider is refused outside development (already enforced by `config.ts`);
* tokens are not readable by page scripts (no `sessionStorage` token);
* evidence lives in S3-compatible storage with server-side encryption and a malware scan before it becomes referenceable;
* a restore drill from backup passes (`docs/operations/BACKUP_AND_RESTORE.md`);
* the external penetration test report exists, and every High/Critical finding is fixed or explicitly accepted by the owner;
* `tests/security/authz.test.mjs` extended for OIDC token cases and still passing.

### Phase 2 — Commissioning pilot (WP5, WP6, WP7, WP12)
Milestone M2 "a real room accepted on evidence":
* KD-01 closed with a test that fails without the fix;
* a test drives a room through the API from PLANNED to ACCEPTED with every applicable test recorded and independently verified;
* field client works offline and uploads evidence on reconnect (E2E on a mobile viewport plus a manual field check);
* on the pilot site, every applicable test of each pilot room is executed with real instruments where required, recorded by its
  responsible role and verified by a different person; the customer signs the acceptance.

### Phase 3 — Service and operations (WP9, WP10, WP13)
Milestone M3:
* one adapter passes `integrations/mocks/src/conformance.ts` against the vendor sandbox and is recorded VERIFIED with its evidence;
* Search Party answers ownership and impact questions from directory data for the pilot site;
* KPI summary computed from real records; operational performance still `NOT_MONITORED` unless a monitoring feed is VERIFIED.

### Phase 4 — Assurance (WP14)
Milestone M4: assurance assessments on accepted pilot rooms with at least one VERIFIED observation source; a sample of drift findings
confirmed on site.

### Phase 5 — Expansion
Per product, an acceptance matrix approved by the founder before any build (Lite 3D, Drawing import, Scouter catalogue, Learn content,
Control Studio CS-AT-41, Collaboro-Sing and Frontline matrices).
