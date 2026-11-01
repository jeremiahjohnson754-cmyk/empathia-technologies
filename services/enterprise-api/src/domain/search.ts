/**
 * Search Party over the real records (P4-A). The catalogue is built per request from the tables the caller may see — tenant isolation
 * by RLS, site scope by the same clause every room read uses — and then handed to the shared @empathia/search-party library for
 * ranking, facets, traversal and intents. Edges are the stored relationships (ADR-0004, keyed) plus edges DERIVED from foreign keys at
 * read time; every edge carries its provenance so a viewer can tell a declared cable from a database join. People appear only where a
 * record the caller can see already names them (approver, recorder, owner); the full person list stays behind policy.configure.
 * Nothing outside the catalogue can be reached: search, facets, neighbourhood, impact and path all run on the visible set only, so an
 * unauthorized caller cannot infer a protected record from a count, a suggestion or an adjacent node.
 */
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { invalid, notFound } from '../http/errors.js';
import { CERTS } from '@empathia/service-engine';
import { COMPETENCY_RECORD, COMPETENCY_VERIFY } from './competency.js';
import * as svc from './service.js';
import { Graph, search as rank, ask, neighbourhood, impact, path, radialLayout, RELATIONS, NODE_TYPES, INTENTS, nodeKey, type Catalogue, type SearchNode, type Edge, type NodeRef, type Facts } from '@empathia/search-party';
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };

const P = PERSONAS as unknown as Record<string, { label: string; authority: string[] }>;
const T = (type: string) => NODE_TYPES[type]?.[0] || type;

