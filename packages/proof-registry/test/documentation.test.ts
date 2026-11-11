import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOSSIER_4218 as D, replay, attempt, DELIVERABLES, RULES, requiredFor, replayDocs, attemptDoc, whatIsMissing, releaseControls, fixtureHistory, wellFormedDocEvent,
  type Actor, type Authority, type DossierEvent, type Working, type DocAuthority, type DocContext, type DocEvent, type DocSet, type DocsWorking, type RoomProfile, type DeliverableType, type FindingKind } from '../src/index.js';

const A = (role: string, label: string): Actor => ({ role, label });
const cx = A('cxeng', 'Commissioning Engineer'); const qa = A('qa', 'Document Reviewer'); const ex = A('exec', 'Executive'); const ops = A('ops', 'AV Operations Lead'); const se = A('syseng', 'Systems Engineer');
const sm = A('svcmgr', 'Service Manager'); const pm = A('ipm', 'Integration PM'); const des = A('designer', 'Designer'); const ins = A('installer', 'Installation Engineer'); const champ = A('sitechamp', 'Site Champion'); const arch = A('architect', 'Product Architect'); const emp = A('employee', 'Employee');
const NO: DocAuthority = { assign: false, submit: false, review: false, acknowledge: false, recordVendor: false };
const POLICY: Record<string, DocAuthority> = { ipm: { ...NO, assign: true, submit: true, recordVendor: true }, designer: { ...NO, submit: true }, syseng: { ...NO, submit: true }, installer: { ...NO, submit: true }, cxeng: { ...NO, submit: true },
  svcmgr: { ...NO, submit: true, review: true, acknowledge: true }, qa: { ...NO, review: true }, architect: { ...NO, review: true }, ops: { ...NO, review: true, acknowledge: true }, sitechamp: { ...NO, acknowledge: true } };
const policy = (role: string): DocAuthority => POLICY[role] ?? NO;
const ALL: Authority = { record: true, verify: true, raise: true, accept: true, countersign: true };

const P4218: RoomProfile = { roomId: 'R-ATL-4-218', name: 'Atlas 4.218 Boardroom', size: 'large', seats: 16, devices: 14, hasDsp: true, hasCameras: true, hasNetwork: true, hasControl: true, hasRack: true, hasProgrammable: true, vendorInstalled: false };
const POSITIONS = ['DSP-01', 'MIC-01', 'MIC-02', 'MIC-03', 'SPK-01', 'SPK-02', 'CAM-01', 'CAM-02', 'DISP-01', 'DISP-02', 'TP-01', 'CTL-01', 'SW-01', 'UC-01'];
const COUNTS = { dsp: 1, microphone: 3, loudspeaker: 2, camera: 2, display: 2, 'touch panel': 1, controller: 1, switch: 1, 'uc compute': 1 };
const ctxOf = (w: Working, over: Partial<DocContext> = {}): DocContext => ({ roomRevision: 3, positions: POSITIONS, counts: COUNTS, evidence: w.tests.filter((t) => t.evidence).map((t) => t.evidence!),
  tests: w.tests.map((t) => ({ id: t.id, name: t.name, settled: t.result === 'PASS' && !!t.evidence && (!t.changed || !!t.verifiedBy) })), deficiencies: w.deficiencies.map((x) => ({ id: x.id, open: x.state !== 'CLOSED' })), ...over });
const REPRESENTS: Partial<Record<DeliverableType, string>> = { signal_flow: 'T-SIM-025', config_backup: 'T-SIM-026', asset_list: 'T-SIM-027', training_materials: 'T-SIM-028', commissioning_results: 'T-SIM-016' };
const CORRECTION = 'The final camera preset verification (T-SIM-016) is missing from the packet. See DEF-SIM-002.';
const W0 = replay(D, []); const C0 = ctxOf(W0);
const SET: DocSet = { id: 'DOCS-R-ATL-4-218', profile: P4218, represents: REPRESENTS,
  history: fixtureHistory(P4218, C0, { reviewer: qa, assigner: pm, actors: { designer: des, syseng: se, installer: ins, cxeng: cx, svcmgr: sm, ipm: pm }, from: '2026-10-20T09:00:00Z', represents: REPRESENTS,
    hold: { commissioning_results: { packetWithout: ['EV-SIM-016'], correction: CORRECTION }, training_materials: { acknowledgedBy: ['ops'] } } }) };
