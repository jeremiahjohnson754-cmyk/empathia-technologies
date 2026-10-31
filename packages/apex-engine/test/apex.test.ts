import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APEX_LAYERS, TIERS, RUNBOOKS, openCase, act, symptomKey } from '../src/index.js';

const cite = (layer: string) => (layer === 'network' ? ['SW-ATL-4A'] : layer === 'physical' ? ['A-0101', 'A-0102'] : []);
const ctx = { adapters: { 'ADP-DSP': 'NOT_CONFIGURED' as const, 'ADP-CAM': 'NOT_CONFIGURED' as const, 'ADP-NET': 'NOT_CONFIGURED' as const }, baseline: { version: 1, evidence: 12 }, priorA4: 0 };

test('seven layers, six tiers with their bounds, four runbooks (one unsigned, one safety-critical)', () => {
  assert.equal(APEX_LAYERS.length, 7); assert.equal(Object.keys(TIERS).length, 6);
  assert.equal(TIERS.A4.autonomous, false); assert.equal(TIERS.A2.autonomous, true);
  assert.equal(RUNBOOKS['RB-VLAN-ROUTE']!.signedBy, null); assert.equal(RUNBOOKS['RB-VLAN-ROUTE']!.safety, true);
});

test('a case ranks hypotheses by confidence and cites recorded evidence per layer; an unknown symptom abstains', () => {
  const c = openCase('Far-end audio drops out and we hear echo', cite);
  assert.equal(c.key, 'echo'); assert.equal(c.hypotheses[0]!.id, 'H1'); assert.equal(c.hypotheses[0]!.confidence, 'medium');
  assert.ok(c.layers.find((l) => l.layer === 'network')!.cites.includes('SW-ATL-4A'));
  const g = openCase('something odd', cite); assert.equal(g.key, 'generic');
  assert.equal(act(g.hypotheses[0]!, {}, ctx).outcome, 'ABSTAINED');
  assert.equal(symptomKey('projector blank'), 'display');
});

test('A0 cites, A1 proposes with its caveat, A2 compares read-only (and is honest without a baseline), A3 stages a draft, A5 is human-led', () => {
  const c = openCase('echo on calls', cite); const h = c.hypotheses[0]!;
  assert.equal(act(h, { tier: 'A0' }, ctx).outcome, 'EXPLAINED');
  assert.match(act(h, { tier: 'A1' }, ctx).detail, /proposal only; configuration difference is read from the recorded signature/);
  assert.match(act(h, { tier: 'A2' }, ctx).detail, /baseline v1 \(12 evidence items\)/);
  assert.match(act(h, { tier: 'A2' }, { ...ctx, baseline: null }).detail, /NOT_VERIFIED/);
  assert.equal(act(h, { tier: 'A2' }, ctx).outcome, 'COMPARED');
  const staged = act(h, { tier: 'A3' }, { ...ctx, stageWorkOrder: () => ({ ok: true, id: 'WO-0101' }) });
  assert.equal(staged.outcome, 'DRAFT_STAGED'); assert.equal(staged.workOrderId, 'WO-0101');
  const n = openCase('network drops in several rooms', cite); const h5 = n.hypotheses[0]!;
  assert.equal(act(h5, {}, ctx).outcome, 'HUMAN_LED'); assert.match(act(h5, {}, ctx).detail, /unsigned/);
});

test('A4 is blocked, in order, by: owner approval, window, occupancy, the real adapter state, targets outside the allowlist, the rate limit; then a dry run precedes the simulation; abnormal branches request compensation', () => {
  const c = openCase('echo on calls', cite); const h = c.hypotheses[0]!;
  assert.match(act(h, {}, ctx).detail, /owner approval missing/);
  assert.match(act(h, { ownerApproved: true }, ctx).detail, /no preauthorized window/);
  assert.match(act(h, { ownerApproved: true, window: '2026-11-04T20:00Z', occupied: true }, ctx).detail, /occupied/);
  const real = act(h, { ownerApproved: true, window: '2026-11-04T20:00Z' }, ctx);
  assert.equal(real.outcome, 'BLOCKED'); assert.match(real.detail, /no SUPPORTED_VERIFIED adapter for dsp \(NOT_CONFIGURED in this build\)/);
  const sim = { ownerApproved: true, window: '2026-11-04T20:00Z', simulate: true };
  assert.match(act(h, { ...sim, targets: ['uplink'] }, ctx).detail, /outside the runbook allowlist/);
  assert.match(act(h, sim, { ...ctx, priorA4: 1 }).detail, /rate limit: 1 per room per day reached/);
  const dry = act(h, sim, ctx); assert.equal(dry.outcome, 'DRY_RUN'); assert.equal(dry.simulated, true);
  const run = act(h, { ...sim, dryRunDone: true }, ctx); assert.equal(run.outcome, 'EXECUTED_SIMULATED'); assert.equal(run.verification, 'REQUIRED'); assert.equal(run.compensation, undefined);
  const estop = act(h, { ...sim, dryRunDone: true, branch: 'estop' }, ctx); assert.equal(estop.outcome, 'ABORTED'); assert.equal(estop.compensation, true);
  const incomplete = act(h, { ...sim, dryRunDone: true, branch: 'incomplete' }, ctx); assert.equal(incomplete.verification, 'FAIL');
  const cam = openCase('camera shows no video', cite); const home = cam.hypotheses.find((x) => x.id === 'H3')!;
  assert.equal(act(home, { ...sim, dryRunDone: true }, { ...ctx, adapters: { 'ADP-CAM': 'SUPPORTED_VERIFIED' } }).outcome, 'EXECUTED_SIMULATED', 'a SUPPORTED_VERIFIED adapter lets the bounded run proceed without simulate');
});
