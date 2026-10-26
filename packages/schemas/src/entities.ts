/**
 * Hand-written JSON Schemas for the core entity shapes the API returns. They mirror packages/api-client/src/types.ts (RoomDetail,
 * PlanRow, Issue, ReadModel) and the domain modules that build them (services/enterprise-api/src/domain/read.ts, worker/outbox.ts).
 * Result labels never include a bare PASS.
 */
const S = 'https://json-schema.org/draft/2020-12/schema';
const ID = (n: string) => `https://schemas.empathia.invalid/entities/${n}/0.1.0.json`;

export const RESULT_LABELS = ['PASS_VERIFIED', 'PASS_UNVERIFIED', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE', 'NOT_TESTED'] as const;
export const LIFECYCLES = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'] as const;

const str = { type: 'string' }; const int = { type: 'integer' }; const num = { type: 'number' }; const bool = { type: 'boolean' };
const strs = { type: 'array', items: str };

export const PlanRow = {
  $schema: S, $id: ID('PlanRow'), title: 'PlanRow', description: 'One test of the commissioning library judged for one room (cx_plan_row + its current result label).',
  type: 'object', required: ['test_id', 'label', 'domain', 'phase', 'tier', 'applicable', 'status', 'personas', 'evidence', 'instrument', 'devices', 'result'],
  properties: { test_id: str, label: str, pack: { type: ['string', 'null'] }, domain: str, phase: int, tier: int, applicable: bool, status: str, why: strs, personas: strs, evidence: strs, instrument: bool, devices: strs, result: { enum: [...RESULT_LABELS] } },
};

export const Issue = {
  $schema: S, $id: ID('Issue'), title: 'Issue', description: 'A room issue: one per underlying deficiency (correlation key unique per room).',
  type: 'object', required: ['code', 'key', 'category', 'severity', 'title', 'state'],
  properties: { code: { type: 'string', pattern: '^RISS-\\d{4,}$' }, key: str, category: str, check_name: { type: ['string', 'null'] }, severity: { enum: ['Critical', 'High', 'Medium', 'Low'] }, title: str, rationale: { type: ['string', 'null'] }, assets: strs, state: { enum: ['OPEN', 'RESOLVED'] }, owner_role: { type: ['string', 'null'] }, resolution: { type: ['object', 'null'] }, first_seen_rev: { type: ['integer', 'null'] }, last_seen_rev: { type: ['integer', 'null'] } },
};

export const ReadModel = {
  $schema: S, $id: ID('ReadModel'), title: 'ReadModel', description: 'The operational read model of one room (app.room_read_model), rebuilt by the outbox worker. Live health is NOT_MONITORED in the starter.',
  type: 'object', required: ['room_code', 'name', 'lifecycle', 'lifecycle_label', 'devices', 'open_issues', 'open_high', 'applicable_tests', 'results', 'live_health'],
  properties: { room_code: str, name: str, lifecycle: { enum: [...LIFECYCLES] }, lifecycle_label: str, archetype: { type: ['string', 'null'] }, devices: int, open_issues: int, open_high: int, applicable_tests: int,
    results: { type: 'object', required: ['applicable', 'recorded', 'verified', 'awaiting', 'failed', 'notSupported', 'inconclusive', 'notTested'], properties: Object.fromEntries(['applicable', 'recorded', 'verified', 'awaiting', 'failed', 'notSupported', 'inconclusive', 'notTested'].map((k) => [k, int])) },
    live_health: { const: 'NOT_MONITORED' } },
};

export const RoomDetail = {
  $schema: S, $id: ID('RoomDetail'), title: 'RoomDetail', description: 'GET /v1/rooms/{room}: the room with its devices, connections, drawings, revisions, issues and commissioning plan.',
  type: 'object', required: ['room', 'devices', 'connections', 'drawings', 'revisions', 'issues', 'commissioning'],
  properties: {
    room: { type: 'object', required: ['code', 'id', 'name', 'lifecycle', 'template', 'occupancy', 'geometry', 'rev'], properties: { code: { type: 'string', pattern: '^R-[A-Z0-9-]{3,32}$' }, id: { type: 'string', format: 'uuid' }, name: str, lifecycle: { enum: [...LIFECYCLES] }, template: str, intendedUse: str, occupancy: int, unit: { enum: ['m', 'ft'] },
      geometry: { type: 'object', required: ['shape', 'points', 'ceiling'], properties: { shape: str, points: { type: 'array', items: { type: 'array', items: num, minItems: 2, maxItems: 2 } }, ceiling: num, lengthM: num, widthM: num } },
      rev: int, approvedRevision: { type: ['integer', 'null'] }, classification: { type: ['object', 'null'] }, approvedClassification: { type: ['object', 'null'] }, liveHealth: { const: 'NOT_MONITORED' } } },
    devices: { type: 'array', items: { type: 'object', required: ['id', 'cat', 'label', 'x', 'y'], properties: { id: { type: 'string', pattern: '^PA-\\d{4,}$' }, cat: str, label: str, role: { type: ['string', 'null'] }, model: { type: ['string', 'null'] }, generic: bool, x: num, y: num, z: num, rot: num, mount: { type: ['string', 'null'] }, furniture: bool, lifecycle: { type: ['string', 'null'] } } } },
    connections: { type: 'array', items: { type: 'object', required: ['id', 'from', 'to', 'kind'], properties: { id: str, from: str, to: str, kind: { enum: ['signal', 'network', 'control', 'power'] }, why: { type: ['string', 'null'] } } } },
    drawings: { type: 'array', items: { type: 'object', required: ['kind', 'state'], properties: { kind: str, state: { enum: ['DRAFT', 'GENERATED', 'APPROVED', 'REVIEW_REQUIRED'] }, revNo: { type: ['integer', 'null'] } } } },
    revisions: { type: 'array', items: { type: 'object', required: ['rev_no', 'sha256'], properties: { rev_no: int, reason: str, sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' } } } },
    issues: { type: 'array', items: { $ref: Issue.$id } },
    commissioning: { oneOf: [{ type: 'null' }, { type: 'object', required: ['planId', 'engineVersion', 'ruleVersion', 'applicable', 'rows'], properties: { planId: str, engineVersion: str, ruleVersion: str, library: int, applicable: int, counts: { type: 'object' }, rows: { type: 'array', items: { $ref: PlanRow.$id } } } }] },
  },
};

export const ENTITY_SCHEMAS = { RoomDetail, PlanRow, Issue, ReadModel } as const;
