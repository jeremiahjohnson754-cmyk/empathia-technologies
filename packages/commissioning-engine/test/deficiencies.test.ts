/** The deficiency state machine (deficiencies.ts): every transition, every refusal, separation of duties, and what blocks acceptance. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDeficiency, step, stepsFrom, due, blocksAcceptance, type Deficiency, type DeficiencyAction } from '../src/index.js';

const T = '2026-11-14T10:00:00.000Z';
const base = (o: Partial<Deficiency> = {}): Deficiency => ({ ...newDeficiency({ id: 'DF-1', title: 'Far-end hears echo', severity: 'Medium', waivable: true, openedAt: '2026-11-01T09:00:00.000Z', by: 'cxeng' }), ...o });
const go = (d: Deficiency, a: DeficiencyAction, by: string) => { const r = step(d, a, by, T); assert.ok(r.ok, r.ok ? '' : r.why.join('; ')); return r.next; };
const no = (d: Deficiency, a: DeficiencyAction, by: string, re: RegExp) => { const r = step(d, a, by, T); assert.ok(!r.ok && r.why.some((w) => re.test(w)), r.ok ? `allowed ${a.kind}` : r.why.join('; ')); };

test('the happy path: open → in progress → pending retest → (retest PASS) → closed by a third person; history grows on every step', () => {
  let d = go(base(), { kind: 'start', owner: 'installer', targetDate: '2026-11-20' }, 'cxlead');
  d = go(d, { kind: 'fixed', rootCause: 'CONFIGURATION', action: 'AEC reference re-routed to the far-end output' }, 'installer');
  d = go(d, { kind: 'retest', result: 'PASS', evidence: 'EV-0042' }, 'cxeng');
  assert.equal(d.state, 'PENDING_RETEST');
  d = go(d, { kind: 'verify' }, 'syseng');
  assert.equal(d.state, 'CLOSED'); assert.equal(d.closedBy, 'syseng'); assert.deepEqual(d.history.map((h) => h.to), ['OPEN', 'IN_PROGRESS', 'PENDING_RETEST', 'PENDING_RETEST', 'CLOSED']);
  assert.ok(!blocksAcceptance(d));
});

test('separation of duties: the fixer does not verify; the retest recorder does not verify; a failed retest returns to the owner', () => {
  let d = go(go(base(), { kind: 'start', owner: 'installer', targetDate: '2026-11-20' }, 'cxlead'), { kind: 'fixed', rootCause: 'INSTALLATION', action: 'Re-terminated the microphone cable at the DSP' }, 'installer');
  no(d, { kind: 'verify' }, 'cxeng', /passing retest is recorded first/);
  const failed = go(d, { kind: 'retest', result: 'FAIL', evidence: 'EV-0043' }, 'cxeng'); assert.equal(failed.state, 'IN_PROGRESS');
  d = go(d, { kind: 'retest', result: 'PASS', evidence: 'EV-0044' }, 'cxeng');
  no(d, { kind: 'verify' }, 'installer', /fixed it does not verify/);
  no(d, { kind: 'verify' }, 'cxeng', /recorded the retest does not verify/);
});

test('refusals with reasons: no step outside the machine; a target date in the past; a corrective action without words; a retest without evidence', () => {
  no(base(), { kind: 'verify' }, 'x', /not a step from OPEN/);
  no(base(), { kind: 'start', owner: 'installer', targetDate: '2026-10-01' }, 'cxlead', /not in the past/);
  no(base(), { kind: 'start', owner: ' ', targetDate: 'soon' }, 'cxlead', /owner is named/);
  const ip = go(base(), { kind: 'start', owner: 'installer', targetDate: '2026-11-20' }, 'cxlead');
  no(ip, { kind: 'fixed', rootCause: 'CONFIGURATION', action: 'done' }, 'installer', /says what was done/);
  const pr = go(ip, { kind: 'fixed', rootCause: 'CONFIGURATION', action: 'Matrix crosspoint corrected' }, 'installer');
  no(pr, { kind: 'retest', result: 'PASS', evidence: ' ' }, 'cxeng', /rests on evidence/);
  assert.deepEqual(stepsFrom('CLOSED'), ['reopen']); assert.deepEqual(stepsFrom('ACCEPTED_EXCEPTION'), []);
});

test('exceptions: never for a rule not open to exception; never approved by the requester; an accepted exception does not block acceptance', () => {
  no(base({ waivable: false }), { kind: 'except', exceptionId: 'EX-7', requestedBy: 'cxeng' }, 'architect', /not open to exception/);
  no(base(), { kind: 'except', exceptionId: 'EX-7', requestedBy: 'cxeng' }, 'cxeng', /requester does not approve/);
  const d = go(base(), { kind: 'except', exceptionId: 'EX-7', requestedBy: 'cxeng' }, 'architect');
  assert.equal(d.state, 'ACCEPTED_EXCEPTION'); assert.ok(!blocksAcceptance(d));
});

test('deferrals: a reason and a future date; not approved by the owner; a High deficiency is not deferred past acceptance; due() resumes it', () => {
  const ip = go(base({ severity: 'High' }), { kind: 'start', owner: 'installer', targetDate: '2026-11-20' }, 'cxlead');
  no(ip, { kind: 'defer', reason: 'Waiting for the replacement camera', until: '2026-12-01', acceptanceDue: true }, 'cxlead', /not deferred past acceptance/);
  no(ip, { kind: 'defer', reason: 'Waiting for the replacement camera', until: '2026-11-01', acceptanceDue: false }, 'cxlead', /date in the future/);
  no(ip, { kind: 'defer', reason: 'Waiting for the replacement camera', until: '2026-12-01', acceptanceDue: false }, 'installer', /owner does not approve/);
  const d = go(ip, { kind: 'defer', reason: 'Waiting for the replacement camera', until: '2026-12-01', acceptanceDue: false }, 'cxlead');
  assert.equal(d.state, 'DEFERRED'); assert.ok(blocksAcceptance(d), 'a deferred High still blocks acceptance');
  assert.equal(due(d, '2026-11-30').resume, false); assert.equal(due(d, '2026-12-01').resume, true);
  assert.equal(go(d, { kind: 'resume', reason: 'the camera arrived' }, 'cxlead').state, 'OPEN');
});

test('age and lateness; a closed deficiency reopens only with what regressed', () => {
  const ip = go(base(), { kind: 'start', owner: 'installer', targetDate: '2026-11-20' }, 'cxlead');
  assert.deepEqual(due(ip, '2026-11-21'), { resume: false, late: true, ageDays: 20 });
  assert.equal(due(ip, '2026-11-20').late, false);
  let d = go(go(ip, { kind: 'fixed', rootCause: 'FIRMWARE', action: 'Codec firmware rolled back to the approved version' }, 'installer'), { kind: 'retest', result: 'PASS', evidence: 'EV-1' }, 'cxeng');
  d = go(d, { kind: 'verify' }, 'syseng');
  no(d, { kind: 'reopen', reason: 'again' }, 'svcmgr', /says what regressed/);
  const r = go(d, { kind: 'reopen', reason: 'Echo returned after the codec update on 3 Dec' }, 'svcmgr');
  assert.equal(r.state, 'OPEN'); assert.equal(r.retest, null); assert.ok(blocksAcceptance(r)); assert.ok(r.history.length > d.history.length, 'history only grows');
});
