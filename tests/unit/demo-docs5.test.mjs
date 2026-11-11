// Commissioning Phase 5 in the demonstration (apps/demo/src/docs5; founder's directive of 11 Nov 2026 §12 and §13). The rules themselves
// are tested in packages/proof-registry; this file tests what the demonstration feeds them: the profile and context derived from each of
// the 90 room records, the one tracked room's seeded history, who may do what over all sixteen roles, and the dossier's gate.
//   node --test tests/unit/demo-docs5.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }; globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-docs5-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as M from './docs5/model.ts'; export * as S from './docs5/store.ts'; export * as PS from './proof/store.ts'; export * as D from './campus/design.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as E from '@empathia/proof-registry'; export { readMeasurements, FRAMES } from './docs5/CapturePage.tsx'; export { needsMe } from './docs5/DocsPage.tsx';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { M, S, PS, D, P, R, E, readMeasurements, FRAMES, needsMe } = await import(pathToFileURL(out).href);
const recs = D.allRecords(); const page = R.PAGES.find((p) => p.id === 'docs');
const can = (role) => (id) => { const a = page.actions.find((x) => x.id === id); return !!a && P.allows(a.authority, role); };
const DOSSIER_KEY = 'empathia.demo.dossier.v1'; const DOCS_KEY = 'empathia.demo.docs5.v1';
const fresh = () => { mem.clear(); };

test('D5-01 a profile for every one of the 90 rooms, from its own record; no room is asked for what it has nothing to show', () => {
  assert.equal(recs.length, 90);
  for (const r of recs) {
    const p = M.profileOf(r); const cats = new Set(r.positions.filter((x) => !x.furniture).map((x) => x.cat)); const q = E.requiredFor(p); const need = new Set(q.filter((x) => x.applies).map((x) => x.type));
    assert.equal(p.roomId, r.outline.id); assert.equal(p.devices, r.positions.filter((x) => !x.furniture).length);
    assert.equal(need.has('rack_elevations'), cats.has('rack'), `${p.roomId}: rack elevations only with a rack`);
    assert.equal(need.has('dsp_documentation'), cats.has('dsp'), `${p.roomId}: DSP documentation only with a processor`);
    assert.equal(need.has('camera_configuration'), cats.has('camera') || cats.has('bar'), `${p.roomId}: camera configuration only with a camera`);
    assert.equal(need.has('vendor_signoff'), false, 'no room of the demonstration is vendor-installed: every installation on record is the organisation’s own');
    for (const t of ['as_built_drawings', 'asset_list', 'bom_revision', 'commissioning_results', 'support_contacts', 'warranty_information', 'operational_handoff']) assert.ok(need.has(t), `${p.roomId}: ${t} always applies`);
    for (const x of q) assert.ok(x.why.length > 12, `${p.roomId} ${x.type}: says why`);
    const ctx = M.contextOf(r, null); assert.equal(ctx.positions.length, p.devices); assert.equal(Object.values(ctx.counts).reduce((a, b) => a + b, 0), p.devices); assert.ok(ctx.roomRevision >= 1);
  }
  const sizes = recs.map((r) => E.requiredFor(M.profileOf(r)).filter((x) => x.applies).length); assert.ok(Math.max(...sizes) - Math.min(...sizes) >= 6 && Math.max(...sizes) < 18, `the estate's rooms are asked for different amounts: ${Math.min(...sizes)} to ${Math.max(...sizes)} of 18 (the smallest rooms here still have a networked, programmable device)`);
});

