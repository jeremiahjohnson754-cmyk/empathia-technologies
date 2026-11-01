# Enterprise API guide

The enterprise API (`services/enterprise-api`) is the server-side authority of the production starter: a TypeScript modular monolith on
Node's `http`, PostgreSQL 16 with row-level security, and a transactional outbox. It runs on synthetic data and is **not
production-ready** (see `docs/operations/PRODUCTION_READINESS_CHECKLIST.md`).

| Reference | Content | Source |
|---|---|---|
| [`openapi.json`](openapi.json) | OpenAPI 3.1, 156 operations | generated from the route table: `node scripts/api/export-openapi.mjs` (`--check` fails when stale); also served at `GET /v1/openapi.json` |
| [ENDPOINTS.md](ENDPOINTS.md) | endpoint inventory: method, path, summary, auth, authority, idempotency | `node scripts/docs/api-inventory.mjs` |
| [RBAC_MATRIX.md](RBAC_MATRIX.md) | which role can call which endpoint, and the rules beyond authority | `node scripts/docs/api-inventory.mjs` |
| [EXAMPLES.md](EXAMPLES.md) | real requests and responses (sign-in, list, detail, 400/401/403/404/422, idempotent replay) | `node scripts/docs/api-examples.mjs` |
| [ERRORS.md](ERRORS.md) | error taxonomy and database error mapping | `http/errors.ts`, `http/server.ts` |
| [EVENT_VERSIONING.md](EVENT_VERSIONING.md) | event envelope, contracts, compatibility | `packages/event-contracts` |
| [`packages/api-client`](../../packages/api-client/) | typed TypeScript client generated from the contract | `scripts/api/export-openapi.mjs` |
| [`packages/schemas`](../../packages/schemas/) | JSON Schema 2020-12 for request bodies, events and entities | `packages/schemas/scripts/generate.mjs` |

The route table (`src/modules/routes.ts`) is the single source of the implementation **and** the contract: request validation and the
OpenAPI document are generated from the same schemas, and `tests/integration/api.test.mjs` checks that every route is documented and
every documented operation is a route.

## Base URL, formats, headers

* `http://127.0.0.1:4100` locally (binds 127.0.0.1 unless `HOST` is set). Version prefix `/v1`; `/health` and `/v1/openapi.json` are public.
* Requests and responses are JSON (`application/json`); errors are `application/problem+json`. Evidence upload is a raw body with the
  file's media type and an optional `x-file-name`.
* Every response carries `x-correlation-id` (yours if you sent a valid one), `x-content-type-options: nosniff`, `cache-control: no-store`,
  `x-frame-options: DENY`, `referrer-policy: no-referrer` and `content-security-policy: default-src 'none'; frame-ancestors 'none'`.
* CORS: only origins in `CORS_ORIGINS` get `access-control-allow-origin`; a pre-flight from any other origin gets 403.

## Authentication

**Now (implemented):** a development identity provider. `POST /v1/auth/token` with email, password and optionally tenant and role
returns a compact JWS access token: **HS256**, claims `sub` (person), `tid` (tenant), `role`, `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`;
lifetime `TOKEN_TTL_SECONDS` (default 900 s); ±30 s clock tolerance; any `alg` other than HS256 (including `none`) is refused. Send it as
`Authorization: Bearer <token>`. `AUTH_MODE=dev` and the synthetic seed are refused when `NODE_ENV=production`; `JWT_SECRET` must then be
set (≥ 32 bytes). Passwords are scrypt-hashed. There are no refresh tokens (NOT IMPLEMENTED): sign in again after expiry.

**On every request** the server resolves the principal from the database (`resolvePrincipal`): the membership named by the token must
still exist and the person must not be disabled, so revoking a membership or disabling a person takes effect immediately, not at token
expiry. The token never carries authorities; they come from the role row.

**Target (SPECIFIED ONLY):** an OIDC provider issuing RS256 tokens verified against its JWKS, behind the same `TokenVerifier` interface
(`src/auth/jwt.ts`); the web app moves to authorization code + PKCE (or a backend-for-frontend with an httpOnly session cookie) instead
of holding the token in `sessionStorage`.

## Authorization

Deny by default. Each handler calls `ctx.require(<authority>)` before doing anything; a refusal returns 403 and is written to the audit
trail as `DENIED` in its own transaction. Authorities are the demonstrator's persona policy (`V25_PERSONAS.json`), unchanged — no role or
authority was added for the starter. Beyond the authority, domain rules (responsible persona for a result, independent verification,
lifecycle gates, site scope) refuse with 403 or 422; the database refuses again (RLS, composite foreign keys, triggers). The full matrix
and the rules beyond authority: [RBAC_MATRIX.md](RBAC_MATRIX.md). A record outside the caller's tenant or site scope answers **404**, not
403, so its existence is not disclosed.

## Pagination and filtering

* `GET /v1/rooms` — keyset pagination by room code: `limit` (1–200, default 50) and `after=<code>`; the response's `next` is the cursor
  for the following page (null on the last). Filter: `lifecycle=<state>`. Ordering is by `code`, stable under inserts.
* `GET /v1/audit` — `aggregateType`, `aggregateId`, `limit` (≤ 500, default 100), newest first.
* `GET /v1/admin/outbox` — `status` (PENDING | DELIVERED | DEAD_LETTER).
* `GET /v1/integrations/{key}/observations` — `limit` (≤ 500, default 50), newest first.
* `GET /v1/graph/{type}/{id}` — `depth` 1–4 (default 2).
* `GET /v1/knowledge` — `q` keyword search (permission-aware; documents a role may not see are never returned).
* Unknown query parameters are refused with 400 everywhere. Other lists are bounded by their scope (one room, one tenant) and not paginated
  yet (NOT IMPLEMENTED: cursor pagination on audit, notifications and observations beyond `limit`).