/** Build the visible catalogue. One query per table; the result is small (an estate, not the internet) and bounded. */
export async function catalogue(ctx: RequestContext, q: Queryable): Promise<Catalogue & { people: Map<string, string> }> {
  const scoped = !!ctx.p.siteScope?.length; const S = ctx.p.siteScope || [];
  const sites = (await q.query<{ id: string; code: string; name: string }>(`SELECT id, code, name FROM app.site${scoped ? ' WHERE id = ANY($1::uuid[])' : ''} ORDER BY code`, scoped ? [S] : [])).rows;
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const buildings = (await q.query<{ id: string; code: string; name: string; site_id: string; floors: number }>(`SELECT id, code, name, site_id, floors FROM app.building${scoped ? ' WHERE site_id = ANY($1::uuid[])' : ''} ORDER BY code`, scoped ? [S] : [])).rows;
  const bById = new Map(buildings.map((b) => [b.id, b]));
  const rooms = (await q.query<{ id: string; code: string; name: string; building_id: string; floor: number; lifecycle: string; template: string; project_id: string | null; approved_class: { by?: string; byRole?: string; at?: string; archetype?: string } | null; created_by: string }>(`SELECT r.id, r.code, r.name, r.building_id, r.floor, r.lifecycle, r.template, r.project_id, r.approved_class, r.created_by FROM app.room r JOIN app.building b ON b.id = r.building_id${scoped ? ' WHERE b.site_id = ANY($1::uuid[])' : ''} ORDER BY r.code`, scoped ? [S] : [])).rows;
  const rById = new Map(rooms.map((r) => [r.id, r]));
  const roomIds = rooms.map((r) => r.id);
  const assets = roomIds.length ? (await q.query<{ id: string; code: string; label: string; category: string; room_id: string; removed_at: string | null }>('SELECT id, code, label, category, room_id, removed_at FROM app.planned_asset WHERE room_id = ANY($1::uuid[]) AND removed_at IS NULL ORDER BY code', [roomIds])).rows : [];
  // ADR-0012: the unit open at each visible position (physical assets are visible through the positions they occupy)
  const units = roomIds.length ? (await q.query<{ position: string; asset: string; model: string; manufacturer: string | null; serial: string | null; identity_state: string; installed_at: string; room_id: string }>('SELECT pa.code AS position, a.code AS asset, a.model, a.manufacturer, a.serial, a.identity_state, i.installed_at, pa.room_id FROM app.asset_installation i JOIN app.planned_asset pa ON pa.id = i.position_id JOIN app.physical_asset a ON a.id = i.asset_id WHERE i.removed_at IS NULL AND pa.room_id = ANY($1::uuid[]) ORDER BY a.code', [roomIds])).rows : [];
  const unitAt = new Map(units.map((u) => [u.position, u]));
  const issues = roomIds.length ? (await q.query<{ id: string; code: string; title: string; severity: string; state: string; category: string; room_id: string; owner_role: string | null; owner_id: string | null }>('SELECT id, code, title, severity, state, category, room_id, owner_role, owner_id FROM app.room_issue WHERE room_id = ANY($1::uuid[]) ORDER BY code', [roomIds])).rows : [];
  const iById = new Map(issues.map((i) => [i.id, i]));
  const wos = issues.length ? (await q.query<{ id: string; code: string; state: string; issue_id: string; assigned_role: string; created_by: string; closed_by: string | null }>('SELECT id, code, state, issue_id, assigned_role, created_by, closed_by FROM app.work_order WHERE issue_id = ANY($1::uuid[]) ORDER BY code', [issues.map((i) => i.id)])).rows : [];
  // projects are tenant-wide records, but a site-scoped caller sees only the projects that touch a room they can see (RT-02: a project name can name a building)
  const projectsAll = (await q.query<{ id: string; code: string; name: string; state: string }>('SELECT id, code, name, state FROM app.project ORDER BY code')).rows;
  const touched = new Set(rooms.map((r) => r.project_id).filter((x): x is string => !!x));
  const projects = scoped ? projectsAll.filter((p) => touched.has(p.id)) : projectsAll;
  const pById = new Map(projects.map((p) => [p.id, p]));
  const baselines = roomIds.length ? (await q.query<{ id: string; room_id: string; version: number; state: string; design_revision: number; results: Record<string, string>; published_by: string; published_at: string; supersedes: string | null }>('SELECT id, room_id, version, state, design_revision, results, published_by, published_at, supersedes FROM app.assurance_baseline WHERE room_id = ANY($1::uuid[]) ORDER BY room_id, version', [roomIds])).rows : [];
  // D-36: every list the catalogue is built from has a stable order (the neighbourhood's BFS and its radial layout follow the edge order;
  // without ORDER BY the DISTINCT over evidence ids and the heap order of relationships changed from run to run; COLLATE "C": the
  // same order whatever the database locale)
  const evidence = roomIds.length ? (await q.query<{ id: string; file_name: string; media_type: string; uploaded_by: string; room_id: string; test_id: string }>('SELECT * FROM (SELECT DISTINCT e.id, e.file_name, e.media_type, e.uploaded_by, t.room_id, t.test_id FROM app.evidence_object e JOIN app.test_result t ON t.evidence_id = e.id WHERE t.room_id = ANY($1::uuid[])) x ORDER BY test_id COLLATE "C", file_name COLLATE "C", id', [roomIds])).rows : [];
  const rels = (await q.query<{ from_type: string; from_id: string; rel: string; to_type: string; to_id: string; provenance: string; from_key: string | null; to_key: string | null }>('SELECT from_type, from_id, rel, to_type, to_id, provenance, from_key, to_key FROM app.relationship WHERE removed_at IS NULL ORDER BY created_at, from_type COLLATE "C", from_id COLLATE "C", rel COLLATE "C", to_type COLLATE "C", to_id COLLATE "C"')).rows;
  // APEX cases and Field Intelligence sessions follow their room's visibility; Learn cases follow their work order's
  const apexCases = roomIds.length ? (await q.query<{ code: string; room_id: string; issue_id: string; symptom_key: string; opened_by: string; review: { decision?: string } | null }>('SELECT code, room_id, issue_id, symptom_key, opened_by, review FROM app.apex_case WHERE room_id = ANY($1::uuid[]) ORDER BY code', [roomIds])).rows : [];
  const fiSessions = roomIds.length ? (await q.query<{ code: string; room_id: string; state: string; created_by: string }>('SELECT code, room_id, state, created_by FROM app.fi_session WHERE room_id = ANY($1::uuid[]) ORDER BY code', [roomIds])).rows : [];
  const woById = new Map(wos.map((w) => [w.id, w]));
  const learnCases = wos.length ? (await q.query<{ code: string; title: string; state: string; work_order_id: string; proposed_by: string; reviewer: string | null; approved_by: string | null }>("SELECT code, title, state, work_order_id, proposed_by, sme_review->>'by' AS reviewer, approved_by FROM app.learn_case WHERE work_order_id = ANY($1::uuid[]) ORDER BY code", [wos.map((w) => w.id)])).rows : [];
  // competency records are personal: everyone's for those who record or verify them, otherwise only the caller's own (ADR-0009)
  const ownOnly = !ctx.can([...COMPETENCY_RECORD, ...COMPETENCY_VERIFY]);
  const comps = (await q.query<{ id: string; person_id: string; competency: string; state: string; expires_on: string; decided_by: string | null }>(`SELECT id, person_id, competency, state, expires_on::text, decided_by FROM app.competency_record WHERE state <> 'REJECTED'${ownOnly ? ' AND person_id = $1' : ''} ORDER BY competency`, ownOnly ? [ctx.p.personId] : [])).rows;
  // people named by visible records (display name only), resolved through the membership-scoped person policy
  const personIds = new Set<string>();
  for (const a of apexCases) personIds.add(a.opened_by);
  for (const f of fiSessions) personIds.add(f.created_by);
  for (const l of learnCases) { personIds.add(l.proposed_by); if (l.reviewer) personIds.add(l.reviewer); if (l.approved_by) personIds.add(l.approved_by); }
  for (const k of comps) { personIds.add(k.person_id); if (k.decided_by) personIds.add(k.decided_by); }
  for (const r of rooms) { if (r.approved_class?.by) personIds.add(r.approved_class.by); personIds.add(r.created_by); }
  for (const i of issues) if (i.owner_id) personIds.add(i.owner_id);
  for (const w of wos) { personIds.add(w.created_by); if (w.closed_by) personIds.add(w.closed_by); }
  for (const b of baselines) personIds.add(b.published_by);
  for (const e of evidence) personIds.add(e.uploaded_by);
  const people = new Map<string, string>();
  if (personIds.size) for (const p of (await q.query<{ id: string; display_name: string }>('SELECT id, display_name FROM app.person WHERE id = ANY($1::uuid[])', [[...personIds]])).rows) people.set(p.id, p.display_name);

  const nodes: SearchNode[] = [];
  const edges: Edge[] = [];
  const E = (from: NodeRef, rel: string, to: NodeRef, provenance: string) => edges.push({ from, rel, to, provenance });
  for (const s of sites) nodes.push({ type: 'Site', id: s.code, label: s.name, provenance: 'app.site', facets: { site: s.code }, href: `#/rooms` });
  for (const b of buildings) { const s = siteById.get(b.site_id); nodes.push({ type: 'Building', id: b.code, label: b.name, subtitle: `${s?.name || ''} · ${b.floors} floors`, provenance: 'app.building', facets: { site: s?.code || '' } }); if (s) E({ type: 'Building', id: b.code }, 'LOCATED_IN', { type: 'Site', id: s.code }, 'DERIVED app.building.site_id'); }
  for (const r of rooms) {
    const b = bById.get(r.building_id); const s = b ? siteById.get(b.site_id) : undefined;
    nodes.push({ type: 'Room', id: r.code, label: r.name, subtitle: `${b?.name || ''} · floor ${r.floor} · ${r.lifecycle}`, provenance: 'app.room', facets: { site: s?.code || '', building: b?.code || '', lifecycle: r.lifecycle }, href: `#/rooms/${r.code}`, keywords: [r.template, r.lifecycle] });
    if (r.project_id && pById.has(r.project_id)) E({ type: 'Room', id: r.code }, 'BELONGS_TO', { type: 'Project', id: pById.get(r.project_id)!.code }, 'DERIVED app.room.project_id');
    if (r.approved_class?.by && people.has(r.approved_class.by)) E({ type: 'Room', id: r.code }, 'APPROVED_BY', { type: 'Person', id: r.approved_class.by }, 'DECLARED app.room.approved_class (classification approval)');
    if (people.has(r.created_by)) E({ type: 'Room', id: r.code }, 'DESIGNED_FOR', { type: 'Person', id: r.created_by }, 'DECLARED app.room.created_by');
  }
  for (const a of assets) { const r = rById.get(a.room_id); const b = r ? bById.get(r.building_id) : undefined; const u = unitAt.get(a.code); nodes.push({ type: 'PlannedAsset', id: a.code, label: a.label, subtitle: `${a.category} · ${r?.name || ''} · ${u ? `unit ${u.asset} · identity ${u.identity_state}` : 'no unit installed'}`, provenance: 'app.planned_asset (a position)', facets: { site: b ? siteById.get(b.site_id)?.code || '' : '', building: b?.code || '', category: a.category, identity: u ? u.identity_state : 'NO_UNIT' }, href: r ? `#/rooms/${r.code}/design` : undefined, keywords: [a.category, ...(u ? [u.asset] : [])] }); }
  // the physical units: one node per installed unit, located in its position (DERIVED from the open installation record)
  for (const u of units) { const r = rById.get(u.room_id); const b = r ? bById.get(r.building_id) : undefined; nodes.push({ type: 'Asset', id: u.asset, label: `${u.asset} · ${u.model}`, subtitle: `identity ${u.identity_state}${u.serial ? ` · serial ${u.serial}` : ''}${u.manufacturer ? ` · ${u.manufacturer}` : ''} · at ${u.position} since ${u.installed_at}`, provenance: 'app.physical_asset', facets: { site: b ? siteById.get(b.site_id)?.code || '' : '', building: b?.code || '', identity: u.identity_state }, href: r ? `#/rooms/${r.code}/design` : undefined, keywords: [u.model, u.asset, ...(u.serial ? [u.serial] : []), 'unit', 'asset'] }); E({ type: 'Asset', id: u.asset }, 'LOCATED_IN', { type: 'PlannedAsset', id: u.position }, 'DERIVED app.asset_installation (open installation)'); }
  const storedIssueEdges = new Set(rels.filter((r) => r.rel === 'AFFECTS' && r.from_type === 'RoomIssue').map((r) => r.from_id));
  for (const i of issues) { const r = rById.get(i.room_id); if (r && !storedIssueEdges.has(i.code)) E({ type: 'RoomIssue', id: i.code }, 'AFFECTS', { type: 'Room', id: r.code }, 'DERIVED app.room_issue.room_id'); nodes.push({ type: 'RoomIssue', id: i.code, label: i.title, subtitle: `${i.severity} · ${i.state} · ${r?.name || ''}`, provenance: 'app.room_issue', facets: { severity: i.severity, state: i.state, building: r ? bById.get(r.building_id)?.code || '' : '' }, href: r ? `#/rooms/${r.code}/issues` : undefined, keywords: [i.category] }); if (i.owner_id && people.has(i.owner_id)) E({ type: 'RoomIssue', id: i.code }, 'OWNED_BY', { type: 'Person', id: i.owner_id }, 'DECLARED app.room_issue.owner_id'); }
  for (const w of wos) { const i = iById.get(w.issue_id); const r = i ? rById.get(i.room_id) : undefined; nodes.push({ type: 'WorkOrder', id: w.code, label: `${w.code} · ${w.assigned_role}`, subtitle: `${w.state} · ${i?.title || ''}`, provenance: 'app.work_order', facets: { state: w.state, role: w.assigned_role }, href: r ? `#/rooms/${r.code}/service` : undefined }); if (i) E({ type: 'RoomIssue', id: i.code }, 'REMEDIED_BY', { type: 'WorkOrder', id: w.code }, 'DERIVED app.work_order.issue_id'); E({ type: 'WorkOrder', id: w.code }, 'ASSIGNED_TO', { type: 'PersonRole', id: w.assigned_role }, 'DECLARED app.work_order.assigned_role'); if (w.closed_by && people.has(w.closed_by)) E({ type: 'WorkOrder', id: w.code }, 'RESOLVED_BY', { type: 'Person', id: w.closed_by }, 'DECLARED app.work_order.closed_by'); }
  const roleKeys = new Set(wos.map((w) => w.assigned_role)); for (const k of roleKeys) nodes.push({ type: 'PersonRole', id: k, label: P[k]?.label || k, provenance: 'V25_PERSONAS (policy)', href: '#/admin/policy' });
  for (const p of projects) nodes.push({ type: 'Project', id: p.code, label: p.name, subtitle: p.state, provenance: 'app.project', facets: { state: p.state }, href: '#/projects' });
  for (const b of baselines) { const r = rById.get(b.room_id); if (!r) continue; nodes.push({ type: 'CommissioningBaseline', id: b.id, label: `${r.name} · baseline v${b.version}`, subtitle: `${b.state} · design revision ${b.design_revision}`, provenance: 'app.assurance_baseline', facets: { state: b.state, building: bById.get(r.building_id)?.code || '' }, href: `#/rooms/${r.code}/assurance` }); E({ type: 'CommissioningBaseline', id: b.id }, 'DOCUMENTS', { type: 'Room', id: r.code }, 'DERIVED app.assurance_baseline.room_id'); if (b.supersedes) E({ type: 'CommissioningBaseline', id: b.id }, 'SUPERSEDES', { type: 'CommissioningBaseline', id: b.supersedes }, 'DECLARED app.assurance_baseline.supersedes'); if (people.has(b.published_by)) E({ type: 'CommissioningBaseline', id: b.id }, 'APPROVED_BY', { type: 'Person', id: b.published_by }, 'DECLARED app.assurance_baseline.published_by'); }
  const seenEv = new Set<string>();
  for (const e of evidence) { const r = rById.get(e.room_id); if (!r) continue; if (!seenEv.has(e.id)) { seenEv.add(e.id); nodes.push({ type: 'Evidence', id: e.id, label: e.file_name, subtitle: e.media_type, provenance: 'app.evidence_object (metadata only)', facets: { building: bById.get(r.building_id)?.code || '' }, href: `#/rooms/${r.code}/commissioning` }); } E({ type: 'Evidence', id: e.id }, 'PROVES', { type: 'CommissioningTest', id: `${r.code}/${e.test_id}` }, 'DERIVED app.test_result.evidence_id'); E({ type: 'CommissioningTest', id: `${r.code}/${e.test_id}` }, 'TESTED_IN', { type: 'Room', id: r.code }, 'DERIVED app.test_result.room_id'); if (people.has(e.uploaded_by)) E({ type: 'Evidence', id: e.id }, 'RECORDS', { type: 'Person', id: e.uploaded_by }, 'DECLARED app.evidence_object.uploaded_by'); }
  const testIds = new Set(edges.filter((e) => e.to.type === 'CommissioningTest').map((e) => e.to.id)); for (const id of testIds) nodes.push({ type: 'CommissioningTest', id, label: id.split('/')[1]!, subtitle: id.split('/')[0], provenance: 'app.test_result', href: `#/rooms/${id.split('/')[0]}/commissioning` });
  for (const a of apexCases) { const r = rById.get(a.room_id); const i = iById.get(a.issue_id); if (!r) continue; nodes.push({ type: 'ApexCase', id: a.code, label: `${a.code} · diagnosis`, subtitle: `${a.symptom_key} · ${a.review?.decision ? `reviewed: ${a.review.decision}` : 'not reviewed'} · ${r.name}`, provenance: 'app.apex_case', facets: { building: bById.get(r.building_id)?.code || '' }, href: `#/apex/${a.code}`, keywords: [a.symptom_key, 'apex', 'diagnosis'] }); if (i) E({ type: 'ApexCase', id: a.code }, 'CONCERNS', { type: 'RoomIssue', id: i.code }, 'DERIVED app.apex_case.issue_id'); if (people.has(a.opened_by)) E({ type: 'ApexCase', id: a.code }, 'RAISED_BY', { type: 'Person', id: a.opened_by }, 'DECLARED app.apex_case.opened_by'); }
  for (const f of fiSessions) { const r = rById.get(f.room_id); if (!r) continue; nodes.push({ type: 'FieldSession', id: f.code, label: `${f.code} · Field Intelligence session`, subtitle: `${f.state} · simulated · ${r.name}`, provenance: 'app.fi_session (software simulation; not a physical measurement)', facets: { state: f.state, building: bById.get(r.building_id)?.code || '' }, href: `#/field/sessions/${f.code}`, keywords: ['field intelligence', 'session', f.state] }); E({ type: 'FieldSession', id: f.code }, 'CONCERNS', { type: 'Room', id: r.code }, 'DERIVED app.fi_session.room_id'); if (people.has(f.created_by)) E({ type: 'FieldSession', id: f.code }, 'RAISED_BY', { type: 'Person', id: f.created_by }, 'DECLARED app.fi_session.created_by'); }
  for (const l of learnCases) { const w = woById.get(l.work_order_id); nodes.push({ type: 'TrainingCase', id: l.code, label: l.title, subtitle: `${l.code} · ${l.state}`, provenance: 'app.learn_case (de-identified)', facets: { state: l.state }, href: '#/learn/cases', keywords: ['learn', 'case'] }); if (w) E({ type: 'TrainingCase', id: l.code }, 'DERIVED_FROM', { type: 'WorkOrder', id: w.code }, 'DERIVED app.learn_case.work_order_id'); if (people.has(l.proposed_by)) E({ type: 'Person', id: l.proposed_by }, 'PROPOSES', { type: 'TrainingCase', id: l.code }, 'DECLARED app.learn_case.proposed_by'); if (l.reviewer && people.has(l.reviewer)) E({ type: 'TrainingCase', id: l.code }, 'REVIEWED_BY', { type: 'Person', id: l.reviewer }, 'DECLARED app.learn_case.sme_review'); if (l.approved_by && people.has(l.approved_by)) E({ type: 'TrainingCase', id: l.code }, 'APPROVED_BY', { type: 'Person', id: l.approved_by }, 'DECLARED app.learn_case.approved_by'); }
  const todayIso = new Date().toISOString().slice(0, 10);
  for (const k of comps) { const counts = k.state === 'VERIFIED' && k.expires_on >= todayIso; const label = (CERTS as Record<string, { label: string }>)[k.competency]?.label || k.competency; nodes.push({ type: 'Competency', id: k.id, label: `${label} · ${people.get(k.person_id) || ''}`, subtitle: `${k.state === 'VERIFIED' && !counts ? 'EXPIRED' : k.state} · expires ${k.expires_on}`, provenance: 'app.competency_record', facets: { state: counts ? 'COUNTS' : k.state }, href: '#/learn/competencies', keywords: [k.competency, 'competency', 'certification'] }); if (counts && people.has(k.person_id)) E({ type: 'Person', id: k.person_id }, 'HAS_SKILL', { type: 'Competency', id: k.id }, 'DECLARED app.competency_record (verified, unexpired)'); if (k.decided_by && people.has(k.decided_by) && k.state !== 'PENDING_VERIFICATION') E({ type: 'Competency', id: k.id }, 'VERIFIED_BY', { type: 'Person', id: k.decided_by }, 'DECLARED app.competency_record.decided_by'); }
  for (const [id, name] of people) nodes.push({ type: 'Person', id, label: name, provenance: 'app.person (named by a visible record)' });
  // stored relationships: only those whose both ends are in the catalogue (anything else is outside the caller's view)
  const visible = new Set(nodes.map((n) => nodeKey(n)));
  let keyed = 0, legacy = 0;
  for (const r of rels) { const from = { type: r.from_type, id: r.from_id }, to = { type: r.to_type, id: r.to_id }; if (!visible.has(nodeKey(from)) || !visible.has(nodeKey(to)) || !RELATIONS[r.rel]) continue; if (r.from_key && r.to_key) keyed += 1; else legacy += 1; E(from, r.rel, to, `${r.provenance} app.relationship${r.from_key && r.to_key ? '' : ' (LEGACY_CODE_ONLY)'}`); }
  const types: Record<string, number> = {}; for (const n of nodes) types[n.type] = (types[n.type] || 0) + 1;
  const notes = ['people appear only where a visible record names them; the full directory needs policy.configure', 'ownership, support paths, vendors and availability are not modelled yet: intents about them answer UNKNOWN; skills are verified competency records (personal: only recorders and verifiers see everyone\'s)', ...(scoped ? ['site-scoped view: records of other sites are absent, not hidden'] : [])];
  return { nodes, edges, coverage: { types, edges: edges.length, keyed, legacyCodeOnly: legacy, notes }, people };
}

