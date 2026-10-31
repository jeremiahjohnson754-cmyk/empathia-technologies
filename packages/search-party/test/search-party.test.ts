import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph, search, ask, radialLayout, neighbourhood, type Catalogue, type SearchNode } from '../src/index.js';

const nodes: SearchNode[] = [
  { type: 'Site', id: 'SITE-NORTH', label: 'North Campus', provenance: 'app.site', facets: { site: 'SITE-NORTH' } },
  { type: 'Building', id: 'ATL', label: 'Atlas Tower', provenance: 'app.building', facets: { site: 'SITE-NORTH' } },
  { type: 'Room', id: 'R-PLN-0001', label: 'Harbour Huddle', subtitle: 'Atlas Tower · floor 2', provenance: 'app.room', facets: { site: 'SITE-NORTH', lifecycle: 'ACCEPTED' } },
  { type: 'Room', id: 'R-PLN-0002', label: 'Skyline Boardroom', provenance: 'app.room', facets: { site: 'SITE-SOUTH', lifecycle: 'PLANNED' } },
  { type: 'PlannedAsset', id: 'A-0001', label: 'Display 1', provenance: 'app.planned_asset', facets: { site: 'SITE-NORTH' } },
  { type: 'PlannedAsset', id: 'A-0002', label: 'Switch 1', provenance: 'app.planned_asset', facets: { site: 'SITE-NORTH' } },
  { type: 'PlannedAsset', id: 'A-0003', label: 'UC room compute 1', provenance: 'app.planned_asset', facets: { site: 'SITE-NORTH' } },
];
const edges = [
  { from: { type: 'Building', id: 'ATL' }, rel: 'LOCATED_IN', to: { type: 'Site', id: 'SITE-NORTH' }, provenance: 'DERIVED app.building.site_id' },
  { from: { type: 'Room', id: 'R-PLN-0001' }, rel: 'LOCATED_IN', to: { type: 'Building', id: 'ATL' }, provenance: 'DECLARED' },
  { from: { type: 'Room', id: 'R-PLN-0001' }, rel: 'PLANS_DEVICE', to: { type: 'PlannedAsset', id: 'A-0001' }, provenance: 'DECLARED' },
  { from: { type: 'Room', id: 'R-PLN-0001' }, rel: 'PLANS_DEVICE', to: { type: 'PlannedAsset', id: 'A-0002' }, provenance: 'DECLARED' },
  { from: { type: 'Room', id: 'R-PLN-0001' }, rel: 'PLANS_DEVICE', to: { type: 'PlannedAsset', id: 'A-0003' }, provenance: 'DECLARED' },
  { from: { type: 'PlannedAsset', id: 'A-0002' }, rel: 'FEEDS', to: { type: 'PlannedAsset', id: 'A-0003' }, provenance: 'MODELED' },
  { from: { type: 'PlannedAsset', id: 'A-0003' }, rel: 'CONNECTS_TO', to: { type: 'PlannedAsset', id: 'A-0001' }, provenance: 'MODELED' },
];
const cat: Catalogue = { nodes, edges, coverage: { types: {}, edges: edges.length, notes: [] } };
const ctx = () => ({ graph: new Graph(edges), nodes: new Map(nodes.map((n) => [`${n.type}:${n.id}`, n])), facts: {} });

test('search ranks ids above labels, counts facets over the visible set only, and filters by type', () => {
  const r = search(cat, { q: 'R-PLN-0001' }); assert.equal(r.items[0]!.id, 'R-PLN-0001'); assert.equal(r.items[0]!.matched, 'id');
  const h = search(cat, { q: 'huddle' }); assert.equal(h.items[0]!.label, 'Harbour Huddle');
  const all = search(cat, { q: '' }); assert.equal(all.total, 7); assert.deepEqual(all.facets.type, { Site: 1, Building: 1, Room: 2, PlannedAsset: 3 }); assert.deepEqual(all.facets['site'], { 'SITE-NORTH': 6, 'SITE-SOUTH': 1 });
  const t = search(cat, { q: '', type: 'Room', facets: { site: 'SITE-NORTH' } }); assert.equal(t.total, 1);
  const miss = search(cat, { q: 'nothing matches this' }); assert.equal(miss.total, 0);
});

