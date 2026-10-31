# ADR-0010 — Evidence Ledger integrity: a per-tenant hash chain over the audit trail (P1)

Status: implemented 2026-10-31 (Project Ascension directive, P1 "Evidence Ledger") · migration `0024_audit_chain.sql`

## Context

The directive asks the Evidence Ledger for "persistent events, actor/authorization context, provenance, relation to workflow, version
history, immutable events, integrity verification, tenant/site restrictions". `app.audit_event` already gave persistence, actor, role,
action, outcome, the aggregate (the workflow record), a correlation id and RLS per tenant. An append-only trigger (`refuse_change`)
blocked UPDATE and DELETE. What it lacked was **integrity verification**: the trigger stops ordinary writes, but nothing could show that
the trail had not been changed by someone who can disable a trigger.

## Decision

1. **A SHA-256 chain per tenant.** Each event gets `seq` (1, 2, 3 … per tenant), `prev_hash` (the previous event's hash, 32 zero bytes
   for the first) and `hash = sha256(prev_hash ‖ canonical(event))`. The canonical form is a JSON array of every column, including `seq`
   and the row id; Postgres's jsonb text output is deterministic. Changing any field, deleting an event, or re-ordering or re-pointing
   a link therefore breaks the chain at a named sequence number.
2. **Sealed after commit, not inside the request.** Holding a per-tenant chain lock in every writing transaction would serialize all
   writes and add a deadlock path (a request that has audited early holds the chain lock while waiting on a row lock held by another
   request). Instead, `app.seal_audit(tenant)` seals committed, unsealed events in id order under a short advisory lock that only
   sealers take. The background worker calls `app.seal_audit_all()` every tenth outbox tick, and the verification endpoint seals before
   it checks. Events committed concurrently with a seal are picked up by the next one: the chain order is seal order, not id order.
3. **Write-once seal.** The append-only trigger now permits exactly one kind of UPDATE: setting `seq`, `prev_hash` and `hash` from NULL,
   with every other column unchanged. Everything else, including for a database superuser, raises "append-only".
4. **Verification independent of the sealer.** `GET /v1/audit/integrity` (`provenance.review` or `policy.configure`) seals, then reads
   the chain and recomputes every hash in the API process with Node's `crypto`. The database function that wrote the hashes is not
   trusted to check them. The endpoint reports `verified`, events checked, the first break (gap, link or content) and the head
   (`seq`, `hash`, time), together with its limits.
5. **Tenant isolation.** The sealer sets the tenant for its own transaction, so it runs under the tenant's RLS policy (RLS is forced on
   the owner too). The runtime role can seal only the tenant its session is for. Only the worker role may run the all-tenant sealer.

## Consequences

- Detection, not prevention: the chain shows **that** and **where** the trail changed; it does not stop someone with superuser access.
- Limits, also returned by every verification:
  1. events are unsealed between commit and the next seal (at most about 10 worker ticks, or until someone verifies);
  2. the chain proves nothing about changes made before migration 0024 sealed the existing events;
  3. someone who rewrites an event **and every later hash** inside the database is detectable only by comparing the head with one
     recorded outside the database. No external anchoring (a timestamping service or a write-once store) is configured in this build.
     That would be an external integration and needs owner authorization.
- Tests: `tests/security/ledger.test.mjs` LED-1..5 cover authority, verification end to end, append-only for a superuser, worker
  sealing, tenant separation, and tamper detection: changed content is found at its sequence number, restoring the content restores the
  chain, and a deletion is reported as a gap. Browser: Administration › Audit has "Verify the chain" and the chain position on each row.
