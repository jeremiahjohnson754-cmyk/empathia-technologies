# CTO handoff — start here

For the future CTO, development partner or engineering organization taking over Empathia. Read this first; every other handoff
document is linked from it. Status words used throughout: **PASS / FAIL / NOT_RUN / BLOCKED** for checks, **MET / NOT MET** for
criteria. All data is synthetic. Nothing here is production-ready.

## 1. What exists

| Thing | Where | What it is |
|---|---|---|
| Browser demonstrator (Founder Edition 2.5.4, dev build) | `/home/claude/Empathia_V25/work/source-254` (read-only worktree); built HTML copied into the Founder Studio | ~29,700 lines of JavaScript in 257 files under `src/`, joined by `build.py` into **one standalone HTML file**; all state in the page; synthetic data. 18 product experiences. |
| Frozen releases | `releases/immutable-references/`, verified by `scripts/verify/verify-frozen.py` | 2.5.1.1, 2.5.2 rc1, 2.5.3 rc1/rc2/rc3 — must never change. Distribution is not authorized. |
| Founder Studio | `apps/founder-studio` | Local hub (27 destinations) over the demonstrators, films, documents and engine. React + esbuild. |
| Production starter — API | `services/enterprise-api` | TypeScript modular monolith on Node 22: framework-free HTTP, vendored PostgreSQL client, dev identity provider (HS256), server-side authority, outbox worker. ~48 operations (`docs/api/openapi.json`). |
| Production starter — database | `database/migrations/0001–0008` | PostgreSQL 16: tenant RLS FORCE, composite FKs, append-only evidence/results/revisions/audit, lifecycle triggers EM001–EM004, outbox, idempotency keys. |
| Production starter — web app | `apps/enterprise-web` + `packages/ui` + `packages/design-tokens` | React app over the API: rooms, room workspace (devices, issues, commissioning, drawings, service), projects, reports, admin. |
| Engines (pure TypeScript) | `packages/commissioning-engine`, `packages/relationship-engine`, `packages/assurance-engine`, `packages/event-contracts`, `integrations/contracts` | Classification, applicability, results, lifecycle gates; relationship graph; assurance; 101 event contracts; Harmony integration rules. |
| Integrations | `integrations/` | 83-entry catalogue (all CONTRACT_ONLY), 3 local MOCK adapters, conformance suite. **No VERIFIED adapter.** |
| Python service + ML | `services/intelligence-python`, `ml/` | Starlette service serving one research prototype on synthetic data. **No real model exists.** PyTorch and FastAPI BLOCKED offline. |
| Documentation | `docs/` | Product (`docs/product/`), architecture, algorithms (`docs/algorithms/ENGINE_INVENTORY.md`), API, database, QA, security, operations, this handoff. |
| Provenance vault | `provenance/` | Source manifest, SBOM, licences, AI-assistance record, classification, chain-of-title checklist, invention-disclosure drafts for counsel. Confidential; never in investor packages. |

## 2. What works — with the test evidence

Automated suites as last run in this program (re-run them: `node scripts/test.mjs`, see `docs/qa/` for the strategy):

| Suite | Result | What it proves |
|---|---|---|
| `packages/commissioning-engine` | 128/128 | engine rules, incl. **92 golden parity cases** against the demonstrator build |
| `tests/integration/api.test.mjs` | 20/20 | the full vertical slice over HTTP + PostgreSQL: room → device → graph → revision/drawings → lifecycle → evidence → FAIL/deficiency → work order → verified PASS → read model → audit; idempotency; outbox dead letter; OpenAPI contract; org/projects/reports; assurance; integrations; knowledge/AI governance |
| `tests/security/authz.test.mjs` | 45/45 | authentication failures, tenant isolation, site scope, 13 role refusals, business rules no role can bypass, RLS and append-only enforcement in the database |
| `tests/browser/enterprise-web.test.mjs` | 21/21 | the React app over the real API; the server refuses what the UI hides |
| `tests/e2e/founder-townhall.e2e.mjs` | 25/25 | the founder's town-hall scenario in the demonstrator |
| `tests/browser/founder-studio.test.mjs` | 19 PASS, 1 NOT_RUN | the studio; H.264 playback in the test browser NOT_RUN (no decoder) |
| assurance 13/13 · relationship 5/5 · event-contracts 3/3 · api-client 5/5 + 3/3 live · integration-contracts 7/7 · mocks 5/5 · worker 1/1 · ml 5/5 · intelligence-python 4/4 | PASS | each package's rules |

Counts are from runs in this program; treat `tests/evidence/TEST_RESULTS.md` (written by `scripts/test.mjs`) as the current record.

## 3. What does not exist or does not work

* **No real-world evidence of any kind**: no field test executed, no hardware verified, no customer, no production deployment.
* **No independent audit.** The 2.5.x "independent" reviews were by a separate AI reviewer. The demonstrator's external page-API
  security assessment remains **NOT VERIFIED — EXTERNAL TEST REQUIRED**. No penetration test of the starter.
* **Identity**: development identity provider only (HS256 shared secret); no OIDC, no MFA.
* **Containers**: `docker-compose.yml` and Dockerfiles exist; `docker compose config` validates; **running them is NOT_RUN** (no daemon in
  the build environment).