test('an unauthorized node is absent from the neighbourhood, the impact and the facets (canSee), never merely hidden', () => {
  const c = ctx(); const canSee = (n: { id: string }) => n.id !== 'A-0003';
  const steps = neighbourhood(c.graph, { type: 'Room', id: 'R-PLN-0001' }, 3, canSee);
  assert.ok(!steps.some((s) => s.node.id === 'A-0003'));
  const dep = ask({ ...c, canSee }, 'If this switch fails, what is affected?', { type: 'PlannedAsset', id: 'A-0002' });
  assert.ok(!JSON.stringify(dep.items).includes('A-0003'));
});

test('intents: dependency follows recorded edges and states its uncertainty; unmodelled facts are UNKNOWN, never invented', () => {
  const c = ctx();
  const dep = ask(c, 'Which rooms depend on this network switch?', { type: 'PlannedAsset', id: 'A-0002' });
  assert.equal(dep.status, 'ANSWERED'); assert.equal(dep.confidence, 'DERIVED');
  assert.ok(dep.items.some((i) => i.node.id === 'A-0003') && dep.items.some((i) => i.node.id === 'A-0001') && dep.items.some((i) => i.node.id === 'R-PLN-0001'), JSON.stringify(dep.items));
  assert.ok(dep.uncertainty.length);
  const own = ask(c, 'Who is responsible for this room?', { type: 'Room', id: 'R-PLN-0001' });
  assert.equal(own.status, 'UNKNOWN'); assert.equal(own.items.length, 0); assert.match(own.uncertainty[0]!, /not yet modelled/);
  const vendor = ask(c, 'Which vendor supports this system?', { type: 'PlannedAsset', id: 'A-0001' });
  assert.equal(vendor.status, 'UNKNOWN');
  const q = ask(c, 'Which technician is qualified and available to investigate this issue?', null);
  assert.equal(q.status, 'UNKNOWN'); assert.match(q.uncertainty[0]!, /not part of the data model/);
  const none = ask(c, 'What is the meaning of life?', null); assert.equal(none.intent, 'none'); assert.equal(none.status, 'UNKNOWN');
});

test('intents backed by host facts: approvals, authority holders with SoD exclusions, baseline diff', () => {
  const c = { ...ctx(), facts: {
    approvals: () => [{ what: 'classification approved', by: 'Systems Engineer', at: '2026-10-30T10:00:00Z', provenance: 'app.audit_event' }],
    holders: (authority: string) => ({ people: [{ id: 'p1', name: 'Systems Engineer', role: 'syseng' }], excluded: [{ name: 'Commissioning Engineer', why: 'requested the exception' }], provenance: 'app.membership + app.auth_delegations' }),
    baselines: () => [{ id: 'b1', version: 1, state: 'SUPERSEDED', designRevision: 2, results: { t1: 'PASS_VERIFIED', t2: 'PASS_VERIFIED' }, publishedBy: 'ops', publishedAt: '2026-10-30' }, { id: 'b2', version: 2, state: 'CURRENT', designRevision: 3, results: { t1: 'PASS_VERIFIED', t2: 'FAIL' }, publishedBy: 'ops', publishedAt: '2026-10-31' }],
  } };
  const ap = ask(c, 'Which engineer approved the current design?', { type: 'Room', id: 'R-PLN-0001' }); assert.equal(ap.status, 'ANSWERED'); assert.equal(ap.confidence, 'OBSERVED');
  const who = ask(c, 'Who can approve this commissioning exception?', { type: 'Room', id: 'R-PLN-0001' }); assert.equal(who.status, 'ANSWERED'); assert.equal(who.items.length, 1); assert.match(who.uncertainty[0]!, /requested the exception/);
  const diff = ask(c, 'What changed between baseline v1 and v2?', { type: 'Room', id: 'R-PLN-0001' }); assert.equal(diff.status, 'ANSWERED'); assert.equal(diff.items.length, 1); assert.match(diff.summary, /the design revision changed/);
});

test('radial layout is deterministic, bounded and keeps every node inside the box', () => {
  const c = ctx(); const steps = neighbourhood(c.graph, { type: 'Room', id: 'R-PLN-0001' }, 3);
  const a = radialLayout(steps, 800, 600), b = radialLayout(steps, 800, 600);
  assert.deepEqual(a, b); assert.equal(a.length, steps.length);
  assert.ok(a.every((p) => p.x >= 0 && p.x <= 800 && p.y >= 0 && p.y <= 600)); assert.equal(a[0]!.x, 400);
});
