# ADR-0002 — Deployment architecture: four surfaces, one modular monolith, managed PostgreSQL

Status: accepted (checkpoint 1) · Phase: P1 · Related: ADR-0001

## Context

The mandate recommends Next.js + Tailwind + a managed Postgres, deployed as `www`, `demo`, `app` hosts. This environment has no package
registry access: only the tooling already vendored here (Node 22, TypeScript, esbuild, React 19, Playwright, PostgreSQL 16, Python) can be
used, and everything must keep building offline. The founder master build already runs a modular monolith on that tooling, with passing
suites. Re-platforming to Next.js would discard tested code for a framework that cannot even be installed here; the mandate itself says an
equivalent simpler monorepo is acceptable if it runs and preserves boundaries.

## Decision

| Surface | Host / path | Deployable | What it carries | Who may reach it |
|---|---|---|---|---|
| Public website | `www.<domain>` | `apps/website` — static, pre-rendered at build (React on the server side only; 1.6 KiB browser script) | marketing pages, lead forms → `POST /v1/public/leads` | anyone |
| Investor demo | `demo.<domain>` | `apps/demo` — static shell + synthetic data, no API dependency for the demonstration itself | guided scenarios, migrated Living Campus areas, perspective picker (never authorization) | anyone with the link; optional invitation token + rate limit (P3) |
| Enterprise application | `app.<domain>` | `apps/enterprise-web` (static) + `services/enterprise-api` (Node, modular monolith) + `services/integration-worker` + `services/intelligence-python` | the authenticated multi-tenant product | authenticated members of a tenant |
| Founder Studio | `founder.<domain>` (private; `noindex`; may also stay a local launcher) | `apps/founder-studio` (static) over the **same API binary** with the `founder` module enabled and its own schema/role/bucket (P4F) | founder workspace, films, vault, engineering records | members of the founder organization with the `founder` role, MFA required when the identity provider supports it |

* **One API process, separate policy domains.** The enterprise and founder modules live in the same service binary (shared identity,
  audit, outbox, storage abstraction) but in separate PostgreSQL schemas with separate database roles and row-level-security policies;
  the API refuses founder operations for any principal outside the founder organization, and refuses enterprise data to founder-only
  principals. Cross-boundary access is a negative test in `tests/security`.
