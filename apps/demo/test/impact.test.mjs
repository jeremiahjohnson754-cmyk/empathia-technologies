// Unit tests of the living-room cascade (apps/demo/src/build/impact.ts): the impact of one change, computed by the engines on the room
// before and after it. The commissioning delta is checked against the commissioning engine run directly here; the accepted baseline is
// checked byte for byte; the KPI deltas against the KPI engine run directly.
//   node --test apps/demo/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from './bundle.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CE = await import(pathToFileURL(path.join(repo, 'packages/commissioning-engine/dist/src/index.js')).href);
const KPI = await import(pathToFileURL(path.join(repo, 'packages/kpi-engine/dist/src/index.js')).href);
const M = await load('src/build/impact.ts', 'src/build/store.ts', 'src/workspace/store.ts', 'src/workspace/records.ts');
const I = M.build_impact, B = M.build_store, W = M.workspace_store, R = M.workspace_records;
const ok = (r) => { if (r && typeof r === 'object' && 'why' in r) throw new Error(r.why.join('; ')); return r; };

/** The engine's own applicability delta between two designs (independent of impact.ts). */
function engineDelta(before, after) {
  const a = CE.analyzeRoom(before.design), b = CE.analyzeRoom(after.design);
  const A = new Set(a.applicability.rows.filter((r) => r.applicable).map((r) => r.id)), Bs = new Set(b.applicability.rows.filter((r) => r.applicable).map((r) => r.id));
  return { added: [...Bs].filter((x) => !A.has(x)).sort(), removed: [...A].filter((x) => !Bs.has(x)).sort(), kept: [...Bs].filter((x) => A.has(x)).length };
}
const ids = (xs) => xs.map((t) => t.id).sort();
function planned() { let d = ok(B.createDraft({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer')); return ok(B.saveRevision(d, 'designer', 'initial layout')); }
function recommissioned() {
  let d = planned(); d = ok(B.approveClassification(d, 'syseng'));
  for (const [p, to] of [['syseng', 'DESIGN_APPROVED'], ['opslead', 'INSTALLATION_PENDING'], ['installer', 'INSTALLED_UNVERIFIED'], ['syseng', 'COMMISSIONING']]) d = ok(B.transition(d, p, to));
  const app = B.analysis(d).applicability.rows.filter((r) => r.applicable);
  for (const r of app) d = ok(B.record(d, 'cxeng', r.id, { state: 'PASS', kind: r.evidence[0], ref: `synthetic observation ${r.id}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined }));
  for (const r of app) d = ok(B.verify(d, 'architect', r.id));
  d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED')); return ok(B.transition(d, 'syseng', 'COMMISSIONING'));
}

test('a camera swap while PLANNED (the one state a device is swapped, D-39): the commissioning delta is the engine’s, and the tests whose covered device changed are named', () => {
  const d = planned(); const w = W.seed(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  assert.equal(B.swapDevice(structuredClone(recommissioned()), 'designer', B.live(recommissioned().design.devices).find((x) => x.cat === 'bar').id, 'camera', '').why[0], 'the design is COMMISSIONING: changes need a change order', 'the same swap while recommissioned is refused, in the API’s words');
  const before = structuredClone(d); const after = ok(B.swapDevice(structuredClone(d), 'designer', bar.id, 'camera', 'like-for-like (synthetic)'));
  const im = I.computeImpact(before, after, w); const e = engineDelta(before, after);
  assert.deepEqual(ids(im.commissioning.added), e.added); assert.deepEqual(ids(im.commissioning.removed), e.removed); assert.equal(im.commissioning.kept.length, e.kept);
  assert.ok(im.commissioning.kept.every((t) => t.reason.length > 0), 'every kept test carries the engine’s reason');
  const cam = B.live(after.design.devices).find((x) => x.cat === 'camera');
  assert.ok(im.commissioning.coverageChanged.length > 0 && im.commissioning.coverageChanged.every((t) => t.to.some((x) => x.includes(cam.id)) && t.from.some((x) => x.includes(bar.id))));
  assert.ok(im.commissioning.coverageChanged.every((t) => !t.recordedBefore && t.result === 'NOT_TESTED'), 'nothing is recorded on a design: no result predates the change, and none is claimed');
  assert.equal(im.change.what, 'device swapped'); assert.equal(im.change.why, 'like-for-like (synthetic)');
});

test('the accepted baseline is read, compared and never modified; Assurance names the drift (a model substitution, the change a recommissioned room accepts) and proposes recommissioning', () => {
  const d = recommissioned(); const w = W.seed(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const snapshot = JSON.stringify({ baseline: d.baseline, baselines: d.baselines });
  const before = structuredClone(d); const after = ok(B.replaceUnit(structuredClone(d), 'designer', bar.id, { model: 'SYN-BAR-2 (synthetic)', why: '' }));
  const im = I.computeImpact(before, after, w); I.attachImpact(after, im);
  assert.equal(JSON.stringify({ baseline: after.baseline, baselines: after.baselines }), snapshot, 'baseline v1 byte for byte');
  assert.equal(im.assurance.untouched, true); assert.equal(im.assurance.baseline.version, 1); assert.equal(im.assurance.baseline.state, 'CURRENT');
  assert.equal(im.assurance.presence.before, 'unknown', 'without live evidence and without a change, Assurance does not claim a match');
  assert.equal(im.assurance.presence.after, 'drift'); assert.match(im.assurance.presence.fix, /Recommission the room/);
  assert.deepEqual([im.assurance.removed, im.assurance.added], [[], []], 'the position stays: nothing removed or added');
  assert.deepEqual(im.assurance.changes.map((c) => [c.id, c.kind, c.fromModel, c.toModel]), [[bar.id, 'MODEL_SUBSTITUTED', 'generic', 'SYN-BAR-2 (synthetic)']], 'a model drift at the position');
  const kinds = new Set(after.events[0].change.affected.map((x) => x.kind)); for (const k of ['unit', 'test', 'baseline']) assert.ok(kinds.has(k), `affected ${k}`);
  assert.match(I.impactSentence(im), /differs from baseline v1, which is unchanged/);
  assert.equal(im.commissioning.gate.to, 'ACCEPTED');
});

test('Search Party: the removed device leaves the recorded graph, the new one is in it with its relationships and dependents (a swap while PLANNED)', () => {
  const d = planned(); const w = W.seed(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const after = ok(B.swapDevice(structuredClone(d), 'designer', bar.id, 'camera', ''));
  const im = I.computeImpact(structuredClone(d), after, w);
  const gone = im.search.find((g) => g.state === 'removed'); const added = im.search.find((g) => g.state === 'added');
  assert.equal(gone.id, bar.id); assert.ok(gone.inGraph && gone.relationships.length > 0, 'its relationships before the change');
  assert.ok(added.inGraph); assert.ok(added.relationships.some((r) => /MODELED/.test(r.provenance)), 'proposed connections are MODELED'); assert.ok(added.dependents.length > 0);
  assert.match(added.href, /^#\/search\?focus=PlannedAsset%3AR-DEMO-0001%2FPA-/);
});

test('adding a ceiling microphone while PLANNED (D-39): new tests with the engine’s reasons, and the KPI passport that changes, as the KPI engine computes it', () => {
  const d = planned(); const w = W.seed(); const at = Date.now();
  assert.equal(B.addDevice(structuredClone(recommissioned()), 'designer', 'micceil', { x: 1, y: 1 }).why[0], 'the design is COMMISSIONING: changes need a change order', 'the same addition while recommissioned is refused');
  const before = structuredClone(d); const after = ok(B.addDevice(structuredClone(d), 'designer', 'micceil', { x: 1, y: 1 }, 'pickup for the far seats'));
  const im = I.computeImpact(before, after, w, at); const e = engineDelta(before, after);
  assert.ok(e.added.length > 0); assert.deepEqual(ids(im.commissioning.added), e.added); assert.deepEqual(ids(im.commissioning.removed), e.removed);
  assert.ok(im.commissioning.added.every((t) => /device family dsp|pack/.test(t.reason)));
  assert.ok(im.commissioning.added.every((t) => B.analysis(after).applicability.rows.find((r) => r.id === t.id).result === 'NOT_TESTED') && im.commissioning.gate.to === 'DESIGN_APPROVED', 'the new tests join the plan untested; the next gate is the design approval');
  const P0 = KPI.passports(R.assemble(w, before, at)), P1 = KPI.passports(R.assemble(w, after, at));
  const changed = P1.filter((p, i) => p.value !== P0[i].value || p.numerator !== P0[i].numerator || p.denominator !== P0[i].denominator).map((p) => p.id);
  assert.deepEqual(im.kpis.map((k) => k.id), changed); assert.ok(changed.includes('devices_commissioned'));
  const p1 = P1.find((p) => p.id === 'devices_commissioned'); assert.ok(im.kpis[0].to.includes(`(${p1.numerator} / ${p1.denominator})`));
  assert.deepEqual(im.stations, [], 'no Mission Control count changes — and none is invented');
});

test('without an accepted baseline Assurance says there is nothing to compare; the next gate is the design approval', () => {
  const d = planned(); const w = W.seed(); const disp = B.live(d.design.devices).find((x) => x.cat === 'display');
  const after = ok(B.removeDevice(structuredClone(d), 'designer', disp.id, 'not needed (synthetic)'));
  const im = I.computeImpact(structuredClone(d), after, w); const e = engineDelta(d, after);
  assert.equal(im.assurance.baseline, null); assert.equal(im.assurance.presence, null);
  assert.deepEqual(ids(im.commissioning.removed), e.removed);
  assert.equal(im.commissioning.gate.to, 'DESIGN_APPROVED'); assert.ok(im.commissioning.gate.after.some((x) => /classification/.test(x)));
});

test('the change is one structured event — actor, what, from, to, why, affected objects — and a refused change records nothing (a swap while PLANNED)', () => {
  const d = planned(); const w = W.seed(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const after = ok(B.swapDevice(structuredClone(d), 'designer', bar.id, 'camera', 'like-for-like (synthetic)'));
  const im = I.computeImpact(structuredClone(d), after, w); I.attachImpact(after, im);
  const ev = after.events[0];
  assert.equal(ev.type, 'room.device_swapped'); assert.equal(ev.by, 'designer'); assert.equal(ev.outcome, 'ALLOWED');
  assert.deepEqual([ev.change.what, ev.change.from, ev.change.to, ev.change.why], ['device swapped', 'Video bar 1 (bar)', 'Camera 1 (camera)', 'like-for-like (synthetic)']);
  const kinds = new Set(ev.change.affected.map((x) => x.kind)); for (const k of ['device', 'connection', 'test']) assert.ok(kinds.has(k), `affected ${k}`);
  assert.ok(!kinds.has('baseline'), 'no baseline exists yet to differ from (the baseline as an affected object: the substitution test)');
  assert.ok(ev.change.affected.every((x) => x.href.startsWith('#/')));
  assert.match(I.impactSentence(im), /0 tests added, 0 removed, \d+ unchanged.*no accepted baseline to compare/);
  const n = d.events.length; const r = B.swapDevice(d, 'requestor', bar.id, 'camera', ''); assert.ok('why' in r); assert.equal(d.events.length, n);
  assert.ok('why' in B.swapDevice(structuredClone(d), 'designer', bar.id, 'bar', ''), 'swapping for the same category is refused');
});

// ---------------------------------------------------------------- re-verification after a substitution while the accepted room is recommissioned
/** The engine's rule run directly here (independent of the store): the plan before the substitution, the substituted position. */
function engineReopened(before, old, to) {
  const rows = CE.analyzeRoom(before.design).applicability.rows.filter((r) => r.applicable).map((r) => ({ testId: r.id, domain: r.domain, devices: r.devices }));
  return CE.reopenedBySubstitution(rows, [{ assetId: old.id, label: old.label, category: old.cat, from: old.model, to }]);
}

test('a model substitution during recommissioning reopens the tests by the engine’s rule, one reason each, and the gate names every one of them', () => {
  const d = recommissioned(); const w = W.seed(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const before = structuredClone(d); const after = ok(B.replaceUnit(structuredClone(d), 'designer', bar.id, { model: 'SYN-BAR-2 (synthetic)', why: 'the newer bar (synthetic)' }));
  const want = engineReopened(before, bar, 'SYN-BAR-2 (synthetic)');
  const im = I.computeImpact(before, after, w);
  assert.ok(want.length >= 10, `the engine reopens the tests that covered the video bar (${want.length})`);
  assert.deepEqual(im.commissioning.reopened.map((t) => t.id), want.map((t) => t.testId), 'the impact’s reopened tests are the engine’s, in plan order');
  assert.deepEqual(im.commissioning.reopened.map((t) => t.reasons), want.map((t) => t.reasons), 'with the engine’s reasons, one per substitution');
  for (const id of ['identity_asset', 'video_av_sync', 'camera_preset']) assert.ok(im.commissioning.reopened.some((t) => t.id === id), `${id} is reopened`);
  assert.match(im.commissioning.reopened.find((t) => t.id === 'identity_asset').reasons[0], /^Video bar 1 \(PA-\d+\) was substituted after acceptance \(generic → SYN-BAR-2 \(synthetic\)\): the asset identity is checked again after every substitution$/);
  assert.ok(im.commissioning.reopened.every((t) => t.rerun && t.result === 'PASS_VERIFIED'), 'each still holds the PASS_VERIFIED recorded on the video bar');
  assert.deepEqual(im.commissioning.coverageChanged, [], 'the position keeps its id: no test now covers another device (the swap cascade: the PLANNED tests)');
  const gate = im.commissioning.gate.after.join(' | ');
  assert.equal(im.commissioning.gate.to, 'ACCEPTED'); assert.deepEqual(im.commissioning.gate.before, [], 'before the substitution nothing blocked the re-acceptance');
  assert.match(gate, new RegExp(`${want.length} test\\(s\\) were last recorded before the substitution and must be re-run on the changed design and verified independently: ${want.map((t) => t.testId).join(', ')}`));
  assert.match(I.impactSentence(im), new RegExp(`; ${want.length} reopened by the substitution`));
  assert.ok(after.events[0].change.affected.filter((x) => x.kind === 'test' && /^reopened: recorded on the previous device/.test(x.effect)).length === want.length, 'the change event names each reopened test');
  assert.equal(after.substitutions.length, 1); assert.equal(after.substitutions[0].baselineVersion, 1); assert.equal(after.substitutions[0].assetId, bar.id);
});

test('re-acceptance is refused until every reopened test is re-run and verified by a different person; then v2 is published and v1 kept SUPERSEDED', () => {
  let d = recommissioned(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const v1 = JSON.stringify(d.baselines[0]);
  d = ok(B.replaceUnit(d, 'designer', bar.id, { model: 'SYN-BAR-2 (synthetic)' }));
  const reopened = B.reverification(d).map((t) => t.testId); const stale0 = Object.fromEntries(reopened.map((id) => [id, structuredClone(d.design.results[id])]));
  assert.equal(JSON.stringify(d.baselines[0]), v1, 'the substitution leaves baseline v1 untouched');
  assert.deepEqual(B.countsNow(d).reopened, reopened.length); assert.equal(B.countsNow(d).verified, B.analysis(d).counts.verified - reopened.length, 'their earlier results no longer count');
  const r1 = B.transition(d, 'qa_reviewer', 'ACCEPTED'); assert.ok('why' in r1);
  assert.ok(reopened.every((id) => r1.why.join(' ').includes(id)), 'the refusal names every reopened test');
  assert.equal(d.events[0].type, 'room.lifecycle:ACCEPTED'); assert.equal(d.events[0].outcome, 'DENIED');
  // re-run: the commissioning engineer records each reopened test again (and any test not recorded yet)
  const app = B.analysis(d).applicability.rows.filter((r) => r.applicable);
  for (const r of app) if (reopened.includes(r.id) || !d.design.results[r.id]) d = ok(B.record(d, 'cxeng', r.id, { state: 'PASS', kind: r.evidence[0], ref: `synthetic re-run ${r.id}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined }));
  assert.ok(B.reverification(d).every((t) => !t.rerun && t.result === 'PASS_UNVERIFIED'), 're-run after the substitution, awaiting verification');
  for (const id of reopened) { const h = d.design.results[id].history; assert.equal(h.length, 1); assert.deepEqual([h[0].state, h[0].by, h[0].at, h[0].verified], [stale0[id].state, stale0[id].by, stale0[id].at, stale0[id].verified], `${id}: the earlier record stays in the history`); }
  const r2 = B.transition(d, 'qa_reviewer', 'ACCEPTED'); assert.ok('why' in r2);
  assert.match(r2.why.join(' | '), new RegExp(`${reopened.length} reopened test\\(s\\) were re-run after the substitution and are not yet passed and verified by a different person`));
  assert.ok(reopened.every((id) => r2.why.join(' ').includes(id)), 'still named, until verified');
  assert.ok('why' in B.verify(d, 'cxeng', reopened[0]), 'the person who re-ran it does not verify it');
  for (const r of app) if (d.design.results[r.id]?.state === 'PASS' && !d.design.results[r.id].verified) d = ok(B.verify(d, 'architect', r.id));
  assert.deepEqual(B.reverificationBlockers(B.reverification(d)), []);
  // D-38: the substitution changed the design, and the re-acceptance binds the approved revision — refused until the change is saved and approved
  const r3 = B.transition(d, 'qa_reviewer', 'ACCEPTED'); assert.ok('why' in r3);
  assert.deepEqual(r3.why, [B.designBindingReason(d)], 'the design binding is all that is left, in the engine’s words');
  assert.match(r3.why[0], new RegExp(`^the design changed while the room is recommissioned \\(${bar.id} generic → SYN-BAR-2 \\(synthetic\\)\\) and the approved revision 1 no longer describes it: save the change as a revision and have it approved \\(room\\.design\\.approve, not its author\\) — the re-acceptance binds the approved revision$`));
  d = ok(B.saveRevision(d, 'designer', 'the bar substitution, saved during recommissioning (synthetic)')); const rev = d.revisions.length;
  assert.match(B.transition(structuredClone(d), 'qa_reviewer', 'ACCEPTED').why.join(' | '), new RegExp(`revision ${rev} needs approval`));
  d = ok(B.approveRevision(d, 'syseng', rev));   // the systems engineer, not the designer who saved it
  d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED'));
  assert.equal(d.baseline.revision, rev, 'baseline v2 binds the newly approved revision'); assert.equal(d.baselines[0].revision, 1, 'v1 keeps the revision it was accepted against');
  assert.equal(d.design.lifecycle, 'ACCEPTED'); assert.equal(d.baseline.version, 2); assert.equal(d.baseline.state, 'CURRENT');
  assert.equal(d.baselines.length, 2); assert.equal(d.baselines[0].state, 'SUPERSEDED');
  assert.equal(JSON.stringify({ ...JSON.parse(v1), state: 'SUPERSEDED' }), JSON.stringify(d.baselines[0]), 'v1 is kept as it was, only marked SUPERSEDED');
  assert.ok(Object.values(d.baseline.results).every((x) => x === 'PASS_VERIFIED')); assert.ok(d.baseline.devices.some((x) => x.id === bar.id && x.model === 'SYN-BAR-2 (synthetic)') && d.baselines[0].devices.some((x) => x.id === bar.id && x.model === 'generic'), 'v2 records the substituted model at the same position; v1 the model it accepted');
  assert.equal(d.substitutions.length, 1, 'the substitution stays on record'); assert.deepEqual(B.reverification(d), [], 'and requires nothing under v2');
});

test('a second substitution adds its reason to a test it reopens again; a swap outside recommissioning reopens nothing', () => {
  let d = recommissioned(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  d = ok(B.replaceUnit(d, 'designer', bar.id, { model: 'SYN-BAR-2 (synthetic)' }));
  d = ok(B.replaceUnit(d, 'designer', bar.id, { model: 'SYN-BAR-3 (synthetic)' }));
  const id = B.reverification(d).find((t) => t.testId === 'identity_asset');
  assert.deepEqual(id.assets, [bar.id, bar.id]); assert.equal(id.reasons.length, 2); assert.match(id.reasons[1], /^Video bar 1 \(PA-\d+\) was substituted after acceptance \(SYN-BAR-2 \(synthetic\) → SYN-BAR-3 \(synthetic\)\)/);
  const p = planned(); const disp = B.live(p.design.devices).find((x) => x.cat === 'display');
  const q = ok(B.swapDevice(structuredClone(p), 'designer', disp.id, 'projector', ''));
  assert.deepEqual(q.substitutions, []); assert.deepEqual(B.reverification(q), []);
});
