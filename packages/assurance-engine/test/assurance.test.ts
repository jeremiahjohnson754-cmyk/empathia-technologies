import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, layoutDiff, worse, angDiff, MOVE_M, TURN_DEG, PRESET_DEG, DIMENSIONS, isOff, type Baseline, type Current } from '../src/index.js';

const base: Baseline = {
  id: 'B-1', version: 1, signedAt: '2026-09-01T00:00:00Z', signedBy: 'qa', capacity: 8, configSignature: 'cfg-0a1b2', documents: ['design summary', 'as-built drawing', 'commissioning report'],
  devices: [{ id: 'PA-1', category: 'display' }, { id: 'PA-2', category: 'camera' }, { id: 'PA-3', category: 'micceil' }, { id: 'PA-4', category: 'touch' }],
  layout: { seats: 8, objs: [{ id: 'T1', kind: 'table', x: 2, y: 3 }, { id: 'PA-1', kind: 'display', x: 2, y: 0 }, { id: 'C1', kind: 'camera', x: 2, y: 0.1, presets: [{ name: 'Room', aim: 0 }] }] },
};
const cur = (o: Partial<Current> = {}): Current => ({ now: '2026-10-20T00:00:00Z', devices: base.devices.map((d) => ({ ...d })), ...o });

test('the 17 dimensions and the status vocabulary are the demonstrator’s', () => {
  assert.equal(DIMENSIONS.length, 17);
  assert.equal(worse('match', 'drift', 'fail'), 'fail');
  assert.equal(worse('match', 'drift'), 'drift');
  assert.equal(worse('match'), 'match');
  assert.ok(isOff('drift') && isOff('fail') && !isOff('observed') && !isOff('unknown'));
});

test('no evidence means not assessed, never “matches baseline”', () => {
  const a = assess(base, cur());
  const st = Object.fromEntries(a.rows.map((r) => [r.k, r.status]));
  for (const k of ['presence', 'firmware', 'configuration', 'camera', 'audio', 'display', 'control', 'spatial', 'purpose', 'environment', 'experience']) assert.equal(st[k], 'unknown', k);
  assert.equal(st['scheduling'], 'na', 'no scheduler in the room');
  assert.equal(a.worst, 'match');
  assert.equal(a.remedy, null);
  assert.ok(a.coverage.assessed < a.coverage.applicable);
  assert.ok(a.rows.filter((r) => r.status === 'unknown').every((r) => r.ev === 'UNKNOWN'));
});

test('layoutDiff thresholds: moved beyond 0.12 m or 3°, presets beyond 1.5°, chairs counted not listed', () => {
  const A = { objs: [{ id: 'T1', kind: 'table', x: 0, y: 0, rot: 0 }, { id: 'S1', kind: 'chair', x: 1, y: 1 }, { id: 'C', kind: 'camera', x: 0, y: 0, presets: [{ name: 'p', aim: 10 }] }] };
  const just = layoutDiff(A, { objs: [{ id: 'T1', kind: 'table', x: MOVE_M - 0.01, y: 0, rot: TURN_DEG - 0.1 }, { id: 'S1', kind: 'chair', x: 1, y: 1 }, { id: 'C', kind: 'camera', x: 0, y: 0, presets: [{ name: 'p', aim: 10 + PRESET_DEG - 0.1 }] }] });
  assert.equal(just.moved.length, 0); assert.equal(just.presets.length, 0);
  const over = layoutDiff(A, { objs: [{ id: 'T1', kind: 'table', x: MOVE_M + 0.01, y: 0 }, { id: 'S1', kind: 'chair', x: 2, y: 1 }, { id: 'S2', kind: 'chair', x: 3, y: 1 }, { id: 'C', kind: 'camera', x: 0, y: 0, presets: [{ name: 'p', aim: 10 + PRESET_DEG + 0.2 }] }] });
  assert.equal(over.moved.length, 1); assert.equal(over.seatsMoved, 1); assert.equal(over.added.length, 0, 'a new chair is not listed'); assert.equal(over.presets.length, 1);
  const turned = layoutDiff(A, { objs: [{ id: 'T1', kind: 'table', x: 0, y: 0, rot: TURN_DEG + 0.5 }] });
  assert.equal(turned.moved.length, 1); assert.equal(turned.removed.length, 1, 'the camera is gone; the chair is not listed');
  assert.equal(angDiff(359, 1), 2);
});

test('an offline device fails presence; minor remediation; the fix is a proposal needing baseline.approve', () => {
  const a = assess(base, cur({ devices: base.devices.map((d) => ({ ...d, state: d.id === 'PA-2' ? 'Offline' : 'Online' })) }));
  const p = a.rows.find((r) => r.k === 'presence')!;
  assert.equal(p.status, 'fail'); assert.equal(p.type, 'DEVICE'); assert.equal(p.ev, 'MEASURED');
  assert.equal(a.rows.find((r) => r.k === 'camera')!.status, 'fail');
  assert.equal(a.worst, 'fail'); assert.equal(a.remedy, 'minor');
  assert.deepEqual([p.fix?.requiresApproval, p.fix?.approverAuthority], [true, 'baseline.approve']);
});

test('an offline device past support calls for replacement', () => {
  const a = assess(base, cur({ devices: base.devices.map((d) => ({ ...d, state: d.id === 'PA-2' ? 'Offline' : 'Online', supportEnded: d.id === 'PA-2' })) }));
  assert.equal(a.remedy, 'replace');
});

