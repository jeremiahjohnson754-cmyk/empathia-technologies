# Monitoring, logging and alerting

## What exists

| Signal | Where | Content |
|---|---|---|
| Structured logs | `services/enterprise-api/src/log.ts` | one JSON line per event: `t`, `level`, `msg`, `service`, fields; `LOG_LEVEL` filters; warnings/errors to stderr. Never logs tokens, passwords or request bodies (`log.ts:1`) |
| Request log | `services/enterprise-api/src/http/server.ts` (finally block) | correlation id, method, path, status, role, duration ms |
| Correlation ids | `http/server.ts:26-27` | accepted from `x-correlation-id` when well-formed, else generated; returned in the response header, stored in `app.audit_event` and `app.outbox_event` |
| Health | `GET /health` (`main.ts:24-30`) | database reachable, server version, migrations applied, auth mode, object store kind, outbox worker counters (delivered/failed/dead-lettered), `liveHealth: NOT_MONITORED` |
| Outbox | `GET /v1/admin/outbox?status=DEAD_LETTER`, `POST /v1/admin/outbox/:event/retry` with `{ "reason": … }` (security admin; 409 unless dead-lettered; audited with prior attempts and last error) | dead-lettered events after 8 attempts with their last error (`worker/outbox.ts`); a dead letter holds the later events of its aggregate until it is replayed |
| Integration health | `app.integration_sync`; `GET /v1/integrations/:key/observations`; events `integration.adapter_health_changed`, `integration.connector_stale` | per-tenant state, last success, last error, retries |
| Audit | `GET /v1/audit` (steward or security admin) | every allowed change and every refusal |
| Slow queries | `log_min_duration_statement = 500` in the local cluster (`scripts/db.mjs:54`) | PostgreSQL log |

## Gaps

No metrics exporter (Prometheus/OpenTelemetry), no tracing, no log shipping, no dashboards, no alert routing, no uptime checks. **GAP.**
Live room health is not monitored anywhere (`NOT_MONITORED`), by design of the starter.

## What to alert on (when the pipeline exists)

| Alert | Condition | Severity |
|---|---|---|
| API down | `/health` fails or `database.reachable = false` for 2 minutes | page |
| Dead letters | any event in DEAD_LETTER | ticket; page if > 10 in 15 min |
| Outbox backlog | oldest PENDING event older than 5 minutes | ticket |
| Auth anomalies | spike of 401s or DENIED audit events per tenant/person | ticket; page on cross-tenant 404 bursts |
| Evidence integrity | any "stored evidence no longer matches its recorded hash" error | page (SEV-1/2, `docs/security/INCIDENT_HANDLING.md`) |
| Error rate | 5xx > 1 % over 5 minutes | page |
| Integration stale | `integration.connector_stale` | ticket |
| Database | connections > 80 % of max, replication/backup failure, disk > 80 % | page |
| Rate limiting | sustained 429s for one principal | ticket |