const NOW = '2026-11-09T12:00:00Z'; const at = (m: number) => new Date(Date.parse(NOW) + m * 60000).toISOString();
const read = (ev: readonly DocEvent[] = [], ctx: DocContext = C0, set: DocSet = SET, asOf = NOW): DocsWorking => replayDocs(set, ev, ctx, policy, asOf);
const doc = (w: DocsWorking, t: DeliverableType) => w.docs.find((x) => x.type === t)!;
const kinds = (w: DocsWorking, t: DeliverableType): FindingKind[] => doc(w, t).findings.map((x) => x.kind);
const go = (steps: DocEvent[], ctx: DocContext = C0, set: DocSet = SET): DocEvent[] => { let ev: DocEvent[] = []; for (const s of steps) { const r = attemptDoc(set, ev, s, ctx, policy); assert.ok('events' in r, 'refused' in r ? `${s.kind} ${s.doc}: ${r.refused}` : ''); if ('events' in r) ev = r.events; } return ev; };
const no = (ev: readonly DocEvent[], e: DocEvent, ctx: DocContext = C0, set: DocSet = SET): string => { const r = attemptDoc(set, ev, e, ctx, policy); return 'refused' in r ? r.refused : ''; };
const SHA = 'ab'.repeat(32);
const submit = (d: DeliverableType, revision: number, by: Actor, m: number, over: Partial<Extract<DocEvent, { kind: 'SUBMIT' }>> = {}): DocEvent => { const r = RULES[d];
  return { kind: 'SUBMIT', doc: d, revision, fields: Object.fromEntries(r.fields.map((x) => [x.key, `stated: ${x.key}`])), equipment: r.equipment === 'all' ? [...POSITIONS] : r.equipment === 'some' ? ['DSP-01'] : [], evidence: r.evidence === 'packet' ? [...C0.evidence] : r.evidence === 'some' ? [C0.evidence[0]!] : [],
    attachment: r.attachment ? { name: `${d}-r${revision}.pdf`, bytes: 1024, sha256: SHA } : null, against: { room: 3, docs: Object.fromEntries(r.dependsOn.map((x) => [x, 1])) }, ...(d === 'asset_list' ? { counts: { ...COUNTS } } : {}), by, at: at(m), ...over }; };

test('applicability: a huddle room gets the short list, the largest room the full one, and every rule says why either way', () => {
  const huddle: RoomProfile = { roomId: 'R-X', name: 'Huddle', size: 'huddle', seats: 4, devices: 2, hasDsp: false, hasCameras: false, hasNetwork: false, hasControl: false, hasRack: false, hasProgrammable: false, vendorInstalled: false };
  const short = requiredFor(huddle).filter((x) => x.applies).map((x) => x.type);
  assert.deepEqual(short, ['as_built_drawings', 'asset_list', 'bom_revision', 'commissioning_results', 'support_contacts', 'warranty_information', 'operational_handoff']);
  const venue: RoomProfile = { ...huddle, size: 'venue', seats: 400, devices: 60, hasDsp: true, hasCameras: true, hasNetwork: true, hasControl: true, hasRack: true, hasProgrammable: true, vendorInstalled: true };
  assert.equal(requiredFor(venue, 2).filter((x) => x.applies).length, 18, 'the full set');
  assert.equal(DELIVERABLES.length, 18);
  const flags = ['hasDsp', 'hasCameras', 'hasNetwork', 'hasControl', 'hasRack', 'hasProgrammable', 'vendorInstalled'] as const;
  for (let m = 0; m < 128; m++) for (const size of ['huddle', 'meeting', 'large', 'venue'] as const) for (const n of [0, 1, 3]) {
    const p: RoomProfile = { ...huddle, size, devices: 2 + (m % 9), ...Object.fromEntries(flags.map((k, i) => [k, !!(m & (1 << i))])) } as RoomProfile;
    for (const q of requiredFor(p, n)) { assert.ok(q.why.length > 12 && !/undefined/.test(q.why), `${q.type} gives a reason`);
      if (q.type === 'rack_elevations') assert.equal(q.applies, p.hasRack, 'no room is asked for rack elevations it has no rack for');
      if (q.type === 'camera_configuration') assert.equal(q.applies, p.hasCameras); if (q.type === 'dsp_documentation') assert.equal(q.applies, p.hasDsp);
      if (q.type === 'vendor_signoff') assert.equal(q.applies, p.vendorInstalled); if (q.type === 'deficiency_closure') assert.equal(q.applies, n > 0); }
  }
  for (const t of DELIVERABLES) { const yes = RULES[t].applies(venue, 2); const not = RULES[t].applies(huddle, 0); if (!not[0]) assert.notEqual(yes[1], not[1], `${t}: the reason it applies is not the reason it does not`); }
});

