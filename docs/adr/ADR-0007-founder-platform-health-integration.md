# ADR-0007 — Founder Studio ↔ platform: the platform-health integration contract

Status: accepted (owner decision "Administration + Founder Studio integration", 2026-10-30 12:59 CT) · Phase: P2 · Register RF-06 (class C → approved)

## Context

The owner approved that the Founder Studio may receive explicitly permitted platform-health summaries through governed APIs, and nothing
else: no unrestricted customer, tenant, financial or operational data. The reinforcement mandate (§5) requires every cross-application
integration to state its contract. This ADR is that contract for the one integration that exists.

## Contract

| Field | Value |
|---|---|
| Trigger | a founder reads `GET /v1/founder/platform-health` (pull; no push, no schedule) |
| Source of truth | `tests/evidence/TEST_RESULTS.json` and `VERIFY_REPORT.json` of the deployed build (read from `EVIDENCE_DIR`), the service's own `/health` function, the integration catalogue's state counts |
| Destination | Founder Studio, "Platform" view (hub destination over `src/lib/platform.ts`) |
| Fields | suite names/status/pass/fail counts and their generation time; verification status; service status/version; database reachability and migrations applied; outbox worker counters; `liveHealth` (always `NOT_MONITORED` today); integration adapter state counts; `excluded` list |
| Authorization | `founder.workspace` **and** principal in the founder organization (`founder.guard`); every enterprise principal, including `secadmin`, receives 403 |
| Classification | `CONFIDENTIAL_TECHNICAL` (stated in the payload) |
| Contract | this ADR + the route's OpenAPI entry; versioned with the API |
| Outcome | a JSON summary; nothing is written |
| Failure | a missing evidence file yields `{available:false, reason}` — never a fabricated pass; a database failure is reported through the service health block |
| Retry / idempotency | GET; safe to repeat |
| Audit | every read writes `founder.platform_health_read` ALLOWED (classification in the detail); refusals are audited by the authority layer |
| Notification | none |
| Boundary | no tenant ids, room codes, site codes, person emails, financial or operational records (asserted by test on the serialized payload) |

## Consequences

- The Founder Studio sees how the platform is doing without any customer data crossing the boundary (ADR-0001 §3 holds).
- Financial data of the founder organization never flows the other way: there is no enterprise route that reads `founder.*` tables.
- The Founder Studio view that renders this is P3 front-end work; the contract and its negative tests exist now.

## Evidence

`tests/security/administration.test.mjs` FH-1: six enterprise principals (both tenants) refused; founder read returns the classification,
the excluded list, an honest `tests.available`; no tenant identifiers in the payload; one ALLOWED audit row.