* **Storage**: local content-addressed store only; S3 is CONTRACT_ONLY.
* **Known defect KD-01**: design approval can record a revision older than the design on screen (`docs/qa/KNOWN_DEFECTS.md`) — needs a
  founder decision because it changes a demonstrated rule.
* **Integrations**: none VERIFIED; the catalogue names target platforms for planning only, with no partnership implied.
* **ML**: one synthetic research prototype; no trained model on real data.
* Missing modules: Intake requests/decisions, tenant administration, field (offline) client, workbook export in the starter, 3D/UE5.

Full list: `TECHNICAL_DEBT_REGISTER.md`, `RISKS_AND_MITIGATIONS.md`, `docs/qa/KNOWN_DEFECTS.md`.

## 4. Where the code is (repository map)

```
apps/            founder-studio (local hub), enterprise-web (React over the API)
services/        enterprise-api (TS modular monolith), integration-worker (scheduled syncs), intelligence-python (Starlette)
packages/        domain-types, domain-data (rule tables extracted from the demonstrator), commissioning-engine, relationship-engine,
                 assurance-engine, event-contracts, api-client (generated), ui, design-tokens
integrations/    contracts (adapter interface + Harmony), mocks (3 MOCK adapters + conformance), verified-adapters (empty)
database/        migrations 0001–0008 (forward-only, sha256-guarded)
ml/              synthetic research prototype (dataset generator, training, evaluation, inference, model card)
tests/           integration, security, browser, e2e, media (film decode), evidence
scripts/         bootstrap, db, build, test, dev, verify-all, discovery, extract, verify, api
docs/            product, architecture, algorithms, api, database, qa, security, operations, engineering-handoff
provenance/      IP and provenance vault (confidential)
releases/        immutable references of the frozen releases
```

Run it: `node scripts/bootstrap.mjs && node scripts/build.mjs && node scripts/dev.mjs` (see `GETTING_STARTED.md` and
`docs/operations/LOCAL_DEVELOPMENT.md`). Verify it: `node scripts/verify-all.mjs`.

## 5. The first 90 days, ordered by risk

Ordered so that the riskiest unknowns are retired first. Details and acceptance per milestone: `WORK_BREAKDOWN_AND_PLAN.md`.

**Days 1–15 — make it yours and reproducible**
1. Run `scripts/verify-all.mjs` on a clean, connected machine; replace the offline bootstrap with `pnpm install` and a lockfile.
2. Stand up CI that runs every suite on every change (the suites already exist; nothing runs them automatically today).
3. Build and run the containers (`docker-compose.yml`): today NOT_RUN.
4. Read `docs/algorithms/ENGINE_INVENTORY.md`, `docs/architecture/DEPENDENCY_SWAPS.md` and this folder; decide KD-01 with the founder.

**Days 15–45 — retire the security risks**
5. Replace the development identity provider with OIDC (RS256 + JWKS) and MFA behind the existing `TokenVerifier` interface
   (`services/enterprise-api/src/auth/jwt.ts`); move the web app's token out of `sessionStorage` (BFF with HttpOnly cookies, or OIDC
   PKCE with in-memory tokens).
6. Swap the vendored PostgreSQL client for `pg` and the framework-free HTTP layer for Fastify (or NestJS on Fastify) — the integration
   and security suites are the safety net; keep them green.
7. Commission an external penetration test of the starter (and the outstanding page-API assessment of the demonstrator).

**Days 45–90 — prove it on a real room**
8. Field client for commissioning (phone, offline, photo evidence to S3) and workbook export in the starter.
9. One read-only identity/directory integration through the adapter contract, passing the conformance suite against a vendor sandbox.
10. A supervised pilot: real rooms, real tests executed, each PASS independently verified by a different person, acceptance signed.

What not to do first: rewrite the engines (they are parity-tested), split into microservices, add ML, or build device control.

## 6. Handoff documents

| Document | Purpose |
|---|---|
| `TEAM_AND_OWNERSHIP.md` | roles needed and module ownership |
| `WORK_BREAKDOWN_AND_PLAN.md` | WBS, phases, milestone acceptance criteria |
| `ESTIMATES.md` | planning estimates (ranges, assumptions) |
| `BUILD_VS_BUY.md` | what to buy, what to build |
| `TECHNICAL_DEBT_REGISTER.md` | concrete debt items with files |
| `INTEGRATION_PRIORITIES.md` | which integrations first, read-only first |
| `RISKS_AND_MITIGATIONS.md` | technical, security, IP, data, delivery, market risks |
| `DEFINITION_OF_DONE.md` | what "done" means for a change and a release |
| `HOW_TO_ADD_A_FEATURE.md` | step list through this repository |
| `HOW_TO_ADD_A_DOMAIN.md` | adding a commissioning domain or product domain |
| `../product/PRODUCT_ARCHITECTURE.md` | products, maturity, personas, first commercial slice |

Ownership questions (authorship, AI assistance, prior employment) are for counsel: `provenance/chain-of-title/CHAIN_OF_TITLE_CHECKLIST.md`
and `provenance/AI_ASSISTANCE_RECORD.md`. Contact for product decisions: [Founder name].