test('the 4.218 documentation agrees with the dossier it belongs to', () => {
  const w = read(); assert.equal(w.dropped, 0, 'the seeded history obeys the rules'); assert.equal(w.required, 17, 'everything but vendor sign-off: the room was not installed by a vendor');
  assert.equal(doc(w, 'vendor_signoff').state, 'NOT_APPLICABLE');
  assert.equal(doc(w, 'signal_flow').state, 'ACCEPTED'); assert.ok(doc(w, 'signal_flow').met, 'T-SIM-025 passes');
  const backup = doc(w, 'config_backup'); assert.equal(backup.state, 'ACCEPTED'); assert.match(backup.submission!.attachment!.sha256, /^[0-9a-f]{64}$/, 'T-SIM-026: stored with its checksum');
  const assets = doc(w, 'asset_list'); assert.equal(assets.state, 'ACCEPTED'); assert.ok(!kinds(w, 'asset_list').includes('contradiction_count'), 'T-SIM-027: the list agrees with the register');
  const guide = doc(w, 'training_materials'); assert.equal(guide.state, 'ACCEPTED'); assert.deepEqual(guide.acknowledgements.outstanding.map((a) => a.role), ['sitechamp']); assert.equal(guide.met, false, 'T-SIM-028 is pending: acknowledgement outstanding');
  const results = doc(w, 'commissioning_results'); assert.equal(results.state, 'CORRECTION_REQUESTED'); assert.match(results.correction!.comment, /camera preset verification/);
  assert.ok(results.findings.some((x) => x.kind === 'evidence_not_in_packet' && /EV-SIM-016/.test(x.detail)), 'DEF-SIM-002: the packet lacks the camera preset record'); assert.equal(results.met, false);
  const closure = doc(w, 'deficiency_closure'); assert.equal(closure.met, false); assert.match(closure.findings[0]!.detail, /DEF-SIM-001, DEF-SIM-002/);
  assert.deepEqual(w.blockers, [], 'every document this tracker gates is complete: what holds the room is on the dossier');
  assert.equal(w.met, 14); assert.deepEqual(w.docs.filter((x) => x.applies && !x.met).map((x) => x.type), ['commissioning_results', 'deficiency_closure', 'training_materials']);
  for (const d of w.docs) if (d.accepted) assert.notEqual(d.accepted.by.role, d.submission!.by.role, `${d.type}: accepted by another role`);
});

