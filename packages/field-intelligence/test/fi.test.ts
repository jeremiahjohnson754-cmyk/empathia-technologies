import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FI13, FIPV, composePlan, createSession, eligibility, preflight, dryRun, authorize, arm, run, estop, isRefusal, type Session, type Actor } from '../src/index.js';

const devices = [{ id: 'A-1', name: 'Ceiling microphone', category: 'micceil' }, { id: 'A-2', name: 'Loudspeaker left', category: 'speaker' }, { id: 'A-3', name: 'Audio processor', category: 'dsp' }, { id: 'A-4', name: 'Touch panel', category: 'touch', claimsObserved: true }, { id: 'A-5', name: 'Video bar', category: 'bar' }];

test('v1.3: the plan is PLAN_ONLY — capabilities DECLARED or UNKNOWN, a claimed OBSERVED is downgraded, pairs NOT_TESTED with null measurements, monitoring NOT_RUN', () => {
  const p = composePlan(devices);
  assert.equal(p.State, 'PLAN_ONLY'); assert.equal(p.ScriptVersion, FI13.scriptVersion); assert.equal(p.Devices.length, 5);
  assert.equal(p.Devices[0]!.Capabilities['AudioCapture'], 'DECLARED'); assert.equal(p.Devices[0]!.Capabilities['CalibratedSPL'], 'UNKNOWN');
  assert.match(p.Devices[3]!.ClaimDowngraded!, /never trusts a claim of observation/);
  assert.equal(p.AudioPairs.length, 1); assert.equal(p.AudioPairs[0]!.Status, 'NOT_TESTED'); assert.equal(p.AudioPairs[0]!.MeasuredSPL, null);
  assert.equal(p.Monitoring.ObservationState, 'NOT_RUN'); assert.equal(p.Monitoring.CollectionIntervalMinutes, 15);
  assert.ok(p.Monitoring.AllowedTargets.find((t) => t.AssetId === 'A-4')!.IcmpRequired, 'the touch panel is ICMP-required and CRITICAL');
  for (const d of p.Devices) { assert.equal(d.HardwareTested, false); for (const pr of d.Procedures) assert.equal(pr.Executed, false); }
  assert.equal(FI13.exitCodes[5], 'plan INCOMPLETE (a declaration failed validation)');
});

const now = '2026-10-31T10:00:00.000Z';
const actor = (persona: string, auth: string[]): Actor => ({ persona, now, can: (a) => ([] as string[]).concat(a).some((x) => auth.includes(x)) });
const syseng = actor('syseng', ['protocol.approve', 'plan.compile', 'test.verify']); const ops = actor('opslead', ['window.approve']); const tech = actor('service', ['work.accept', 'work.evidence']); const cx = actor('cxeng', ['tests.verify.all', 'test.verify', 'fipv.review']);
const fresh = () => createSession('FIS-1', 'R-1', 'BRD', [{ id: 'TP-1', label: 'seat 1' }, { id: 'TP-2', label: 'seat 4' }], [{ id: 'LAEQ', label: 'LAeq at seats', adapter: 'ADP-SLM' }, { id: 'CAM-FOV', label: 'Camera FOV scan', adapter: 'ADP-CAM' }], syseng);
const S = (r: unknown): Session => { if (isRefusal(r)) throw new Error(r.why.join('; ')); return ('session' in (r as object) ? (r as { session: Session }).session : r) as Session; };

test('v1.4: a licence opens requests (not proofs); without it the session ends NOT_LICENSED; with it, tests on NOT_CONFIGURED adapters are marked and the rest are eligible', () => {
  assert.equal(S(eligibility(fresh(), syseng, false)).state, 'NOT_LICENSED');
  const s = S(eligibility(fresh(), syseng, true));
  assert.equal(s.state, 'SAFETY_PREFLIGHT'); assert.deepEqual(s.eligibility!.eligibleTests, ['LAEQ']); assert.deepEqual(s.eligibility!.notConfigured, ['CAM-FOV']);
  const none = createSession('FIS-2', 'R-1', 'BRD', [], [{ id: 'CAM-FOV', label: 'x', adapter: 'ADP-CAM' }], syseng);
  assert.equal(S(eligibility(none, syseng, true)).state, 'NOT_SUPPORTED');
  assert.ok(isRefusal(eligibility(fresh(), tech, true)), 'a technician cannot check eligibility');
});

