# Empathia Technologies — monorepo

Empathia is one platform for the built environment: rooms, the technology in them, how that technology is designed, installed,
commissioned with evidence, serviced and assured over its life — one canonical record shared by eighteen product experiences.

This repository is the **founder-controlled software development program**: the Founder Studio (to explore what has been built), the
production starter (real API, database and server-side authorization behind the first vertical slice), the engineering blueprint, and the
provenance records. All data is synthetic. Nothing here is production-ready; the production readiness checklist says exactly what is
missing (`docs/operations/PRODUCTION_READINESS_CHECKLIST.md`).

## Start here

| You want to… | Go to |
|---|---|
| Run the production starter on your machine | [GETTING_STARTED.md](GETTING_STARTED.md) |
| Explore everything as the founder | `apps/founder-studio` → `node apps/founder-studio/build.mjs`, then the launcher in `apps/founder-studio/dist/` |
| Take over engineering (CTO) | [docs/engineering-handoff/CTO_HANDOFF.md](docs/engineering-handoff/CTO_HANDOFF.md) |
| See how it is put together | [docs/architecture/SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md) |
| Find every document | [docs/README.md](docs/README.md) |
| Review authorship and IP evidence (counsel) | [provenance/README.md](provenance/README.md) — restricted |

## What is in the repository

| Path | What | Language |
|---|---|---|
| `apps/founder-studio` | the founder's local hub: 27 destinations over the demonstrators, films, documents and engine | React, TypeScript |
| `apps/enterprise-web` | the production starter's web app over the API | React, TypeScript |
| `apps/investor-demo`, `apps/engineer-demo` | pointers to the frozen investor and engineer packages (not copies) | — |
| `services/enterprise-api` | the API: TypeScript modular monolith, PostgreSQL, server-side authorization, outbox | TypeScript |
| `services/integration-worker` | scheduled integration syncs (same monolith, second process) | TypeScript |
| `services/intelligence-python` | Python boundary; serves the synthetic research prototype | Python |
| `packages/commissioning-engine` | Build a Room engine: classification, design checks, applicability, results, lifecycle (ported from 2.5.4, 92 golden parity cases) | TypeScript |
| `packages/assurance-engine` | Assurance: baseline vs current across 17 dimensions (ported from 2.5.4) | TypeScript |
| `packages/relationship-engine` | Search Party graph: neighbourhood, impact, path | TypeScript |
| `packages/event-contracts` | 101 event types and their validation | TypeScript |
| `packages/api-client` | typed client generated from the OpenAPI contract | TypeScript |
| `packages/ui`, `packages/design-tokens` | components and CSS tokens (light and dark) | React, CSS |
| `packages/domain-types`, `packages/domain-data` | shared types; rule tables extracted from the demonstrator build | TypeScript, JSON |
| `packages/schemas` | JSON Schemas for events, API bodies and core entities | JSON |
| `integrations/` | adapter contract + Harmony rules, three MOCK adapters, the integration catalogue (CONTRACT_ONLY) | TypeScript |
| `database/migrations` | the schema (0001–0007), row-level security, append-only evidence | SQL |
| `ml/` | one research prototype on synthetic data, with model card | Python |
| `spatial/` | room model schema, geometry rules; 3D and UE5 contracts (specified only) | JSON, Markdown |
| `docs/` | blueprint: product, architecture, data, API, algorithms, frontend, design system, QA, security, operations, handoff | Markdown, Mermaid |
| `media/` | media manifests, rights classification, screenshots | JSON, CSV |
| `provenance/` | source manifest, SBOM, licences, AI-assistance record, classification, chain of title, invention disclosures | restricted |
| `releases/immutable-references` | hashes of the frozen releases; checks that they are unchanged | JSON |
| `tests/` | integration, security, browser, E2E, media tests | JS, Python |
| `scripts/` | bootstrap, build, test, dev, verify, discovery, media and API generators | Node, Python |

## Commands

```bash
node scripts/bootstrap.mjs     # link the workspace (offline); on a connected machine: pnpm install
node scripts/build.mjs         # build and type-check everything; checks the API contract
node scripts/db.mjs up         # local PostgreSQL 16 cluster under .local/pg
node scripts/dev.mjs           # migrate, seed, run API :4100, web :4200, Python :4300
node scripts/test.mjs          # unit, integration, security suites → tests/evidence/TEST_RESULTS.md
node scripts/verify-all.mjs    # build + tests + secret scan + link check + frozen-release check
```

## Status, in one table

| Area | Status |
|---|---|
| Founder Studio and demonstrators | working locally; frozen releases unchanged (checked) |
| Production starter API, database, authorization, vertical slice | working on synthetic data; integration and negative security tests pass |
| Enterprise web app | working against the API; E2E tested in Chromium |
| Integrations | contract + rules + three MOCK adapters; **no live or verified integration** |
| AI / ML | no trained model on real data; assistant generation NOT_CONFIGURED; PyTorch BLOCKED |
| Containers | Dockerfiles and compose validated statically; **not run** (no container runtime in the build environment) |
| Security | starter-level controls tested; **external assessment not done**; dev identity provider only |
| Distribution | **not authorized** — nothing here may be distributed externally without the founder's explicit approval |

Every claim above is backed by a test report or a document in `tests/evidence/` and `docs/`; the completion report
(`EMPATHIA_MASTER_COMPLETION_REPORT.md`) lists each verification item as PASS, FAIL, NOT_RUN or BLOCKED.
