# Support and escalation

No support organization exists yet. This is the intended model for a pilot.

| Tier | Who | Handles | Tools that exist today |
|---|---|---|---|
| 1 | Customer service desk (customer side) | how-to, access requests | — |
| 2 | Empathia support engineer | sign-in problems, permissions, data questions, integration health | `GET /v1/audit` by correlation id; `/health`; `app.integration_sync`; dead-letter list and retry |
| 3 | Empathia engineering on call | defects, outages, data integrity, security incidents | logs with correlation ids; database; `docs/security/INCIDENT_HANDLING.md` |

Ask every reporter for the **reference** shown in error messages: it is the request's correlation id (the web app shows it in
`ErrorState`, `packages/ui/src/components.tsx`), which locates the request in the logs and the audit trail.

Escalate immediately (SEV-1) on any suspicion of cross-tenant access, altered evidence, leaked credentials or an unapproved write to a
building system. Contacts and hours: to be set by the founder (none recorded).
