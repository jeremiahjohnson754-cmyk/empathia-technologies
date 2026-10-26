# System architecture (B)

How Empathia is put together today, and how the parts are meant to grow. Every statement points at the code that implements it;
anything not implemented says so. The production starter runs on synthetic data and is **not production-ready**
(see `docs/operations/PRODUCTION_READINESS_CHECKLIST.md`).

Diagrams are editable Mermaid sources in `docs/architecture/diagrams/` (rendered inside the Founder Studio, Architecture destination).

| Diagram | Shows |
|---|---|
| [01-system-context](diagrams/01-system-context.mmd) | people, Empathia, the systems around it |
| [02-containers](diagrams/02-containers.mmd) | the deployable parts of the starter and what calls what |
| [03-vertical-slice](diagrams/03-vertical-slice.mmd) | Room → record → device → graph → drawing revision → plan → issue → service → evidence → read model |
| [04-data-model](diagrams/04-data-model.mmd) | the core tables |
| [05-events](diagrams/05-events.mmd) | the transactional outbox and its consumers |
| [06-today-demonstrator](diagrams/06-today-demonstrator.mmd) | the browser-only demonstrator (2.5.x) |
| [07-editions-separation](diagrams/07-editions-separation.mmd) | investor experience, engineering review, founder source vault |
| [08-runtime-topology](diagrams/08-runtime-topology.mmd) | the local processes and ports |
| [09-integration-flow](diagrams/09-integration-flow.mmd) | one integration sync through the contract and Harmony |

## 1. Two systems, one domain

| | Demonstrator (2.5.x, frozen releases + 2.5.4 dev build) | Production starter (this monorepo) |
|---|---|---|
| What | one self-contained HTML file per edition, all state in the browser | authenticated API, PostgreSQL, workers, React app |
| Source | `Empathia_V25/work/source-254/src/*.js` (build: `python3 build.py 2.5.4`) | `apps/`, `services/`, `packages/`, `integrations/`, `database/` |
| Authority | client-side persona switch (a demonstration of authorization, not security) | server-side, per request, from the database |
| Data | synthetic, generated in the page | synthetic seed in PostgreSQL |
| Role | show the product; frozen investor/engineer packages | the path to the real product |

The two share their rules: `packages/commissioning-engine` is a TypeScript port of the demonstrator's Build a Room engine, held to the
demonstrator by **92 golden parity cases** extracted from the 2.5.4 build (`packages/domain-data/golden/room-engine-golden.json`,
`packages/commissioning-engine/test/parity.test.ts`). `packages/assurance-engine` ports the Assurance core
(`src/57-derive-assure.js`). The demonstrator is preserved unchanged; the starter does not replace it, it shows how its verified
workflows run on real services.

## 2. Containers (diagram 02)

| Container | Language / runtime | Code | Port |
|---|---|---|---|
| Enterprise API (modular monolith) + in-process outbox worker | TypeScript, Node 22, `node:http` | `services/enterprise-api` | 4100 |
| Integration worker (second process of the same monolith) | Node 22 | `services/integration-worker/main.mjs` | — |
| Enterprise web app | React 19, TypeScript, esbuild | `apps/enterprise-web` | 4200 |
| Founder Studio | React 19, local launcher | `apps/founder-studio` | 4310 (launcher default) |
| Intelligence service (research prototype) | Python 3.13, Starlette, scikit-learn | `services/intelligence-python` | 4300 |
| Database | PostgreSQL 16 | `database/migrations/0001–0007` | 55432 (local cluster) |
| Evidence object store | content-addressed files | `services/enterprise-api/src/storage/objectStore.ts` | — |

Why a modular monolith: one deployable keeps transactions, authorization and auditing in one place while the team is small. Module
boundaries are folders with their own SQL and their own events (`src/domain/*.ts`, `src/integrations/`), so a module can be extracted
when load or ownership demands it — the integration worker already runs as a separate process without duplicating rules.

## 3. Backend: the request pipeline

`services/enterprise-api/src/http/server.ts`, in order:
1. correlation id (accepted from `x-correlation-id` if well formed, else generated) on every response and log line;
2. CORS only for configured origins (`CORS_ORIGINS`); security headers (`nosniff`, `no-store`, `DENY`, CSP `default-src 'none'`);
3. route match from the single route table (`src/modules/routes.ts`), 405 with `Allow` for a wrong method;
4. authentication: `Authorization: Bearer` → `auth/jwt.ts` (HS256, iss/aud/exp/nbf checks, refuses `alg` ≠ HS256) → the membership
   is resolved from the database on every request (`domain/platform.ts resolvePrincipal`): a disabled person or a removed membership
   stops working at once;
5. per-caller rate limit (token bucket, `RATE_LIMIT_PER_MINUTE`);
6. body size limit, content-type check, JSON parse, validation against the route's schema, unknown query parameters refused;
7. idempotency (`Idempotency-Key` on POST routes marked idempotent): same key + same request → stored response replayed; same key +
   different request → 422;