test('every finding is computed from the submission and the room’s record', () => {
  // the room record moves on: every document written against revision 3 is outdated, and the tracker now blocks
  const moved = read([], ctxOf(W0, { roomRevision: 4 })); assert.equal(doc(moved, 'as_built_drawings').state, 'OUTDATED'); assert.ok(kinds(moved, 'rack_elevations').includes('outdated_room'));
  assert.ok(moved.blockers.some((b) => /“Rack elevations” is outdated/.test(b.reason)) && moved.blockers.every((b) => b.test === null));
  // a new as-built: what was drawn from the old one is outdated until it is checked again
  const ev = go([submit('as_built_drawings', 2, des, 1), { kind: 'ACCEPT', doc: 'as_built_drawings', revision: 2, by: qa, at: at(2) }]); const w = read(ev);
  for (const t of ['signal_flow', 'network_diagram', 'rack_elevations'] as const) { assert.ok(kinds(w, t).includes('outdated_reference'), t); assert.equal(doc(w, t).state, 'OUTDATED'); }
  assert.deepEqual(w.blockers.map((b) => b.reason).sort(), ['document “Network diagram” is outdated', 'document “Rack elevations” is outdated'], 'signal flow is gated by its own test on the dossier, so it is not counted twice');
  assert.ok(kinds(w, 'signal_flow').includes('dossier_ahead'), 'and the tracker says the two records disagree');
  // the asset list against a room that has gained a camera
  const cam = read([], ctxOf(W0, { counts: { ...COUNTS, camera: 3 }, positions: [...POSITIONS, 'CAM-03'] }));
  assert.match(doc(cam, 'asset_list').findings.find((x) => x.kind === 'contradiction_count')!.detail, /camera 2 listed, 3 installed/); assert.ok(kinds(cam, 'asset_list').includes('equipment_not_listed'));
  // submissions with gaps are recorded, and say what is missing
  const gaps = go([submit('rack_elevations', 2, des, 1, { attachment: null, fields: { rack_id: 'R1', rack_units: ' ' }, against: { room: 5, docs: {} } }), submit('dsp_documentation', 2, se, 2, { equipment: ['DSP-99'] }),
    submit('camera_configuration', 2, se, 3, { equipment: [] }), submit('measurement_evidence', 2, cx, 4, { evidence: [] }), submit('commissioning_results', 2, cx, 5, { evidence: [...C0.evidence, 'EV-NOPE-1'] }),
    submit('signal_flow', 2, des, 6, { against: { room: 2, docs: { as_built_drawings: 1 } } })]); const g = read(gaps);
  assert.deepEqual(kinds(g, 'rack_elevations').sort(), ['ahead_of_room', 'awaiting_review', 'field_empty', 'missing_attachment', 'overdue', 'reference_missing']);   // overdue too: it was due on 1 November and is not complete
  assert.ok(kinds(g, 'dsp_documentation').includes('unknown_equipment')); assert.ok(kinds(g, 'camera_configuration').includes('no_equipment')); assert.ok(kinds(g, 'measurement_evidence').includes('no_evidence'));
  assert.ok(kinds(g, 'commissioning_results').includes('unknown_evidence') && !kinds(g, 'commissioning_results').includes('evidence_not_in_packet'));
  assert.ok(kinds(g, 'signal_flow').includes('contradiction_revision') && kinds(g, 'as_built_drawings').includes('contradiction_revision') && kinds(g, 'signal_flow').includes('outdated_room'));
  for (const t of ['rack_elevations', 'dsp_documentation', 'camera_configuration', 'measurement_evidence', 'commissioning_results', 'signal_flow'] as const) assert.match(no(gaps, { kind: 'ACCEPT', doc: t, revision: 2, by: qa, at: at(9) }), /cannot be accepted/, `${t} is not accepted with a finding standing`);
  // a withdrawn document, an unassigned one, an overdue one
  const gone = go([{ kind: 'WITHDRAW', doc: 'warranty_information', reason: 'Wrong provider named in it.', by: ins, at: at(1) }]);
  assert.deepEqual(kinds(read(gone), 'warranty_information'), ['not_submitted', 'overdue']); assert.deepEqual(kinds(read(gone, C0, SET, '2026-10-30T00:00:00Z'), 'warranty_information'), ['not_submitted'], 'not overdue before its due date'); assert.equal(doc(read(gone), 'warranty_information').state, 'ASSIGNED'); assert.ok(kinds(read(gone, C0, SET, '2026-12-01T00:00:00Z'), 'warranty_information').includes('overdue'));
  const bare = read([], C0, { ...SET, history: [] }); assert.deepEqual(kinds(bare, 'bom_revision'), ['not_submitted', 'unassigned']); assert.equal(doc(bare, 'bom_revision').state, 'NOT_STARTED'); assert.equal(bare.blockers.length, 11);
  // the tracker complete where the dossier is not
  const done = go([{ kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: champ, at: at(1) }]); assert.deepEqual(kinds(read(done), 'training_materials'), ['not_on_dossier']); assert.equal(doc(read(done), 'training_materials').met, false, 'the test on the dossier is still the gate');
  // a vendor document recorded as anything else
  const vp = { ...P4218, vendorInstalled: true }; const vset: DocSet = { ...SET, profile: vp };
  assert.match(no([], submit('vendor_signoff', 1, pm, 1), C0, vset), /comes from the vendor/);
  const v = go([{ ...(submit('vendor_signoff', 1, pm, 1) as Extract<DocEvent, { kind: 'SUBMIT' }>), kind: 'VENDOR_SUBMISSION', vendor: 'Synthetic Integration Ltd' }], C0, vset);
  assert.equal(doc(read(v, C0, vset), 'vendor_signoff').submission!.vendor, 'Synthetic Integration Ltd');
  const every = new Set([...moved.findings, ...w.findings, ...cam.findings, ...g.findings, ...read(gone, C0, SET, '2026-12-01T00:00:00Z').findings, ...bare.findings, ...read(done).findings, ...read().findings].map((x) => x.kind));
  for (const k of ['not_submitted', 'unassigned', 'overdue', 'missing_attachment', 'field_empty', 'unknown_equipment', 'equipment_not_listed', 'no_equipment', 'unknown_evidence', 'evidence_not_in_packet', 'no_evidence', 'outdated_room', 'ahead_of_room', 'outdated_reference', 'reference_missing',
    'contradiction_count', 'contradiction_revision', 'correction_requested', 'awaiting_review', 'acknowledgement_outstanding', 'deficiency_open', 'not_on_dossier', 'dossier_ahead'] as const) assert.ok(every.has(k), `${k} is produced`);
});

