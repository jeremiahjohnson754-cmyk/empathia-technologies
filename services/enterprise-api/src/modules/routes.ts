/**
 * The v1 route table. The `authority` field documents the server-side check each handler performs (ctx.require / rule functions);
 * the OpenAPI document is generated from this table, and a contract test checks the two never diverge.
 */
import { Router, type Route } from '../http/router.js';
import { str, int, num, bool, arr, obj, anyObj, type Schema } from '../http/schema.js';
import * as rooms from '../domain/rooms.js';
import * as cx from '../domain/commissioning.js';
import * as read from '../domain/read.js';
import * as platform from '../domain/platform.js';
import * as org from '../domain/org.js';
import * as analytics from '../domain/analytics.js';
import * as assurance from '../domain/assurance.js';
import * as integ from '../integrations/sync.js';
import * as leads from '../domain/leads.js';
import type { PgPool } from '../db/pg.js';
import type { Hs256Tokens } from '../auth/jwt.js';
import type { ObjectStore } from '../storage/objectStore.js';
import { LIFECYCLE_AUTHORITY } from '@empathia/commissioning-engine';
import { ROOM_LIFECYCLE } from '@empathia/domain-types';
import { invalid } from '../http/errors.js';

const ROOM = str({ pattern: '^(R-[A-Z0-9-]{3,32}|[0-9a-fA-F-]{36})$', description: 'canonical room code (R-PLN-0001) or room uuid' });
const ok = (description: string, schema?: Schema) => ({ 200: { description, ...(schema ? { schema } : {}) } });
const created = (description: string) => ({ 201: { description } });
const ERR = { 400: { description: 'validation error' }, 401: { description: 'not signed in' }, 403: { description: 'not allowed for your role' }, 404: { description: 'not found in your tenant or scope' }, 422: { description: 'refused by a business rule' } };