8. the handler: `ctx.require(authority)` (deny by default; every refusal is audited in its own transaction), then one database
   transaction with `app.tenant_id`/`app.user_id` set (`db/pg.ts PgPool.tx`) so row-level security applies to every statement;
9. errors mapped to RFC 9457 problem details; database rule violations (EM001–EM004, 23505, 23514) map to 422/409; internal errors
   return only the correlation id.

Business rules live in the engines (pure functions) and are applied server-side; the database enforces the critical ones again
(append-only evidence and results, result only in COMMISSIONING, verification independence, verify-only-PASS, live-health
NOT_MONITORED, mock evidence only from mocks). See `docs/database/DATA_ARCHITECTURE.md`.

## 4. Service boundaries

| Boundary | Inside | Contract |
|---|---|---|
| API ↔ browser | `/v1` REST | `docs/api/openapi.json` generated from the route table; `packages/api-client` generated from it; drift check `node scripts/api/export-openapi.mjs --check` |
| Module ↔ module | function calls in one process, one transaction | events for anything asynchronous |
| API ↔ workers | the outbox table (`app.outbox_event`) | `packages/event-contracts` — 101 event types, `EVENT_SCHEMA_VERSION 1.0.0`, validated before insert |
| Empathia ↔ external systems | `integrations/contracts` `Adapter` interface | conformance suite `integrations/mocks/src/conformance.ts` |
| API ↔ Python | HTTP + service token | `RiskRequest`/`RiskResponse` (pydantic) — not called by the API yet |

## 5. Event architecture

Transactional outbox (`database/migrations/0004_platform.sql`, `src/worker/outbox.ts`): an event is inserted in the same transaction as
the change it describes, so it exists if and only if the change committed. The worker claims batches with `FOR UPDATE SKIP LOCKED`
(several workers are safe), runs idempotent handlers (read-model rebuild, notifications), retries with exponential backoff and moves an
event to `DEAD_LETTER` after 8 attempts, where a security administrator can see and retry it (`/v1/admin/outbox`). Delivery is
at-least-once; handlers are written to be idempotent (full recompute; notifications unique per event, kind and role). No Redis or
broker is needed at this scale; `docs/architecture/DEPENDENCY_SWAPS.md` says when to add one.

## 6. Search and graph architecture

* **Relationship graph** (Search Party): edges in `app.relationship` (typed, with provenance labels; vocabulary of 130 relations in
  `packages/domain-data/data/RELS.json`). `GET /v1/graph/:type/:id` loads the tenant's edges into the in-memory `Graph` of
  `packages/relationship-engine` and returns the neighbourhood and downstream impact, filtered by site scope (an asset or issue belongs
  to its room). Cost is O(edges of the tenant) per request: fine for the seed, a known limit — the extension point is a recursive SQL
  query or a graph store when a tenant's edge count makes it necessary. No separate graph database is justified today.
* **Knowledge search**: permission-aware keyword scoring over `app.knowledge_document` (`domain/platform.ts knowledge`): documents a role
  may not see are never scored or returned. No vector index: there is no semantic-search requirement backed by data yet.

## 7. AI and ML architecture

* No trained model is used by any product feature. The demonstrator's "intelligence" is deterministic rules, graph traversal, SQL and
  simulation — inventoried function by function in `docs/algorithms/ENGINE_INVENTORY.md`.
* `POST /v1/ai/requests` is the governed-assistant boundary: it logs the request (prompt stored as a SHA-256, not as text), retrieves the
  permitted sources, audits the attempt and returns **501 NOT_CONFIGURED** — no model is configured.
* `ml/` holds one research prototype on synthetic data with a model card; `services/intelligence-python` serves it behind a typed,
  authenticated contract. PyTorch is BLOCKED (not installable offline) and not needed for that prototype.

## 8. Frontend architecture

* `apps/enterprise-web`: React over the typed client; a small cache (`src/api.ts useQuery/useMutation`, the offline stand-in for
  TanStack Query); hash routes; components from `packages/ui` styled by `packages/design-tokens`. It never decides authority: it shows
  controls to roles that hold the authority and displays the server's refusals verbatim (E2E W-09 proves a bypassing call gets 403).
* `apps/founder-studio`: the founder's local hub (27 destinations) over the demonstrators, films, documents and the ported engine.
* Details: `docs/frontend/FRONTEND_ENGINEERING.md`; design system: `docs/design-system/`.

## 9. Security, storage, deployment

* Security architecture and threats: `docs/security/THREAT_MODEL.md`, `docs/security/SECURE_DEVELOPMENT.md`.
* Storage: `docs/architecture/STORAGE.md`.
* Infrastructure and deployment: `docs/operations/DEPLOYMENT_GUIDE.md`, `docker-compose.yml` (static configuration validated; runtime
  NOT_RUN in the build environment).
* Data architecture: `docs/database/DATA_ARCHITECTURE.md`; API: `docs/api/API_GUIDE.md`.

## 10. Repository organization

See the top-level `README.md` for the map. The layout follows directive section 16, adapted: integration code lives in
`integrations/contracts` and `integrations/mocks` as workspace packages; `packages/shared-utils` was not created because no code needs it
yet.
