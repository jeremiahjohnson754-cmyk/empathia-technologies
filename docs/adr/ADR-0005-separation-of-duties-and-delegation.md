# ADR-0005 — Separation of duties and scoped, expiring delegations

Status: accepted (owner decision RT-16, 2026-10-30 12:59 CT) · Phase: P2

## Context

The demonstrator's policy gave each persona a set of authorities but never asked *who authored the thing being approved*: a systems
engineer could approve a design revision they had just saved; the QA reviewer who verified every result could accept the room; nothing
let an absent approver hand their authority to a colleague for a week without an administrator re-assigning roles. The owner approved
independent authorization for funding, engineering approval, commissioning acceptance and baseline publication, with scoped, expiring
delegations, and no silent escalation or self-approval.

## Decision

1. **Self-approval is refused per artifact, not per role.** `RequestContext.separate(action, aggregate, authors, what)` refuses, with an
   audited rule refusal (RT-01 pattern), when the actor is among the authors of the thing approved:
   | protected action | authors checked |
   |---|---|
   | `room.classify.approve` | the person who saved the latest design revision |
   | `room.lifecycle:DESIGN_APPROVED` | the person who saved the latest design revision |
   | `room.lifecycle:ACCEPTED` (publishes a baseline version) | every recorder and verifier of the results accepted |
   | measurement verification | the recorder (also a database CHECK) |
   | baseline exception decision | the requester (also a database CHECK) |
   | membership grant/revoke | the administrator on their own memberships |
   Result verification already refused self-verification (slice 7); it is unchanged. Funding authorization (`funding.authorize`) is
   checked the same way when the governance front half lands (P5, RF-05): the rule is in place, the route is not.
2. **Delegation** (`app.delegation`, migration `0012`): a person lends **one authority they hold directly** to another member of the same
   tenant, with a reason, a scope and an expiry (≤ 90 days), revocable by the grantor or a security administrator. `'*'` is never
   delegated; a delegated authority cannot be re-delegated (the grantor must hold it directly).
3. **Resolved per request, never cached in the token.** `app.auth_delegations(person, tenant)` returns only delegations whose grantor
   *still holds* the authority through an unrevoked membership; the principal carries them as `delegated[]`, separate from
   `authorities[]`. `ctx.can` honours them; `ctx.require` writes an ALLOWED audit row with `delegated: true`, the delegation id, the
   grantor and the expiry whenever an action succeeds only by delegation.
4. **Delegation never lifts separation of duties.** The authorship checks run on the actor, delegated or not.
5. Routes: `GET/POST /v1/delegations`, `POST /v1/delegations/:id/revoke`; `GET /v1/me` shows `delegated`.

## Consequences

- Existing flows where one seeded person both authored and approved now fail by design; the tests that relied on that were wrong
  (`api.test.mjs` slice 7 already expected the QA reviewer's acceptance to be refused for another reason; the SoD refusal now follows it).
- The demonstrator's 14 UI roles stay a view preference (ADR-0006); permissions come from personas and delegations only.
- `app.delegation` has RLS enabled but not forced (like the identity tables), because the resolver runs as the definer before a tenant is
  set; the runtime role is still confined to its tenant.

## Evidence

`tests/security/governance.test.mjs` SoD-1 (author cannot approve classification/design; audited), SoD-2 (verifier cannot accept), DEL-1
(cannot lend what you do not hold; `'*'` refused; grantee sees it in `/v1/me`; third party sees nothing), BL-1 (delegated acceptance
audited with the delegation id), DEL-2 (revocation immediate; a grantor who lost the role lends nothing), BL-4 (requester cannot decide),
`administration.test.mjs` ADM-3 (own membership refused). `authority-matrix.test.mjs` still covers every keyed route for every role.
