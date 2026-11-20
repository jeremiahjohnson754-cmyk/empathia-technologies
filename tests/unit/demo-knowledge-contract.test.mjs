// The knowledge contract (apps/demo/src/knowledge/contract.ts; founder's directive of 11 Nov 2026, §07–§09). One definition of a
// knowledge object and of who may read it, used by the ledger, the three publications, Search Party and Ask Empathia. These tests
// hold the rules the founder called "absolutely critical": a tenant's private knowledge is never readable from another tenant, in
// any zone state or role, across thousands of random objects and readers; nothing unverified is promoted without a named person;
// nothing private is shared without consent; and a list cut down for a reader carries no trace of what was removed.
//   node --test tests/unit/demo-knowledge-contract.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-knowledge-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/knowledge/contract.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const K = await import(pathToFileURL(out).href);
const ROLES = ['visitor', 'employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect', 'qa'];
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const src = (authority = 6, rights = 'empathia-original') => ({ system: 'empathia', title: 'Synthetic source', version: '1', authority, rights });
const obj = (over = {}) => ({ id: 'K-1', title: 'Gain structure', topic: 'audio', domain: 'Audio engineering', contentType: 'concept', difficulty: 'foundation', audience: 'technicians', roles: [], objectives: ['Explain gain structure'],
  zone: 2, tenant: null, acl: { roles: [], groups: [] }, sources: [src()], state: 'APPROVED', reviewer: 'Reviewer (synthetic)', reviewedOn: '2026-10-01', reviewBy: '2027-10-01', body: ['Synthetic text.'], ...over });
const reader = (over = {}) => ({ tenant: 'tenant_a', role: 'service', groups: [], ...over });