test('independence and order: who may do what, and in which sequence', () => {
  const s2 = go([submit('bom_revision', 2, des, 1)]);
  assert.match(no(s2, { kind: 'ACCEPT', doc: 'bom_revision', revision: 2, by: des, at: at(2) }), /does not review/);
  assert.match(no([], { kind: 'WITHDRAW', doc: 'support_contacts', reason: 'Starting it again from scratch.', by: sm, at: at(1) }), /^$/, 'the submitter withdraws their own');
  const mine = go([submit('support_contacts', 2, sm, 1)]);
  assert.match(no(mine, { kind: 'ACCEPT', doc: 'support_contacts', revision: 2, by: sm, at: at(2) }), /different role from the one that submitted/, 'a reviewer who submitted it cannot accept it');
  assert.match(no(mine, { kind: 'REQUEST_CORRECTION', doc: 'support_contacts', comment: 'Escalation is missing.', by: sm, at: at(2) }), /different role/);
  assert.match(no(s2, { kind: 'ACCEPT', doc: 'bom_revision', revision: 1, by: qa, at: at(2) }), /current revision is 2/);
  assert.match(no(s2, submit('bom_revision', 4, des, 2)), /next revision of the bill of materials revision is 3/);
  assert.match(no(s2, submit('bom_revision', 3, se, 2)), /assigned to the Designer/);
  assert.match(no(s2, submit('bom_revision', 3, des, -5)), /dated before/);
  assert.match(no([], submit('vendor_signoff', 1, pm, 1)), /does not apply to this room: the room was not installed by a vendor/);
  assert.match(no([], submit('deficiency_closure', 1, cx, 1)), /read from the dossier/);
  assert.match(no([], submit('bom_revision', 2, emp, 1)), /does not submit/);
  assert.match(no([], { kind: 'ASSIGN', doc: 'bom_revision', owner: des, due: '2026-12-01', by: des, at: at(1) }), /does not assign/);
  assert.match(no([], { kind: 'ASSIGN', doc: 'bom_revision', owner: emp, due: '2026-12-01', by: pm, at: at(1) }), /not a role that submits/);
  assert.match(no([], { kind: 'ASSIGN', doc: 'bom_revision', owner: des, due: '2026-11-01', by: pm, at: at(1) }), /already past/);
  assert.match(no([], { kind: 'REQUEST_CORRECTION', doc: 'bom_revision', comment: 'No.', by: qa, at: at(1) }), /at least 12 characters/);
  assert.match(no([], { kind: 'ACCEPT', doc: 'bom_revision', revision: 1, by: qa, at: at(1) }), /already accepted/);
  assert.match(no([], { kind: 'ACCEPT', doc: 'commissioning_results', revision: 1, by: qa, at: at(1) }), /correction was requested/);
  // acknowledgement: only the named roles, only an accepted revision, never the author, once
  assert.match(no([], { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: sm, at: at(1) }), /acknowledged by: AV Operations Lead, Site Champion/);
  assert.match(no([], { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: ops, at: at(1) }), /Already acknowledged/);
  assert.match(no([], { kind: 'ACKNOWLEDGE', doc: 'bom_revision', revision: 1, by: ops, at: at(1) }), /needs no acknowledgement/);
  assert.match(no([], { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: champ, at: at(1) }), /^$/);
  assert.match(no(go([submit('training_materials', 2, sm, 1)]), { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 2, by: champ, at: at(2) }), /Only an accepted revision/);
  // a new revision is reviewed and acknowledged again
  const again = go([submit('operational_handoff', 2, pm, 1), { kind: 'ACCEPT', doc: 'operational_handoff', revision: 2, by: qa, at: at(2) }]); const w = read(again);
  assert.deepEqual(doc(w, 'operational_handoff').acknowledgements.outstanding.map((a) => a.role), ['svcmgr', 'ops']); assert.ok(w.blockers.some((b) => /“Operational handoff” awaits acknowledgement by the Service Manager and the AV Operations Lead/.test(b.reason)));
  // a correction reopens an accepted document
  const reopened = read(go([{ kind: 'REQUEST_CORRECTION', doc: 'network_diagram', comment: 'The control VLAN is not shown.', by: arch, at: at(1) }]));
  assert.equal(doc(reopened, 'network_diagram').state, 'CORRECTION_REQUESTED'); assert.deepEqual(reopened.blockers.map((b) => b.reason), ['document “Network diagram” has a correction requested']);
});

