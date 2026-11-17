// One room, end to end (apps/demo/src/thread/slice.ts; founder, 16 Nov 2026: "a demonstrably functioning vertical slice: Lite →
// Engineering → Commissioning → ServiceHands → Assurance → APEX, with real persisted records, traceable evidence").
// Driven through the products' own stores and engines, on one accepted room of the synthetic campus.
//   TS-01  at the start the thread says what is missing; nothing is invented for a stage with no record
//   TS-02  handing a deficiency to service: the Designer is refused (logged); a design still on paper is refused; the Service Manager
//          hands it over once (a second handoff returns the same incident); the incident names the deficiency it came from
//   TS-03  the incident runs the ServiceHands machine to RESOLVED (assigned technician, preflight, field evidence, independent
//          verification); resolving it does NOT close the deficiency
//   TS-04  the deficiency closes only by a retest with evidence verified by someone other than the retester
//   TS-05  an APEX case on the incident holds hypotheses with caveats; the thread is then whole and its links carry the same ids
//   node --test tests/unit/thread-slice.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'thread-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export { roomRecord } from './campus/design.ts'; export * as S from './workspace/store.ts'; export * as T from './thread/slice.ts'; export * as D from './assurance/deficiencyStore.ts'; export { WORK_NEEDS } from '@empathia/service-engine'; export { step } from '@empathia/commissioning-engine';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { roomRecord, S, T, D, WORK_NEEDS, step } = await import(pathToFileURL(out).href);
const ROOM = 'R-ATL-7-112'; const r = roomRecord(ROOM); const w = S.seed(); const issue = r.issues.find((x) => x.state === 'OPEN'); const defId = D.keyOf(r, issue);
const hand = (persona, rec = r, i = issue) => S.handDeficiencyToService(w, persona, { deficiencyId: D.keyOf(rec, i), issueId: i.id, state: D.deficiencyOf(rec, i, '2026-10-01').state, title: i.title, severity: i.severity, roomId: rec.outline.id, roomName: rec.outline.name, buildingKey: rec.outline.building, lifecycle: rec.lifecycle });
let inc;

test('TS-01 at the start the thread says what is missing and invents nothing', () => {
  const t = T.threadOf(r, w);
  assert.deepEqual(t.stages.map((s) => s.key), ['lite', 'engineering', 'commissioning', 'service', 'assurance', 'apex']);
  assert.equal(t.complete, false); assert.ok(t.missing.some((m) => /handed to ServiceHands/.test(m)) && t.missing.some((m) => /APEX/.test(m)), t.missing.join(' | '));
  assert.match(t.stages[3].status, /nothing raised|none from a deficiency/); assert.match(t.stages[5].status, /no case/);
  assert.match(t.stages[4].status, /baseline v1 accepted/); assert.ok(t.stages[2].rows.some((x) => x.id === issue.id));
});

test('TS-02 the handoff: authority, a design on paper refused, once only, and the incident names its deficiency', () => {
  const no = hand('designer'); assert.ok('why' in no && /issue\.assign|service\.triage/.test(no.why.join(' ')));
  assert.equal(w.events[0].outcome, 'DENIED');
  const paper = roomRecord('R-MER-1-130'); const pi = paper.issues.find((x) => x.state === 'OPEN');
  const p = hand('svcmgr', paper, pi); assert.ok('why' in p && /design change, not a work order/.test(p.why.join(' ')), JSON.stringify(p));
  const a = hand('svcmgr'); assert.ok(!('why' in a) && a.existing === false, JSON.stringify(a));
  const b = hand('opslead'); assert.deepEqual([b.id, b.existing], [a.id, true]);
  inc = S.incidentOf(w, a.id); assert.deepEqual([inc.roomId, inc.source.kind, inc.source.id, inc.source.issue, inc.state], [ROOM, 'deficiency', defId, issue.id, 'OPEN']);
  assert.equal(w.incidents.filter((i) => i.source?.id === defId).length, 1);
});