export function buildRoutes(deps: { pool: PgPool; tokens: Hs256Tokens; store: ObjectStore; health: () => Promise<Record<string, unknown>> }): Router {
  const r = new Router();
  const add = (x: Route) => r.add({ ...x, responses: { ...x.responses, ...(x.auth ? ERR : {}) } as Route['responses'] });

  // ---------------------------------------------------------------------------------------- platform
  add({ method: 'GET', path: '/health', tag: 'platform', summary: 'Liveness and readiness (database, migrations, outbox backlog)', auth: false, responses: ok('service health'), handler: async () => ({ status: 200, body: await deps.health() }) });
  add({ method: 'GET', path: '/v1/openapi.json', tag: 'platform', summary: 'This API’s OpenAPI 3.1 document (generated from the route table)', auth: false, responses: ok('OpenAPI document'), handler: async () => ({ status: 200, body: (await import('../openapi.js')).openapi(r) }) });
  add({ method: 'POST', path: '/v1/auth/token', tag: 'auth', summary: 'Sign in with the development identity provider (AUTH_MODE=dev only)', auth: false,
    body: obj({ email: str({ maxLength: 200 }), password: str({ minLength: 1, maxLength: 200 }), tenant: str({ maxLength: 64 }), role: str({ maxLength: 40 }) }, ['email', 'password']),
    responses: { ...ok('access token'), 401: { description: 'wrong email or password' }, 409: { description: 'several memberships match' } },
    handler: async (_c, q) => ({ status: 200, body: await platform.signIn(deps.pool, deps.tokens, q.body as never) }) });
  add({ method: 'GET', path: '/v1/me', tag: 'auth', summary: 'The signed-in person, tenant, role and authorities (resolved server-side)', auth: true, responses: ok('principal'), handler: async (c) => ({ status: 200, body: await platform.me(c) }) });

  // ---------------------------------------------------------------------------------------- organization
  add({ method: 'GET', path: '/v1/sites', tag: 'organization', summary: 'Sites and their buildings (within your site scope)', auth: true, responses: ok('sites'), handler: async (c) => ({ status: 200, body: await org.sites(c) }) });
  add({ method: 'GET', path: '/v1/roles', tag: 'organization', summary: 'The role catalogue and each role’s authorities', auth: true, responses: ok('roles'), handler: async (c) => ({ status: 200, body: await org.roles(c) }) });
  add({ method: 'GET', path: '/v1/people', tag: 'organization', summary: 'People and memberships of the tenant (security admin; audited)', auth: true, authority: 'policy.configure', responses: ok('people'), handler: async (c) => ({ status: 200, body: await org.people(c) }) });
  add({ method: 'GET', path: '/v1/projects', tag: 'organization', summary: 'Projects and their rooms (rooms within your site scope)', auth: true, responses: ok('projects'), handler: async (c) => ({ status: 200, body: await org.projects(c) }) });
  add({ method: 'POST', path: '/v1/projects', tag: 'organization', summary: 'Create a project', auth: true, authority: 'project.decide', idempotent: true,
    body: obj({ code: str({ pattern: '^PRJ-[A-Z0-9-]{2,32}$' }), name: str({ minLength: 1, maxLength: 120 }) }, ['code', 'name']), responses: created('project'), handler: async (c, q) => ({ status: 201, body: await org.createProject(c, q.body as never) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/project', tag: 'organization', summary: 'Put a room into a project, or take it out (projectCode null)', auth: true, authority: 'project.decide',
    body: obj({ projectCode: str({ pattern: '^PRJ-[A-Z0-9-]{2,32}$', nullable: true }) }, ['projectCode']), responses: ok('assignment'), handler: async (c, q) => ({ status: 200, body: await org.assignRoomToProject(c, q.params['room']!, (q.body as { projectCode: string | null }).projectCode) }) });
  add({ method: 'GET', path: '/v1/reports/summary', tag: 'reporting', summary: 'KPI summary: lifecycle, commissioning coverage and verification, issues, work orders, assets, evidence (operational performance NOT_MONITORED)', auth: true, responses: ok('summary'), handler: async (c) => ({ status: 200, body: await analytics.summary(c) }) });

  // ---------------------------------------------------------------------------------------- rooms
  add({ method: 'GET', path: '/v1/rooms', tag: 'rooms', summary: 'List rooms (cursor pagination by code; filter by lifecycle)', auth: true,
    query: { lifecycle: str({ enum: ROOM_LIFECYCLE }), after: str({ maxLength: 40 }), limit: str({ pattern: '^[0-9]{1,3}$' }) }, responses: ok('rooms'),
    handler: async (c, q) => ({ status: 200, body: await read.listRooms(c, { lifecycle: q.query.get('lifecycle'), after: q.query.get('after'), limit: Number(q.query.get('limit') || 50) }) }) });
  add({ method: 'POST', path: '/v1/rooms', tag: 'rooms', summary: 'Create a planned room from a template (server-side classification, checks and applicability)', auth: true, authority: 'room.design', idempotent: true,
    body: obj({ name: str({ minLength: 1, maxLength: 80 }), template: str({ maxLength: 40 }), buildingCode: str({ maxLength: 24 }), floor: int({ minimum: -5, maximum: 200 }), unit: str({ enum: ['m', 'ft'] }), length: str({ maxLength: 20 }), width: str({ maxLength: 20 }), ceiling: str({ maxLength: 20 }), intendedUse: str({ maxLength: 200 }), occupancy: int({ minimum: 1, maximum: 5000 }), shape: str({ enum: ['rect', 'lshape'] }), points: arr(arr(num(), { minItems: 2, maxItems: 2 }), { minItems: 3, maxItems: 40 }), projectCode: str({ pattern: '^PRJ-[A-Z0-9-]{2,32}$' }) }, ['name', 'template']),
    responses: created('the room code and id'), handler: async (c, q) => ({ status: 201, body: await rooms.createRoom(c, q.body as never) }) });
  add({ method: 'GET', path: '/v1/rooms/:room', tag: 'rooms', summary: 'A room with its devices, connections, drawings, revisions, issues and commissioning plan (result labels, never a bare PASS)', auth: true, responses: ok('room detail'), handler: async (c, q) => ({ status: 200, body: await read.getRoom(c, q.params['room']!) }) });
  add({ method: 'PATCH', path: '/v1/rooms/:room', tag: 'rooms', summary: 'Change the room’s name, intended use or occupancy (PLANNED only)', auth: true, authority: 'room.design',
    body: obj({ name: str({ minLength: 1, maxLength: 80 }), intendedUse: str({ maxLength: 200 }), occupancy: int({ minimum: 1, maximum: 5000 }) }), responses: ok('analysis summary'), handler: async (c, q) => ({ status: 200, body: await rooms.updateRoom(c, q.params['room']!, q.body as never) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/devices', tag: 'devices', summary: 'Add a planned device (gets a tenant-unique canonical asset id)', auth: true, authority: 'room.design', idempotent: true,
    body: obj({ category: str({ maxLength: 20 }), x: num(), y: num(), mount: str({ enum: ['wall', 'ceiling', 'floor', 'table', 'rack'] }), rot: num() }, ['category']), responses: created('asset id'), handler: async (c, q) => ({ status: 201, body: await rooms.addDevice(c, q.params['room']!, q.body as never) }) });
  add({ method: 'PATCH', path: '/v1/rooms/:room/devices/:asset', tag: 'devices', summary: 'Move a device or substitute its model (the asset keeps its id; the model history is kept)', auth: true, authority: 'room.design',
    body: obj({ x: num(), y: num(), rot: num(), mount: str({ enum: ['wall', 'ceiling', 'floor', 'table', 'rack'] }), model: str({ minLength: 1, maxLength: 80 }) }), responses: ok('analysis summary'), handler: async (c, q) => ({ status: 200, body: await rooms.changeDevice(c, q.params['room']!, q.params['asset']!, q.body as never) }) });
  add({ method: 'DELETE', path: '/v1/rooms/:room/devices/:asset', tag: 'devices', summary: 'Remove a device from the design (kept in earlier revisions)', auth: true, authority: 'room.design', responses: ok('analysis summary'), handler: async (c, q) => ({ status: 200, body: await rooms.removeDevice(c, q.params['room']!, q.params['asset']!) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/connections', tag: 'devices', summary: 'Propose a connection between two devices', auth: true, authority: 'room.design', idempotent: true,
    body: obj({ from: str({ pattern: '^PA-[0-9]{4,10}$' }), to: str({ pattern: '^PA-[0-9]{4,10}$' }), kind: str({ enum: ['signal', 'network', 'control', 'power'] }) }, ['from', 'to', 'kind']), responses: created('connection id'), handler: async (c, q) => ({ status: 201, body: await rooms.addConnection(c, q.params['room']!, q.body as never) }) });
  add({ method: 'DELETE', path: '/v1/rooms/:room/connections/:connection', tag: 'devices', summary: 'Remove a proposed connection (the design checks re-run)', auth: true, authority: 'room.design', responses: ok('analysis summary'), handler: async (c, q) => ({ status: 200, body: await rooms.removeConnection(c, q.params['room']!, q.params['connection']!) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/revisions', tag: 'revisions', summary: 'Save an immutable revision (refused when nothing changed)', auth: true, authority: 'room.design', idempotent: true,
    body: obj({ reason: str({ maxLength: 200 }) }), responses: created('revision number and hash'), handler: async (c, q) => ({ status: 201, body: await rooms.saveRevision(c, q.params['room']!, String((q.body as { reason?: string } | null)?.reason || 'saved')) }) });
  add({ method: 'GET', path: '/v1/rooms/:room/revisions/compare', tag: 'revisions', summary: 'Compare two revisions: geometry, devices added/removed/moved/swapped, connections', auth: true,
    query: { a: str({ pattern: '^[0-9]{1,6}$' }), b: str({ pattern: '^[0-9]{1,6}$' }) }, responses: ok('difference'), handler: async (c, q) => ({ status: 200, body: await read.revisions(c, q.params['room']!, Number(q.query.get('a')), Number(q.query.get('b'))) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/classification/approve', tag: 'rooms', summary: 'Approve the suggested room type, or override it with a reason (≥ 10 characters)', auth: true, authority: 'room.classify.approve',
    body: obj({ archetype: str({ maxLength: 8, nullable: true }), reason: str({ maxLength: 400 }) }), responses: ok('approval'), handler: async (c, q) => ({ status: 200, body: await rooms.approveClassification(c, q.params['room']!, (q.body || {}) as never) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/drawings/generate', tag: 'drawings', summary: 'Generate the drawing set from the design (diagrams, not stamped drawings)', auth: true, authority: 'room.design', responses: ok('drawing states'), handler: async (c, q) => ({ status: 200, body: await rooms.generateDrawings(c, q.params['room']!) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/drawings/:kind/approve', tag: 'drawings', summary: 'Approve a current generated drawing (it turns REVIEW_REQUIRED when its input changes)', auth: true, authority: 'room.classify.approve', responses: ok('approved drawing'), handler: async (c, q) => ({ status: 200, body: await rooms.approveDrawing(c, q.params['room']!, q.params['kind']!) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/lifecycle', tag: 'rooms', summary: 'Move the room one governed lifecycle step', auth: true, authority: Object.entries(LIFECYCLE_AUTHORITY).map(([k, v]) => `${k}: ${v}`),
    body: obj({ to: str({ enum: ROOM_LIFECYCLE }) }, ['to']), responses: ok('transition'), handler: async (c, q) => ({ status: 200, body: await rooms.transition(c, q.params['room']!, (q.body as { to: never }).to) }) });
  add({ method: 'GET', path: '/v1/rooms/:room/assurance', tag: 'assurance', summary: 'Assurance: the accepted baseline against current evidence across 17 dimensions (unknown where there is no evidence)', auth: true, responses: ok('assessment, or NO_BASELINE'), handler: async (c, q) => ({ status: 200, body: await assurance.roomAssurance(c, q.params['room']!) }) });
  add({ method: 'GET', path: '/v1/rooms/:room/service-history', tag: 'service', summary: 'Work orders and issue history of the room', auth: true, responses: ok('history'), handler: async (c, q) => ({ status: 200, body: await read.serviceHistory(c, q.params['room']!) }) });

  // ---------------------------------------------------------------------------------------- commissioning and evidence
  add({ method: 'POST', path: '/v1/evidence', tag: 'evidence', summary: 'Upload an evidence file (raw body; stored content-addressed by SHA-256, retained 7 years)', auth: true, authority: cx.EVIDENCE_AUTHORITIES, bodyKind: 'binary',
    responses: { ...created('evidence id and hash'), 413: { description: 'too large' }, 415: { description: 'media type not accepted' } },
    handler: async (c, q) => ({ status: 201, body: await cx.uploadEvidence(c, deps.store, q.raw || Buffer.alloc(0), String(q.headers['content-type'] || ''), String(q.headers['x-file-name'] || 'evidence')) }) });
  add({ method: 'GET', path: '/v1/evidence/:evidence/content', tag: 'evidence', summary: 'Download an evidence file (its hash is re-verified on every read)', auth: true, responses: ok('the file'),
    handler: async (c, q) => { if (!/^[0-9a-f-]{36}$/i.test(q.params['evidence']!)) throw invalid('evidence id is a UUID'); const f = await cx.evidenceContent(c, deps.store, q.params['evidence']!); return { status: 200, raw: f.data, headers: { 'content-type': f.mediaType, 'content-disposition': `attachment; filename="${f.fileName.replace(/"/g, '')}"` } }; } });
  add({ method: 'POST', path: '/v1/rooms/:room/results', tag: 'commissioning', summary: 'Record a field result (room in COMMISSIONING; responsible role; accepted evidence kind; stored evidence)', auth: true, authority: 'the test’s responsible personas, or cxeng', idempotent: true,
    body: obj({ testId: str({ maxLength: 80 }), state: str({ enum: ['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'] }), evidenceId: str({ format: 'uuid' }), evidenceKind: str({ maxLength: 40 }), instrument: str({ maxLength: 200 }) }, ['testId', 'state', 'evidenceId', 'evidenceKind']),
    responses: created('result with its label (PASS → PASS_UNVERIFIED)'), handler: async (c, q) => ({ status: 201, body: await cx.recordResult(c, q.params['room']!, q.body as never) }) });
  add({ method: 'POST', path: '/v1/rooms/:room/results/:test/verify', tag: 'commissioning', summary: 'Independently verify a recorded PASS (never by the person who recorded it)', auth: true, authority: cx.VERIFY_AUTHORITIES, responses: ok('PASS_VERIFIED'), handler: async (c, q) => ({ status: 200, body: await cx.verifyResult(c, q.params['room']!, q.params['test']!) }) });

  // ---------------------------------------------------------------------------------------- issues and service
  add({ method: 'POST', path: '/v1/issues/:issue/assign', tag: 'issues', summary: 'Assign an open issue to a role', auth: true, authority: ['issue.assign', 'route.internal'], body: obj({ ownerRole: str({ pattern: '^[a-z_]{2,40}$' }) }, ['ownerRole']), responses: ok('assignment'), handler: async (c, q) => ({ status: 200, body: await cx.assignIssue(c, q.params['issue']!, (q.body as { ownerRole: string }).ownerRole) }) });
  add({ method: 'POST', path: '/v1/issues/:issue/work-orders', tag: 'service', summary: 'Raise a ServiceHands work order for an installation/commissioning deficiency', auth: true, authority: ['service.assign', 'service.triage'], idempotent: true,
    body: obj({ assignedRole: str({ pattern: '^[a-z_]{2,40}$' }), note: str({ maxLength: 1000 }) }), responses: created('work order'), handler: async (c, q) => ({ status: 201, body: await cx.createWorkOrder(c, q.params['issue']!, (q.body || {}) as never) }) });
  add({ method: 'POST', path: '/v1/work-orders/:workOrder/close', tag: 'service', summary: 'Close a work order (records field work; never passes a test)', auth: true, authority: 'service.close', body: obj({ note: str({ maxLength: 1000 }) }), responses: ok('closed'), handler: async (c, q) => ({ status: 200, body: await cx.closeWorkOrder(c, q.params['workOrder']!, String((q.body as { note?: string } | null)?.note || '')) }) });

  // ---------------------------------------------------------------------------------------- public inbound (the website's forms) and its admin inbox
  add({ method: 'POST', path: '/v1/public/leads', tag: 'public', summary: 'A message from the public website (demonstration request, pilot partnership, contact): stored for a person to answer; stricter per-address budget; honeypot; consent required', auth: false,
    body: obj({ kind: str({ enum: ['demo', 'pilot', 'contact'] }), name: str({ minLength: 1, maxLength: 120 }), organization: str({ minLength: 1, maxLength: 160 }), email: str({ minLength: 3, maxLength: 200 }), audience: str({ maxLength: 80 }), scope: str({ maxLength: 80 }), message: str({ minLength: 1, maxLength: 4000 }), consent: bool(), website: str({ maxLength: 200 }) }, ['kind', 'name', 'organization', 'email', 'message', 'consent']),
    responses: { ...created('receipt: id, receivedAt, notification status'), 400: { description: 'validation error, missing consent, or the form was not accepted' }, 429: { description: 'too many messages from this address' } },
    handler: async (c, q) => ({ status: 201, body: await leads.createLead(deps.pool, q.body as never, { ip: String(q.headers['x-forwarded-for'] || '').split(',')[0]!.trim() || String(q.headers['x-empathia-remote'] || 'unknown'), userAgent: String(q.headers['user-agent'] || ''), correlationId: c.correlationId }) }) });
  add({ method: 'GET', path: '/v1/admin/leads', tag: 'admin', summary: 'The lead inbox (security admin; audited): messages from the public website with their handling status and whether a notification went out', auth: true, authority: 'policy.configure',
    query: { status: str({ enum: ['NEW', 'ANSWERED', 'SPAM'] }), limit: str({ pattern: '^[0-9]{1,3}$' }) }, responses: ok('leads and the email adapter status'), handler: async (c, q) => ({ status: 200, body: await leads.listLeads(c, q.query.get('status'), Number(q.query.get('limit') || 100)) }) });
  add({ method: 'PATCH', path: '/v1/admin/leads/:id', tag: 'admin', summary: 'Mark a lead answered or spam, or add handling notes (security admin; audited)', auth: true, authority: 'policy.configure',
    body: obj({ status: str({ enum: ['NEW', 'ANSWERED', 'SPAM'] }), notes: str({ maxLength: 4000 }) }), responses: ok('the lead’s handling state'), handler: async (c, q) => ({ status: 200, body: await leads.handleLead(c, q.params['id']!, q.body as never) }) });

  // ---------------------------------------------------------------------------------------- read models, graph, notifications
  add({ method: 'GET', path: '/v1/read/rooms', tag: 'read-models', summary: 'Operational read model of every room (built by the outbox worker; live health is NOT_MONITORED)', auth: true, responses: ok('read model'), handler: async (c) => ({ status: 200, body: await read.readModel(c) }) });
  add({ method: 'GET', path: '/v1/read/rooms/:room', tag: 'read-models', summary: 'Operational read model of one room', auth: true, responses: ok('read model row'), handler: async (c, q) => ({ status: 200, body: await read.readModel(c, q.params['room']!) }) });
  add({ method: 'GET', path: '/v1/graph/:type/:id', tag: 'graph', summary: 'Relationship neighbourhood and downstream impact (Search Party)', auth: true, query: { depth: str({ pattern: '^[1-4]$' }) }, responses: ok('neighbourhood'), handler: async (c, q) => ({ status: 200, body: await read.graph(c, q.params['type']!, q.params['id']!, Number(q.query.get('depth') || 2)) }) });
  add({ method: 'GET', path: '/v1/notifications', tag: 'platform', summary: 'Notifications for my role or me', auth: true, responses: ok('notifications'), handler: async (c) => ({ status: 200, body: await platform.notifications(c) }) });
  add({ method: 'GET', path: '/v1/audit', tag: 'platform', summary: 'Audit trail (data steward or security admin)', auth: true, authority: ['provenance.review', 'policy.configure'], query: { aggregateType: str({ maxLength: 40 }), aggregateId: str({ maxLength: 80 }), limit: str({ pattern: '^[0-9]{1,3}$' }) }, responses: ok('audit events'), handler: async (c, q) => ({ status: 200, body: await platform.auditTrail(c, q.query.get('aggregateType'), q.query.get('aggregateId'), Number(q.query.get('limit') || 100)) }) });

  // ---------------------------------------------------------------------------------------- integrations, knowledge, AI, admin
  add({ method: 'GET', path: '/v1/integrations', tag: 'integrations', summary: 'The integration catalogue with honest states (MOCK / CONTRACT_ONLY / NOT_CONFIGURED / VERIFIED)', auth: true, responses: ok('catalogue'), handler: async () => ({ status: 200, body: await platform.integrations(deps.pool) }) });
  add({ method: 'POST', path: '/v1/integrations/:key/probe', tag: 'integrations', summary: 'Probe an integration: MOCK answers from a local mock; everything else is NOT_CONFIGURED (no network call)', auth: true, authority: ['adapter.allowlist', 'policy.configure'], responses: { ...ok('mock health'), 501: { description: 'not configured' } }, handler: async (c, q) => ({ status: 200, body: await platform.probeIntegration(c, q.params['key']!) }) });
  add({ method: 'POST', path: '/v1/integrations/:key/sync', tag: 'integrations', summary: 'Run one sync of a runnable (MOCK) integration through the common contract: retries, rate limit, dedupe, canonical matching, health', auth: true, authority: ['adapter.allowlist', 'policy.configure'], responses: { ...ok('sync result'), 501: { description: 'not configured (no adapter to run)' } }, handler: async (c, q) => ({ status: 200, body: await integ.syncIntegration(c, q.params['key']!) }) });
  add({ method: 'GET', path: '/v1/integrations/:key/observations', tag: 'integrations', summary: 'Stored observations and sync health of an integration (evidence labels included)', auth: true, authority: ['adapter.allowlist', 'policy.configure'], query: { limit: str({ pattern: '^[0-9]{1,3}$' }) }, responses: ok('observations'), handler: async (c, q) => ({ status: 200, body: await integ.observations(c, q.params['key']!, Number(q.query.get('limit') || 50)) }) });
  add({ method: 'GET', path: '/v1/knowledge', tag: 'knowledge', summary: 'Permission-aware keyword search over knowledge documents (citations included)', auth: true, query: { q: str({ maxLength: 200 }) }, responses: ok('documents'), handler: async (c, q) => ({ status: 200, body: await platform.knowledge(c, q.query.get('q')) }) });
  add({ method: 'POST', path: '/v1/ai/requests', tag: 'knowledge', summary: 'Ask the governed assistant (logged; generation NOT_CONFIGURED in the starter)', auth: true, body: obj({ purpose: str({ maxLength: 80 }), prompt: str({ minLength: 1, maxLength: 4000 }) }, ['prompt']), responses: { 501: { description: 'no model configured; the permitted sources are returned in reasons' } }, handler: async (c, q) => ({ status: 200, body: await platform.aiRequest(c, q.body as never) }) });
  add({ method: 'GET', path: '/v1/admin/outbox', tag: 'admin', summary: 'Outbox events by status (security admin)', auth: true, authority: 'policy.configure', query: { status: str({ enum: ['PENDING', 'DELIVERED', 'DEAD_LETTER'] }) }, responses: ok('events'), handler: async (c, q) => ({ status: 200, body: await platform.outboxAdmin(c, q.query.get('status') || 'DEAD_LETTER') }) });
  add({ method: 'POST', path: '/v1/admin/outbox/:event/retry', tag: 'admin', summary: 'Retry a dead-lettered event (security admin)', auth: true, authority: 'policy.configure', responses: ok('requeued'), handler: async (c, q) => ({ status: 200, body: await platform.outboxRetry(c, q.params['event']!) }) });
  void bool; void anyObj;
  return r;
}
