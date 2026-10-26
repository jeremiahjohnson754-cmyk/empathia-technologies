# Customer onboarding

## What exists

| Step | How today |
|---|---|
| Create a tenant, its sites and buildings | only by the synthetic seed (`services/enterprise-api/src/db/seed.ts`) or SQL as the schema owner |
| Create people and memberships (role + optional site scope) | seed or SQL as the owner; the runtime role cannot insert into `app.person`/`app.role` (`database/migrations/0004_platform.sql` grants) |
| List people and memberships | `GET /v1/people` (security admin; audited) |
| Integration catalogue | seeded from `integrations/contracts/INTEGRATION_REGISTRY.csv`; all CONTRACT_ONLY except three MOCKs |
| Projects | `POST /v1/projects` (executive), rooms assigned with `POST /v1/rooms/:room/project` |
| Rooms | `POST /v1/rooms` (designer) or the enterprise web app |

## Gaps — no tenant administration path

There is **no tenant admin API or UI**: no endpoint to create a tenant, site or building, invite a person, grant or revoke a membership,
or offboard a tenant. **GAP.** Until it exists, onboarding a real customer would require direct SQL by an operator, which bypasses the
audit trail. Build before any pilot:

1. Platform-operator API (separate from tenant APIs) to create a tenant with its first security administrator.
2. Tenant security-admin endpoints: sites/buildings, invitations through the customer's OIDC, memberships with site scope, all audited.
3. Bulk import of rooms and assets with canonical-id matching (serial/MAC only — `integrations/contracts/src/harmony.ts` `matchCanonical`).
4. Offboarding: export (rooms, evidence with hashes, audit), retention hold for evidence (`retention_until`), then deletion of personal data
   where the law requires it — note evidence and audit are append-only by design, so a retention/erasure procedure needs counsel's input.
