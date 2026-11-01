/** Assurance tells an installation change (another unit of the same model at a position) apart from a model drift (ADR-0012). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, type Baseline, type Current } from '../src/index.js';

const base: Baseline = { id: 'b1', version: 1, signedAt: '2026-10-01T00:00:00Z', signedBy: 'p', capacity: 6, configSignature: null, documents: [], layout: null,
  devices: [{ id: 'PA-0061', category: 'camera', label: 'Camera 1', model: 'generic', unit: 'AS-0002' }, { id: 'PA-0062', category: 'display', label: 'Display 1', model: 'generic', unit: 'AS-0003' }] };
const cur = (devices: Current['devices']): Current => ({ now: '2026-10-31T00:00:00Z', devices });
const presence = (c: Current) => assess(base, c).rows.find((r) => r.k === 'presence')!;

test('the same units: no change claimed (and without live evidence, not assessed rather than matched)', () => {
  const p = presence(cur([{ id: 'PA-0061', category: 'camera', model: 'generic', unit: 'AS-0002' }, { id: 'PA-0062', category: 'display', model: 'generic', unit: 'AS-0003' }]));
  assert.equal(p.status, 'unknown'); assert.equal(p.changes, undefined);
});
test('another unit of the same model: an INSTALLATION change (UNIT_REPLACED), drift on the record, never called a model drift', () => {
  const p = presence(cur([{ id: 'PA-0061', category: 'camera', label: 'Camera 1', model: 'generic', unit: 'AS-0009' }, { id: 'PA-0062', category: 'display', model: 'generic', unit: 'AS-0003' }]));
  assert.equal(p.status, 'drift'); assert.equal(p.ev, 'INFERRED'); assert.deepEqual(p.ids, ['PA-0061']);
  assert.deepEqual(p.changes, [{ id: 'PA-0061', kind: 'UNIT_REPLACED', fromModel: 'generic', toModel: 'generic', fromUnit: 'AS-0002', toUnit: 'AS-0009' }]);
  assert.match(p.current, /another physical unit of the same model since handover \(an installation change, not a model drift\): Camera 1 PA-0061 unit AS-0002 → AS-0009/);
  assert.equal(p.fix?.kind, 'recom');
});
test('a different model (with its new unit): a MODEL_SUBSTITUTED drift, not an installation change — the existing wording is kept', () => {
  const p = presence(cur([{ id: 'PA-0061', category: 'camera', label: 'Camera 1', model: 'SYN-PTZ-12X', unit: 'AS-0009' }, { id: 'PA-0062', category: 'display', model: 'generic', unit: 'AS-0003' }]));
  assert.deepEqual(p.changes?.map((c) => c.kind), ['MODEL_SUBSTITUTED']);
  assert.match(p.current, /^1 device on the register substituted since handover: Camera 1 generic → SYN-PTZ-12X$/);
});
test('a unit not on record on either side is not compared (a migrated room: assetAtBaseline unknown)', () => {
  const b2 = { ...base, devices: base.devices.map((d) => ({ ...d, unit: null })) };
  const p = assess(b2, cur([{ id: 'PA-0061', category: 'camera', model: 'generic', unit: 'AS-0009' }, { id: 'PA-0062', category: 'display', model: 'generic', unit: 'AS-0003' }])).rows.find((r) => r.k === 'presence')!;
  assert.equal(p.status, 'unknown', 'Assurance does not guess which unit was accepted');
});
