import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KPIS, passports, window, type Records } from '../src/index.js';

const now = '2026-10-31T00:00:00.000Z';
const empty: Records = { now, projects: [], decisions: [], funding: [], workOrders: [], incidents: [], requests: [], rooms: [], documents: [], standards: [], sops: [], sows: [], devices: [], sessions: [], profiles: [], fieldScans: [], consentedParticipation: false };
const R: Records = { ...empty,
  projects: [{ id: 'P1', governance: 'FUNDED', delivery: 'HANDED_OFF', updatedAt: '2026-10-20T00:00:00Z', requestId: 'Q1', history: [{ to: 'FIELD_ACTIVE', at: '2026-10-10T00:00:00Z' }] }, { id: 'P2', governance: 'APPROVED', delivery: 'DESIGN_DRAFT', updatedAt: '2026-10-25T00:00:00Z', history: [] }, { id: 'P3', governance: 'FUNDED', delivery: 'FIELD_ACTIVE', updatedAt: '2026-10-28T00:00:00Z', history: [{ to: 'FIELD_ACTIVE', at: '2026-10-28T00:00:00Z' }] }],
  decisions: [{ projectId: 'P1', decision: 'APPROVED', scopeRev: 1, at: '2026-09-01T00:00:00Z' }, { projectId: 'P2', decision: 'APPROVED', scopeRev: 2, at: '2026-10-01T00:00:00Z' }, { projectId: 'P2', decision: 'HELD', scopeRev: 1, at: '2026-09-15T00:00:00Z' }],
  funding: [{ projectId: 'P1', kind: 'AUTHORIZED', amount: 18000, currency: 'USD', at: '2026-09-05T00:00:00Z' }, { projectId: 'P3', kind: 'AUTHORIZED', amount: 9000, currency: 'EUR', at: '2026-10-15T00:00:00Z' }],
  incidents: [{ id: 'I1', state: 'CLOSED', roomId: 'R1', openedAt: '2026-10-01T08:00:00Z', restoredAt: '2026-10-01T14:00:00Z' }, { id: 'I2', state: 'RESOLVED', roomId: 'R1', openedAt: '2026-10-10T08:00:00Z', restoredAt: '2026-10-11T08:00:00Z', recurrenceOf: 'I1' }, { id: 'I3', state: 'OPEN', roomId: 'R2', openedAt: '2026-10-29T08:00:00Z' }],
  rooms: [{ id: 'R1', requiresCommissioning: true, devices: 6, baseline: { version: 1, publishedAt: '2026-10-05T00:00:00Z', devicesBound: 6, verifiedTests: 12, applicableTests: 12, exceptions: 0 }, instrumented: true, eligibleForUsage: true }, { id: 'R2', requiresCommissioning: true, devices: 4, baseline: null, instrumented: false, eligibleForUsage: true }],
  sessions: [{ roomId: 'R1', at: '2026-10-20T10:00:00Z', conferencing: true, whiteboarding: false, deviceActivation: true, interactiveDisplay: true }, { roomId: 'R1', at: '2026-10-21T10:00:00Z', conferencing: false, whiteboarding: true, deviceActivation: true, interactiveDisplay: true }],
  devices: [{ id: 'D1', active: true, supportEnd: '2027-06-01', romLow: 800, romHigh: 1400 }, { id: 'D2', active: true, supportEnd: null }, { id: 'D3', active: true, supportEnd: '2030-01-01' }],
};

test('27 passports, each with numerator, denominator, window, coverage, freshness and a confidence that names its reasons', () => {
  assert.equal(KPIS.length, 27);
  const ps = passports(R, 90);
  assert.equal(ps.length, 27);
  for (const p of ps) { assert.ok(p.window.days === 90); assert.ok(p.confidence.reasons !== undefined); assert.ok(['MEASURED', 'NOT_MEASURABLE'].includes(p.state)); }
});

test('the figures are computed from the records with their denominators', () => {
  const ps = Object.fromEntries(passports(R, 90).map((p) => [p.id, p]));
  assert.equal(ps['projects_started']!.value, 2); assert.equal(ps['projects_started']!.denominator, 3);
  assert.equal(ps['projects_approved']!.value, 2, 'two distinct approved scope revisions; the HELD decision counted apart'); assert.equal(ps['projects_approved']!.denominator, 3);
  assert.equal(ps['projects_funded']!.value, 2);
  assert.deepEqual(ps['committed_budget']!.byCurrency, { USD: 18000, EUR: 9000 });
  assert.equal(ps['issues_resolved']!.value, 2); assert.equal(ps['issue_repeat']!.value, 33);
  assert.equal(ps['mttr']!.value, 15, 'median of 6 h and 24 h');
  assert.equal(ps['rooms_commissioned']!.value, 50); assert.equal(ps['devices_commissioned']!.value, 60);
  assert.equal(ps['room_use']!.coverage.observed, 1); assert.equal(ps['room_use']!.coverage.total, 2); assert.match(ps['room_use']!.exclusions[0]!, /1 eligible room\(s\) without instrumentation: not measurable/);
  assert.equal(ps['meeting_adoption']!.value, 50); assert.equal(ps['whiteboarding_adoption']!.value, 50);
  assert.equal(ps['lifecycle_exposure']!.value, 1); assert.match(ps['lifecycle_exposure']!.exclusions[0]!, /1 device\(s\) without a recorded support end/); assert.match(ps['lifecycle_exposure']!.confidence.reasons.join(' '), /ROM replacement 800–1,400 USD \(range\)/);
  assert.equal(ps['funding_to_outcome']!.value, 50);
});

test('"not measurable" is never 0%: the person-level whiteboarding passport is NOT_MEASURABLE with its reason, and so is every passport over an empty estate', () => {
  const ps = Object.fromEntries(passports(R, 90).map((p) => [p.id, p]));
  assert.equal(ps['whiteboard_people_pct']!.state, 'NOT_MEASURABLE'); assert.equal(ps['whiteboard_people_pct']!.value, null); assert.match(ps['whiteboard_people_pct']!.reason!, /no consent-governed person-level participation data/);
  for (const p of passports(empty, 90)) if (p.unit === '%' || p.unit.includes('median') || p.unit.includes('week')) { assert.equal(p.state, 'NOT_MEASURABLE', p.id); assert.equal(p.value, null, p.id); }
});

test('confidence drops with coverage and staleness and says why; the window is explicit', () => {
  const stale: Records = { ...R, now: '2027-03-01T00:00:00Z' };
  const p = passports(stale, 365).find((x) => x.id === 'rooms_commissioned')!;
  assert.equal(p.confidence.level, 'medium'); assert.match(p.confidence.reasons.join(' '), /freshest source \d+ days old/);
  const w = window(now, 30); assert.equal(w.days, 30); assert.ok(w.from < w.to);
  const ru = passports(R, 90).find((x) => x.id === 'room_use')!; assert.equal(ru.confidence.level, 'medium'); assert.match(ru.confidence.reasons[0]!, /source coverage 50%/);
});
