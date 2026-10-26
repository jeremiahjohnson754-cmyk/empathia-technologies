# Technical debt register

Concrete debt in this repository, found by reading the code. Each item: where, why it exists, its risk, and the proposed resolution.
Priority: P1 = before any pilot, P2 = before general availability, P3 = when convenient. "Offline" means it exists because the build
environment of this program had no package registry.

| ID | Item | Where | Why it exists | Risk | Resolution | Priority |
|---|---|---|---|---|---|---|
| TD-01 | Vendored PostgreSQL wire-protocol client | `services/enterprise-api/src/db/pg.ts` (`PgConnection` l.71, `PgPool` l.237) | offline | protocol edge cases, maintenance burden | replace with `pg` (same `query(text, params)` interface by design) | P1 |
| TD-02 | Framework-free HTTP layer | `src/http/server.ts` (l.24), `router.ts`, `schema.ts` | offline | hand-written validation and routing | Fastify (or NestJS on Fastify); keep the route table as the source of OpenAPI | P1 |
| TD-03 | Development identity provider, HS256 shared secret | `src/auth/jwt.ts` | no IdP in the build environment | symmetric secret; no MFA; no SSO | OIDC RS256 + JWKS via `TokenVerifier`; production already refuses `AUTH_MODE=dev` (`config.ts`) | P1 |
| TD-04 | Web app keeps the access token in `sessionStorage` | `apps/enterprise-web/src/api.ts` (l.13, 21) | simplicity for the starter | readable by any script on the page (XSS) | BFF with HttpOnly cookies or OIDC PKCE with in-memory tokens | P1 |
| TD-05 | Per-process rate limiter | `src/http/server.ts` `Bucket` (l.20); `src/integrations/sync.ts` `buckets` (l.20) | single-process starter | limits multiply with instances; reset on restart | shared limiter (PostgreSQL or gateway) | P2 |
| TD-06 | Local object store only | `src/storage/objectStore.ts`; `S3ObjectStore` CONTRACT_ONLY (l.36–37) | offline (no SDK) | no durable, encrypted, replicated evidence store | implement `S3ObjectStore`; add malware scanning before evidence is referenceable | P1 |
| TD-07 | KD-01: approval may record a revision older than the design on screen | `src/domain/rooms.ts` l.404; inherited from 2.5.4 `src/v25-60-room.js` l.464 | parity with the demonstrator | integrity of the approval record | refuse approval while the current design hash differs from the latest revision (founder decision) — `docs/qa/KNOWN_DEFECTS.md` | P1 |
| TD-08 | React type shim instead of `@types/react` | `tooling/types/react-offline/index.d.ts` | offline | JSX props are loosely typed; type errors can slip through | install `@types/react`/`@types/react-dom`, delete the shim, fix what the compiler finds | P1 |
| TD-09 | Hand-written query cache instead of TanStack Query | `apps/enterprise-web/src/api.ts` `useQuery` (l.35), `useMutation` (l.54) | offline | no retries, stale-time, devtools | swap for TanStack Query; call sites keep the same shape | P2 |
| TD-10 | Display hints duplicated in the web app | `apps/enterprise-web/src/pages/Room.tsx` `NEXT` (l.15), `CATEGORIES` (l.19); `Rooms.tsx` `TEMPLATES` (l.8) | keep the bundle free of the rule tables | drift from the engine (cosmetic only: the server decides) | serve these lists from the API (e.g. `/v1/catalog`) | P3 |
| TD-11 | Two copies of the engine logic: demonstrator JavaScript and the TypeScript port | `source-254/src/v25-60-room.js` etc. vs `packages/commissioning-engine` | the demonstrator is preserved unchanged | divergence | guarded by 92 golden parity cases; decide which is the source of truth for rule data (today extracted from the demonstrator by `scripts/extract/extract-domain-data.mjs`) and retire the other | P2 |
| TD-12 | Demonstrator is one generated HTML file (257 source files joined by `build.py`), all state in the page | `/home/claude/Empathia_V25/work/source-254` | the demonstrator's purpose: offline, single file | not a basis for production; no server authority | keep as a demonstrator; build product features in the starter | — (by design) |
| TD-13 | No tenant administration API | `src/domain/org.ts` (read-only sites/people) | starter scope | tenants and memberships are created by the seed only | WP8 | P1 |
| TD-14 | No down-migrations; sha256-guarded forward-only | `src/db/migrate.ts` (l.19–20) | intentional | rollback needs restore | keep forward-only; document roll-forward fixes; rehearse restore | P3 |
| TD-15 | Outbox worker runs inside the API process by default | `src/main.ts` l.34 (`WORKER=off` to disable) | simplicity | scaling the API scales the worker | run the worker as its own deployment in production | P2 |
| TD-16 | Fixed limits instead of pagination on several reads | e.g. audit `domain/platform.ts` l.47 (max 500), notifications (100) | starter scope | large tenants | cursor pagination like `/v1/rooms` | P2 |
| TD-17 | No metrics or tracing exporter | `src/log.ts` (logs only) | starter scope | blind in production | OpenTelemetry | P1 |
| TD-18 | Containers never run | `Dockerfile`, `docker-compose.yml` (config validated statically only) | no container daemon in the build environment | unknown build/runtime issues | WP1 | P1 |
| TD-19 | Python service on Starlette instead of FastAPI | `services/intelligence-python/app/main.py` | offline | none functional; no generated OpenAPI | swap to FastAPI (same pydantic models) | P3 |
| TD-20 | Drawing REVIEW_REQUIRED and the High-issue approval block have no API-level test (engine + demonstrator E2E only) | `src/domain/rooms.ts` `drawingStates`; `lifecycle.ts` | starter scope | regressions unnoticed | add tests to `tests/integration/api.test.mjs` | P1 |