test('TS-03 the incident runs to RESOLVED through the service machine; that does not close the deficiency', () => {
  const ok = (x, l) => assert.equal(x, null, `${l}: ${x && x.why.join('; ')}`);
  ok(S.triage(w, 'svcmgr', inc.id, 'Standard'), 'triage'); ok(S.assign(w, 'svcmgr', inc.id, 'tech-ana'), 'assign'); ok(S.accept(w, 'service', inc.id), 'accept');
  const wo = S.workOrderOf(w, inc.workOrderId); const tools = WORK_NEEDS[wo.workType]?.tools || [];
  if (!S.preflightFor(w, wo.id, { access: true, safety: true, heightPermit: true, tools }).ok) ok(S.replanWindow(w, 'svcmgr', inc.id), 'replan');
  ok(S.start(w, 'service', inc.id, { access: true, safety: true, heightPermit: true, tools }), 'start');
  assert.ok(S.submitForVerification(w, 'service', inc.id), 'handing over without field evidence is refused');
  ok(S.recordEvidence(w, 'service', inc.id, 'photo', 'display standby setting corrected; wake on signal confirmed three times'), 'evidence');
  ok(S.submitForVerification(w, 'service', inc.id), 'submit'); assert.ok(S.verify(w, 'service', inc.id), 'the technician does not verify their own work');
  ok(S.verify(w, 'cxeng', inc.id), 'verify'); assert.equal(S.incidentOf(w, inc.id).state, 'RESOLVED');
  assert.equal(D.deficiencyOf(r, issue, '2026-10-01').state, 'OPEN', 'the deficiency is still open');
  const t = T.threadOf(r, w); assert.ok(t.missing.some((m) => /verified retest/.test(m))); assert.match(t.stages[4].status, /1 open deficiency/);
});

test('TS-04 the deficiency closes only by a retest with evidence, verified by someone else', () => {
  let d = D.deficiencyOf(r, issue, '2026-10-01'); const now = new Date().toISOString();
  const go = (who, a) => { const x = D.mayStep(who, a.kind) ? step(d, a, who, now) : { ok: false, why: [`${who} holds no authority for ${a.kind}`] }; if (x.ok) { d = x.next; D.save(d); } return x; };
  assert.equal(go('svcmgr', { kind: 'start', owner: 'service', targetDate: '2099-01-01' }).ok, true);
  assert.equal(go('service', { kind: 'fixed', rootCause: 'CONFIGURATION', action: 'Standby mode set to wake on signal; firmware power setting corrected on the display.' }).ok, true);
  assert.equal(go('cxeng', { kind: 'retest', result: 'PASS', evidence: '' }).ok, false, 'a retest needs evidence');
  assert.equal(go('cxeng', { kind: 'retest', result: 'PASS', evidence: 'EV-7112-RT1' }).ok, true);
  const self = go('cxeng', { kind: 'verify' }); assert.equal(self.ok, false); assert.match(self.why.join(' '), /someone other|separation|same person|recorded the retest/i);
  assert.equal(go('syseng', { kind: 'verify' }).ok, true); assert.equal(D.deficiencyOf(r, issue, '2026-10-01').state, 'CLOSED');
});

test('TS-05 an APEX case holds hypotheses with caveats; the thread is whole and its links carry the ids', () => {
  const ax = S.openApex(w, 'cxeng', inc.id, () => []); assert.ok(!('why' in ax));
  const c = w.apexCases.find((x) => x.id === ax.id); assert.equal(c.roomId, ROOM); assert.ok(c.hypotheses.length >= 1 && c.hypotheses.every((h) => h.caveat && h.confidence !== 'high'));
  const t = T.threadOf(r, w); assert.equal(t.complete, true, t.missing.join(' | '));
  const ids = t.links.map((l) => l.id).join(' | ');
  for (const need of [ROOM, `${issue.id} → ${inc.id}`, 'EV-7112-RT1', `${inc.id} → ${ax.id}`]) assert.ok(ids.includes(need), `${need} in ${ids}`);
  assert.match(t.stages[4].facts.find(([k]) => k === 'Closed by retest')[1], /EV-7112-RT1, verified by syseng/);
  assert.match(t.stages[5].status, /hypotheses only, never a verified fault/);
});