export async function searchEntities(ctx: RequestContext, params: { q?: string; type?: string; limit?: number; site?: string; building?: string; lifecycle?: string; state?: string; severity?: string }) {
  if (params.type && !/^[A-Za-z]{2,40}$/.test(params.type)) throw invalid('type must be a node type name');
  return ctx.tx(async (q) => {
    const cat = await catalogue(ctx, q);
    const facets: Record<string, string> = {}; for (const k of ['site', 'building', 'lifecycle', 'state', 'severity'] as const) if (params[k]) facets[k] = params[k]!;
    const r = rank(cat, { q: params.q || '', type: params.type || null, facets, limit: Math.min(params.limit ?? 50, 200) });
    await ctx.audit(null, 'search.query', 'ALLOWED', undefined, { q: (params.q || '').slice(0, 80), type: params.type || null, total: r.total });
    return { ...r, items: r.items.map((n) => ({ ...n, typeLabel: T(n.type) })), coverage: cat.coverage, intents: INTENTS.map((i) => ({ id: i.id, label: i.label, examples: i.examples })) };
  });
}

/** Neighbourhood + impact + a laid-out picture of one node, on the visible catalogue only (404 when the node is not in it). */
export async function neighbourhoodOf(ctx: RequestContext, type: string, id: string, depth: number, box = { w: 900, h: 600 }) {
  if (!/^[A-Za-z]{2,40}$/.test(type)) throw invalid('type must be a node type name');
  if (!Number.isInteger(depth) || depth < 1 || depth > 4) throw invalid('depth is 1 to 4');
  return ctx.tx(async (q) => {
    const cat = await catalogue(ctx, q); const start = { type, id }; const byKey = new Map(cat.nodes.map((n) => [nodeKey(n), n]));
    if (!byKey.has(nodeKey(start))) throw notFound(`${type} ${id} in the graph`);
    const g = new Graph(cat.edges);
    const steps = neighbourhood(g, start, depth, () => true, 300);
    const inSet = new Set(steps.map((s) => nodeKey(s.node)));
    const edges = cat.edges.filter((e) => inSet.has(nodeKey(e.from)) && inSet.has(nodeKey(e.to))).map((e) => ({ ...e, label: RELATIONS[e.rel]![0], inverse: RELATIONS[e.rel]![1] }));
    const placed = radialLayout(steps, box.w, box.h, 150);
    return { start: byKey.get(nodeKey(start)), depth, nodes: steps.map((s) => ({ ...byKey.get(nodeKey(s.node))!, depth: s.depth, via: s.via, typeLabel: T(s.node.type) })), edges, layout: placed, impact: impact(g, start, undefined, () => true).map((n) => ({ ...byKey.get(nodeKey(n))!, typeLabel: T(n.type) })), truncated: steps.length >= 300, coverage: cat.coverage };
  });
}