## Idempotency keys

Implemented in `src/http/server.ts` for the operations the route table marks idempotent (ENDPOINTS.md, column "Idempotency-Key":
room and device creation, connections, revisions, results, work orders, projects).

* Header `Idempotency-Key`: 8–128 characters of letters, digits and `._:-` (otherwise 400).
* Keys are scoped to the **person** (and tenant): `(tenant_id, person_id, key)`.
* The request fingerprint is SHA-256 of `METHOD path\n` + the raw body.
* First use: the request runs; if it succeeds (status < 300) the status and body are stored.
* Same key, same fingerprint: the stored response is returned with `idempotent-replay: true`; nothing runs again.
* Same key, different fingerprint: **422 `idempotency_mismatch`** (the status the IETF Idempotency-Key header draft gives this case).
* A failed first attempt stores nothing, so the same key can be retried.
* Keys do not expire yet (NOT IMPLEMENTED; proposed 24–72 h). Concurrent first uses of one key are not serialized (both may run;
  the second insert is ignored) — a known gap to close with a lock or an "in progress" row.

## Positions, physical assets and installations (ADR-0012)

A room's device (`PA-xxxx`) is a **position**: the slot, its purpose, mounting and design history. The hardware is a **physical asset**
(`AS-xxxx`: category, manufacturer, model, serial, `identityState` UNKNOWN → DECLARED → OBSERVED → VERIFIED), joined to a position by
an append-only, dated **installation** record. Every read that shows a device carries the same three fields — `position`, `asset`,
`identityState` (room detail `devices[]`, readiness `installations.devices`, Assurance `installation.devices`, Search Party `Asset` nodes).

| Operation | Authority | Notes |
|---|---|---|
| `POST /v1/rooms/{room}/positions/{position}/installation` | `work.evidence` | an empty position, INSTALLATION_PENDING or INSTALLED_UNVERIFIED; a spare `asset` or a new unit (`serial` → DECLARED) |
| `POST /v1/rooms/{room}/positions/{position}/replace` | `work.evidence` | like for like; `expectedInstallation` required (stale → 409); one transaction: close, open, outbox, audit; reopens the tests that covered the position |
| `PATCH /v1/rooms/{room}/devices/{asset}` `{ model }` | `room.design` | a model substitution while recommissioned: the old unit closes SUBSTITUTED, a unit of the new model opens; optional `expectedInstallation`, spare `asset` |
| `GET /v1/rooms/{room}/positions/{position}/history` | read | the design history apart from the installation timeline |
| `GET /v1/assets/{asset}/history` | read | identity changes and installations across positions and rooms (within your site scope) |
| `POST /v1/assets/{asset}/identity` | `work.evidence` / `field.scan`; VERIFIED: a verification authority | forward only; OBSERVED/VERIFIED need `evidenceId`; never verified by its declarer; a serial is final; a duplicate serial → 409 |

A result recorded at or before a change of unit that reopens its test is superseded: it keeps its label but never counts towards an
acceptance, cannot be verified, and its re-run needs evidence uploaded after the change. Database constraints back every rule (one open
installation per position and per unit, no overlapping periods, close-once, no DELETE): a refused overlap is `409`, a guard (`EM009`) `422`.

## Rate limiting

A token bucket per caller in each API process (`Bucket` in `http/server.ts`): capacity `RATE_LIMIT_PER_MINUTE` (default 600), refilled
continuously at that rate per minute; the key is the person when signed in, otherwise the client address. Over budget: 429
`rate_limited`. The bucket is in memory, so with several API instances the effective limit multiplies (NOT IMPLEMENTED: a shared limiter,
`Retry-After` and `RateLimit-*` headers).

## Webhook contracts

Inbound webhooks are part of the adapter contract (`Adapter.receiveWebhook`, `integrations/contracts/src/contract.ts`); the only
implementation is the mock service desk (`MockItsm.receiveWebhook`, `integrations/mocks/src/mocks.ts`):

* headers `x-mock-timestamp` (ISO-8601) and `x-mock-signature` = hex HMAC-SHA256 over `"<timestamp>." + raw body` with the tenant's
  webhook secret (a secret reference, never stored in the integration row);
* refused when unsigned, when the signature does not match (constant-time comparison), or when the timestamp is more than 5 minutes
  from the receiver's clock (replay window);
* body `{ "id", "state", "room"?, "summary"? }`, normalized to a `ticket` observation labelled `SYNTHETIC_MOCK`.

**NOT IMPLEMENTED:** a public HTTP endpoint that receives webhooks; outbound webhooks to customers. A real adapter must document its own
vendor scheme and pass `integrations/mocks/src/conformance.ts` against the vendor sandbox.

## Events

Every state change appends domain events to the transactional outbox in the same transaction; the worker delivers them at least once
to idempotent handlers (read model, notifications). Envelope, the 101 contracts, validation at emit and compatibility rules:
[EVENT_VERSIONING.md](EVENT_VERSIONING.md).

## Backward compatibility policy

* The major version is in the path (`/v1`). Within `/v1`: adding endpoints, optional request fields, response fields and enum values
  that clients must tolerate are allowed; removing or renaming fields, making an optional field required, changing a status code's
  meaning or tightening validation are breaking and need `/v2`.
* Deprecation (SPECIFIED ONLY — headers not emitted yet): a deprecated operation will send `Deprecation` and `Sunset` headers (RFC 9745 /
  RFC 8594) and a `Link` to its replacement for at least one release before removal, and is marked `deprecated: true` in the OpenAPI
  document.
* The typed client is regenerated from the contract in the same commit as any route change; `node scripts/api/export-openapi.mjs --check`
  fails the build when they diverge.
