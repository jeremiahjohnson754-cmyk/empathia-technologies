// The STI workflow (apps/demo/src/bench/sti.ts): readings recorded from a meter, compared with the PROJECT's policy; the intelligibility
// exception record and its refusals. The bench computes no STI and reproduces no standard.
//   ST-01  readings parse with their positions, values and conditions; bad rows and formula cells are refused with line numbers
//   ST-02  the verdict: meets the policy; below it (positions and mean named); too few positions give no verdict; mixed conditions,
//          repeated positions, uncalibrated meters and phone readings are flagged
//   ST-03  the exception: refused for life-safety, without a shortfall, on phone readings, without a reason or measures, beyond the short
//          positions, without a future expiry or beyond a year; approval never by the requester
//   node --test tests/unit/bench-sti.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sti-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/bench/sti.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const T = await import(pathToFileURL(out).href);
const D = { meter: 'SYN-STI-METER-01', chain: 'meter-calibrated', occupied: false, at: '2026-11-14T10:00:00Z' };
const meet = T.POLICY_PRESETS[0]; const va = T.POLICY_PRESETS[2];

test('ST-01 parsing', () => {
  const r = T.parseReadings('position,sti,occupied\nP1,0.64,no\nP2,0.58,no\n=HYPERLINK("x"),0.6,no\nP4,1.3,no\n,0.5,no\nP6,0.61,yes\n', D);
  assert.deepEqual(r.readings.map((x) => [x.position, x.sti, x.occupied]), [['P1', 0.64, false], ['P2', 0.58, false], ['P6', 0.61, true]]);
  assert.equal(r.errors.length, 3); assert.match(r.errors[0], /line 4: .*formula/); assert.match(r.errors[1], /line 5: STI “1.3”/); assert.match(r.errors[2], /line 6: no position/);
  assert.match(T.parseReadings('where,what\nx,y', D).errors[0], /no position or no sti/);
});

test('ST-02 the verdict against the project policy', () => {
  const rs = (vals, extra = {}) => vals.map((v, i) => ({ position: `P${i + 1}`, sti: v, ...D, ...extra }));
  assert.equal(T.evaluate(rs([0.64, 0.62, 0.6]), meet).verdict, 'MEETS_POLICY');
  const below = T.evaluate(rs([0.64, 0.52, 0.6]), meet); assert.equal(below.verdict, 'BELOW_POLICY'); assert.deepEqual(below.short, ['P2']); assert.match(below.why.join(), /below 0\.55: P2/);
  assert.match(T.evaluate(rs([0.6, 0.56, 0.58]), meet).why.join(), /mean 0\.58 is below 0\.60/);
  const few = T.evaluate(rs([0.7, 0.7]), meet); assert.equal(few.verdict, 'NO_VERDICT'); assert.match(few.why[0], /at least 3 positions; 2 measured/);
  const mixed = T.evaluate([...rs([0.64, 0.62]), { position: 'P3', sti: 0.6, ...D, occupied: true }], meet); assert.ok(mixed.flags.some((f) => /mix occupied/.test(f)));
  const phone = T.evaluate(rs([0.64, 0.62, 0.6], { chain: 'phone-app' }), meet); assert.ok(phone.indicative && phone.flags.some((f) => /indicative only/.test(f)));
  assert.ok(T.evaluate(rs([0.64, 0.62, 0.6], { chain: 'meter' }), meet).flags.some((f) => /calibration/.test(f)));
});

test('ST-03 the intelligibility exception record', () => {
  const rs = [0.64, 0.52, 0.61].map((v, i) => ({ position: `P${i + 1}`, sti: v, ...D })); const ev = T.evaluate(rs, meet);
  const base = { policy: meet.id, positions: ['P2'], reason: 'The seat behind the column is not used for presenting; it is a overflow seat.', measures: 'A lectern microphone is used for questions', expires: '2027-06-01', requestedBy: 'cxeng', at: D.at };
  assert.deepEqual(T.exceptionRefusal(base, meet, ev, D.at), []);
  assert.match(T.exceptionRefusal(base, va, T.evaluate(rs.concat({ position: 'P4', sti: 0.6, ...D }), va), D.at).join(), /life-safety/);
  assert.match(T.exceptionRefusal(base, meet, T.evaluate(rs.map((r) => ({ ...r, sti: 0.7 })), meet), D.at).join(), /no.*shortfall|none to carry/);
  assert.match(T.exceptionRefusal(base, meet, T.evaluate(rs.map((r) => ({ ...r, chain: 'phone-app' })), meet), D.at).join(), /indicative readings/);
  assert.match(T.exceptionRefusal({ ...base, reason: 'fine' }, meet, ev, D.at).join(), /reason says why/);
  assert.match(T.exceptionRefusal({ ...base, positions: ['P1', 'P2'] }, meet, ev, D.at).join(), /only those/);
  assert.match(T.exceptionRefusal({ ...base, expires: '2026-01-01' }, meet, ev, D.at).join(), /future/);
  assert.match(T.exceptionRefusal({ ...base, expires: '2028-06-01' }, meet, ev, D.at).join(), /at most a year/);
  const rec = { ...base, id: 'IX-1', approvedBy: null, approvedAt: null };
  assert.match(T.approvalRefusal(rec, 'cxeng').join(), /separation of duties/); assert.deepEqual(T.approvalRefusal(rec, 'syseng'), []);
  assert.match(T.approvalRefusal({ ...rec, approvedBy: 'syseng' }, 'architect').join(), /already approved/);
});
