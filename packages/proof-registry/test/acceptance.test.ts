import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOSSIER_4218 as D, QR_PAYLOAD_4218, replay, attempt, parseQr, resolveQr, DEMO_LABELS, DEMO_TENANT, type DossierEvent, type Authority, type Actor } from '../src/index.js';

const cx: Actor = { role: 'cxeng', label: 'Commissioning Engineer' }; const qa: Actor = { role: 'qa', label: 'Document Reviewer' }; const ex: Actor = { role: 'exec', label: 'Executive' };
const ALL: Authority = { record: true, verify: true, raise: true, accept: true }; const NONE: Authority = { record: false, verify: false, raise: false, accept: false };
const at = '2026-11-09T12:00:00Z';
const run = (steps: DossierEvent[], may: Authority = ALL) => { let ev: DossierEvent[] = []; for (const s of steps) { const r = attempt(D, ev, s, may); assert.ok('events' in r, 'refused' in r ? r.refused : ''); if ('events' in r) ev = r.events; } return ev; };

test('with no events the working state is the snapshot: 27/3/2, 29 evidence, held', () => {
  const w = replay(D, []);
  assert.deepEqual({ ...w.totals }, { tests: 32, pass: 27, pending: 3, fail: 2, evidence: 29, awaitingVerification: 0 });
  assert.equal(w.acceptance, 'HELD'); assert.equal(w.changed, false);
  assert.ok(w.blockers.some((b) => b.test === 'T-SIM-032' && /no deficiency/.test(b.reason)));
  assert.ok(w.blockers.some((b) => b.test === 'T-SIM-030' && /no evidence/.test(b.reason)));
});
test('acceptance is refused while blockers stand, and says which', () => {
  const r = attempt(D, [], { kind: 'ACCEPT', by: ex, at }, ALL);
  assert.ok('refused' in r && /stays held/.test(r.refused) && /T-SIM-008 fails/.test(r.refused));
});
test('a pass without evidence is refused', () => {
  const r = attempt(D, [], { kind: 'RETEST', test: 'T-SIM-008', result: 'PASS', evidence: null, by: cx, at }, ALL);
  assert.ok('refused' in r && /needs an evidence record/.test(r.refused));
});
test('a retest that passes still blocks until someone in another role verifies it', () => {
  const ev = run([{ kind: 'RETEST', test: 'T-SIM-008', result: 'PASS', evidence: 'EV-SIM-108', by: cx, at }]);
  const w = replay(D, ev); assert.equal(w.totals.pass, 28); assert.equal(w.totals.awaitingVerification, 1);
  assert.ok(w.blockers.some((b) => b.test === 'T-SIM-008' && /independent verification/.test(b.reason)));
  assert.equal(w.deficiencies.find((x) => x.id === 'DEF-SIM-001')!.state, 'OPEN', 'the deficiency stays open until the pass is verified');
  const self = attempt(D, ev, { kind: 'VERIFY', test: 'T-SIM-008', by: cx, at }, ALL); assert.ok('refused' in self && /independent/.test(self.refused));
  const ok = attempt(D, ev, { kind: 'VERIFY', test: 'T-SIM-008', by: qa, at }, ALL); assert.ok('events' in ok);
  if ('events' in ok) assert.equal(replay(D, ok.events).deficiencies.find((x) => x.id === 'DEF-SIM-001')!.state, 'CLOSED');
});
test('a failure needs a deficiency; raising one is refused for a test that does not fail', () => {
  assert.ok('refused' in attempt(D, [], { kind: 'RAISE', test: 'T-SIM-001', id: 'DEF-X', statement: 'Something is wrong here.', by: cx, at }, ALL));
  const ev = run([{ kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-003', statement: 'Assistive listening feed is below the specified level.', by: cx, at }]);
  assert.ok(!replay(D, ev).blockers.some((b) => /no deficiency/.test(b.reason)));
  assert.ok('refused' in attempt(D, ev, { kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-004', statement: 'Raised twice by mistake.', by: cx, at }, ALL));
});
test('the whole recovery: every blocker cleared and verified, then acceptance is recorded and the dossier closes', () => {
  const fix = (t: string, n: string): DossierEvent[] => [{ kind: 'RETEST', test: t, result: 'PASS', evidence: `EV-SIM-${n}`, by: cx, at }, { kind: 'VERIFY', test: t, by: qa, at }];
  const ev = run([
    { kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-003', statement: 'Assistive listening feed is below the specified level.', by: cx, at },
    ...fix('T-SIM-008', '108'), ...fix('T-SIM-016', '116'), ...fix('T-SIM-028', '128'), ...fix('T-SIM-031', '131'), ...fix('T-SIM-032', '132'),
    { kind: 'EVIDENCE', test: 'T-SIM-030', evidence: 'EV-SIM-130', by: cx, at }, { kind: 'VERIFY', test: 'T-SIM-030', by: qa, at },
  ]);
  const before = replay(D, ev); assert.deepEqual(before.blockers, []); assert.equal(before.acceptance, 'HELD', 'nothing accepts itself');
  assert.deepEqual({ pass: before.totals.pass, evidence: before.totals.evidence }, { pass: 32, evidence: 32 });
  for (const who of [cx, qa]) { const r = attempt(D, ev, { kind: 'ACCEPT', by: who, at }, ALL); assert.ok('refused' in r && /independent of the work/.test(r.refused), who.role); }
  const done = run([...ev, { kind: 'ACCEPT', by: ex, at }]); const w = replay(D, done);
  assert.equal(w.acceptance, 'ACCEPTED'); assert.equal(w.acceptedBy!.role, 'exec');
  assert.ok('refused' in attempt(D, done, { kind: 'RETEST', test: 'T-SIM-001', result: 'FAIL', evidence: null, by: cx, at }, ALL), 'closed after acceptance');
});
test('the caller’s authority is required as well as the rules', () => {
  for (const e of [{ kind: 'RETEST', test: 'T-SIM-008', result: 'FAIL', evidence: null, by: ex, at }, { kind: 'VERIFY', test: 'T-SIM-008', by: ex, at }, { kind: 'ACCEPT', by: cx, at }, { kind: 'EVIDENCE', test: 'T-SIM-030', evidence: 'EV-1', by: ex, at }] as DossierEvent[])
    assert.ok('refused' in attempt(D, [], e, NONE), e.kind);
});
test('a forged acceptance event in stored state does not accept a dossier with blockers', () => {
  const w = replay(D, [{ kind: 'ACCEPT', by: ex, at }]); assert.equal(w.acceptance, 'HELD'); assert.equal(w.acceptedBy, null);
});
test('the fixture label parses and resolves; a typed identifier does too', () => {
  const p = parseQr(QR_PAYLOAD_4218); assert.ok(p.ok && p.id === 'SIM-AV-0042' && p.tenant === 'corporate_demo' && p.entity === 'asset');
  if (p.ok) assert.equal(resolveQr(p, DEMO_TENANT, DEMO_LABELS).state, 'RESOLVED');
  const b = parseQr(' sim-av-0042 '); assert.ok(b.ok && b.id === 'SIM-AV-0042');
});
test('forged, malformed and foreign labels are refused without a guess', () => {
  for (const bad of ['', 'javascript:alert(1)', 'https://example.test/x', '<img src=x>', 'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=SIM-AV-0042', 'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=../../etc|NOT-LIVE',
    'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|id=SIM-AV-0001|NOT-LIVE', 'EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|role=admin|NOT-LIVE', 'x'.repeat(201), 'SIM AV 0042', '0042'])
    assert.equal(parseQr(bad).ok, false, bad.slice(0, 40));
  assert.deepEqual(parseQr('EMPATHIA-DEMO|v=2|tenant=corporate_demo|entity=asset|id=SIM-AV-0042|NOT-LIVE'), { ok: false, error: 'unsupported_version' });
  const foreign = parseQr('EMPATHIA-DEMO|v=1|tenant=other_tenant|entity=asset|id=SIM-AV-0042|NOT-LIVE'); assert.ok(foreign.ok);
  if (foreign.ok) assert.deepEqual(resolveQr(foreign, DEMO_TENANT, DEMO_LABELS), { state: 'NOT_FOUND' }, 'another tenant’s label reads as not found');
  const room = parseQr('EMPATHIA-DEMO|v=1|tenant=corporate_demo|entity=room|id=SIM-AV-0042|NOT-LIVE'); assert.ok(room.ok && resolveQr(room, DEMO_TENANT, DEMO_LABELS).state === 'NOT_FOUND', 'an asset id presented as a room does not resolve');
});
test('revoked, expired and replaced labels say so; a replaced one points to the current label', () => {
  const r = (id: string) => { const p = parseQr(id); assert.ok(p.ok); return p.ok ? resolveQr(p, DEMO_TENANT, DEMO_LABELS) : { state: 'NOT_FOUND' as const }; };
  assert.equal(r('SIM-AV-0017').state, 'REVOKED'); assert.equal(r('SIM-AV-0009').state, 'EXPIRED');
  const rep = r('SIM-AV-0031'); assert.ok(rep.state === 'REPLACED' && rep.current?.id === 'SIM-AV-0042');
  assert.equal(r('SIM-AV-9999').state, 'NOT_FOUND');
});
