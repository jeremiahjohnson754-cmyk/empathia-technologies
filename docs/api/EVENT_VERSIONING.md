# Event contracts and versioning

Domain events are the integration surface between Empathia's modules (and, later, external consumers). They are defined once in
`packages/event-contracts` and published as JSON Schema in `packages/schemas/schemas/events/` (one file per type).

## The catalogue

* **101 event types**, extracted unchanged from the 2.5.4 demonstrator (`V25_EVENTS`, `src/v25-01-core.js`, via
  `packages/domain-data/data/V25_EVENTS.json`). Each type lists the payload fields it **requires**; e.g.
  `commission.test_result_submitted` requires `planId`, `testId`, `state` and `evidence` (the starter also sends `resultLabel`), and
  `integration.adapter_health_changed` requires `adapter` and `state`.
* Families (count of types): room 16, commission 12, project 7, control 6, field 4, work_order 4, assurance 3, design 3, drawing 3,
  request 3, standardization 3, and 30 smaller families.
* **25 types are emitted by the starter today**: `room.design_created`, `room.design_revision_saved`, `room.geometry_updated`,
  `room.device_added`, `room.device_moved`, `room.device_swapped`, `room.device_removed`, `room.connection_changed`,
  `room.classification_approved`, `room.design_approved`, `room.lifecycle_changed`, `room.test_verified`, `drawing.revision_generated`,
  `commission.applicability_compiled`, `commission.test_result_submitted`, `commission.test_failed`, `commission.deficiency_opened`,
  `commission.deficiency_resolved`, `deficiency.identified`, `issue.created_or_updated`, `issue.assigned`, `work_order.created`,
  `service.field_completed`, `integration.adapter_health_changed`, `integration.connector_stale`. The other 76 are contracts only.

## The envelope (schema version 1.0.0)

| Field | Type | Meaning |
|---|---|---|
| `id` | string (uuid) | unique event id; consumers deduplicate on it |
| `type` | string | one of the 101 types |
| `schemaVersion` | `1.x.y` | `EVENT_SCHEMA_VERSION`, currently **1.0.0** |
| `tenantId` | string | tenant the event belongs to (events never cross tenants) |
| `aggregateType`, `aggregateId` | string | the record that changed (`Room` / `R-PLN-0001`, `RoomIssue` / `RISS-0001`, `WorkOrder`, `Integration`) |
| `aggregateRevision` | integer ≥ 0 | the aggregate's revision after the change (`room.rev`) |
| `occurredAt` | date-time | when the change committed |
| `actorId` | string or null | the person who caused it |
| `correlationId` | string | the request's correlation id (traces an event back to its request and audit rows) |
| `causationId` | string or null | the event that caused this one (reserved; not set by the starter) |
| `payload` | object | at least the type's required fields, none null or empty; additional fields allowed |

In the starter the envelope is stored as columns of `app.outbox_event` (`schema_version`, `aggregate_type`, … , `payload` jsonb).

## Validation at emit

`RequestContext.emit` (`services/enterprise-api/src/auth/context.ts`) calls `validateEvent` **before** writing the event into the outbox in
the business transaction. An unknown type, a missing aggregate, a negative revision, a missing required payload field, or a
`resultLabel` of bare `PASS` aborts the whole transaction with a 500 — a change can never commit with a corrupt event. Delivery is
at-least-once (outbox worker, 8 attempts, then DEAD_LETTER); handlers must be idempotent (the read-model handler recomputes from the
canonical tables; notifications are unique per event, kind and role).

## Compatibility rules

| Change | Version | Rule |
|---|---|---|
| Add an optional payload field | MINOR (1.0.0 → 1.1.0) | consumers must ignore fields they do not know |
| Add a new event type | MINOR | consumers must ignore types they do not handle |
| Make an optional field required, remove or rename a required field, change a field's meaning or type | **MAJOR** (→ 2.0.0) | publish both versions side by side (dual-publish) for a deprecation window agreed with consumers; the type name stays the same, the envelope's `schemaVersion` tells them apart |
| Fix a description only | PATCH | no consumer impact |

Consumers declare the MAJOR version they accept and must accept every MINOR of it. **NOT IMPLEMENTED in the starter:** dual-publish
and per-consumer version negotiation (there is one in-process consumer, the outbox worker); an external event bus (the outbox is in
PostgreSQL; a relay to a broker is the extension point).

To add or change an event: edit the contract in `packages/domain-data/data/V25_EVENTS.json` only together with a version bump in
`packages/event-contracts` (`EVENT_SCHEMA_VERSION`), regenerate the schemas (`node packages/schemas/scripts/generate.mjs`), and keep the
demonstrator parity note in `packages/event-contracts` up to date.