test('stored events are untrusted: what the rules refuse is dropped, counted, and changes nothing', () => {
  const base = read(); const j = (x: unknown) => JSON.stringify(x);
  const forged: unknown[] = [null, 7, 'ACCEPT', {}, { kind: 'ACCEPT' }, { kind: 'ACCEPT', doc: 'bom_revision', revision: 1, by: { role: 'QA!', label: 'x' }, at: at(1) }, { kind: 'ACCEPT', doc: '__proto__', revision: 1, by: qa, at: at(1) },
    { kind: 'ACCEPT', doc: 'commissioning_results', revision: 1, by: cx, at: at(1) },                                    // the submitter accepts their own, and without authority
    { kind: 'ACCEPT', doc: 'commissioning_results', revision: 1, by: qa, at: at(1) },                                    // over a requested correction
    { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: emp, at: at(1) }, { kind: 'ACKNOWLEDGE', doc: 'training_materials', revision: 1, by: sm, at: at(1) },
    { ...submit('bom_revision', 9, des, 1) }, { ...submit('bom_revision', 2, des, 1), attachment: { name: 'x', bytes: -1, sha256: 'zz' } }, { ...submit('bom_revision', 2, des, 1), fields: { a: 'x'.repeat(5000) } },
    { ...submit('bom_revision', 2, emp, 1) }, { kind: 'WITHDRAW', doc: 'bom_revision', reason: 'because I can do this', by: emp, at: at(1) }, { kind: 'SUBMIT', doc: 'vendor_signoff', revision: 1 }, { kind: 'NOPE', doc: 'bom_revision', by: qa, at: at(1) }];
  for (const x of forged.slice(0, 7)) assert.equal(wellFormedDocEvent(x), false);
  const w = replayDocs(SET, forged as DocEvent[], C0, policy, NOW); assert.equal(w.dropped, forged.length);
  assert.equal(j(w.docs), j(base.docs), 'nothing changed'); assert.deepEqual(w.blockers, []);
  // a missing attachment cannot be accepted even by a stored event from a real reviewer
  const gap = [submit('bom_revision', 2, des, 1, { attachment: null }), { kind: 'ACCEPT', doc: 'bom_revision', revision: 2, by: qa, at: at(2) } as DocEvent]; const g = replayDocs(SET, gap, C0, policy, NOW);
  assert.equal(g.dropped, 1); assert.equal(doc(g, 'bom_revision').state, 'SUBMITTED'); assert.equal(doc(g, 'bom_revision').satisfied, false);
  // and an accepted document the room record now contradicts is not satisfied, whatever its stored state says
  const stale = replayDocs(SET, [], ctxOf(W0, { positions: POSITIONS.slice(1) }), policy, NOW); assert.equal(doc(stale, 'config_backup').satisfied, false, 'it names a position the room no longer has');
});

test('property: any sequence the rules let through replays to the same record, and what is satisfied was independently accepted', () => {
  let seed = 20261111; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]!;
  const people = [cx, qa, ops, se, sm, pm, des, ins, champ, arch, emp]; const types = DELIVERABLES;
  for (let run = 0; run < 60; run++) {
    let ev: DocEvent[] = []; let m = 1; const set: DocSet = run % 3 ? SET : { ...SET, history: [] };
    for (let i = 0; i < 70; i++) {
      const d = pick(types); const by = pick(people); const cur = read(ev, C0, set).docs.find((x) => x.type === d)!; const k = Math.floor(rnd() * 6);
      const e: DocEvent = k === 0 ? { kind: 'ASSIGN', doc: d, owner: pick(people), due: '2026-12-20', by, at: at(m) }
        : k === 1 ? submit(d, cur.lastRevision + (rnd() < 0.9 ? 1 : 2), by, m, rnd() < 0.2 ? { attachment: null } : {})
        : k === 2 ? { kind: 'REQUEST_CORRECTION', doc: d, comment: 'Something in it is not right yet.', by, at: at(m) }
        : k === 3 ? { kind: 'ACCEPT', doc: d, revision: cur.submission?.revision ?? 1, by, at: at(m) }
        : k === 4 ? { kind: 'ACKNOWLEDGE', doc: d, revision: cur.accepted?.revision ?? 1, by, at: at(m) } : { kind: 'WITHDRAW', doc: d, reason: 'Withdrawn for the property test.', by, at: at(m) };
      const r = attemptDoc(set, ev, e, C0, policy); if ('events' in r) { ev = r.events; m++; }
    }
    const w = read(ev, C0, set); assert.equal(w.dropped, 0, 'what attempt let through, replay keeps');
    assert.equal(JSON.stringify(read(ev, C0, set)), JSON.stringify(w), 'deterministic');
    for (const d of w.docs) {
      if (d.satisfied) { assert.ok(d.accepted && d.submission && d.accepted.by.role !== d.submission.by.role && policy(d.accepted.by.role).review, `${d.type}: independently accepted`);
        assert.ok(!RULES[d.type].attachment || d.submission!.attachment, `${d.type}: has its file`); assert.equal(d.acknowledgements.outstanding.length, 0); assert.equal(d.accepted!.revision, d.submission!.revision); }
      assert.equal(d.lastRevision, d.history.filter((x) => x.kind === 'SUBMIT' || x.kind === 'VENDOR_SUBMISSION').length, `${d.type}: revisions are consecutive`);
      for (const a of d.acknowledgements.have) assert.ok(RULES[d.type].acknowledgers.some((x) => x.role === a.by.role));
      assert.equal(d.met, !d.applies || (d.gate === 'dossier' ? (d.test ? C0.tests.find((t) => t.id === d.test)!.settled : !C0.deficiencies.some((x) => x.open)) : d.satisfied));
    }
    assert.deepEqual(w.blockers.map((b) => b.reason.split('”')[0]).sort(), w.docs.filter((d) => d.applies && d.gate === 'tracker' && !d.satisfied).map((d) => `document “${d.title}`).sort());
    // garbage between the events changes nothing
    const noisy = ev.flatMap((e, i) => (i % 5 ? [e] : [e, { kind: 'ACCEPT', doc: e.doc } as unknown as DocEvent])); const n = replayDocs(set, noisy, C0, policy, NOW);
    assert.equal(JSON.stringify(n.docs), JSON.stringify(w.docs)); assert.equal(n.dropped, noisy.length - ev.length);
  }
});