test('KC-01 the five zones and the ten-step source hierarchy are the founder’s', () => {
  assert.deepEqual(Object.keys(K.ZONES), ['1', '2', '3', '4', '5']); assert.equal(Object.keys(K.AUTHORITIES).length, 10);
  assert.match(K.AUTHORITIES[1], /Law/); assert.match(K.AUTHORITIES[2], /standard/i); assert.match(K.AUTHORITIES[3], /manufacturer/i); assert.match(K.AUTHORITIES[10], /AI-generated/);
});
test('KC-02 universal knowledge is read by every tenant; a tenant’s private knowledge only inside that tenant', () => {
  for (const zone of [1, 2]) for (const tenant of ['tenant_a', 'tenant_b']) assert.ok(K.mayRead(obj({ zone }), reader({ tenant })).ok);
  const priv = obj({ zone: 3, tenant: 'tenant_a' });
  assert.ok(K.mayRead(priv, reader({ tenant: 'tenant_a' })).ok);
  const no = K.mayRead(priv, reader({ tenant: 'tenant_b' })); assert.equal(no.ok, false); assert.match(no.why, /another tenant/);
});
test('KC-03 property: across 20,000 random objects and readers nothing private or unverified is ever read from another tenant, whatever the role, group, state or reviewer flag', () => {
  const r = rng(11); const pick = (a) => a[Math.floor(r() * a.length)]; let crossChecked = 0;
  for (let i = 0; i < 20000; i += 1) {
    const zone = pick([1, 2, 3, 4, 5]); const tenant = pick([null, 'tenant_a', 'tenant_b', 'tenant_c']);
    const o = obj({ zone, tenant, state: pick(['DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED']), acl: { roles: r() < 0.5 ? [] : [pick(ROLES), pick(ROLES)], groups: r() < 0.6 ? [] : [pick(['g1', 'g2'])] },
      ...(r() < 0.5 ? { consent: { by: 'Admin (synthetic)', on: '2026-10-01', anonymised: 'names and sites removed' } } : {}) });
    const rd = reader({ tenant: pick(['tenant_a', 'tenant_b', 'tenant_c']), role: pick(ROLES), groups: r() < 0.5 ? [] : [pick(['g1', 'g2'])], reviewer: r() < 0.5 });
    const ans = K.mayRead(o, rd);
    if ((zone === 3 || zone === 5) && o.tenant !== rd.tenant) { crossChecked += 1; assert.equal(ans.ok, false, JSON.stringify({ o: { zone, tenant }, rd })); }
    if (zone === 5 && !rd.reviewer) assert.equal(ans.ok, false);
    if ((zone === 1 || zone === 2) && tenant !== null) assert.equal(ans.ok, false, 'a universal object owned by a tenant is malformed and unreadable');
    if (zone === 4 && !o.consent) assert.equal(ans.ok, false, 'shared without consent is unreadable');
    if (ans.ok && o.acl.roles.length) assert.ok(o.acl.roles.includes(rd.role)); if (ans.ok && o.acl.groups.length) assert.ok(o.acl.groups.some((g) => rd.groups.includes(g)));
  }
  assert.ok(crossChecked > 3000, String(crossChecked));
});
test('KC-04 the source’s access list is honoured: a role or a group the source does not name reads nothing', () => {
  const o = obj({ zone: 3, tenant: 'tenant_a', acl: { roles: ['syseng', 'svcmgr'], groups: ['av-engineering'] } });
  assert.equal(K.mayRead(o, reader({ role: 'service', groups: ['av-engineering'] })).ok, false);
  assert.equal(K.mayRead(o, reader({ role: 'syseng', groups: [] })).ok, false);
  assert.ok(K.mayRead(o, reader({ role: 'syseng', groups: ['av-engineering', 'other'] })).ok);
});
test('KC-05 a list cut down for a reader carries no trace of what was removed', () => {
  const list = [obj({ id: 'K-1' }), obj({ id: 'K-2', zone: 3, tenant: 'tenant_b', title: 'Tenant B incident' }), obj({ id: 'K-3', zone: 5, tenant: 'tenant_a' }), obj({ id: 'K-4', zone: 3, tenant: 'tenant_a' })];
  const seen = K.redactFor(list, reader()); assert.deepEqual(seen.map((o) => o.id), ['K-1', 'K-4']);
  assert.ok(!JSON.stringify(seen).includes('Tenant B')); assert.equal(list.length, 4, 'the source list is not changed');
});
test('KC-06 only approved knowledge outside zone 5 is fact; a draft a reader may read stays a draft', () => {
  assert.equal(K.isFact(obj()), true); assert.equal(K.isFact(obj({ state: 'DRAFT' })), false); assert.equal(K.isFact(obj({ zone: 5, tenant: 'tenant_a' })), false);
  assert.ok(K.mayRead(obj({ state: 'DRAFT' }), reader()).ok); assert.match(K.cite(obj({ state: 'DRAFT' }), '2026-11-11'), /not approved/);
});
test('KC-07 promotion: never by a model or an automation, never without a name; an observation becomes tenant knowledge only through a reviewer', () => {
  const cand = obj({ zone: 5, tenant: 'tenant_a', state: 'IN_REVIEW', sources: [src(10)] });
  for (const kind of ['ai', 'system']) { const x = K.promote(cand, { to: 3, by: { name: 'Harmony', kind }, on: '2026-11-11' }); assert.match(x.refused, /named person/); }
  assert.match(K.promote(cand, { to: 3, by: { name: ' ', kind: 'human-reviewer' }, on: '2026-11-11' }).refused, /Name the reviewer/);
  assert.match(K.promote(cand, { to: 3, by: { name: 'Admin', kind: 'tenant-admin' }, on: '2026-11-11' }).refused, /reviewer/);
  const done = K.promote(cand, { to: 3, by: { name: 'Reviewer (synthetic)', kind: 'human-reviewer' }, on: '2026-11-11' });
  assert.equal(done.object.zone, 3); assert.equal(done.object.state, 'APPROVED'); assert.equal(done.object.tenant, 'tenant_a'); assert.equal(cand.zone, 5, 'the original is not changed');
  for (const to of [1, 2, 4]) assert.ok(K.promote(cand, { to, by: { name: 'Reviewer', kind: 'human-reviewer' }, on: '2026-11-11' }).refused, `5 → ${to}`);
});
test('KC-08 sharing: a tenant’s knowledge reaches other tenants only with its recorded consent, anonymised, approved and reviewed; never by becoming universal', () => {
  const priv = obj({ zone: 3, tenant: 'tenant_a', acl: { roles: [], groups: ['av-engineering'] } }); const by = { name: 'Reviewer (synthetic)', kind: 'human-reviewer' };
  assert.match(K.promote(priv, { to: 4, by, on: '2026-11-11' }).refused, /consent/);
  assert.match(K.promote(priv, { to: 4, by, on: '2026-11-11', consent: { by: 'Admin', on: '2026-11-10', anonymised: '  ' } }).refused, /consent/);
  assert.match(K.promote({ ...priv, state: 'DRAFT' }, { to: 4, by, on: '2026-11-11', consent: { by: 'Admin', on: '2026-11-10', anonymised: 'names removed' } }).refused, /approved/);
  assert.match(K.promote(priv, { to: 4, by: { name: 'Admin', kind: 'tenant-admin' }, on: '2026-11-11', consent: { by: 'Admin', on: '2026-11-10', anonymised: 'names removed' } }).refused, /reviewed by a person/);
  for (const to of [1, 2]) assert.match(K.promote(priv, { to, by, on: '2026-11-11' }).refused, /not turned into universal knowledge/);
  const shared = K.promote(priv, { to: 4, by, on: '2026-11-11', consent: { by: 'Admin (synthetic)', on: '2026-11-10', anonymised: 'names, sites and addresses removed' } }).object;
  assert.equal(shared.zone, 4); assert.equal(shared.tenant, 'tenant_a', 'ownership is kept'); assert.ok(K.mayRead(shared, reader({ tenant: 'tenant_b' })).ok);
  assert.equal(K.mayRead(priv, reader({ tenant: 'tenant_b', groups: ['av-engineering'] })).ok, false, 'the private original stays private');
});
test('KC-09 authority: the stronger source wins, then the later review, then the id; the order is total', () => {
  const a = obj({ id: 'A', sources: [src(4)] }); const b = obj({ id: 'B', sources: [src(8), src(3)] }); const c = obj({ id: 'C', sources: [] });
  assert.equal(K.authorityOf(b), 3); assert.equal(K.authorityOf(c), 10);
  assert.deepEqual([a, c, b].sort(K.compareAuthority).map((o) => o.id), ['B', 'A', 'C']);
  const later = obj({ id: 'Z', sources: [src(4)], reviewedOn: '2026-11-01' }); assert.deepEqual([a, later].sort(K.compareAuthority).map((o) => o.id), ['Z', 'A']);
  assert.equal(K.compareAuthority(a, a), 0);
});
test('KC-10 freshness is computed from the review dates: current, due within thirty days, stale, never reviewed', () => {
  const o = obj({ reviewedOn: '2026-01-01', reviewBy: '2026-12-31' });
  assert.equal(K.freshness(o, '2026-11-11'), 'CURRENT'); assert.equal(K.freshness(o, '2026-12-01'), 'DUE'); assert.equal(K.freshness(o, '2026-12-31'), 'DUE'); assert.equal(K.freshness(o, '2027-01-01'), 'STALE');
  assert.equal(K.freshness(obj({ reviewedOn: null }), '2026-11-11'), 'NEVER_REVIEWED'); assert.match(K.cite(o, '2027-02-01'), /review overdue/);
});
test('KC-11 a standard that may not be reproduced is stored as metadata only', () => {
  assert.equal(K.mayReproduce(src(2, 'metadata-only')), false); assert.equal(K.mayReproduce(src(2, 'unknown')), false);
  for (const rights of ['empathia-original', 'founder-owned', 'licensed-reproduction', 'tenant-owned', 'tenant-shared-with-consent']) assert.equal(K.mayReproduce(src(6, rights)), true);
});
test('KC-12 a citation names the title, the source, its version and kind, and says when the object is not approved or has no source', () => {
  assert.equal(K.cite(obj(), '2026-11-11'), 'Gain structure · Synthetic source 1 · Expert-reviewed internal procedure');
  assert.match(K.cite(obj({ sources: [] }), '2026-11-11'), /no source recorded/);
});