test('D5-02 the tracked room is the dossier’s room; its seeded history obeys the rules and agrees with the dossier', () => {
  fresh(); const t = M.trackedSet(); assert.ok(t); assert.equal(t.set.id, E.DOSSIER_4218.id); assert.equal(t.record.outline.id, E.DOSSIER_4218.room.id);
  const w = S.readDocs([], undefined, '2026-11-09T12:00:00Z'); assert.equal(w.dropped, 0); const doc = (k) => w.docs.find((x) => x.type === k);
  assert.deepEqual(w.blockers, [], 'at the report, every document this tracker gates is complete: the dossier’s own blockers are what hold the room');
  assert.equal(doc('signal_flow').state, 'ACCEPTED'); assert.match(doc('config_backup').submission.attachment.sha256, /^[0-9a-f]{64}$/); assert.ok(!doc('asset_list').findings.some((f) => f.kind === 'contradiction_count'));
  assert.deepEqual(doc('asset_list').submission.equipment, t.record.positions.filter((x) => !x.furniture).map((x) => x.code), 'the asset list names the room’s own positions');
  assert.equal(doc('training_materials').state, 'ACCEPTED'); assert.deepEqual(doc('training_materials').acknowledgements.outstanding.map((a) => a.role), ['sitechamp']);
  assert.equal(doc('commissioning_results').state, 'CORRECTION_REQUESTED'); assert.ok(doc('commissioning_results').findings.some((f) => f.kind === 'evidence_not_in_packet' && /EV-SIM-016/.test(f.detail)));
  assert.equal(doc('rack_elevations').state, 'NOT_APPLICABLE', 'the room’s processor sits in a credenza: its record has no rack');
  assert.deepEqual(w.docs.filter((x) => x.applies && !x.met).map((x) => x.type), ['commissioning_results', 'deficiency_closure', 'training_materials']);
  for (const [k, id] of Object.entries(M.REPRESENTS)) { assert.ok(E.DOSSIER_4218.tests.some((x) => x.id === id), `${id} is a test of the dossier`); assert.equal(M.docOfTest(id), k); assert.equal(doc(k).test, id); }
  // every acknowledger the rules name carries the demonstration's own role label
  for (const r of Object.values(E.RULES)) for (const a of r.acknowledgers) assert.equal(P.ROLES[a.role].label, a.label); for (const r of Object.values(E.RULES)) assert.equal(P.ROLES[r.owner].label, r.ownerLabel);
});

test('D5-03 sixteen roles: who reads, assigns, submits, reviews, acknowledges, records a vendor’s submission and captures', () => {
  assert.equal(P.ROLE_KEYS.length, 16);
  const who = (id) => P.ROLE_KEYS.filter((r) => can(r)(id)).sort();
  assert.deepEqual(P.ROLE_KEYS.filter((r) => P.allows(page.authority, r)).sort(), ['architect', 'cxeng', 'designer', 'exec', 'installer', 'ipm', 'ops', 'qa', 'service', 'sitechamp', 'svcmgr', 'syseng']);
  for (const r of ['visitor', 'employee', 'bpm', 'steward']) assert.equal(P.allows(page.authority, r), false, `${r} does not open the documentation`);
  assert.deepEqual(who('docs.assign'), ['architect', 'ipm']); assert.deepEqual(who('docs.submit'), ['cxeng', 'designer', 'installer', 'ipm', 'svcmgr', 'syseng']);
  assert.deepEqual(who('docs.review'), ['architect', 'ops', 'qa', 'svcmgr']); assert.deepEqual(who('docs.acknowledge'), ['ops', 'sitechamp', 'svcmgr']); assert.deepEqual(who('docs.vendor'), ['ipm']);
  assert.deepEqual(who('docs.capture'), ['architect', 'cxeng', 'installer', 'service', 'syseng']); assert.deepEqual(who('docs.record'), ['architect', 'cxeng', 'syseng']);
  // the engine's policy is the registry's: one definition
  for (const r of P.ROLE_KEYS) { const a = M.docPolicy(r); assert.deepEqual([a.assign, a.submit, a.review, a.acknowledge, a.recordVendor], ['docs.assign', 'docs.submit', 'docs.review', 'docs.acknowledge', 'docs.vendor'].map((id) => can(r)(id)), r); }
  // the site champion: acknowledges, and nothing else; reads only what they acknowledge; sees no engineering section
  const sc = M.docPolicy('sitechamp'); assert.deepEqual(sc, { assign: false, submit: false, review: false, acknowledge: true, recordVendor: false });
  const eng = page.sections.find((s) => s.id === 'engineering'); assert.equal(P.allows(eng.authority, 'sitechamp'), false);
  fresh(); const w = S.readDocs([], undefined, '2026-11-09T12:00:00Z'); assert.deepEqual(w.docs.filter((d) => M.mayRead('sitechamp', d.acknowledgements.need)).map((d) => d.type), ['training_materials']);
  // "needs me" names a real next step for the role and never for a role with nothing to do
  const mine = (role) => w.docs.filter((d) => needsMe(d, role, can(role))).map((d) => d.type);
  assert.deepEqual(mine('sitechamp'), ['training_materials']); assert.deepEqual(mine('cxeng'), ['commissioning_results']); assert.deepEqual(mine('exec'), []); assert.deepEqual(mine('qa'), []); assert.deepEqual(mine('designer'), []);
});