test('“what is missing” is the findings in words: nothing in it is invented', () => {
  for (const w of [read(), read([], ctxOf(W0, { roomRevision: 4 })), read([], C0, { ...SET, history: [] })]) {
    const lines = whatIsMissing(w); assert.equal(lines.length, w.findings.filter((x) => x.kind !== 'unassigned').length);
    for (const l of lines) { assert.ok(w.findings.includes(l.finding), 'each line is one finding of the record'); assert.equal(l.text, `${l.title}. ${l.finding.detail} ${l.finding.action}`); assert.ok(!/approved by|signed by|measured at|\d+(\.\d+)? ?dB/i.test(l.text), 'no measurement, sign-off or approval is asserted'); }
    const firstSoft = lines.findIndex((l) => !l.finding.blocking); assert.ok(firstSoft < 0 || lines.slice(firstSoft).every((l) => !l.finding.blocking), 'what stops acceptance comes first');
  }
});

const AT = NOW; const fix = (t: string, n: string, by: Actor = cx, v: Actor = qa): DossierEvent[] => [{ kind: 'RETEST', test: t, result: 'PASS', evidence: `EV-SIM-${n}`, by, at: AT }, { kind: 'VERIFY', test: t, by: v, at: AT }];
const dossier = (steps: DossierEvent[]): DossierEvent[] => { let ev: DossierEvent[] = []; for (const s of steps) { const r = attempt(D, ev, s, ALL); assert.ok('events' in r, 'refused' in r ? r.refused : ''); if ('events' in r) ev = r.events; } return ev; };
const cleared = (by: Actor = cx, v: Actor = qa): DossierEvent[] => dossier([{ kind: 'RAISE', test: 'T-SIM-032', id: 'DEF-SIM-003', statement: 'Assistive listening feed is below the specified level.', by, at: AT }, ...fix('T-SIM-008', '108', by, v), ...fix('T-SIM-016', '116', by, v), ...fix('T-SIM-028', '128', by, v), ...fix('T-SIM-031', '131', by, v), ...fix('T-SIM-032', '132', by, v),
  { kind: 'EVIDENCE', test: 'T-SIM-030', evidence: 'EV-SIM-130', by, at: AT }, { kind: 'VERIFY', test: 'T-SIM-030', by: v, at: AT }]);
const APPROVERS = { first: [sm, ex], second: [ops, se] };

test('release controls: the ten checks are computed, before and after the room is put right', () => {
  const rc = releaseControls(W0, read(), APPROVERS); assert.deepEqual(rc.map((x) => x.id), ['tests', 'evidence', 'deficiencies', 'documents', 'identity', 'revisions', 'signoff', 'retest', 'handoff', 'baseline']);
  const st = (r: typeof rc) => Object.fromEntries(r.map((x) => [x.id, x.state]));
  assert.deepEqual(st(rc), { tests: 'OPEN', evidence: 'OPEN', deficiencies: 'OPEN', documents: 'OPEN', identity: 'PASS', revisions: 'PASS', signoff: 'PASS', retest: 'PASS', handoff: 'OPEN', baseline: 'PASS' });
  assert.equal(rc[0]!.open.length, 5); assert.match(rc[1]!.open[0]!, /T-SIM-030 passes with no evidence record/); assert.equal(rc[2]!.open.length, 2);
  assert.deepEqual(rc[3]!.open.map((x) => x.split(':')[0]), ['Commissioning results', 'Deficiency closure records', 'Training materials and operator guide']); assert.match(rc[3]!.basis, /14 of 17/);
  for (const x of rc) assert.equal(x.state === 'PASS', x.open.length === 0);
  const ev = cleared(); const w = replay(D, ev); const after = releaseControls(w, read([], ctxOf(w)), APPROVERS);
  assert.ok(after.every((x) => x.state === 'PASS'), JSON.stringify(after.filter((x) => x.state !== 'PASS')));
  // half-way: a retest waiting for its verifier
  const half = replay(D, dossier([fix('T-SIM-008', '108')[0]!])); assert.match(releaseControls(half, read([], ctxOf(half)), APPROVERS).find((x) => x.id === 'retest')!.open[0]!, /T-SIM-008 was retested and awaits independent verification/);
  // the work was done by the very roles that would approve second: nobody is left to give that approval
  const w2 = replay(D, cleared(ops, se)); const so = releaseControls(w2, read([], ctxOf(w2)), APPROVERS).find((x) => x.id === 'signoff')!; assert.equal(so.state, 'OPEN'); assert.match(so.open[0]!, /second approval/);
  // identity and revisions follow the documents
  const moved = releaseControls(w, read([], ctxOf(w, { roomRevision: 4, counts: { ...COUNTS, camera: 3 } })), APPROVERS);
  assert.deepEqual(st(moved), { tests: 'PASS', evidence: 'PASS', deficiencies: 'PASS', documents: 'OPEN', identity: 'OPEN', revisions: 'OPEN', signoff: 'PASS', retest: 'PASS', handoff: 'OPEN', baseline: 'OPEN' });
});

