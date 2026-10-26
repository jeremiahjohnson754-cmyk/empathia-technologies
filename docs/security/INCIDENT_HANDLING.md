# Incident handling

For the production starter and any pilot built from it. Synthetic data only today; this procedure becomes binding before any customer data.

## Severity

| Level | Examples |
|---|---|
| SEV-1 | Cross-tenant data exposure; signing key or database credential leaked; evidence altered or deleted; unauthorized write to a building system |
| SEV-2 | Authentication bypass for one tenant; outbox dead letters blocking notifications; evidence hash mismatch on read |
| SEV-3 | Single-user access problem; degraded integration (MOCK or real); elevated error rate without data impact |

## First hour

1. **Contain.** Revoke the affected memberships or disable the person (`app.person.disabled` — effective on the next request,
   `services/enterprise-api/src/http/server.ts:55`). For a key leak: rotate `JWT_SECRET` (all tokens become invalid) or, under OIDC,
   revoke at the IdP. For a database credential: rotate the role password and restart the API.
2. **Preserve evidence. Do not delete or rewrite anything.** The audit trail, evidence objects, results and revisions are append-only by
   design; take a `pg_dump -Fc` and a copy of the object store before any repair (procedure: `docs/operations/BACKUP_AND_RESTORE.md`).
3. **Trace.** Every request carries a correlation id (`x-correlation-id`, `http/server.ts:26-27`) present in the JSON logs and in
   `app.audit_event.correlation_id`. Query the audit trail (`GET /v1/audit`, steward or security admin) by aggregate or correlation id.
4. **Check integrity.** Every evidence read re-verifies the stored hash (`domain/commissioning.ts:50`); for a full sweep, compare each
   `app.evidence_object.sha256` with a re-hash of its object (the drill script shows how).
5. **Decide notification** with the owner and counsel. Contractual and legal notification duties depend on the customer and jurisdiction;
   nothing is sent externally without the owner's explicit approval.

## After

Write a post-incident review within five working days: timeline (from logs and audit), root cause, what detected it, what would have
prevented it, actions with owners. Add the weakness to `docs/security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md` and a regression test to
`tests/security/`.

## Contacts

To be filled in by the founder: security owner, on-call engineer, counsel, hosting provider support, customer contacts. No escalation
contacts exist yet (see `docs/operations/SUPPORT_ESCALATION.md`).