export async function pathBetween(ctx: RequestContext, from: string, to: string) {
  const parse = (s: string) => { const m = /^([A-Za-z]{2,40}):(.{1,120})$/.exec(s); if (!m) throw invalid('a node is written Type:id'); return { type: m[1]!, id: m[2]! }; };
  const a = parse(from), b = parse(to);
  return ctx.tx(async (q) => {
    const cat = await catalogue(ctx, q); const byKey = new Map(cat.nodes.map((n) => [nodeKey(n), n]));
    if (!byKey.has(nodeKey(a))) throw notFound(`${a.type} ${a.id} in the graph`); if (!byKey.has(nodeKey(b))) throw notFound(`${b.type} ${b.id} in the graph`);
    const p = path(new Graph(cat.edges), a, b);
    return { from: byKey.get(nodeKey(a)), to: byKey.get(nodeKey(b)), found: !!p, hops: p ? p.length : null, path: (p || []).map((e) => ({ ...e, label: RELATIONS[e.rel]![0] })), note: p ? 'shortest recorded path; an unrecorded link may be shorter' : 'no recorded path connects these two records' };
  });
}

/** Relationship intent: a question in words, answered from the visible graph plus facts the server can state (approvals, authority holders, baseline lineage). */
export async function intent(ctx: RequestContext, body: { question: string; target?: { type: string; id: string } | null }) {
  if (!body.question || body.question.length > 300) throw invalid('question is 1–300 characters');
  return ctx.tx(async (q) => {
    const cat = await catalogue(ctx, q); const byKey = new Map(cat.nodes.map((n) => [nodeKey(n), n]));
    let target: NodeRef | null = body.target || null;
    if (target && !byKey.has(nodeKey(target))) throw notFound(`${target.type} ${target.id} in the graph`);
    if (!target) { const m = /\b(R-[A-Z0-9-]{3,32}|A-\d{4}|ISS-\d{4}|WO-[A-Z0-9-]{3,20})\b/i.exec(body.question); if (m) { const id = m[1]!.toUpperCase(); const hit = cat.nodes.find((n) => n.id === id); if (hit) target = { type: hit.type, id: hit.id }; } }
    const facts: Facts = {
      approvals: (room) => {
        const r = cat.nodes.find((n) => n.type === 'Room' && n.id === room.id); if (!r) return [];
        return approvalsOf.get(room.id) || [];
      },
      holders: (authority, tgt) => holdersCache ? holdersCache(authority, tgt) : null,
      baselines: (room) => baselinesByRoom.get(room.id) || [],
      contact: (personId) => [{ label: `Copy reference for ${cat.people.get(personId) || personId}`, kind: 'copy', payload: `Person ${personId} (${cat.people.get(personId) || 'unknown'})`, available: true }, { label: 'Message in Teams', kind: 'teams', available: false, note: 'no Teams connector is configured (integration catalogue: NOT_CONFIGURED)' }, { label: 'Email', kind: 'mailto', available: false, note: 'email addresses are not exposed to this view' }],
    };
    // facts from records (only for the visible rooms)
    const approvalsOf = new Map<string, Array<{ what: string; by: string; at: string; provenance: string }>>();
    const baselinesByRoom = new Map<string, Array<{ id: string; version: number; state: string; designRevision: number; results: Record<string, string>; publishedBy: string; publishedAt: string }>>();
    if (target?.type === 'Room') {
      const row = (await q.query<{ id: string; approved_class: { by?: string; at?: string; archetype?: string; override?: boolean } | null }>('SELECT id, approved_class FROM app.room WHERE code = $1', [target.id])).rows[0];
      if (row) {
        const list: Array<{ what: string; by: string; at: string; provenance: string }> = [];
        if (row.approved_class?.by) list.push({ what: `classification ${row.approved_class.archetype || ''}${row.approved_class.override ? ' (override)' : ''} approved`, by: cat.people.get(row.approved_class.by) || row.approved_class.by, at: row.approved_class.at || '', provenance: 'app.room.approved_class' });
        const ev = (await q.query<{ action: string; actor_id: string | null; actor_role: string | null; at: string; detail: Record<string, unknown> }>("SELECT action, actor_id, actor_role, at, detail FROM app.audit_event WHERE aggregate_type = 'Room' AND aggregate_id = $1 AND outcome = 'ALLOWED' AND action IN ('room.lifecycle:DESIGN_APPROVED', 'room.revision.approve', 'room.lifecycle:ACCEPTED', 'assurance.baseline_published') ORDER BY at", [target.id])).rows;
        for (const e of ev) list.push({ what: e.action === 'room.lifecycle:DESIGN_APPROVED' ? 'design approved' : e.action === 'room.revision.approve' ? `design revision ${(e.detail as { revision?: number }).revision ?? '?'} approved (recommissioning)` : e.action === 'room.lifecycle:ACCEPTED' ? 'room accepted' : `baseline v${(e.detail as { version?: number }).version ?? '?'} published`, by: (e.actor_id && cat.people.get(e.actor_id)) || e.actor_role || 'unknown', at: e.at, provenance: 'app.audit_event' });
        approvalsOf.set(target.id, list);
        const bl = (await q.query<{ id: string; version: number; state: string; design_revision: number; results: Record<string, string>; published_by: string; published_at: string }>('SELECT id, version, state, design_revision, results, published_by, published_at FROM app.assurance_baseline WHERE room_id = $1 ORDER BY version', [row.id])).rows;
        baselinesByRoom.set(target.id, bl.map((b) => ({ id: b.id, version: b.version, state: b.state, designRevision: b.design_revision, results: b.results, publishedBy: cat.people.get(b.published_by) || b.published_by, publishedAt: b.published_at })));
      }
    }
    // authority holders: members of the tenant whose role (or an in-force delegation) carries the authority; excluded by SoD for the target
    const members = (await q.query<{ person_id: string; display_name: string; role_key: string; authorities: string[] }>('SELECT m.person_id, p.display_name, m.role_key, r.authorities FROM app.membership m JOIN app.person p ON p.id = m.person_id JOIN app.role r ON r.key = m.role_key WHERE m.revoked_at IS NULL')).rows;
    const holdersCache = (authority: string, tgt: NodeRef | null) => {
      const people = members.filter((m) => m.authorities.includes(authority) || m.authorities.includes('*')).map((m) => ({ id: m.person_id, name: m.display_name, role: m.role_key }));
      const excluded: Array<{ name: string; why: string }> = [];
      if (tgt?.type === 'Room') { const authors = new Set<string>(); for (const e of cat.edges) if (e.from.type === 'Room' && e.from.id === tgt.id && e.rel === 'DESIGNED_FOR') authors.add(e.to.id); for (const p of people) if (authors.has(p.id)) excluded.push({ name: p.name, why: 'authored the design (separation of duties, ADR-0005)' }); }
      return { people: people.filter((p) => !excluded.some((x) => x.name === p.name)), excluded, provenance: 'app.membership × app.role (memberships only; delegations are resolved per request and not listed here)' };
    };
    // qualification: ServiceHands' own hard gates for the triaged work order remedying the issue (service managers only)
    const qualified = target?.type === 'RoomIssue' ? await svc.qualifiedForIssue(ctx, q, target.id) : null;
    facts.qualified = (issue) => (qualified && issue.id === target?.id ? qualified : null);
    const g = new Graph(cat.edges);
    const answer = ask({ graph: g, nodes: byKey, facts }, body.question, target);
    await ctx.audit(null, 'search.intent', 'ALLOWED', target ? { type: target.type, id: target.id } : undefined, { intent: answer.intent, status: answer.status });
    return { ...answer, items: answer.items.map((i) => ({ ...i, href: byKey.get(nodeKey(i.node))?.href })) };
  });
}
