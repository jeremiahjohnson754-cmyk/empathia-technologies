/** Positions, physical assets and installations (installations.ts, ADR-0012), the kind-aware reverification wording, and the acceptance
 *  gate that never counts a superseded result. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planInstall, planReplacement, planIdentity, identityOf, identityText, replacementsOf, substitutionUnits, reopenedBySubstitution, substitutionReason,
  reverificationBlockers, rerunTask, lifecycleBlockers, IDENTITY_TEST, type InstallationFact, type AssetFact, type PositionFact,
} from '../src/index.js';

const pos: PositionFact = { code: 'PA-0061', category: 'camera', label: 'Camera 1', model: 'generic' };
const inst = (o: Partial<InstallationFact>): InstallationFact => ({ id: 'i1', position: 'PA-0061', asset: 'AS-0002', installedAt: '2026-10-01T10:00:00.000Z', removedAt: null, basis: 'RECORDED', installReason: 'INITIAL', removalReason: null, installedBy: 'p-installer', removedBy: null, ...o });
const unit = (o: Partial<AssetFact> = {}): AssetFact => ({ code: 'AS-0042', category: 'camera', manufacturer: null, model: 'generic', serial: null, identityState: 'UNKNOWN', ...o });

test('install: only into an empty position, before commissioning, a unit of the designed model and category; never one installed elsewhere', () => {
  const ok = planInstall({ lifecycle: 'INSTALLATION_PENDING', position: pos, open: null, incoming: { create: { serial: 'SYN-SN-1' } } });
  assert.ok(ok.ok && ok.plan.identityState === 'DECLARED' && ok.plan.asset === null && ok.plan.model === 'generic');
  const unknown = planInstall({ lifecycle: 'INSTALLED_UNVERIFIED', position: pos, open: null, incoming: { create: {} } });
  assert.ok(unknown.ok && unknown.plan.identityState === 'UNKNOWN' && unknown.plan.serial === null, 'no serial: UNKNOWN, nothing invented');
  const occupied = planInstall({ lifecycle: 'INSTALLATION_PENDING', position: pos, open: inst({}), incoming: { create: {} } });
  assert.ok(!occupied.ok && occupied.conflict && /one unit per position/.test(occupied.why[0]!));
  const elsewhere = planInstall({ lifecycle: 'INSTALLATION_PENDING', position: pos, open: null, incoming: { existing: unit(), openElsewhere: inst({ position: 'PA-0070', asset: 'AS-0042' }) } });
  assert.ok(!elsewhere.ok && elsewhere.conflict && /occupies one position at a time/.test(elsewhere.why[0]!));
  const wrongCat = planInstall({ lifecycle: 'INSTALLATION_PENDING', position: pos, open: null, incoming: { existing: unit({ category: 'display' }), openElsewhere: null } });
  assert.ok(!wrongCat.ok && !wrongCat.conflict);
  const wrongModel = planInstall({ lifecycle: 'INSTALLATION_PENDING', position: pos, open: null, incoming: { existing: unit({ model: 'SYN-PTZ-12X' }), openElsewhere: null } });
  assert.ok(!wrongModel.ok && /design change/.test(wrongModel.why[0]!));
  for (const l of ['PLANNED', 'COMMISSIONING', 'ACCEPTED']) assert.ok(!planInstall({ lifecycle: l, position: pos, open: null, incoming: { create: {} } }).ok, l);
  assert.ok(!planInstall({ lifecycle: 'INSTALLATION_PENDING', position: { ...pos, furniture: true }, open: null, incoming: { create: {} } }).ok);
});

test('replacement: like for like (same model) or a substitution (another model, only while recommissioned); refusals: no current installation, a stale expected installation, a unit installed elsewhere, the same unit', () => {
  const open = inst({});
  const like = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: true, position: pos, open, expected: 'i1', incoming: { create: {} } });
  assert.ok(like.ok && like.plan.kind === 'REPLACEMENT' && like.plan.change === 'REPLACED' && !like.plan.designChange && like.plan.close.reason === 'REPLACED' && like.plan.open.installReason === 'REPLACEMENT');
  const sub = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: true, position: pos, open, model: 'SYN-PTZ-12X', incoming: { create: {} } });
  assert.ok(sub.ok && sub.plan.kind === 'SUBSTITUTION' && sub.plan.designChange && sub.plan.close.reason === 'SUBSTITUTED' && sub.plan.open.model === 'SYN-PTZ-12X');
  const firstCx = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: false, position: pos, open, model: 'SYN-PTZ-12X', incoming: { create: {} } });
  assert.ok(!firstCx.ok && /design change/.test(firstCx.why[0]!), 'a model change outside recommissioning is refused');
  const accepted = planReplacement({ lifecycle: 'ACCEPTED', recommissioning: false, position: pos, open, incoming: { create: {} } });
  assert.ok(!accepted.ok && /recommissioned first/.test(accepted.why[0]!));
  const none = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: true, position: pos, open: null, incoming: { create: {} } });
  assert.ok(!none.ok && !none.conflict && /no current installation/.test(none.why[0]!));
  const stale = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: true, position: pos, open, expected: 'i0', incoming: { create: {} } });
  assert.ok(!stale.ok && stale.conflict && /changed since it was read/.test(stale.why[0]!));
  const busy = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: true, position: pos, open, incoming: { existing: unit(), openElsewhere: inst({ id: 'i9', position: 'PA-0099', asset: 'AS-0042' }) } });
  assert.ok(!busy.ok && busy.conflict);
  const same = planReplacement({ lifecycle: 'COMMISSIONING', recommissioning: true, position: pos, open, incoming: { existing: unit({ code: 'AS-0002' }), openElsewhere: null } });
  assert.ok(!same.ok && /already the unit/.test(same.why[0]!));
});

test('identity: forward only, a serial to declare, evidence to observe or verify, an independent verifier, a final serial — and never a downgrade', () => {
  const a = unit();
  assert.ok(!planIdentity(a, 'UNKNOWN', { actor: 'p1', priorActors: [] }).ok);
  assert.ok(!planIdentity(a, 'DECLARED', { actor: 'p1', priorActors: [] }).ok, 'a declaration needs the serial');
  const d = planIdentity(a, 'DECLARED', { serial: 'SYN-SN-7', actor: 'p1', priorActors: [] }); assert.ok(d.ok && d.plan.from === 'UNKNOWN' && d.plan.to === 'DECLARED');
  const declared = unit({ serial: 'SYN-SN-7', identityState: 'DECLARED' });
  assert.ok(!planIdentity(declared, 'OBSERVED', { actor: 'p1', priorActors: ['p1'] }).ok, 'observation needs evidence');
  assert.ok(planIdentity(declared, 'OBSERVED', { evidence: 'ev-1', actor: 'p1', priorActors: ['p1'] }).ok);
  const sod = planIdentity(declared, 'VERIFIED', { evidence: 'ev-1', actor: 'p1', priorActors: ['p1'] }); assert.ok(!sod.ok && /separation of duties/.test(sod.why[0]!));
  assert.ok(planIdentity(declared, 'VERIFIED', { evidence: 'ev-1', actor: 'p2', priorActors: ['p1'] }).ok);
  assert.ok(!planIdentity(declared, 'VERIFIED', { evidence: 'ev-1', serial: 'SYN-SN-8', actor: 'p2', priorActors: ['p1'] }).ok, 'a different serial is a different unit');
  const verified = unit({ serial: 'SYN-SN-7', identityState: 'VERIFIED' });
  for (const to of ['DECLARED', 'OBSERVED', 'VERIFIED']) { const r = planIdentity(verified, to, { serial: 'SYN-SN-7', evidence: 'ev', actor: 'p3', priorActors: [] }); assert.ok(!r.ok && /never downgraded/.test(r.why[0]!), to); }
});

test('one reading of a device: position · unit · identity, the same words everywhere', () => {
  const facts = [inst({ removedAt: '2026-10-20T00:00:00.000Z', removalReason: 'REPLACED' }), inst({ id: 'i2', asset: 'AS-0009', installedAt: '2026-10-20T00:00:00.000Z', installReason: 'REPLACEMENT' })];
  const d = identityOf('PA-0061', facts, new Map([['AS-0009', unit({ code: 'AS-0009', serial: 'SYN-SN-9', identityState: 'DECLARED' })]]));
  assert.deepEqual(d, { position: 'PA-0061', asset: 'AS-0009', identityState: 'DECLARED' });
  assert.equal(identityText(d), 'PA-0061 · unit AS-0009 · identity DECLARED');
  assert.equal(identityText(identityOf('PA-0070', facts, new Map())), 'PA-0070 · no unit installed');
  const rep = replacementsOf([pos], facts);
  assert.equal(rep.length, 1); assert.deepEqual([rep[0]!.kind, rep[0]!.fromAsset, rep[0]!.toAsset, rep[0]!.from, rep[0]!.to, rep[0]!.model], ['REPLACED', 'AS-0002', 'AS-0009', 'AS-0002', 'AS-0009', 'generic']);
  assert.deepEqual(replacementsOf([pos], facts, Date.parse('2026-10-21T00:00:00Z')), [], 'only after the window opened');
  const subFacts = [inst({ removedAt: '2026-10-20T00:00:00.000Z', removalReason: 'SUBSTITUTED' }), inst({ id: 'i3', asset: 'AS-0010', installedAt: '2026-10-20T00:00:00.000Z', installReason: 'SUBSTITUTION' })];
  assert.deepEqual(substitutionUnits('PA-0061', Date.parse('2026-10-20T00:00:00.050Z'), subFacts), { fromAsset: 'AS-0002', toAsset: 'AS-0010' });
});

test('the reverification wording distinguishes “replaced by another unit of the same model” from “substituted by a different model”; the substitution wording is unchanged', () => {
  const rows = [{ testId: 'camera_preset', domain: 'Video', devices: ['PA-0061'] }, { testId: IDENTITY_TEST, domain: 'Physical', devices: [] }];
  const sub = { assetId: 'PA-0061', label: 'Camera 1', category: 'camera', from: 'generic', to: 'SYN-PTZ-12X (synthetic PTZ camera)' };
  const rep = { ...sub, from: 'AS-0002', to: 'AS-0009', kind: 'REPLACED' as const, model: 'generic' };
  assert.deepEqual(reopenedBySubstitution(rows, [sub]).map((t) => t.reasons[0]), [
    'Camera 1 (PA-0061) was substituted after acceptance (generic → SYN-PTZ-12X (synthetic PTZ camera)): the plan names it among the devices this test covers',
    'Camera 1 (PA-0061) was substituted after acceptance (generic → SYN-PTZ-12X (synthetic PTZ camera)): the asset identity is checked again after every substitution']);
  assert.deepEqual(reopenedBySubstitution(rows, [{ ...sub, kind: 'SUBSTITUTED' as const }]).map((t) => t.reasons[0]), reopenedBySubstitution(rows, [sub]).map((t) => t.reasons[0]), 'an explicit SUBSTITUTED is the default wording, byte for byte');
  assert.deepEqual(reopenedBySubstitution(rows, [rep]).map((t) => t.reasons[0]), [
    'Camera 1 (PA-0061) was replaced by another unit of the same model (AS-0002 → AS-0009, both generic): the plan names it among the devices this test covers',
    'Camera 1 (PA-0061) was replaced by another unit of the same model (AS-0002 → AS-0009, both generic): the asset identity is checked again after every change of unit']);
  assert.equal(substitutionReason({ testId: 'video_av_sync', domain: 'Video' }, rep), 'it is a camera and this is a Video test of the room', 'the same triggers for either kind');
  assert.equal(rerunTask(['REPLACED']), 're-run on the new unit (a result recorded on the previous unit no longer counts)');
  assert.equal(rerunTask(), 're-run on the substituted design (a result recorded before the substitution no longer counts)');
});

test('reverification blockers (one sentence for the API and the demonstration): to re-run, and re-run but not yet verified by a different person', () => {
  const rv = [{ testId: 'a', rerun: true, result: 'PASS_VERIFIED' }, { testId: 'b', rerun: false, result: 'PASS_UNVERIFIED' }, { testId: 'c', rerun: false, result: 'PASS_VERIFIED' }];
  assert.deepEqual(reverificationBlockers(rv), ['1 test(s) were last recorded before the substitution and must be re-run on the changed design and verified independently: a', '1 reopened test(s) were re-run after the substitution and are not yet passed and verified by a different person: b (PASS_UNVERIFIED)']);
  assert.deepEqual(reverificationBlockers(rv, ['REPLACED']), ['1 test(s) were last recorded on the previous unit and must be re-run on the new unit and verified independently: a', '1 reopened test(s) were re-run on the new unit and are not yet passed and verified by a different person: b (PASS_UNVERIFIED)']);
  assert.match(reverificationBlockers(rv, ['REPLACED', 'SUBSTITUTED'])[0]!, /before the change of device and must be re-run on the changed installation/);
  assert.deepEqual(reverificationBlockers([{ testId: 'c', rerun: false, result: 'PASS_VERIFIED' }]), [], 're-run and verified: nothing left');
});

test('the acceptance gate never counts a superseded PASS_VERIFIED — even without the specific blocker, and with the accurate count', () => {
  const rows = ['t1', 't2', 't3', 't4'].map((id) => ({ id, applicable: true, result: 'PASS_VERIFIED' })) as never[];
  const results = Object.fromEntries(['t1', 't2', 't3', 't4'].map((id) => [id, { state: 'PASS', by: 'rec', verified: { by: 'ver' }, evidence: { kind: 'X', ref: 'e' } }])) as never;
  const f = { from: 'COMMISSIONING', to: 'ACCEPTED' as const, classificationApproved: true, openIssues: [], savedRevisions: 1, rows, results, hasBaseline: true, hasLiveMonitoringEvidence: false };
  assert.deepEqual(lifecycleBlockers(f), [], 'without a change of unit, four PASS_VERIFIED accept');
  // two results recorded on the previous unit: their PASS_VERIFIED no longer counts
  const sup = lifecycleBlockers({ ...f, reverification: [{ testId: 't1', rerun: true, result: 'PASS_VERIFIED' }, { testId: 't2', rerun: true, result: 'PASS_VERIFIED' }] });
  assert.deepEqual(sup, ['2 test(s) were last recorded before the substitution and must be re-run on the changed design and verified independently: t1, t2 — acceptance counts 2 of 4 applicable tests as passed and independently verified; the 2 earlier result(s) no longer count']);
  // with another gap as well, the general count names the superseded results apart
  const both = lifecycleBlockers({ ...f, rows: rows.map((r: { id: string }) => (r.id === 't4' ? { id: 't4', applicable: true, result: 'NOT_TESTED' } : r)) as never, results: { ...(results as object), t4: undefined } as never, reverification: [{ testId: 't1', rerun: true, result: 'PASS_VERIFIED' }], changeKinds: ['REPLACED'] });
  assert.deepEqual(both, ['acceptance needs every applicable test executed, passed and independently verified with evidence: 2 of 4 passed and independently verified (2 recorded: 0 passed awaiting verification, 0 failed; 1 not tested; 1 recorded before a change of device and no longer counted)', '1 test(s) were last recorded on the previous unit and must be re-run on the new unit and verified independently: t1']);
  // a test reopened and re-run, not yet verified: counted as recorded, never as verified
  const rerun = lifecycleBlockers({ ...f, rows: rows.map((r: { id: string }) => (r.id === 't1' ? { id: 't1', applicable: true, result: 'PASS_UNVERIFIED' } : r)) as never, results: { ...(results as object), t1: { state: 'PASS', by: 'rec2', verified: null, evidence: { kind: 'X', ref: 'e2' } } } as never, reverification: [{ testId: 't1', rerun: false, result: 'PASS_UNVERIFIED' }] });
  assert.equal(rerun.length, 2); assert.match(rerun[0]!, /3 of 4 passed and independently verified \(4 recorded: 1 passed awaiting verification/); assert.match(rerun[1]!, /re-run after the substitution and are not yet passed and verified by a different person: t1 \(PASS_UNVERIFIED\)/);
});
