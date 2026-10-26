/**
 * @empathia/event-contracts — the event catalogue shared by the demonstrator and the enterprise API.
 *
 * The 101 event types and their required payload fields are extracted unchanged from the demonstrator (V25_EVENTS in
 * src/v25-01-core.js, via packages/domain-data). Every event travels in one envelope. Versioning: the envelope carries
 * `schemaVersion`; a change that removes or renames a required field is a new MAJOR version and a new type name suffix is NOT used —
 * consumers must accept every MINOR version of the MAJOR they declare (see docs/api/EVENT_VERSIONING.md).
 */
import V25_EVENTS from '@empathia/domain-data/data/V25_EVENTS.json' with { type: 'json' };

export const EVENT_SCHEMA_VERSION = '1.0.0';
export const EVENT_CONTRACTS: Readonly<Record<string, readonly string[]>> = Object.freeze(V25_EVENTS as Record<string, string[]>);
export type EventType = keyof typeof EVENT_CONTRACTS & string;

export interface EventEnvelope<P extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: string;
  schemaVersion: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateRevision: number;
  occurredAt: string;
  actorId: string | null;
  correlationId: string;
  causationId?: string | null;
  payload: P;
}

/** The problems with an event, or [] when it satisfies its contract. */
export function validateEvent(e: Pick<EventEnvelope, 'type' | 'aggregateType' | 'aggregateId' | 'aggregateRevision' | 'payload'> & Partial<EventEnvelope>): string[] {
  const p: string[] = [];
  const need = EVENT_CONTRACTS[e.type];
  if (!need) p.push(`unknown event type ${e.type}`);
  for (const k of ['aggregateType', 'aggregateId'] as const) if (!e[k]) p.push(`missing ${k}`);
  if (!Number.isInteger(e.aggregateRevision) || (e.aggregateRevision as number) < 0) p.push('aggregateRevision must be a non-negative integer');
  if (!e.payload || typeof e.payload !== 'object') { p.push('payload is not an object'); return p; }
  for (const k of need || []) if (e.payload[k] === undefined || e.payload[k] === null || e.payload[k] === '') p.push(`missing payload field ${k}`);
  // R3-2: a commissioning result never travels as a bare PASS label
  if ('resultLabel' in e.payload && e.payload['resultLabel'] === 'PASS') p.push('resultLabel PASS is not a result label (use PASS_UNVERIFIED or PASS_VERIFIED)');
  return p;
}

/** JSON Schema (draft 2020-12) for one event type: the envelope plus the type's required payload fields. */
export function jsonSchemaFor(type: string): Record<string, unknown> {
  const need = EVENT_CONTRACTS[type];
  if (!need) throw new Error(`unknown event type ${type}`);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://schemas.empathia.invalid/events/${type}/${EVENT_SCHEMA_VERSION}.json`,
    title: type,
    type: 'object',
    required: ['id', 'type', 'schemaVersion', 'tenantId', 'aggregateType', 'aggregateId', 'aggregateRevision', 'occurredAt', 'correlationId', 'payload'],
    properties: {
      id: { type: 'string', minLength: 1 }, type: { const: type }, schemaVersion: { type: 'string', pattern: '^1\\.\\d+\\.\\d+$' },
      tenantId: { type: 'string', minLength: 1 }, aggregateType: { type: 'string', minLength: 1 }, aggregateId: { type: 'string', minLength: 1 },
      aggregateRevision: { type: 'integer', minimum: 0 }, occurredAt: { type: 'string', format: 'date-time' }, actorId: { type: ['string', 'null'] },
      correlationId: { type: 'string', minLength: 1 }, causationId: { type: ['string', 'null'] },
      payload: { type: 'object', required: [...need], properties: Object.fromEntries(need.map((k) => [k, { not: { type: 'null' } }])), additionalProperties: true },
    },
    additionalProperties: false,
  };
}