test('a device on the register that the baseline does not hold is device drift (recommission)', () => {
  const a = assess(base, cur({ devices: [...base.devices, { id: 'PA-9', category: 'display' }] }));
  const p = a.rows.find((r) => r.k === 'presence')!;
  assert.equal(p.status, 'drift'); assert.equal(p.ev, 'INFERRED'); assert.equal(a.remedy, 'minor', 'DEVICE findings are minor remediation');
});

test('firmware: not validated is drift; behind the baseline is a gap, not drift', () => {
  const drift = assess(base, cur({ devices: base.devices.map((d) => ({ ...d, fwState: d.id === 'PA-1' ? 'Not validated' : 'Validated', firmware: '2.1', fwBaseline: '2.0' })) }));
  const f = drift.rows.find((r) => r.k === 'firmware')!;
  assert.equal(f.status, 'drift'); assert.equal(f.type, 'FIRMWARE'); assert.equal(drift.remedy, 'recommission');
  const gap = assess(base, cur({ devices: base.devices.map((d) => ({ ...d, fwState: d.id === 'PA-1' ? 'Behind baseline' : 'Validated' })) }));
  const g = gap.rows.find((r) => r.k === 'firmware')!;
  assert.equal(g.status, 'match'); assert.match(g.gap, /has not drifted/); assert.equal(gap.counts.gap, 1); assert.equal(gap.remedy, null);
});

test('configuration signature: unchanged matches, changed is drift', () => {
  assert.equal(assess(base, cur({ configSignature: 'cfg-0a1b2' })).rows.find((r) => r.k === 'configuration')!.status, 'match');
  assert.equal(assess(base, cur({ configSignature: 'cfg-99999' })).rows.find((r) => r.k === 'configuration')!.status, 'drift');
});

test('purpose drift above 115 % of capacity calls for redesign; at 115 % it does not', () => {
  assert.equal(assess(base, cur({ seats: 9 })).rows.find((r) => r.k === 'purpose')!.status, 'match', '9.0 ≤ 9.2');
  const a = assess(base, cur({ seats: 10 }));
  assert.equal(a.rows.find((r) => r.k === 'purpose')!.status, 'drift'); assert.equal(a.remedy, 'redesign');
});

test('spatial drift from a survey; without a survey it is not assessed', () => {
  const moved = { seats: 8, objs: [{ id: 'T1', kind: 'table', x: 2.5, y: 3 }, { id: 'PA-1', kind: 'display', x: 2, y: 0 }, { id: 'C1', kind: 'camera', x: 2, y: 0.1, presets: [{ name: 'Room', aim: 0 }] }] };
  const a = assess(base, cur({ layout: moved }));
  const s = a.rows.find((r) => r.k === 'spatial')!;
  assert.equal(s.status, 'drift'); assert.match(s.current, /1 object moved \(up to 0\.5 m\)/); assert.deepEqual(s.ids, ['T1']);
  assert.equal(a.remedy, 'recommission');
});

test('environment: drift above 26 °C or 1,000 ppm; a noisy baseline is a gap; no sensor is unknown', () => {
  assert.equal(assess(base, cur({ environment: { tempC: 26, co2: 1000 } })).rows.find((r) => r.k === 'environment')!.status, 'match');
  assert.equal(assess(base, cur({ environment: { tempC: 26.5, co2: 600 } })).rows.find((r) => r.k === 'environment')!.status, 'drift');
  assert.equal(assess(base, cur({ environment: { tempC: 22, co2: 1100 } })).rows.find((r) => r.k === 'environment')!.status, 'drift');
  const g = assess({ ...base, noiseDbA: 44 }, cur({ environment: { tempC: 22, co2: 600 } })).rows.find((r) => r.k === 'environment')!;
  assert.equal(g.status, 'match'); assert.match(g.gap, /not drift/);
});

test('experience: two reports of a kind in 30 days are observed (not a finding) and name what would confirm them', () => {
  const sig = [{ kind: 'hear' as const, at: '2026-10-10T00:00:00Z' }, { kind: 'hear' as const, at: '2026-10-12T00:00:00Z' }, { kind: 'warm' as const, at: '2026-08-01T00:00:00Z' }];
  const a = assess(base, cur({ signals: sig }));
  const e = a.rows.find((r) => r.k === 'experience')!;
  assert.equal(e.status, 'observed'); assert.equal(e.ev, 'OBSERVED'); assert.match(e.note, /observed, not measured: a speech-intelligibility measurement/);
  assert.equal(a.findings.length, 0); assert.equal(a.worst, 'observed');
  assert.equal(assess(base, cur({ signals: [sig[0]!] })).rows.find((r) => r.k === 'experience')!.status, 'match', 'one report is not a pattern');
});

test('a measured check that drifted offers to restore the commissioned setting, with the check id', () => {
  const a = assess(base, cur({ checks: [{ id: 'AC-1', dimension: 'camera', driftType: 'CONFIGURATION', result: 'Drift', metric: 'Camera preset positions', baselineValue: 'Centred (0°)', currentValue: 'Shifted 6°' }] }));
  const c = a.rows.find((r) => r.k === 'camera')!;
  assert.equal(c.status, 'drift'); assert.equal(c.type, 'CONFIGURATION'); assert.equal(c.fix?.kind, 'restore'); assert.equal(c.fix?.checkId, 'AC-1');
  assert.equal(a.remedy, 'recommission');
});