test('phase 6 gate: an incomplete required document stops acceptance, cannot be waived, and an acceptance covers the record as it stood', () => {
  const ev = cleared(); const w = replay(D, ev); const ctx = ctxOf(w);
  const docsAt = (docEv: readonly DocEvent[]) => (t: string) => replayDocs(SET, docEv, ctx, policy, t, { until: t }).blockers;
  assert.equal(replay(D, ev, AT, docsAt([])).signoff, 'AWAITING_FIRST', 'with the documents complete, the existing path is unchanged');
  assert.deepEqual(replay(D, ev, AT, docsAt([])).blockers, replay(D, ev, AT).blockers);
  // a reviewer reopens the network diagram: acceptance is refused and names the document
  const reopen = go([{ kind: 'REQUEST_CORRECTION', doc: 'network_diagram', comment: 'The control VLAN is not shown.', by: arch, at: at(-30) }]);
  const held = replay(D, ev, AT, docsAt(reopen)); assert.equal(held.signoff, 'TESTS_OPEN'); assert.deepEqual(held.blockers, [{ test: null, reason: 'document “Network diagram” has a correction requested' }]); assert.ok(held.open.some((b) => b.test === null));
  const r = attempt(D, ev, { kind: 'ACCEPT', by: sm, at: AT }, ALL, docsAt(reopen)); assert.ok('refused' in r && /stays held: 1 blocker stands \(document “Network diagram” has a correction requested\)/.test(r.refused), 'refused' in r ? r.refused : '');
  assert.equal(held.waivers.length, 0, 'there is no test to waive: a document is completed, not waived');
  // corrected, resubmitted, accepted: the room can be accepted
  let all: DocEvent[] = reopen; for (const s of [submit('network_diagram', 2, se, 1), { kind: 'ACCEPT', doc: 'network_diagram', revision: 2, by: qa, at: at(2) } as DocEvent]) { const x = attemptDoc(SET, all, s, C0, policy); assert.ok('events' in x, 'refused' in x ? x.refused : ''); if ('events' in x) all = x.events; }
  assert.equal(replay(D, ev, at(3), docsAt(all)).signoff, 'AWAITING_FIRST');
  const one = attempt(D, ev, { kind: 'ACCEPT', by: sm, at: at(3) }, ALL, docsAt(all)); assert.ok('events' in one);
  // a document reopened between the two approvals withdraws the first
  const later = [...all, { kind: 'REQUEST_CORRECTION', doc: 'rack_elevations', comment: 'Rack units do not add up.', by: arch, at: at(5) } as DocEvent];
  const mid = replay(D, (one as { events: DossierEvent[] }).events, at(6), docsAt(later)); assert.equal(mid.firstApproval, null); assert.equal(mid.signoff, 'TESTS_OPEN');
  // both approvals given while complete: a document changed afterwards is a new cycle, not a reopened acceptance
  const two = attempt(D, (one as { events: DossierEvent[] }).events, { kind: 'COUNTERSIGN', by: ops, at: at(4) }, ALL, docsAt(all)); assert.ok('events' in two, 'refused' in two ? two.refused : '');
  const closed = replay(D, (two as { events: DossierEvent[] }).events, at(9), docsAt(later)); assert.equal(closed.acceptance, 'ACCEPTED'); assert.deepEqual(closed.blockers, []);
  // garbage from an outside source cannot crash or unblock
  const junk = replay(D, ev, AT, () => [null, { test: 'T-SIM-001', reason: 7 }, { test: 'T-SIM-016', reason: 'pretends to be a test' }] as never); assert.deepEqual(junk.blockers, [{ test: null, reason: 'pretends to be a test' }]);
});
