# Build versus buy

Recommendations for the capabilities a commercial Empathia needs. The rule of thumb: **buy commodity infrastructure, build what is
Empathia** — the evidence model, the commissioning rules, the relationship graph, the governed lifecycle and the honest maturity
labelling. Named open-source projects are examples of a category; no vendor partnership or endorsement is implied, and the final
choice belongs to the CTO.

| Capability | Recommendation | Rationale | Today in the starter |
|---|---|---|---|
| Identity (OIDC, MFA, SSO) | **Buy / integrate**: the customer's identity provider via OIDC; a managed IdP for Empathia's own staff | Enterprise buyers require SSO and MFA from their own directory; building an IdP is a liability | development identity provider, HS256 (`services/enterprise-api/src/auth/jwt.ts`) behind a `TokenVerifier` interface ready for RS256 + JWKS |
| Authorization (roles, authorities, tenant and site scope) | **Build (keep)** | It is domain logic: authorities like `room.design.approve` or `customer.accept` and the verification-separation rule are the product | `auth/context.ts`, `app.membership`, RLS |
| Relational database | **Buy managed PostgreSQL** (with row-level security support verified on the chosen service) | RLS, append-only triggers and constraints are core controls; operations, backups and patching are commodity | local PostgreSQL 16 (`scripts/db.mjs`) |
| Object storage | **Buy S3-compatible storage**; MinIO for local development | Evidence retention (7 years), encryption, lifecycle policies | `LocalObjectStore`; `S3ObjectStore` CONTRACT_ONLY (`src/storage/objectStore.ts:36`) |
| Malware scanning of evidence uploads | **Buy** (a scanning service or an open-source scanner run as a sidecar) | Evidence files come from the field | none (GAP) |
| Observability (logs, metrics, traces, alerting) | **Buy a managed stack**; instrument with OpenTelemetry | Commodity; correlation ids already exist | structured JSON logs with correlation ids (`src/log.ts`) only |
| Queue / background jobs | **Build on PostgreSQL (keep the outbox)** until load proves otherwise; then a PostgreSQL-backed job library or a managed queue | The transactional outbox with SKIP LOCKED, retries and dead letter already works and is tested; Redis is not needed today | `worker/outbox.ts` |
| Search (people, rooms, documents) | **Build on PostgreSQL** (full-text, trigram) first; buy a search service only when volume or relevance demands it | Volumes per tenant are modest; permission filtering must stay server-side | keyword search in `domain/platform.ts` |
| Relationship graph | **Build (keep)** on PostgreSQL edges | 130 relation types with provenance and site-scoped visibility are product logic; a graph database only if traversal performance proves inadequate | `packages/relationship-engine`, `app.relationship` |
| 3D in the browser | **Use an open-source library** (Three.js / React Three Fiber) | Commodity rendering; Empathia's value is the room model and its confidence | none in the starter; demonstrator has browser 3D |
| Native real-time 3D (UE5) | **Defer** | No contract exists (`spatial/ue5-contracts` not written); high cost, uncertain buyer value | none |
| ITSM / device-management connectors | **Build adapters** against the common contract (`integrations/contracts`), one at a time, read-only first; buy an integration platform only if the number of systems explodes | Source authority and evidence labelling (Harmony) are product logic; vendor APIs and terms differ | 3 MOCK adapters; none VERIFIED |
| Workbook export (.xlsx) | **Use a maintained open-source library** | Commodity file format | demonstrator only |
| AI / LLM generation | **Buy model access** when a governed use case is approved; **build** the governance (permission-aware retrieval, citations, logging, approval for actions) | The governance shell exists; generation is `NOT_CONFIGURED` by design | `POST /v1/ai/requests` → 501 with permitted sources |
| Machine learning | **Do not build yet** | No real labelled data; the synthetic prototype validates only the pipeline (`ml/model-cards/first-attempt-fail-risk.md`) | research prototype only |
| HTTP framework, DB client | **Use maintained open-source** (Fastify or NestJS on Fastify; `pg`) | The framework-free layer and the vendored client exist only because the build environment was offline | `docs/architecture/DEPENDENCY_SWAPS.md` |
