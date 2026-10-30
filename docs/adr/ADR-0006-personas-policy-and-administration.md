# ADR-0006 — Personas as the canonical policy; UI roles as a view; administration

Status: accepted (owner decisions RT-17 and "Administration", 2026-10-30 12:59 CT) · Phase: P2

## Context

The legacy source carried two vocabularies: 14 UI roles (`visitor, employee, exec, service, svcmgr, syseng, designer, installer, cxeng,
ipm, bpm, ops, steward, architect`) selected by a switch in the header, and 22 personas (`V25_PERSONAS.json`) that carried the actual
authority lists. The red team (RT-17) asked which one the migration adopts. The owner decided: preserve all 22 personas and the existing
UX; one canonical authorization policy mapping personas → permissions; a UI role switch is never authentication; legacy routes and
workflows stay compatible. The owner also approved an administration surface with strict boundaries: authorized invitations, scoped
memberships, policy management, audit; the founder role grantable only inside the founder organization.

## Decision

1. **The 22 personas are the roles.** `app.role` is seeded from `V25_PERSONAS.json` unchanged (plus `founder`, ADR-0001). A principal's
   permissions are the union of its persona's authorities and its in-force delegations (ADR-0005). `architect` (`*`) is seeded nowhere
   and is never grantable through administration.
2. **The 14 UI roles are a view preference.** `admin.UI_ROLE_TO_PERSONA` maps each UI role to the persona whose home it shows
   (`ops → opslead`, `visitor/employee → requestor`, the rest by name). The front-ends may keep the legacy switch to change what is
   *shown*; every request is authorized by the signed-in principal. `GET /v1/admin/policy` publishes the mapping with that note.
3. **Legacy routes stay.** The demo keeps the `#/area/...` address space (`apps/demo/src/registry.ts`); the API accepts display codes
   wherever a key is also accepted; nothing an investor or engineer has bookmarked changes meaning.
4. **Administration** (migration `0015_administration.sql`, `domain/admin.ts`; authority `policy.configure`, held by `secadmin`):
   - *Invitations*: pinned to the administrator's own tenant (the tenant id is written server-side; RLS confines reads); a role, an
     optional site scope, 1–30 days; the one-time token is returned once and only its SHA-256 is stored; revocable while open.
   - *Acceptance* is unauthenticated and atomic (`app.accept_invitation`, SECURITY DEFINER): the token is the credential, used once;
     the person is created or matched by email; the membership carries the invited role and site scope.
   - *Memberships*: grant (with site scope) and revoke; never the administrator's own; never `architect`.
   - *Founder boundary*: trigger `app.founder_role_boundary()` (EM008) on invitations and memberships refuses the `founder` role in any
     tenant but `empathia-founder`; the API turns it into an audited rule refusal.
   - *Policy read*: personas with authorities, the UI-role mapping, the separation-of-duties rules, the delegation limits.
   - Every administrative action is audited; cross-tenant attempts resolve to 404 (the person is not visible) or 400 (site unknown).
5. **Production identity** stays OIDC (`person.password_hash` is the development provider only; `config.ts` refuses it in production);
   the invitation flow sets a development password today and will bind an OIDC subject once a provider is configured
   (listed under awaiting external integration).

## Consequences

- No new authorities were invented; `policy.configure` gates administration as it gated `/v1/people` and `/v1/audit` already.
- `app.invitation` has RLS enabled but not forced (the acceptance function runs before a tenant is chosen), like the identity tables.
- The RBAC matrix document and the authority-matrix test grew with the new routes (52 gated rows × 22 roles).

## Evidence

`tests/security/administration.test.mjs` ADM-1…ADM-4 (403 for non-administrators; founder/architect refused and audited; other tenant's
site code unknown; token stored hashed and shown once; acceptance once; sign-in with invited role and site scope; own membership refused;
second tenant's administrator cannot reach this tenant's people; revoked membership no longer signs in; policy model shape).