* **Static front-ends behind one reverse proxy.** Each front-end is a directory of static files served with a strict CSP (`connect-src`
  limited to the API origin). In production a reverse proxy (Caddy or nginx; or the hosting provider's CDN) serves the four hosts over
  TLS and forwards `/v1/*` to the API. The repository's `docker-compose.yml` already defines postgres, api, worker, web, intelligence;
  `website`, `demo` and `founder` services are added as further static servers (P9).
* **Database.** PostgreSQL 16 (managed service in production; local cluster or the compose service in development). Migrations are SQL
  files applied in order by the API's migration runner with a ledger; roles: owner (migrations), app (RLS-constrained), worker (outbox).
* **Object storage.** The `ObjectStore` abstraction with the local store today and an S3-compatible store for production (compose
  `s3` profile; implementation is CONTRACT_ONLY until P4F/P8).
* **Identity.** Dev mode and signed JWT sessions today; OIDC (Entra ID / any OpenID provider) is the production path and is BLOCKED
  until the owner supplies a provider and credentials — the code path exists as an adapter boundary, not as a fake SSO.
* **Jobs and events.** Transactional outbox in PostgreSQL, one worker, idempotent consumers; no message broker until a measured need.
* **Observability.** Structured JSON logs, `/health` with migration-ledger check, audit table; metrics/traces export is P8.
* **Environments.** `dev` (local), `staging` and `production` (owner's accounts) configured only by environment variables
  (`.env.example` lists them, without secrets). No domain is assumed to exist; `--base` and `--api` are build inputs.

## The framework and runtime actually used, and its limits

| Concern | What is used | Limit, and how it is handled |
|---|---|---|
| Language and runtime | TypeScript (strict) on Node 22 for the API, workers and build tooling; React 19 for the three front-ends; Python 3 (Starlette) for the intelligence service | Node 22 LTS is current; the Python service is optional and has its own service token |
| Front-end delivery | esbuild bundles; the public site is pre-rendered to static HTML at build time with `react-dom/server`; the demo, enterprise and founder apps are client-rendered single-page applications served as static files | no server-side rendering at request time, so personalised pages render after the API answers (acceptable for authenticated apps; the public site is fully static, so SEO and first paint do not depend on JavaScript) |
| Routing | hash routing in the client apps (kept so every legacy `#/` address resolves); path routing on the public site | hash routes are not crawlable — intended for the demo and the authenticated apps, never for the public site |
| HTTP | Node's `http` module with a small typed router, JSON-schema-validated bodies and queries, an OpenAPI document generated from the route table and a generated client | no framework middleware ecosystem; each concern (CORS, CSP, rate limit, auth, idempotency, correlation ids) is implemented and tested in `services/enterprise-api/src/http` |
| Database | PostgreSQL 16; SQL migrations with a ledger; three roles (owner, app, worker); row-level security on tenant tables and policy flags on operator tables (for example `public_lead`) | no ORM: queries are hand-written and parameterised; the schema dump and entity dictionary are generated |
| Background work | transactional outbox table + one worker process with retries, dead-letter and admin retry | single worker; horizontal scaling means advisory-locked polling (P8) |
| Storage | `ObjectStore` abstraction: local directory now, S3-compatible implementation CONTRACT_ONLY | production needs the S3 implementation and virus scanning before external uploads (P4F/P8) |
| Identity | development identity provider and signed HS256 sessions; OIDC adapter boundary | production identity (OIDC/Entra, MFA) is BLOCKED on the owner's provider and credentials; no fake SSO is shipped |
| Testing | `node:test` unit and integration suites over a real database, Playwright browser suites, security denial suites | Chromium only in this environment; Firefox and WebKit NOT_RUN |

## Deployment compatibility and production security

* **Any static host + any Node host.** The three static front-ends deploy to a CDN or static server (Vercel, Netlify, S3+CloudFront,
  nginx, Caddy); the API and worker deploy as containers or a Node process behind a reverse proxy (Dockerfile and compose provided,
  runtime NOT_RUN here). Managed PostgreSQL (RDS, Cloud SQL, Supabase, Neon) works unchanged because the schema relies only on
  standard PostgreSQL 16 features (RLS, `SECURITY DEFINER` functions, `gen_random_uuid`).
* **Security posture at the edge.** Each static server sends a CSP that allows scripts and styles from itself only and connections to
  the API origin only, `X-Frame-Options: DENY`, `nosniff`, no-referrer; the API answers only its configured CORS origins, applies
  per-caller rate limits, body-size caps, JSON-only bodies, correlation ids, structured logs without secrets, and audits every denied
  authority. Production adds TLS termination, HSTS, a secrets manager for `JWT_SECRET`/database passwords, and separate hosts so that
  `founder.` can carry stricter network rules (allow-listed addresses, mandatory MFA) than `app.`.
* **Separate trust zones.** Public (`www`, `demo`) → no credentials, no tenant data, synthetic only. Authenticated (`app`) →
  tenant-scoped. Private (`founder`) → founder organization only, own schema, own bucket, own policy flags; a cross-zone read is a
  tested denial. The reverse proxy must never route `founder.*` paths to a public host.

## Is a later move to Next.js appropriate?

Yes, for the public site and possibly the authenticated front-ends — and the architecture keeps that door open deliberately:

* The public site is already "server-rendered" in the only sense that matters for it (static HTML with metadata). Next.js would add
  incremental static regeneration, image optimisation and a larger ecosystem; its migration is a front-end-only change because the
  site has no coupling to the API beyond one `POST /v1/public/leads`.
* The authenticated apps gain from Next.js only if request-time SSR of personalised pages becomes a measured need (very large tables,
  slow devices). The typed API client, the design tokens and the UI package are framework-neutral and move over unchanged.
* The API should **not** move into Next.js route handlers: the modular monolith with its own HTTP layer keeps authorization, RLS
  transactions, outbox and audit in one testable process that can scale and be deployed independently of any front-end host.
* Trigger for the move: a hosting decision by the owner (P9) on a provider with first-class Next.js support, taken with registry access
  so that exact versions can be pinned and audited (SBOM). Until then the current stack is not a compromise forced by tooling but a
  smaller, fully owned foundation; the decision is recorded here so that the temporary constraint does not harden into an accident.

## Consequences

* No framework re-platforming; the public site stays trivially cacheable and fast; SEO is served by pre-rendered HTML.
* The founder surface inherits identity, audit and storage without a second backend, at the cost of a stricter policy test matrix
  (every operation is tested from both sides of the boundary).
* Container runtime and hosting cannot be exercised here (NOT_RUN); compose and Dockerfiles are validated statically and must be run on
  the owner's machine or staging before any claim of deployment.
* If the owner later chooses a hosting provider with first-class Next.js support, the static surfaces can be re-hosted without changing
  the API; ADR-0003 would record that.
