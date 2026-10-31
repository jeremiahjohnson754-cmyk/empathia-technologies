import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SERVICE_STATES, SERVICE_TRANSITIONS, WORK_NEEDS, hardGates, candidates, preflight, serviceBlockers, type Staff } from '../src/index.js';

const today = '2026-10-31';
const staff = (over: Partial<Staff> = {}): Staff => ({ id: 'P-1', name: 'Tech One', internal: true, buildingKey: 'ATL', sites: ['ATL', 'NST'], skills: { 'SK-VID-1': { level: 'Working', n: 4 }, 'SK-SVC-1': { level: 'Advanced', n: 12 } }, certs: { 'cert.av_field': { expires: '2027-03-01' }, 'cert.video': { expires: '2027-01-01' } }, leave: null, capacity: { remaining: 24 }, ...over });
const wo = { workType: 'camera_replacement', scope: { roomId: 'R-1', buildingKey: 'ATL' }, window: { from: '2026-11-04T20:00', to: '2026-11-04T23:00' } };

test('the service machine is the demonstrator’s (10 states, 8 transitions + the reopened resume)', () => {
  assert.equal(SERVICE_STATES.length, 10); assert.equal(SERVICE_TRANSITIONS.length, 9);
});

test('hard gates: expired certification, missing experience, site access, leave, capacity, vendor agreement, exclusion — each named', () => {
  assert.deepEqual(hardGates(staff(), WORK_NEEDS['camera_replacement']!, wo, today).fails, []);
  assert.deepEqual(hardGates(staff({ certs: { 'cert.av_field': { expires: '2026-01-01' } } }), WORK_NEEDS['camera_replacement']!, wo, today).fails, ['Field service practitioner: expired 2026-01-01', 'Camera and framing: not held']);
  assert.deepEqual(hardGates(staff({ skills: {}, certs: { 'cert.av_field': { expires: '2027-01-01' }, 'cert.video': { expires: '2027-01-01' } } }), WORK_NEEDS['camera_replacement']!, wo, today).fails, [], 'a valid certification carries its minimum experience level');
  assert.deepEqual(hardGates(staff({ sites: ['HZN'], buildingKey: 'HZN' }), WORK_NEEDS['camera_replacement']!, wo, today).fails, ['site access: ATL not in approved sites (HZN)']);
  assert.deepEqual(hardGates(staff({ leave: { from: '2026-11-03', to: '2026-11-05' } }), WORK_NEEDS['camera_replacement']!, wo, today).fails, ['availability: on leave 2026-11-03 → 2026-11-05']);
  assert.deepEqual(hardGates(staff({ capacity: { remaining: 2 } }), WORK_NEEDS['camera_replacement']!, wo, today).fails, ['capacity: 2 h left this week']);
  assert.deepEqual(hardGates(staff({ internal: false, agreement: null }), WORK_NEEDS['camera_replacement']!, wo, today).fails, ['vendor: no support agreement on record']);
  assert.deepEqual(hardGates(staff({ internal: false, agreement: { id: 'SA-1', status: 'Active', buildings: ['ATL'], domains: ['audio'] } }), WORK_NEEDS['camera_replacement']!, wo, today).fails, ['vendor: agreement SA-1 covers audio, not video']);
  assert.deepEqual(hardGates(staff(), WORK_NEEDS['camera_replacement']!, { ...wo, excludeIds: ['P-1'] }, today).fails, ['excluded from this work (did the original work)']);
});

test('ranking happens only among the eligible and explains every point; no eligible person is said so', () => {
  const pool = [staff(), staff({ id: 'P-2', name: 'Tech Two', buildingKey: 'NST', capacity: { remaining: 8 }, pastInRoom: 2 }), staff({ id: 'P-3', name: 'Tech Three', capacity: { remaining: 1 } })];
  const c = candidates(pool, wo, today);
  assert.equal(c.eligible.length, 2); assert.equal(c.eligible[0]!.id, 'P-1'); assert.ok(c.eligible[0]!.reasons.includes('based in ATL'));
  assert.ok(c.eligible[1]!.reasons.includes('2 resolved job(s) in this room'));
  assert.equal(c.ineligible[0]!.id, 'P-3'); assert.equal(c.none, false);
  const none = candidates([staff({ capacity: { remaining: 0 } })], wo, today);
  assert.equal(none.none, true); assert.match(none.whyNone!, /capacity gates fail for everyone/);
});

