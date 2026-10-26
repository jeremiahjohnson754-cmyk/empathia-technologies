# Team and ownership

Roles a professional team needs to take Empathia from the production starter to a first commercial pilot, and which folders of this
repository each role owns. Sizes are a proposal for the founder; they assume the plan in `WORK_BREAKDOWN_AND_PLAN.md` and the
estimates in `ESTIMATES.md`.

## Roles

| Role | When | Size (proposal) | Responsibilities |
|---|---|---|---|
| CTO / tech lead – architect | from day 1 | 1 | owns the architecture, the dependency swaps (`docs/architecture/DEPENDENCY_SWAPS.md`), the decision log, code review standards, the release gate; final say on KD-01 with the founder |
| Full-stack TypeScript engineers | from day 1 | 2–3 | enterprise API modules, web app, engines; one of them leans backend/data, one frontend |
| Platform / DevOps engineer | from day 1 (can be a partner at first) | 1 | CI, containers, environments, managed PostgreSQL, object storage, secrets, observability, backups and restore drills |
| Security engineer | part-time from day 15, full-time before the pilot | 0.5 → 1 | OIDC/MFA, threat model upkeep (`docs/security/`), secure SDLC, coordinating the external penetration test; never self-certifies |
| QA automation engineer | from month 2 | 1 | owns `tests/`, `scripts/test.mjs`, the golden parity cases, browser/E2E suites, release evidence (`tests/evidence/`) |
| AV / commissioning domain engineer | from day 1 (part-time is acceptable) | 0.5–1 | owns the rule tables (`packages/domain-data`), test library, applicability rules, field methods and evidence kinds; runs the pilot rooms; is the domain reviewer of every rule change |
| Product designer | from month 2 | 0.5–1 | design system (`packages/design-tokens`, `packages/ui`), field client UX, accessibility |
| Product manager / owner proxy | optional | 0–1 | acceptance matrices with the founder; pilot customer liaison |
| Data / ML engineer | **later** — only when real labelled data exists | 0 now | `ml/`; see the model card's preconditions |

Explicitly not needed yet: a dedicated 3D/UE5 developer (no contract exists), a separate integration team (one adapter at a time
through the conformance suite), microservice specialists (the modular monolith is intentional).

## Module ownership

| Folder | Owner role | Reviewer for changes |
|---|---|---|
| `services/enterprise-api/src/http`, `auth`, `db` | tech lead | security engineer |
| `services/enterprise-api/src/domain`, `modules/routes.ts` | full-stack (backend) | domain engineer for rule changes |
| `services/enterprise-api/src/integrations`, `integrations/` | full-stack (backend) | security engineer (writes, credentials) |
| `services/integration-worker` | platform | tech lead |
| `database/migrations` | full-stack (backend) | tech lead + security (RLS, grants) |
| `packages/commissioning-engine`, `packages/domain-data`, `packages/domain-types` | domain engineer + backend | QA (golden cases) |
| `packages/relationship-engine`, `packages/assurance-engine` | backend | domain engineer |
| `packages/event-contracts` | backend | tech lead (versioning) |
| `packages/api-client`, `scripts/api` | frontend | backend |
| `apps/enterprise-web`, `packages/ui`, `packages/design-tokens` | frontend + designer | QA (E2E, accessibility) |
| `apps/founder-studio` | frontend | founder |
| `services/intelligence-python`, `ml/` | backend now; data/ML later | tech lead |
| `tests/`, `scripts/test.mjs`, `scripts/verify-all.mjs` | QA | tech lead |
| `Dockerfile`, `docker-compose.yml`, `scripts/db.mjs`, `scripts/dev.mjs`, `docs/operations` | platform | security |
| `docs/security` | security | tech lead |
| `provenance/`, `releases/immutable-references` | founder + counsel | tech lead (read-only changes only) |

Rules: a rule change in `packages/domain-data` or `packages/commissioning-engine` needs the domain engineer's review and updated
golden cases; a migration touching RLS, grants or append-only triggers needs the security engineer's review; nobody modifies
`releases/immutable-references` or a frozen release.