test('D5-04 the tracker’s steps go through the engine: independence, the champion’s acknowledgement, untrusted storage', () => {
  fresh(); const t = M.trackedSet(); const ctx = S.docContext(); const at = (m) => new Date(Date.parse('2026-11-11T12:00:00Z') + m * 60000).toISOString(); const A = (r) => M.actorOf(r);
  const tryIt = (ev, e) => E.attemptDoc(t.set, ev, e, ctx, M.docPolicy);
  let r = tryIt([], { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: A('sitechamp'), at: at(1) }); assert.ok('events' in r);
  assert.match(tryIt([], { kind: 'ACCEPT', doc: 'commissioning_results', revision: 1, by: A('sitechamp'), at: at(1) }).refused, /does not review/);
  assert.match(tryIt([], { kind: 'ACKNOWLEDGE', doc: 'operational_handoff', revision: 1, by: A('sitechamp'), at: at(1) }).refused, /acknowledged by: Service Manager, AV Operations Lead/);
  // stored rubbish and a forged self-acceptance are dropped
  mem.set(DOCS_KEY, JSON.stringify([null, { kind: 'ACCEPT' }, { kind: 'ACCEPT', doc: 'commissioning_results', revision: 1, by: A('cxeng'), at: at(1) }, '<script>']));
  assert.equal(S.loadDocEvents().length, 1, 'only what has the shape of an event is read'); const w = S.readDocs(undefined, undefined, at(2)); assert.equal(w.dropped, 1); assert.equal(w.docs.find((d) => d.type === 'commissioning_results').state, 'CORRECTION_REQUESTED');
});