test('the safety preflight: five approvals by different authorities; occupied window, past calibration, absent operator and unverified E-stop each end the session; the list of what is missing is explicit', () => {
  let s = S(eligibility(fresh(), syseng, true));
  assert.ok(isRefusal(preflight(s, tech, { step: 'protocol', levelLimit: 85 })), 'only protocol.approve approves the protocol');
  assert.ok(isRefusal(preflight(s, syseng, { step: 'protocol', levelLimit: 0 })), 'no universal safe volume: a limit is required');
  let r = preflight(s, syseng, { step: 'protocol', levelLimit: 85 }); assert.deepEqual((r as { missing: string[] }).missing, ['maintenance window', 'operator consent', 'instrument calibration', 'emergency stop verification']); s = S(r);
  assert.equal(S(preflight(s, ops, { step: 'window', occupied: true, privacyNotice: true })).state, 'OCCUPIED');
  s = S(preflight(s, ops, { step: 'window', occupied: false, privacyNotice: true }));
  assert.equal(S(preflight(s, tech, { step: 'operator', present: false, qualified: true })).state, 'AWAITING_CONSENT');
  s = S(preflight(s, tech, { step: 'operator', present: true, qualified: true, mfa: true })); assert.equal(s.safety.localOperator, 'service');
  assert.equal(S(preflight(s, tech, { step: 'instrument', instrument: { model: 'SLM class 1', serial: 'SLM-9', calibrationId: 'CAL-1', calibrationDue: '2026-01-01' } })).state, 'OUT_OF_CALIBRATION');
  s = S(preflight(s, tech, { step: 'instrument', instrument: { model: 'SLM class 1', serial: 'SLM-9', calibrationId: 'CAL-1', calibrationDue: '2027-01-01' } }));
  assert.equal(S(preflight(s, tech, { step: 'estop', verified: false })).state, 'PRECONDITION_FAILED');
  s = S(preflight(s, tech, { step: 'estop', verified: true })); assert.equal(s.state, 'DRY_RUN');
});

test('dry run emits nothing; the commissioning lead authorizes; only the consenting operator arms, with two confirmations, as a labelled simulation; a real build would be NOT_CONFIGURED', () => {
  let s = S(eligibility(fresh(), syseng, true));
  s = S(preflight(s, syseng, { step: 'protocol', levelLimit: 85 })); s = S(preflight(s, ops, { step: 'window', occupied: false, privacyNotice: true })); s = S(preflight(s, tech, { step: 'operator', present: true, qualified: true })); s = S(preflight(s, tech, { step: 'instrument', instrument: { model: 'm', serial: 's', calibrationId: 'c', calibrationDue: '2027-01-01' } })); s = S(preflight(s, tech, { step: 'estop', verified: true }));
  s = S(dryRun(s, tech)); assert.equal(s.state, 'APPROVAL_PENDING'); assert.equal(s.dryRun!.output, 'none (dry run emits nothing)'); assert.equal(s.dryRun!.preview.length, 2);
  assert.ok(isRefusal(arm(s, tech, true, true)), 'not before authorization');
  assert.ok(isRefusal(authorize(s, tech, true)), 'a technician cannot authorize');
  s = S(authorize(s, cx, true));
  assert.ok(isRefusal(arm(s, cx, true, true)), 'the commissioning lead is not the consenting operator');
  assert.ok(isRefusal(arm(s, tech, true, false)), 'two confirmations');
  assert.equal(S(arm(s, tech, true, true, false)).state, 'NOT_CONFIGURED', 'outside demonstration mode a real session cannot be armed');
  s = S(arm(s, tech, true, true)); assert.equal(s.state, 'ARMED'); assert.equal(s.simulated, true);
  // the run: point by point, with the scripted abnormal branches and the E-stop
  let r1 = S(run(s, tech)); assert.equal(r1.state, 'RUNNING'); assert.equal(r1.results.length, 1); assert.equal(r1.results[0]!.value, null);
  const r2 = S(run(r1, tech)); assert.equal(r2.state, 'ACQUIRED'); assert.equal(r2.restore, 'verified (simulated)');
  assert.equal(S(run(S(run(s, tech)), tech, 'excessive_level')).state, 'ABORTED');
  assert.match(S(run(S(run(s, tech)), tech, 'excessive_level')).exits[0]!.why, /85 dB\(A\)/);
  assert.equal(S(run(S(run(s, tech)), tech, 'occupied')).state, 'OCCUPIED');
  assert.equal(S(run(S(run(s, tech)), tech, 'failing_test')).results.find((x) => x.test === 'STIPA')!.outcome, 'FAIL');
  const e = S(estop(S(run(s, tech)), tech)); assert.equal(e.state, 'ABORTED'); assert.equal(e.terminal, true); assert.match(e.restore!, /restore requested/);
  assert.ok(isRefusal(estop(e, tech)));
  assert.equal(FIPV.adapters.filter((a) => a.tier === 'NOT_CONFIGURED').length, 3);
});
