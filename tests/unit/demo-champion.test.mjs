// The Site Champion (apps/demo/src/champion; founder, 11 Nov 2026: "a distinct governed role with its own permission model, Mission
// Control, profile … scoped access … must not inherit privileged engineering, administrative, or commissioning-signoff capabilities
// merely because of their title"). These tests hold the permission model as arithmetic over every registered surface and every legacy
// table: the champion has what the Employee has, a short named list more, and nothing else; each thing a champion does is refused to
// every other role, refused outside the champion's own site, written to the ledger either way, and changes nothing but what it says.
//   node --test tests/unit/demo-champion.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-champion-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as C from './champion/store.ts'; export * as H from './campus/rolehome.ts'; export * as D from './campus/design.ts'; export * as N from './campus/canon.ts'; export * as M from './campus/metrics.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as V from './access/v253.ts'; export * as R from './registry.pages.ts'; export * as B from './build/store.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { C, H, D, N, M, W, P, V, R, B } = await import(pathToFileURL(out).href);
const SC = 'sitechamp'; const SITE = P.CHAMPION_SITES[0]; const others = P.ROLE_KEYS.filter((k) => k !== SC);
const inRoom = N.roomsIn(SITE)[0].id; const outRoom = N.CAMPUS_ROOMS.find((r) => !P.CHAMPION_SITES.includes(r.building)).id;
const fresh = () => { mem.clear(); return W.seed(); };
const strip = (w) => { const { ch, events, workOrders, ...rest } = structuredClone(w); return { rest, wos: workOrders.map(({ access, ...x }) => x) }; };