test('D5-05 Phase 6 reads Phase 5: an incomplete required document stops the dossier’s acceptance and clears when it is put right', () => {
  fresh(); const A = (r) => M.actorOf(r); const ALL = { record: true, verify: true, raise: true, accept: true, countersign: true }; const D0 = E.DOSSIER_4218; const AT = new Date().toISOString();
  let ev = []; const go = (e) => { const x = E.attempt(D0, ev, e, ALL); assert.ok('events' in x, x.refused); ev = x.events; };
  go({ kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-003', statement: 'Assistive listening feed is below the specified level.', by: A('cxeng'), at: AT });
  for (const [t, n] of [['T-SIM-008', '108'], ['T-SIM-016', '116'], ['T-SIM-028', '128'], ['T-SIM-031', '131'], ['T-SIM-032', '132']]) { go({ kind: 'RETEST', test: t, result: 'PASS', evidence: `EV-SIM-${n}`, by: A('cxeng'), at: AT }); go({ kind: 'VERIFY', test: t, by: A('qa'), at: AT }); }
  go({ kind: 'EVIDENCE', test: 'T-SIM-030', evidence: 'EV-SIM-130', by: A('cxeng'), at: AT }); go({ kind: 'VERIFY', test: 'T-SIM-030', by: A('qa'), at: AT });
  mem.set(DOSSIER_KEY, JSON.stringify(ev));
  const read = () => E.replay(D0, PS.loadEvents(), new Date().toISOString(), PS.withDocuments(PS.loadEvents()));
  assert.equal(read().signoff, 'AWAITING_FIRST', 'the existing path to acceptance is unchanged while the documents are complete');
  // a reviewer reopens the network diagram
  const t = M.trackedSet(); const now = () => new Date().toISOString();
  let docs = E.attemptDoc(t.set, [], { kind: 'REQUEST_CORRECTION', doc: 'network_diagram', comment: 'The control VLAN is not shown.', by: A('architect'), at: now() }, S.docContext(), M.docPolicy); assert.ok('events' in docs); mem.set(DOCS_KEY, JSON.stringify(docs.events));
  const held = read(); assert.equal(held.signoff, 'TESTS_OPEN'); assert.deepEqual(held.blockers, [{ test: null, reason: 'document “Network diagram” has a correction requested' }]);
  const no = E.attempt(D0, PS.loadEvents(), { kind: 'ACCEPT', by: A('svcmgr'), at: now() }, ALL, PS.withDocuments(PS.loadEvents())); assert.match(no.refused, /document “Network diagram” has a correction requested/);
  // the release control says so too
  const rc = E.releaseControls(held, S.readDocs(), { first: [A('svcmgr'), A('exec')], second: [A('ops'), A('syseng')] }); assert.equal(rc.find((x) => x.id === 'documents').state, 'OPEN');
  assert.deepEqual(rc.filter((x) => x.state === 'OPEN').map((x) => x.id), ['documents']);
});

test('D5-06 field capture: measurements are read as typed, never completed; a capture is committed once', () => {
  assert.deepEqual(readMeasurements([{ quantity: '', value: '', unit: '', instrument: '', method: '' }]), { ok: [], wrong: [] }, 'an untouched row is nothing');
  const half = readMeasurements([{ quantity: 'Speech level at seat 4', value: '68,5', unit: '', instrument: 'SLM-2 (synthetic)', method: '' }]);
  assert.equal(half.ok.length, 0); assert.deepEqual(half.wrong, ['Measurement 1: give the unit.', 'Measurement 1: say how it was measured.']);
  const bad = readMeasurements([{ quantity: 'Level', value: 'about 70', unit: 'dB', instrument: 'meter', method: 'A-weighted, slow' }]); assert.match(bad.wrong[0], /has to be a number/);
  const good = readMeasurements([{ quantity: 'Speech level at seat 4', value: '68,5', unit: 'dBA', instrument: 'SLM-2 (synthetic)', method: 'A-weighted, slow, 30 s' }]); assert.deepEqual(good.ok, [{ quantity: 'Speech level at seat 4', value: 68.5, unit: 'dBA', instrument: 'SLM-2 (synthetic)', method: 'A-weighted, slow, 30 s' }]);
  for (const f of FRAMES) { assert.ok(f.must.length >= 3); const [x, y, w, h] = f.box; assert.ok(x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1); }
  fresh(); const c = { key: 'CAP-ABCDEFGH', target: { kind: 'test', id: 'T-SIM-031' }, note: 'Loop receiver heard at seat 4.', measurements: good.ok, photo: null, by: M.actorOf('cxeng'), at: new Date().toISOString() };
  assert.equal(S.commitCapture(c), 'added'); assert.equal(S.commitCapture(c), 'already'); assert.equal(S.commitCapture({ ...c, note: 'changed' }), 'already', 'the same draft adds nothing twice, whatever it now says'); assert.equal(S.loadCaptures().length, 1);
  for (const x of [null, {}, { ...c, key: 'x' }, { ...c, key: 'CAP-ZZZZZZZ1', note: '', measurements: [] }, { ...c, key: 'CAP-ZZZZZZZ2', measurements: [{ quantity: 'L', value: NaN, unit: 'dB', instrument: 'm', method: 'm' }] }, { ...c, key: 'CAP-ZZZZZZZ3', photo: { name: 'a.jpg', bytes: 10, sha256: 'nope', annotated: false } }]) assert.equal(S.commitCapture(x), 'refused');
  mem.set('empathia.demo.docs5.captures.v1', JSON.stringify([c, c, { junk: true }])); assert.equal(S.loadCaptures().length, 1, 'duplicates and rubbish in storage are not read');
});
