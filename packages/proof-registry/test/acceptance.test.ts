import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOSSIER_4218 as D, QR_PAYLOAD_4218, replay, attempt, parseQr, resolveQr, DEMO_LABELS, DEMO_TENANT, type DossierEvent, type Authority, type Actor } from '../src/index.js';

const cx: Actor = { role: 'cxeng', label: 'Commissioning Engineer' }; const qa: Actor = { role: 'qa', label: 'Document Reviewer' }; const ex: Actor = { role: 'exec', label: 'Executive' };
const ALL: Authority = { record: true, verify: true, raise: true, accept: true, countersign: true }; const NONE: Authority = { record: false, verify: false, raise: false, accept: false, countersign: false };
const ops: Actor = { role: 'ops', label: 'AV Operations Lead' }; const se: Actor = { role: 'syseng', label: 'Systems Engineer' }; const sm: Actor = { role: 'svcmgr', label: 'Service Manager' };
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
  // Changed 10 Nov 2026 (founder): one approval no longer accepts. Final sign-off is two approvals in order; the first leaves it held.
  const one = run([...ev, { kind: 'ACCEPT', by: ex, at }]); const h = replay(D, one);
  assert.equal(h.acceptance, 'HELD', 'the first approval alone does not accept'); assert.equal(h.signoff, 'AWAITING_SECOND'); assert.equal(h.firstApproval!.by.role, 'exec');
  const done = run([...one, { kind: 'COUNTERSIGN', by: ops, at: '2026-11-09T13:00:00Z' }]); const w = replay(D, done);
  assert.equal(w.acceptance, 'ACCEPTED'); assert.equal(w.signoff, 'COMPLETE'); assert.equal(w.acceptedBy!.role, 'exec'); assert.equal(w.secondApproval!.by.role, 'ops'); assert.equal(w.acceptedAt, '2026-11-09T13:00:00Z', 'accepted when the second approval is given');
  assert.ok('refused' in attempt(D, done, { kind: 'RETEST', test: 'T-SIM-001', result: 'FAIL', evidence: null, by: cx, at }, ALL), 'closed after acceptance');
  assert.ok('refused' in attempt(D, done, { kind: 'COUNTERSIGN', by: se, at }, ALL), 'and no third approval');
});
const cleared = (): DossierEvent[] => { const fix = (t: string, n: string): DossierEvent[] => [{ kind: 'RETEST', test: t, result: 'PASS', evidence: `EV-SIM-${n}`, by: cx, at }, { kind: 'VERIFY', test: t, by: qa, at }];
  return run([{ kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-003', statement: 'Assistive listening feed is below the specified level.', by: cx, at }, ...fix('T-SIM-008', '108'), ...fix('T-SIM-016', '116'), ...fix('T-SIM-028', '128'), ...fix('T-SIM-031', '131'), ...fix('T-SIM-032', '132'), { kind: 'EVIDENCE', test: 'T-SIM-030', evidence: 'EV-SIM-130', by: cx, at }, { kind: 'VERIFY', test: 'T-SIM-030', by: qa, at }]); };
test('phase 6: the second approval follows the first, comes from a different role, and from a role that did none of the work', () => {
  const ev = cleared(); assert.equal(replay(D, ev).signoff, 'AWAITING_FIRST'); assert.equal(replay(D, []).signoff, 'TESTS_OPEN');
  const early = attempt(D, ev, { kind: 'COUNTERSIGN', by: ops, at }, ALL); assert.ok('refused' in early && /follows the first/.test(early.refused));
  const blocked = attempt(D, [], { kind: 'COUNTERSIGN', by: ops, at }, ALL); assert.ok('refused' in blocked && /blockers stand/.test(blocked.refused));
  const one = run([...ev, { kind: 'ACCEPT', by: sm, at }]);
  const twice = attempt(D, one, { kind: 'ACCEPT', by: ex, at }, ALL); assert.ok('refused' in twice && /first approval is already recorded, by the Service Manager/.test(twice.refused));
  const same = attempt(D, one, { kind: 'COUNTERSIGN', by: sm, at }, ALL); assert.ok('refused' in same && /two different roles/.test(same.refused));
  for (const who of [cx, qa]) { const r = attempt(D, one, { kind: 'COUNTERSIGN', by: who, at }, ALL); assert.ok('refused' in r && /independent of the work/.test(r.refused), `${who.role} did the work`); }
  const none = attempt(D, one, { kind: 'COUNTERSIGN', by: se, at }, { ...ALL, countersign: false }); assert.ok('refused' in none && /cannot give the second approval/.test(none.refused));
  assert.equal(replay(D, run([...one, { kind: 'COUNTERSIGN', by: se, at }])).acceptance, 'ACCEPTED', 'the Systems Engineer may give the second, having recorded nothing here');
});
test('phase 6: a result recorded after the first approval withdraws it, and the approvals are given again', () => {
  const one = run([...cleared(), { kind: 'ACCEPT', by: sm, at }]); assert.equal(replay(D, one).signoff, 'AWAITING_SECOND');
  const again = run([...one, { kind: 'RETEST', test: 'T-SIM-008', result: 'FAIL', evidence: null, by: cx, at }]); const w = replay(D, again);
  assert.equal(w.firstApproval, null); assert.equal(w.signoff, 'TESTS_OPEN'); assert.ok(w.blockers.length > 0);
  const r = attempt(D, again, { kind: 'COUNTERSIGN', by: ops, at }, ALL); assert.ok('refused' in r);
});
test('phase 6: stored events cannot forge it: a second approval with no first, from the first’s own role, or over blockers accepts nothing', () => {
  const ev = cleared();
  assert.equal(replay(D, [...ev, { kind: 'COUNTERSIGN', by: ops, at }]).acceptance, 'HELD', 'no first');
  assert.equal(replay(D, [...ev, { kind: 'ACCEPT', by: sm, at }, { kind: 'COUNTERSIGN', by: sm, at }]).acceptance, 'HELD', 'same role twice');
  assert.equal(replay(D, [...ev, { kind: 'ACCEPT', by: cx, at }, { kind: 'COUNTERSIGN', by: ops, at }]).acceptance, 'HELD', 'the first approver did the work');
  assert.equal(replay(D, [...ev, { kind: 'ACCEPT', by: sm, at }, { kind: 'COUNTERSIGN', by: qa, at }]).acceptance, 'HELD', 'the second approver did the work');
  assert.equal(replay(D, [{ kind: 'ACCEPT', by: sm, at }, { kind: 'COUNTERSIGN', by: ops, at }]).acceptance, 'HELD', 'blockers stand');
  assert.equal(replay(D, [...ev, { kind: 'COUNTERSIGN', by: ops, at }, { kind: 'ACCEPT', by: sm, at }]).acceptance, 'HELD', 'out of order');
});
// ---- Waivers and attestations (founder's directive of 11 Nov 2026, §13, and his decisions of 01:42 and 02:25) ----
// Two kinds, decided by the item: late paperwork or handover is a business risk, accepted by the business decision-maker (here the
// Executive); anything else is a technical deviation, waived by the operations authority (here the Operations Lead) and standing
// only after an engineering review by another role (here the Product Architect). Neither giver nor reviewer approves.
const W: Authority = { ...ALL, waiveBusiness: true, waiveTechnical: true, reviewWaiver: true, attest: true }; const emp: Actor = { role: 'employee', label: 'Employee' }; const arch: Actor = { role: 'architect', label: 'Product Architect' };
const why = 'The camera preset check needs the vendor on site; the room is usable without it and the visit is booked.';
/** everything closed except T-SIM-016 (camera preset verification: pending, P2 deficiency open; a technical deviation) and T-SIM-028 (operator guide acknowledgement: pending; a business risk) */
const twoOpen = (): DossierEvent[] => { const fix = (t: string, n: string): DossierEvent[] => [{ kind: 'RETEST', test: t, result: 'PASS', evidence: `EV-SIM-${n}`, by: cx, at }, { kind: 'VERIFY', test: t, by: qa, at }];
  return run([{ kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-003', statement: 'Assistive listening feed is below the specified level.', by: cx, at }, ...fix('T-SIM-008', '108'), ...fix('T-SIM-031', '131'), ...fix('T-SIM-032', '132'), { kind: 'EVIDENCE', test: 'T-SIM-030', evidence: 'EV-SIM-130', by: cx, at }, { kind: 'VERIFY', test: 'T-SIM-030', by: qa, at }]); };
const waive = (t: string, by: Actor = t === 'T-SIM-028' ? ex : ops, expires = '2026-12-09'): DossierEvent => ({ kind: 'WAIVE', test: t, reason: why, basis: 'DEF-SIM-002 and the vendor visit booking', risk: 'A presenter preset may frame the wrong seat until the visit; meetings still run.', owner: 'Commissioning Engineer', plan: 'Vendor attends on the booked day; the engineer retests and the reviewer verifies.', expires, by, at });
const review = (t: string, by: Actor = arch): DossierEvent => ({ kind: 'REVIEW_WAIVER', test: t, finding: 'Acceptable: framing is unaffected for the fixed presets in use; recheck after the visit.', by, at });
/** both items waived as their kinds require, the technical one reviewed */
const bothWaived = (): DossierEvent[] => run([...twoOpen(), waive('T-SIM-016'), review('T-SIM-016'), waive('T-SIM-028')], W);

test('waiver: the kind is the item’s. A technical deviation is the operations authority’s and stands only after engineering review; a business risk is the decision-maker’s', () => {
  const ev = twoOpen(); const before = replay(D, ev, at);
  assert.deepEqual(before.blockers.map((b) => b.test).sort(), ['T-SIM-016', 'T-SIM-028']); assert.equal(before.signoff, 'TESTS_OPEN');
  assert.ok('refused' in attempt(D, ev, { kind: 'ACCEPT', by: sm, at }, W));
  const BUS: Authority = { ...ALL, waiveBusiness: true }; const TECH: Authority = { ...ALL, waiveTechnical: true };
  const a = attempt(D, ev, waive('T-SIM-016', ex), BUS); assert.ok('refused' in a && /technical deviation/.test(a.refused), 'the business authority cannot waive a technical deviation');
  const b = attempt(D, ev, waive('T-SIM-028', ops), TECH); assert.ok('refused' in b && /business decision-maker/.test(b.refused), 'the operations authority cannot accept a business risk');
  const tech = run([...ev, waive('T-SIM-016')], W); let w = replay(D, tech, at);
  assert.deepEqual(w.waivers.map((x) => [x.test, x.kind, x.state]), [['T-SIM-016', 'technical', 'AWAITING_REVIEW']]); assert.equal(w.blockers.length, 2, 'unreviewed, it covers nothing');
  const again = attempt(D, tech, waive('T-SIM-016'), W); assert.ok('refused' in again && /awaiting its engineering review/.test(again.refused));
  w = replay(D, run([...tech, review('T-SIM-016')], W), at); assert.equal(w.waivers[0]!.state, 'STANDING'); assert.equal(w.waivers[0]!.review!.by.role, 'architect'); assert.deepEqual(w.blockers.map((x) => x.test), ['T-SIM-028']);
  w = replay(D, bothWaived(), at);
  assert.equal(w.blockers.length, 0); assert.equal(w.open.length, 2, 'the items are still open'); assert.equal(w.signoff, 'AWAITING_FIRST');
  assert.equal(w.totals.pending, before.totals.pending, 'a waived test still counts as pending'); assert.equal(w.totals.pass, before.totals.pass);
  assert.deepEqual(w.waivers.map((x) => [x.test, x.kind, x.state]), [['T-SIM-016', 'technical', 'STANDING'], ['T-SIM-028', 'business', 'STANDING']]);
  assert.ok(w.deficiencies.some((x) => x.test === 'T-SIM-016' && x.state !== 'CLOSED'), 'the deficiency stays open under the waiver');
});
test('waiver: the engineering review is another role’s, independent of the work, and says something', () => {
  const tech = run([...twoOpen(), waive('T-SIM-016')], W); const r = (e: DossierEvent, may: Authority = W) => { const x = attempt(D, tech, e, may); return 'refused' in x ? x.refused : ''; };
  assert.match(r(review('T-SIM-016', ops)), /different role than the one that gave the waiver/);
  for (const who of [cx, qa]) assert.match(r(review('T-SIM-016', who)), /independent of the work/, who.role);
  assert.match(r({ ...review('T-SIM-016'), finding: 'fine' } as DossierEvent), /engineering view/);
  assert.match(r(review('T-SIM-016'), ALL), /cannot give an engineering review/);
  assert.match(r(review('T-SIM-028')), /no waiver to review/);
  const bus = run([...twoOpen(), waive('T-SIM-028')], W); const x = attempt(D, bus, review('T-SIM-028'), W); assert.ok('refused' in x && /business-risk acceptance; it takes no engineering review/.test(x.refused));
  const done = run([...tech, review('T-SIM-016')], W); const y = attempt(D, done, review('T-SIM-016'), W); assert.ok('refused' in y && /already reviewed/.test(y.refused));
  // a new waiver on the same item needs its own review: the old review does not carry over
  const lapsed = replay(D, [...done, { ...waive('T-SIM-016'), reason: `${why} Extended.` } as DossierEvent], at); assert.equal(lapsed.waivers[0]!.state, 'AWAITING_REVIEW');
});
test('waiver: each approval names how many waivers it is given over; acceptance is then recorded with them', () => {
  const ev = bothWaived();
  const silent = attempt(D, ev, { kind: 'ACCEPT', by: sm, at }, W); assert.ok('refused' in silent && /carries 2 waivers/.test(silent.refused));
  const wrong = attempt(D, ev, { kind: 'ACCEPT', by: sm, at, waivers: 1 }, W); assert.ok('refused' in wrong);
  const one = run([...ev, { kind: 'ACCEPT', by: sm, at, waivers: 2 }], W);
  const silent2 = attempt(D, one, { kind: 'COUNTERSIGN', by: se, at }, W); assert.ok('refused' in silent2 && /carries 2 waivers/.test(silent2.refused));
  const w = replay(D, run([...one, { kind: 'COUNTERSIGN', by: se, at, waivers: 2 }], W), at);
  assert.equal(w.acceptance, 'ACCEPTED'); assert.equal(w.firstApproval!.waivers, 2); assert.equal(w.secondApproval!.waivers, 2);
  assert.equal(w.waivers.filter((x) => x.state === 'STANDING').length, 2); assert.equal(w.open.length, 2); assert.equal(w.totals.pending, 2);
});
test('waiver: separation of duties. Neither the giver nor the reviewer of a waiver approves; a role that did the work cannot waive; nobody waives an exception they own', () => {
  const ev = bothWaived();
  const a = attempt(D, ev, { kind: 'ACCEPT', by: ex, at, waivers: 2 }, W); assert.ok('refused' in a && /different roles/.test(a.refused), 'the Executive gave the business waiver');
  const one = run([...ev, { kind: 'ACCEPT', by: sm, at, waivers: 2 }], W);
  const b = attempt(D, one, { kind: 'COUNTERSIGN', by: ops, at, waivers: 2 }, W); assert.ok('refused' in b && /different roles/.test(b.refused), 'the Operations Lead gave the technical waiver');
  const c = attempt(D, one, { kind: 'COUNTERSIGN', by: arch, at, waivers: 2 }, W); assert.ok('refused' in c && /different roles/.test(c.refused), 'the Product Architect reviewed it');
  assert.equal(replay(D, run([...one, { kind: 'COUNTERSIGN', by: se, at, waivers: 2 }], W), at).acceptance, 'ACCEPTED', 'five parties: two gave waivers, one reviewed, the Service Manager and the Systems Engineer approved');
  for (const who of [cx, qa]) { const r = attempt(D, twoOpen(), waive('T-SIM-016', who), W); assert.ok('refused' in r && /independent of the work/.test(r.refused), who.role); }
  const own = attempt(D, twoOpen(), { ...waive('T-SIM-016'), owner: 'AV Operations Lead' } as DossierEvent, W); assert.ok('refused' in own && /Nobody waives an exception they own/.test(own.refused));
  const none = attempt(D, twoOpen(), waive('T-SIM-016'), ALL); assert.ok('refused' in none && /cannot waive/.test(none.refused), 'the caller’s authority is needed too');
});
test('waiver: what is never waived, and what a waiver must record', () => {
  const r = (ev: DossierEvent[], e: DossierEvent) => { const x = attempt(D, ev, e, W); return 'refused' in x ? x.refused : ''; };
  assert.match(r([{ kind: 'RETEST', test: 'T-SIM-005', result: 'FAIL', evidence: null, by: cx, at }], waive('T-SIM-005')), /Raise the deficiency first/, 'an unraised failure');
  assert.match(r([], waive('T-SIM-032')), /an accessibility control.*never waived/, 'the unraised accessibility failure of the snapshot');
  assert.match(r([], waive('T-SIM-008')), /P1 .*not waived/, 'an open P1');
  assert.match(r([], waive('T-SIM-001')), /nothing to waive/, 'a test with nothing open');
  assert.match(r([], waive('T-SIM-031')), /accessibility control.*never waived/, 'an accessibility test, though it is only pending');
  const fail = (t: string, s: string): DossierEvent[] => [{ kind: 'RETEST', test: t, result: 'FAIL', evidence: null, by: cx, at }, { kind: 'RAISE', test: t, id: 'DEF-SIM-009', statement: s, by: cx, at }];
  assert.match(r(fail('T-SIM-017', 'The control network is reachable from the guest network.'), waive('T-SIM-017')), /a security control.*never waived/);
  assert.match(r(fail('T-SIM-019', 'Management access is open to the whole building network.'), waive('T-SIM-019')), /an authorisation control.*never waived/);
  assert.match(r(fail('T-SIM-026', 'The stored backup does not match its checksum.'), waive('T-SIM-026')), /a record-integrity control.*never waived/);
  // evidence integrity: a pass that has no evidence, or whose new result nobody has verified, is not waived into acceptance
  assert.match(r([{ kind: 'RETEST', test: 'T-SIM-016', result: 'PASS', evidence: 'EV-SIM-116', by: cx, at }], waive('T-SIM-016')), /Evidence is supplied and verified; its absence is never waived/);
  assert.match(r([], waive('T-SIM-999')), /No test/);
  assert.match(r([], { ...waive('T-SIM-016'), reason: 'Not needed.' } as DossierEvent), /documented/);
  assert.match(r([], { ...waive('T-SIM-016'), basis: 'trust me' } as DossierEvent), /relies on/);
  assert.match(r([], { ...waive('T-SIM-016'), risk: 'none' } as DossierEvent), /what could go wrong/);
  assert.match(r([], { ...waive('T-SIM-016'), owner: '' } as DossierEvent), /who owns/);
  assert.match(r([], { ...waive('T-SIM-016'), plan: 'later' } as DossierEvent), /how the item will be closed/);
  assert.match(r([], waive('T-SIM-016', ops, '2026-11-09')), /a day after today/);
  assert.match(r([], waive('T-SIM-016', ops, 'soon')), /last day/);
  assert.match(r([], waive('T-SIM-016', ops, '2027-03-01')), /at most 90 days/);
  const once = run([waive('T-SIM-028')], W); assert.match(r(once, waive('T-SIM-028')), /already has a waiver standing/);
});
test('waiver: it is dated. Run out before the second approval and the first is withdrawn; run out later and the acceptance stands, the waiver reads expired', () => {
  const ev = run([...bothWaived(), { kind: 'ACCEPT', by: sm, at, waivers: 2 }], W);
  assert.equal(replay(D, ev, '2026-12-09T20:00:00Z').signoff, 'AWAITING_SECOND', 'the last day counts');
  const late = replay(D, ev, '2026-12-10T08:00:00Z'); assert.equal(late.firstApproval, null); assert.equal(late.signoff, 'TESTS_OPEN'); assert.equal(late.blockers.length, 2);
  assert.deepEqual(late.waivers.map((x) => x.state), ['EXPIRED', 'EXPIRED']);
  const lateSecond = attempt(D, ev, { kind: 'COUNTERSIGN', by: se, at: '2026-12-10T08:00:00Z', waivers: 2 }, W); assert.ok('refused' in lateSecond, 'no second approval over an expired waiver');
  const done = run([...ev, { kind: 'COUNTERSIGN', by: se, at: '2026-11-10T09:00:00Z', waivers: 2 }], W);
  const after = replay(D, done, '2027-01-15T08:00:00Z'); assert.equal(after.acceptance, 'ACCEPTED', 'an acceptance covers the record as it stood'); assert.equal(after.open.length, 2, 'and the items it left open are still listed');
});
test('waiver: closing the item makes it moot; a new waiver, review or result withdraws an approval', () => {
  const ev = run([...bothWaived(), { kind: 'ACCEPT', by: sm, at, waivers: 2 }], W);
  const closed = run([...ev, { kind: 'RETEST', test: 'T-SIM-028', result: 'PASS', evidence: 'EV-SIM-128', by: cx, at }, { kind: 'VERIFY', test: 'T-SIM-028', by: qa, at }], W); const w = replay(D, closed, at);
  assert.equal(w.firstApproval, null, 'the record changed'); assert.deepEqual(w.waivers.map((x) => [x.test, x.state]), [['T-SIM-016', 'STANDING'], ['T-SIM-028', 'MOOT']]);
  assert.ok('events' in attempt(D, closed, { kind: 'ACCEPT', by: sm, at, waivers: 1 }, W), 'one waiver now');
});
test('waiver: stored events cannot forge one', () => {
  const base = twoOpen(); const acc: DossierEvent[] = [{ kind: 'ACCEPT', by: sm, at, waivers: 2 }, { kind: 'COUNTERSIGN', by: se, at, waivers: 2 }];
  const good: DossierEvent[] = [waive('T-SIM-016'), review('T-SIM-016'), waive('T-SIM-028')];
  assert.equal(replay(D, [...base, ...good, ...acc], at).acceptance, 'ACCEPTED', 'the honest sequence accepts');
  const held = (ev: DossierEvent[], m: string) => assert.equal(replay(D, ev, at).acceptance, 'HELD', m);
  held([...base, waive('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a technical waiver with no engineering review');
  held([...base, waive('T-SIM-016'), review('T-SIM-016', ops), waive('T-SIM-028'), ...acc], 'a review by the role that gave the waiver');
  held([...base, waive('T-SIM-016'), review('T-SIM-016', qa), waive('T-SIM-028'), ...acc], 'a review by a role that did the work');
  held([...base, review('T-SIM-016'), waive('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a review recorded before the waiver it claims to review');
  held([...base, waive('T-SIM-016', cx), review('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a waiver from a role that did the work');
  held([...base, ...good, { kind: 'ACCEPT', by: sm, at }, { kind: 'COUNTERSIGN', by: se, at }], 'approvals that do not name the waivers');
  held([...base, ...good, { kind: 'ACCEPT', by: ex, at, waivers: 2 }, { kind: 'COUNTERSIGN', by: se, at, waivers: 2 }], 'the first approver gave a waiver');
  held([...base, ...good, { kind: 'ACCEPT', by: sm, at, waivers: 2 }, { kind: 'COUNTERSIGN', by: ops, at, waivers: 2 }], 'the second approver gave a waiver');
  held([...base, waive('T-SIM-016', se), review('T-SIM-016'), waive('T-SIM-028'), { kind: 'ACCEPT', by: sm, at, waivers: 2 }, { kind: 'COUNTERSIGN', by: arch, at, waivers: 2 }], 'the second approver reviewed a waiver');
  held([...base, waive('T-SIM-016', ops, '2026-11-01'), review('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a waiver already past its date');
  held([...base, waive('T-SIM-016', ops, 'never'), review('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a waiver with no date');
  held([...base, { ...waive('T-SIM-016'), owner: 'AV Operations Lead' } as DossierEvent, review('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a waiver whose owner is its giver');
  held([waive('T-SIM-008'), review('T-SIM-008'), waive('T-SIM-016'), review('T-SIM-016'), waive('T-SIM-028'), waive('T-SIM-030'), review('T-SIM-030'), waive('T-SIM-031'), review('T-SIM-031'), waive('T-SIM-032'), review('T-SIM-032'), { kind: 'ACCEPT', by: sm, at, waivers: 6 }, { kind: 'COUNTERSIGN', by: se, at, waivers: 6 }], 'waiving a P1, an unraised failure, missing evidence and accessibility controls');
  held([...base, { kind: 'WAIVE', test: 'T-SIM-016', reason: why, expires: '2026-12-09', by: ops, at } as unknown as DossierEvent, review('T-SIM-016'), waive('T-SIM-028'), ...acc], 'a waiver with no owner, plan, risk or basis');
  held([...base, ...acc, ...good], 'waivers after the approvals');
});
test('attestation: the site champion’s word is recorded and read, and approves nothing', () => {
  const say: DossierEvent = { kind: 'ATTEST', statement: 'We held three team meetings here this week; far end heard us clearly.', by: emp, at };
  const ev = run([say], W); const w = replay(D, ev, at);
  assert.equal(w.attestations.length, 1); assert.equal(w.acceptance, 'HELD'); assert.equal(w.blockers.length, replay(D, [], at).blockers.length, 'it clears no blocker');
  assert.ok('refused' in attempt(D, ev, say, W), 'not twice'); assert.ok('refused' in attempt(D, [], { ...say, statement: 'ok' }, W)); assert.ok('refused' in attempt(D, [], say, ALL), 'needs the authority');
  const one = run([...cleared(), { kind: 'ACCEPT', by: sm, at }], W); const withWord = run([...one, say], W);
  assert.equal(replay(D, withWord, at).signoff, 'AWAITING_SECOND', 'an attestation does not withdraw an approval');
  assert.equal(replay(D, [...cleared(), say, { kind: 'COUNTERSIGN', by: emp, at }], at).acceptance, 'HELD', 'and the champion is not an approver');
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