test('CH-01 the role is the platform’s persona: Site Champion, home "My site", an employee who holds asking and reporting and exactly three authorities of its own', () => {
  const r = P.ROLES[SC]; assert.equal(r.label, 'Site Champion'); assert.equal(r.initials, 'SC'); assert.equal(r.home, 'My site'); assert.ok(!r.internal);
  assert.equal(B.personaOf(SC), 'sitechamp');
  for (const a of ['location.verify', 'access.coordinate', 'occupancy.confirm', 'request.submit']) assert.ok(B.holds('sitechamp', a), a);
  for (const a of ['service.triage', 'service.assign', 'service.close', 'work.evidence', 'work.accept', 'test.verify', 'tests.verify.all', 'customer.accept', 'room.design', 'design.release', 'room.classify.approve', 'policy.configure', 'license.grant', 'standard.change', 'documents.approve', 'field.authorize', 'access.approve'])
    assert.equal(B.holds('sitechamp', a), false, `holds ${a}`);
});
test('CH-02 the permission model over every legacy table: what the Employee has, the short named list, and nothing else', () => {
  const extra = { AZ_AREA: ['search.people', 'search.support'], AZ_ACTION: ['social.contribute'], AZ_FIELD: ['history', 'person.contact', 'support.chain'], AZ_ENTITY: ['Issue', 'PersonRole', 'Contact', 'WorkOrder', 'KnowledgeAsset', 'Team', 'Site'], AZ_LENS: [], AZ_LAYER: [], AZ_COMPARE: [], AZ_AREA_V25: [] };
  const kind = { AZ_AREA: 'area', AZ_AREA_V25: 'area', AZ_ACTION: 'action', AZ_FIELD: 'field', AZ_ENTITY: 'entity', AZ_LENS: 'lens', AZ_LAYER: 'layer', AZ_COMPARE: 'compare' }; let n = 0;
  for (const [table, keys] of Object.entries(extra)) for (const [k, v] of Object.entries(V[table])) {
    const roles = Array.isArray(v[0]) ? v[0] : v; const want = roles.includes('employee') || keys.includes(k);
    assert.equal(P.allows({ [kind[table]]: k }, SC), want, `${table} ${k}`); n += 1;
  }
  assert.ok(n > 250, String(n));
  // by name, the things the founder said a title must not bring: engineering, administration, commissioning sign-off
  for (const a of ['cx.tech', 'cx.accept', 'cx.revoke', 'com.run', 'com.signoff', 'com.deficiency', 'com.fix', 'assure.run', 'assure.approveBaseline', 'assure.change', 'sh.triage', 'sh.engineer', 'sh.authorize', 'sh.install', 'sh.minicx', 'sh.close', 'wo.step', 'escalate', 'govern', 'build.design', 'builder.edit', 'design.decide', 'optimize.edit', 'budget.decide', 'budget.plan', 'deviation.decide', 'install.gate', 'handoff.accept', 'review.decide', 'fabric.fire'])
    assert.equal(P.allows({ action: a }, SC), false, a);
  for (const f of ['technical', 'control.engineer', 'commissioning.record', 'assurance.evidence', 'assurance.findings', 'cost', 'health', 'operations', 'graph', 'agreement.value']) assert.equal(P.allows({ field: f }, SC), false, f);
  for (const a of ['room', 'pro', 'commissioning', 'assurance', 'builder', 'scouter', 'budget', 'servicehands', 'service', 'ledger', 'fabric', 'core', 'install', 'projects', 'learn', 'agent']) assert.equal(P.allows({ area: a }, SC), false, a);
  for (const l of ['engineer', 'exec', 'optimize']) assert.equal(P.allows({ lens: l }, SC), false, l);
});
test('CH-03 over every registered page, section and action: the champion is admitted where the Employee is, and to its own named surfaces; the dossier and its sign-off are closed to it', () => {
  const surfaces = R.PAGES.flatMap((p) => [{ id: p.id, a: p.authority }, ...(p.sections || []).map((s) => ({ id: s.id, a: s.authority })), ...(p.actions || []).map((s) => ({ id: s.id, a: s.authority }))]);
  const mine = surfaces.filter((s) => P.rolesFor(s.a).includes(SC)).map((s) => s.id); const emp = surfaces.filter((s) => P.rolesFor(s.a).includes('employee')).map((s) => s.id);
  for (const id of emp) assert.ok(mine.includes(id), `the Employee has ${id}; the champion must too`);
  const more = mine.filter((id) => !emp.includes(id)).sort();
  for (const id of ['site', 'site.access', 'site.verify', 'site.occupancy', 'site.contribute', 'scan.attest', 'here.history']) assert.ok(more.includes(id), `${id} is the champion’s`);
  for (const id of more) assert.ok(/^(site|scan\.attest|here\.history)/.test(id) || surfaces.some((s) => s.id === id && ('field' in s.a ? ['history', 'person.contact', 'support.chain'].includes(s.a.field) : 'area' in s.a ? ['search.people', 'search.support'].includes(s.a.area) : 'action' in s.a ? s.a.action === 'social.contribute' : 'entity' in s.a)), `unexpected surface for the champion: ${id}`);
  for (const id of ['dossier', 'dossier.record', 'dossier.raise', 'dossier.verify', 'dossier.accept', 'dossier.countersign', 'dossier.waive.business', 'dossier.waive.technical', 'dossier.waive.review', 'dossier.export', 'scan.attach', 'scan.openTest', 'scan.technical', 'scan.acceptance'])
    assert.ok(!mine.includes(id), `the champion must not have ${id}`);
  assert.ok(!emp.includes('scan.attest') && !emp.includes('site'), 'the Employee is not the champion: it neither attests nor has a site');
  const site = R.resolve('#/site'); assert.ok(site); assert.deepEqual(P.ROLE_KEYS.filter((k) => P.canOpen(k, site)), [SC], 'only the champion opens My site');
});
test('CH-04 access for a visit: the champion confirms it, once, for their own site; the technician’s pre-flight then finds it; nothing else about the job changes', () => {
  const w = fresh(); const wo = w.workOrders.find((x) => x.buildingKey === SITE && !['DONE', 'CANCELLED'].includes(x.state)); assert.ok(wo, 'a visit is planned at the site'); assert.equal(wo.access, null);
  const before = strip(w); assert.equal(W.preflightFor(w, wo.id, {}).checks.find((c) => c.id === 'access').ok, false);
  assert.deepEqual(C.confirmAccess(w, SC, wo.id), { ok: true }); assert.equal(wo.access.confirmedBy, 'the Site Champion');
  assert.equal(w.events[0].type, 'site.access_confirmed'); assert.equal(w.events[0].outcome, 'ALLOWED'); assert.equal(w.events[0].by, 'sitechamp');
  assert.equal(W.preflightFor(w, wo.id, {}).checks.find((c) => c.id === 'access').ok, true, 'the pre-flight reads the champion’s confirmation');
  assert.deepEqual(strip(w), before, 'no incident, state, technician, part or test changed');
  assert.match(C.confirmAccess(w, SC, wo.id).why[0], /already confirmed/);
  assert.match(C.confirmAccess(w, SC, 'WO-9999').why[0], /No such visit/);
  const done = w.workOrders.find((x) => x.state === 'DONE'); if (done) { done.buildingKey = SITE; done.access = null; assert.match(C.confirmAccess(w, SC, done.id).why[0], /no visit to confirm/); }
});
test('CH-05 scope: the same action on another site’s visit or room is refused, in words, and the refusal is in the ledger', () => {
  const w = fresh(); const wo = w.workOrders.find((x) => !['DONE', 'CANCELLED'].includes(x.state)); wo.buildingKey = 'NST'; wo.access = null;
  const r = C.confirmAccess(w, SC, wo.id); assert.match(r.why[0], /outside your site/); assert.equal(wo.access, null); assert.equal(w.events[0].outcome, 'DENIED');
  for (const f of [() => C.verifyRoom(w, SC, outRoom, ''), () => C.confirmOccupancy(w, SC, outRoom, 'free'), () => C.contribute(w, SC, outRoom, 'The door sticks; lift the handle.')]) {
    const x = f(); assert.match(x.why[0], /outside your site/); assert.equal(w.events[0].outcome, 'DENIED'); }
  assert.deepEqual(C.championView(w), { verified: {}, occupancy: {}, notes: [] }, 'nothing was recorded');
  assert.equal(C.roomInSite(inRoom), true); assert.equal(C.roomInSite(outRoom), false); assert.equal(C.roomInSite('R-NO-SUCH'), false);
});
test('CH-06 the role matrix: each of the four champion actions is refused to every one of the fifteen other roles, written down, and changes nothing', () => {
  for (const k of others) { const w = fresh(); const wo = w.workOrders.find((x) => x.buildingKey === SITE && !['DONE', 'CANCELLED'].includes(x.state)); const before = JSON.stringify({ ...strip(w), ch: C.championView(w) });
    for (const [name, f] of [['access', () => C.confirmAccess(w, k, wo.id)], ['verify', () => C.verifyRoom(w, k, inRoom, '')], ['occupancy', () => C.confirmOccupancy(w, k, inRoom, 'free')], ['note', () => C.contribute(w, k, inRoom, 'The door sticks; lift the handle.')]]) {
      const x = f(); assert.ok('why' in x, `${k} ${name}`); assert.equal(w.events[0].outcome, 'DENIED', `${k} ${name}`); }
    assert.equal(wo.access, null, k); assert.equal(JSON.stringify({ ...strip(w), ch: C.championView(w) }), before, `${k}: a refused role changed something`); }
  assert.equal(others.length, 15);
});
test('CH-07 a room checked on site, what was seen at the door, and a note: each is recorded as what it is — a person’s check, an observation, a candidate', () => {
  const w = fresh(); const before = strip(w);
  assert.deepEqual(C.verifyRoom(w, SC, inRoom, ' The door sign says 4.218. '), { ok: true }); assert.equal(C.championView(w).verified[inRoom].note, 'The door sign says 4.218.');
  assert.match(C.verifyRoom(w, SC, inRoom, 'x'.repeat(301)).why[0], /under 300/); assert.match(C.verifyRoom(w, SC, 'R-NO-SUCH', '').why[0], /Choose a room/);
  assert.deepEqual(C.confirmOccupancy(w, SC, inRoom, 'in-use'), { ok: true }); assert.equal(C.championView(w).occupancy[inRoom].state, 'in-use'); assert.match(w.events[0].detail, /an observation, not a sensor/);
  assert.match(C.confirmOccupancy(w, SC, inRoom, 'maybe').why[0], /in use or free/);
  assert.match(C.contribute(w, SC, inRoom, 'short').why[0], /in a sentence/); assert.match(C.contribute(w, SC, inRoom, 'x'.repeat(401)).why[0], /under 400/);
  const n = C.contribute(w, SC, inRoom, 'The blinds must be down after 3 pm or the camera washes out.'); assert.equal(n.state, 'CANDIDATE'); assert.match(n.id, /^SN-\d{4}$/); assert.match(w.events[0].detail, /candidate, awaiting review/);
  assert.match(C.contribute(w, SC, inRoom, 'The blinds must be down after 3 pm or the camera washes out.').why[0], /already recorded/);
  assert.ok(C.championView(w).notes.every((x) => x.state === 'CANDIDATE'), 'a champion’s note is never anything but a candidate');
  assert.deepEqual(strip(w), before, 'none of it changed a job, a visit or anything else');
});
test('CH-08 stored champion state is untrusted: anything of the wrong shape reads as empty and nothing throws', () => {
  for (const bad of [null, 5, 'x', [], { verified: 7, occupancy: [], notes: 'no' }, { notes: [null, 3, { text: 5 }, { text: 'ok', roomId: inRoom }] }]) { const w = fresh(); w.ch = bad; const v = C.championView(w);
    assert.equal(typeof v.verified, 'object'); assert.ok(Array.isArray(v.notes)); assert.ok(v.notes.every((n) => typeof n.text === 'string')); }
  assert.deepEqual(C.championView(null), { verified: {}, occupancy: {}, notes: [] });
});
test('CH-09 the champion’s start page is their own site, computed from the records: no health score, no money, no link the policy did not grant', () => {
  const w = fresh(); const opens = (href) => { const at = R.resolve(href.split('?')[0]); return !!at && P.canOpen(SC, at); };
  const s = H.startFor({ role: SC, w, opens }); assert.equal(s.name, 'My site'); assert.equal(s.strip, null);
  const recs = D.allRecords().filter((r) => r.outline.building === SITE); const withProblem = recs.filter((r) => M.roomIssues(r, w).some((x) => x.state !== 'RESOLVED'));
  const visits = w.workOrders.filter((x) => x.buildingKey === SITE && !['DONE', 'CANCELLED'].includes(x.state));
  assert.deepEqual(s.tiles.map((t) => t.value), [String(recs.length), String(withProblem.length), String(visits.length)]);
  assert.ok(s.jumps.length >= 5 && s.jumps.length <= 7); assert.equal(new Set(s.jumps.map((j) => j.key)).size, s.jumps.length); assert.ok(s.jumps.every((j) => !['g', 'h'].includes(j.key) && opens(j.href)));
  assert.equal(s.jumps[0].href, '#/site'); assert.ok(s.primary && opens(s.primary.href));
  const text = JSON.stringify(s); assert.ok(!/\/100|\$\d|health score|funding/i.test(text), 'no score or money on a champion’s start page');
  for (const z of s.zones) for (const r of z.rows) if (r.href) assert.ok(opens(r.href), r.href);
  assert.match(s.summary, /You do not change settings, run tests or approve/);
  // after the champion confirms, the page says so
  C.confirmAccess(w, SC, visits[0].id); const s2 = H.startFor({ role: SC, w, opens }); assert.ok(s2.zones[0].rows.some((r) => r.tag === 'Confirmed'));
});