test('dispatch preflight records every check; a booked room, stale stock, missing access, missing height permit, missing tools or withdrawn funding each block', () => {
  const base = { window: { from: '2026-11-04T20:00', to: '2026-11-04T23:00' }, bookings: [], parts: [{ part: 'camera unit', stock: { known: true, onHand: 2 } }], access: { confirmedBy: 'site champion' }, safety: { briefed: true, heightPermit: true }, tools: ['PTZ service kit'], toolsConfirmed: ['PTZ service kit'], needs: WORK_NEEDS['camera_replacement']!, approval: { ok: true, why: 'no further approval required' } };
  assert.equal(preflight(base).ok, true);
  const bad = preflight({ ...base, bookings: [{ from: '2026-11-04T21:00', to: '2026-11-04T22:00' }], parts: [{ part: 'camera unit', stock: { known: true, onHand: 0 } }, { part: 'bracket', stock: { known: false, onHand: 0 } }], access: null, safety: { briefed: true }, tools: ['PTZ service kit', 'lift'], toolsConfirmed: [], needs: WORK_NEEDS['new_install']!, approval: { ok: false, why: 'the project’s funding is withdrawn (SUSPENDED): field work is not authorized' } });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.checks.filter((c) => !c.ok).map((c) => c.id), ['booking', 'parts', 'access', 'safety', 'tools', 'approval']);
  assert.match(bad.checks[1]!.why, /camera unit: 0 on hand, 1 needed; bracket: not in the stock table/);
  assert.equal(bad.checks[3]!.why, 'working-at-height permit missing');
});

test('service guards: assignment needs an eligible technician; only the assignee accepts/starts/records; the verifier is never the technician; closure follows the customer policy; reopening needs a reason', () => {
  const f = { state: 'TRIAGED' as const, actorId: 'SM', technicianId: null, recorderIds: [], severity: 'High', roomId: 'R-1' };
  assert.deepEqual(serviceBlockers('ASSIGNED', f), ['no technician chosen']);
  assert.deepEqual(serviceBlockers('ASSIGNED', { ...f, technicianId: 'P-2', eligible: false }), ['the chosen technician fails a hard gate']);
  assert.deepEqual(serviceBlockers('ACCEPTED', { ...f, state: 'ASSIGNED', technicianId: 'P-1', actorId: 'P-2' }), ['the job is accepted by the technician it was assigned to']);
  assert.deepEqual(serviceBlockers('IN_PROGRESS', { ...f, state: 'ACCEPTED', technicianId: 'P-1', actorId: 'P-1', preflightOk: false }), ['dispatch preflight has a failed check']);
  assert.deepEqual(serviceBlockers('VERIFYING', { ...f, state: 'IN_PROGRESS', technicianId: 'P-1', actorId: 'P-1', evidence: 0 }), ['no field evidence recorded']);
  assert.deepEqual(serviceBlockers('RESOLVED', { ...f, state: 'VERIFYING', technicianId: 'P-1', actorId: 'P-1', recorderIds: ['P-1'] }), ['the verifier is never the technician (separation of duties)']);
  assert.deepEqual(serviceBlockers('RESOLVED', { ...f, state: 'VERIFYING', technicianId: 'P-1', actorId: 'CX', recorderIds: ['P-1'] }), []);
  assert.deepEqual(serviceBlockers('CLOSED', { ...f, state: 'RESOLVED', customerPolicy: { needsCustomerConfirmation: true, confirmed: false } }), ['the customer policy requires the requester’s confirmation before closure']);
  assert.deepEqual(serviceBlockers('REOPENED', { ...f, state: 'RESOLVED' }), ['a reopening names its reason (recurrence or failed verification)']);
  assert.equal(serviceBlockers('CLOSED', { ...f, state: 'OPEN' }).length, 1);
});
