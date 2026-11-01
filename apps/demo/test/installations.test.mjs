// Positions, physical units and installations in Build a Room (ADR-0012), and the parity of the demonstration with the enterprise API:
// the same room fed through the API's adapter (services/enterprise-api/src/domain/reverification.ts, pure) and through the demonstration's
// store gives the same reopened tests, the same reasons, the same "still to re-run" and the same acceptance reasons — one set of rules.
//   node --test apps/demo/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from './bundle.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CE = await import(pathToFileURL(path.join(repo, 'packages/commissioning-engine/dist/src/index.js')).href);
const API = await import(pathToFileURL(path.join(repo, 'services/enterprise-api/dist/src/domain/reverification.js')).href);
const API_EDITS = await import(pathToFileURL(path.join(repo, 'services/enterprise-api/dist/src/domain/design-edits.js')).href);   // the rule rooms.ts runs on every device edit (D-39)
const M = await load('src/build/impact.ts', 'src/build/store.ts', 'src/workspace/store.ts', 'src/story/assemble.ts', 'src/search/estate.ts', 'src/workspace/records.ts');
const I = M.build_impact, B = M.build_store, W = M.workspace_store, A = M.story_assemble, E = M.search_estate;
const ok = (r) => { if (r && typeof r === 'object' && 'why' in r) throw new Error(r.why.join('; ')); return r; };
const no = (r, re) => { assert.ok(r && 'why' in r, 'refused'); if (re) assert.match(r.why.join(' | '), re); return r; };
const tick = () => new Promise((r) => setTimeout(r, 5));   // time passes between a change and the next records (as it does on site)

function planned() { const d = ok(B.createDraft({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer')); return ok(B.saveRevision(d, 'designer', 'initial layout')); }
function installed() { let d = planned(); d = ok(B.approveClassification(d, 'syseng')); for (const [p, to] of [['syseng', 'DESIGN_APPROVED'], ['opslead', 'INSTALLATION_PENDING'], ['installer', 'INSTALLED_UNVERIFIED']]) d = ok(B.transition(d, p, to)); return d; }
function firstCommissioning() { return ok(B.transition(installed(), 'syseng', 'COMMISSIONING')); }
function recommissioned() {
  let d = installed(); d = ok(B.transition(d, 'syseng', 'COMMISSIONING'));
  const app = B.analysis(d).applicability.rows.filter((r) => r.applicable);
  for (const r of app) d = ok(B.record(d, 'cxeng', r.id, { state: 'PASS', kind: r.evidence[0], ref: `synthetic observation ${r.id}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined }));
  for (const r of app) d = ok(B.verify(d, 'architect', r.id));
  d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED')); return ok(B.transition(d, 'syseng', 'COMMISSIONING'));
}
const bar = (d) => B.live(d.design.devices).find((x) => x.cat === 'bar');

test('recording the installation puts one synthetic unit at every position: identity UNKNOWN, no serial, no maker; the installer named', () => {
  const p = planned(); assert.deepEqual(p.installations, [], 'a planned room has no hardware');
  const d = installed(); const devs = B.live(d.design.devices).filter((x) => !x.furniture);
  assert.equal(d.installations.length, devs.length); assert.equal(d.assets.length, devs.length);
  assert.ok(d.assets.every((a) => a.identityState === 'UNKNOWN' && a.serial === null && a.manufacturer === null && a.synthetic && /^AS-\d{4}$/.test(a.code)));
  assert.ok(d.installations.every((i) => i.installReason === 'INITIAL' && i.basis === 'RECORDED' && i.installedBy === 'installer' && !i.removedAt));
  assert.match(B.identityLabel(d, bar(d).id), /^PA-\d{4} · unit AS-\d{4} · identity UNKNOWN$/);
  assert.equal(B.identityLabel(p, bar(p).id), `${bar(p).id} · no unit installed`);
});

test('a like-for-like replacement while recommissioned keeps the position, closes the old unit (REPLACED, history kept), installs a new one; no design change; the tests say “replaced by another unit of the same model”; Assurance calls it an installation change', () => {
  const d0 = recommissioned(); const b = bar(d0); const old = B.identity(d0, b.id).asset; const v1 = JSON.stringify(d0.baselines);
  no(B.replaceUnit(structuredClone(d0), 'designer', b.id, { why: 'synthetic' }), /work\.evidence/);
  const before = structuredClone(d0); const d = ok(B.replaceUnit(structuredClone(d0), 'installer', b.id, { why: 'synthetic: the bar failed its self-test' }));
  const now = B.identity(d, b.id).asset;
  assert.equal(bar(d).id, b.id, 'the position keeps its id'); assert.equal(bar(d).model, b.model); assert.notEqual(now, old);
  const ph = B.positionHistory(d, b.id); assert.deepEqual(ph.design, [], 'no design change'); assert.deepEqual(ph.installations.map((i) => [i.asset, i.removalReason, i.installReason]), [[old, 'REPLACED', 'INITIAL'], [now, null, 'REPLACEMENT']]);
  const ah = B.assetHistory(d, old); assert.equal(ah.current, null); assert.equal(ah.asset.identityState, 'UNKNOWN'); assert.equal(ah.installations[0].removedBy, 'installer');
  assert.equal(JSON.stringify(d.baselines), v1, 'baseline v1 byte for byte'); assert.deepEqual(d.drawings, before.drawings, 'no drawing goes stale'); assert.equal(d.revisions.length, before.revisions.length);
  const rv = B.reverification(d); assert.ok(rv.length > 0 && rv.every((t) => t.rerun && t.reasons.every((x) => x.includes(`was replaced by another unit of the same model (${old} → ${now}, both ${b.model})`))));
  assert.match(rv.find((t) => t.testId === 'identity_asset').reasons[0], /checked again after every change of unit$/);
  const gate = B.lifecycleConditions(d, 'ACCEPTED').join(' | ');
  assert.match(gate, new RegExp(`${rv.length} test\\(s\\) were last recorded on the previous unit and must be re-run on the new unit and verified independently`));
  const im = I.computeImpact(before, d, W.seed());
  assert.deepEqual(im.assurance.changes.map((c) => [c.id, c.kind, c.fromUnit, c.toUnit]), [[b.id, 'UNIT_REPLACED', old, now]]);
  assert.equal(im.assurance.presence.after, 'drift'); assert.match(im.assurance.presence.current, /not a model drift/);
});

test('a model substitution is a design change: only by a designer, only while an accepted room is recommissioned; the position keeps its id, the old unit is closed SUBSTITUTED; Assurance calls it a model drift', () => {
  const acc = recommissioned();
  const accepted = structuredClone(acc); accepted.design.lifecycle = 'ACCEPTED';   // the same room seen as ACCEPTED (not recommissioned)
  no(B.replaceUnit(structuredClone(accepted), 'designer', bar(accepted).id, { model: 'SYN-BAR-2 (synthetic)' }), /recommissioned/);
  no(B.replaceUnit(structuredClone(acc), 'installer', bar(acc).id, { model: 'SYN-BAR-2 (synthetic)' }), /room\.design/);
  const old = B.identity(acc, bar(acc).id).asset; const before = structuredClone(acc);
  const d = ok(B.replaceUnit(structuredClone(acc), 'designer', bar(acc).id, { model: 'SYN-BAR-2 (synthetic)', why: 'synthetic: the newer bar' }));
  const b = bar(d); assert.equal(b.id, bar(acc).id); assert.equal(b.model, 'SYN-BAR-2 (synthetic)');
  const ph = B.positionHistory(d, b.id); assert.deepEqual(ph.design.map((h) => [h.kind, h.from, h.to]), [['model', 'generic', 'SYN-BAR-2 (synthetic)']]);
  assert.deepEqual(ph.installations.map((i) => i.removalReason || i.installReason), ['SUBSTITUTED', 'SUBSTITUTION']);
  assert.equal(B.unitOf(d, old).model, 'generic', 'the substituted unit keeps its model'); assert.equal(B.unitOf(d, B.identity(d, b.id).asset).model, 'SYN-BAR-2 (synthetic)');
  assert.ok(B.reverification(d).every((t) => t.reasons.every((x) => /was substituted after acceptance \(generic → SYN-BAR-2 \(synthetic\)\)/.test(x))));
  const im = I.computeImpact(before, d, W.seed());
  assert.ok(im.assurance.changes.some((c) => c.id === b.id && c.kind === 'MODEL_SUBSTITUTED') && !im.assurance.changes.some((c) => c.kind === 'UNIT_REPLACED'));
});

test('stale evidence never satisfies a re-run; a superseded result is never verified; the re-runner never verifies; a historical PASS_VERIFIED counts 0 until a new verifier verifies the re-run', async () => {
  let d = ok(B.replaceUnit(recommissioned(), 'installer', bar(recommissioned()).id, { why: 'synthetic' }));
  const rv = B.reverification(d); const t = rv[0].testId; const row = B.analysis(d).applicability.rows.find((r) => r.id === t);
  assert.equal(B.results(d)[t].verified?.by, 'architect', 'the historical PASS_VERIFIED is still readable');
  assert.equal(B.countsNow(d).verified, B.analysis(d).counts.verified - rv.length, 'and counts 0');
  no(B.record(structuredClone(d), 'cxeng', t, { state: 'PASS', kind: row.evidence[0], ref: `synthetic observation ${t}`, instrument: row.instrument ? 'SYN-METER-01 (synthetic)' : undefined }), /attached before the change of unit/);
  no(B.verify(structuredClone(d), 'architect', t), /already verified/);
  await tick();
  for (const x of rv) { const r = B.analysis(d).applicability.rows.find((y) => y.id === x.testId); d = ok(B.record(d, 'cxeng', x.testId, { state: 'PASS', kind: r.evidence[0], ref: `synthetic re-run ${x.testId}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined })); }
  no(B.verify(structuredClone(d), 'cxeng', t), /independent/);
  assert.match(B.lifecycleConditions(d, 'ACCEPTED').join(' | '), new RegExp(`${rv.length} reopened test\\(s\\) were re-run on the new unit and are not yet passed and verified by a different person`));
  for (const x of rv) d = ok(B.verify(d, 'architect', x.testId));   // a new verifier, independent of the re-run
  assert.deepEqual(B.lifecycleConditions(d, 'ACCEPTED'), []);
  d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED'));   // an acceptor who neither recorded nor verified
  assert.equal(d.baseline.version, 2); assert.ok(d.baseline.devices.some((x) => x.id === bar(d).id && x.unit === B.identity(d, bar(d).id).asset), 'v2 binds the new unit');
});

test('refusals: no current installation, a stale precondition, a unit at a furniture position, a downgrade, a real-looking serial, a self-verified identity', () => {
  no(B.replaceUnit(planned(), 'installer', bar(planned()).id), /is replaced while the room is/);
  const d = recommissioned(); const b = bar(d); const cur = d.installations.find((i) => i.position === b.id && !i.removedAt);
  no(B.replaceUnit(structuredClone(d), 'installer', b.id, { expected: 'IN-9999' }), /changed since it was read/);
  ok(B.replaceUnit(structuredClone(d), 'installer', b.id, { expected: cur.id }));
  const table = B.live(d.design.devices).find((x) => x.furniture); no(B.replaceUnit(structuredClone(d), 'installer', table.id), /furniture|no current installation/);
  const unit = B.identity(d, b.id).asset;
  no(B.recordIdentity(structuredClone(d), 'installer', unit, { state: 'DECLARED', serial: 'ABC123456' }), /synthetic/);
  let e = ok(B.recordIdentity(structuredClone(d), 'installer', unit, { state: 'DECLARED', serial: `SYN-SN-${unit}` }));
  no(B.recordIdentity(structuredClone(e), 'installer', unit, { state: 'OBSERVED' }), /evidence/);
  e = ok(B.recordIdentity(e, 'installer', unit, { state: 'OBSERVED', evidence: 'synthetic label photograph' }));
  no(B.recordIdentity(structuredClone(e), 'installer', unit, { state: 'VERIFIED', evidence: 'x' }), /does not hold/);
  e = ok(B.recordIdentity(e, 'cxeng', unit, { state: 'VERIFIED', evidence: 'synthetic read-back' }));
  no(B.recordIdentity(structuredClone(e), 'installer', unit, { state: 'DECLARED', serial: `SYN-SN-${unit}` }), /never downgraded/);
  assert.equal(B.identityLabel(e, b.id), `${b.id} · unit ${unit} · identity VERIFIED`);
});

test('one reading everywhere: Search Party, the Room Story (positions apart from units) and the register show position · unit · identity', () => {
  const d = ok(B.replaceUnit(recommissioned(), 'installer', bar(recommissioned()).id, { why: 'synthetic' }));
  const est = E.buildEstate(d); const b = bar(d); const u = B.identity(d, b.id).asset;
  const pos = est.nodes.find((n) => n.id === `${d.code}/${b.id}`); assert.ok(pos.subtitle.includes(`unit ${u} · identity UNKNOWN`), pos.subtitle);
  const unitNode = est.nodes.find((n) => n.type === 'Asset' && n.id === `${d.code}/${u}`); assert.ok(unitNode);
  assert.ok(est.edges.some((x) => x.rel === 'LOCATED_IN' && x.from.id === unitNode.id && x.to.id === pos.id && /installation record/.test(x.provenance)));
  const w = W.seed(); const s = A.assembleStory(d.code, { draft: d, w, est, R: M.workspace_records.assemble(w, d) });
  const entries = s.stages.flatMap((x) => x.entries);
  const p = entries.find((x) => x.id === 'design:positions'); const units = entries.find((x) => x.id === 'commission:units');
  assert.ok(p && units, 'two entries: the positions (design) and the units (commission)'); assert.equal(p.stage, 'design'); assert.equal(units.stage, 'commission');
  assert.ok(p.items.some((x) => x.text.startsWith(`${b.id} · unit ${u} · identity UNKNOWN`)));
  assert.ok(units.items.some((x) => /replaced/.test(x.text)) && units.items.filter((x) => x.text.startsWith(`${u} `)).length === 1);
  assert.ok(entries.some((x) => x.stage === 'commission' && /^Unit replaced like for like/.test(x.what)));
});

test('an old draft is upgraded the way migration 0026 upgrades a room: units of UNKNOWN identity, no installer named, the start known as of the upgrade', () => {
  const d = recommissioned(); const old = structuredClone(d); delete old.assets; delete old.installations; delete old.designHistory; for (const b of old.baselines) for (const x of b.devices) { delete x.unit; delete x.model; }
  const u = B.upgradeDraft(old);
  assert.equal(u.installations.length, B.live(u.design.devices).filter((x) => !x.furniture).length);
  assert.ok(u.installations.every((i) => i.basis === 'KNOWN_AS_OF_MIGRATION' && i.installReason === 'MIGRATED' && i.installedBy === null));
  assert.ok(u.assets.every((a) => a.identityState === 'UNKNOWN' && a.serial === null && a.manufacturer === null && a.createdBy === null));
  assert.equal(B.upgradeDraft(u).installations.length, u.installations.length, 'upgrading again changes nothing');
  const im = I.computeImpact(structuredClone(u), ok(B.replaceUnit(structuredClone(u), 'installer', bar(u).id)), W.seed());
  assert.deepEqual(im.assurance.changes, [], 'a baseline without units on record: Assurance does not guess which unit was accepted');
});

test('D-38 — a model substitution during recommissioning: the re-acceptance waits for an approved revision that describes the room (the engine’s sentence, first); the author and a persona without room.design.approve are refused; v2 binds the new revision; a like-for-like replacement needs none (a category swap is refused while recommissioned: D-39)', async () => {
  no(B.swapDevice(structuredClone(recommissioned()), 'designer', bar(recommissioned()).id, 'camera', 'synthetic: a camera instead'), /^the design is COMMISSIONING: changes need a change order$/);
  for (const change of ['model']) {
    let d = recommissioned(); await tick(); const b = bar(d);
    d = ok(change === 'model' ? B.replaceUnit(d, 'designer', b.id, { model: 'SYN-BAR-2 (synthetic)', why: 'synthetic: the newer bar' }) : B.swapDevice(d, 'designer', b.id, 'camera', 'synthetic: a camera instead'));
    const to = change === 'model' ? 'generic → SYN-BAR-2 \\(synthetic\\)' : 'bar → Camera 1 \\(camera, PA-\\d+\\)';
    const first = B.lifecycleConditions(d, 'ACCEPTED');
    assert.match(first[0], new RegExp(`^the design changed while the room is recommissioned \\(${b.id} ${to}\\) and the approved revision 1 no longer describes it: save the change as a revision and have it approved \\(room\\.design\\.approve, not its author\\) — the re-acceptance binds the approved revision$`), `${change}: the design binding comes first`);
    assert.match(first[1], /were last recorded before the substitution and must be re-run/, `${change}: then the reopened tests`);
    assert.equal(first[0], B.designBindingReason(d)); assert.deepEqual(B.designBindingTodo(d), { what: 'save the change made during recommissioning as a design revision', who: 'room.design' });
    // re-run and verify: the reopened tests stop blocking; the design binding does not
    await tick(); const app = B.analysis(d).applicability.rows.filter((r) => r.applicable); const stale = new Set(B.reverification(d).filter((t) => t.rerun).map((t) => t.testId));
    for (const r of app) if (stale.has(r.id) || !d.design.results[r.id]) d = ok(B.record(d, 'cxeng', r.id, { state: 'PASS', kind: r.evidence[0], ref: `synthetic re-run ${r.id}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined }));
    for (const r of app) if (d.design.results[r.id]?.state === 'PASS' && !d.design.results[r.id].verified) d = ok(B.verify(d, 'architect', r.id));
    const refusedNow = no(B.transition(structuredClone(d), 'qa_reviewer', 'ACCEPTED'));
    assert.deepEqual(refusedNow.why, [B.designBindingReason(d)], `${change}: without the design approval the re-acceptance is refused, for that reason alone`);
    // the approval: never before the change is saved, never by a persona without room.design.approve, never by the revision's author
    no(B.approveRevision(structuredClone(d), 'syseng', 1), /revision 1 is not newer than the approved revision 1/);
    d = ok(B.saveRevision(d, 'syseng', `synthetic: the ${change} change, saved during recommissioning`)); const rev = d.revisions.length;
    assert.match(B.designBindingReason(d), new RegExp(`revision ${rev} needs approval \\(room\\.design\\.approve, not its author\\)`));
    assert.deepEqual(B.designBindingTodo(d), { what: `approve design revision ${rev} (it carries the change made during recommissioning)`, who: 'room.design.approve (not the author of the revision)' });
    assert.deepEqual(no(B.approveRevision(structuredClone(d), 'designer', rev)).why, [CE.needsAuthority('designer', 'approve a design revision', 'room.design.approve')]);
    assert.deepEqual(no(B.approveRevision(structuredClone(d), 'syseng', rev)).why, [CE.notByItsAuthor('the design', 'syseng')], 'the author of the revision does not approve it');
    assert.equal(d.events[0].outcome, 'ALLOWED', 'refusals on a copy leave the draft as it was');
    d = ok(B.approveRevision(d, 'architect', rev));   // holds room.design.approve and did not save the revision
    assert.equal(d.approvedRevision, rev); assert.equal(d.events[0].type, 'room.revision.approve'); assert.equal(B.designBindingReason(d), null);
    no(B.approveRevision(structuredClone(d), 'architect', rev), /not newer than the approved revision/);
    d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED'));
    assert.equal(d.baseline.version, 2); assert.equal(d.baseline.revision, rev, `${change}: baseline v2 binds the newly approved revision`); assert.equal(d.baselines[0].revision, 1);
    no(B.approveRevision(structuredClone(d), 'architect', rev), /only while an accepted room is recommissioned \(R-DEMO-0001 is ACCEPTED\)/);
  }
  // a like-for-like replacement: the design is unchanged — no design approval, the binding holds, re-acceptance needs only the re-runs
  let d = recommissioned(); await tick(); d = ok(B.replaceUnit(d, 'installer', bar(d).id, { why: 'synthetic: like for like' }));
  assert.equal(B.designBindingNow(d).approvedDescribesDesign, true); assert.equal(B.designBindingReason(d), null); assert.equal(B.designBindingTodo(d), null);
  assert.ok(!B.lifecycleConditions(d, 'ACCEPTED').some((x) => /no longer describes it/.test(x)));
  no(B.approveRevision(structuredClone(d), 'syseng', 1), /not newer than the approved revision 1/);
});

test('D-39 — Build a Room accepts the design edits the API accepts and refuses the others with the API’s sentence, recorded as DENIED: every edit while PLANNED (a model change included); while an accepted room is recommissioned only a model substitution (and a like-for-like unit replacement); none during first commissioning or once accepted', async () => {
  const rule = (d, edit) => CE.designEditRefusal({ room: d.code, lifecycle: d.design.lifecycle, recommissioning: !!B.recommissioningBaseline(d), edit });
  const display = (d) => B.live(d.design.devices).find((x) => x.cat === 'display');
  const edits = {
    'add-device': [(d) => B.addDevice(d, 'designer', 'micceil', { x: 1, y: 1 }, 'synthetic: pickup for the far seats'), 'room.device_added'],
    'remove-device': [(d) => B.removeDevice(d, 'designer', display(d).id, 'synthetic: not needed'), 'room.device_removed'],
    'swap-category': [(d) => B.swapDevice(d, 'designer', bar(d).id, 'camera', 'synthetic: a camera instead'), 'room.device_swapped'],
    'substitute-model': [(d) => B.replaceUnit(d, 'designer', bar(d).id, { model: 'SYN-BAR-2 (synthetic)', why: 'synthetic: the newer bar' }), 'room.device_swapped'],
  };
  const refusedHere = (d0, edit) => {
    const [fn, type] = edits[edit]; const d = structuredClone(d0); const n = d.events.length; const want = rule(d0, edit);
    assert.ok(want, `${d0.design.lifecycle}: the rule refuses ${edit}`);
    const r = no(fn(d)); assert.deepEqual(r.why, [want], `${d0.design.lifecycle} ${edit}: the API's sentence`);
    assert.equal(d.events.length, n + 1); assert.deepEqual([d.events[0].type, d.events[0].outcome, d.events[0].by], [type, 'DENIED', 'designer'], `${edit}: recorded as DENIED`); assert.ok(d.events[0].detail.includes(want));
    assert.equal(JSON.stringify([d.design, d.installations, d.assets, d.substitutions, d.designHistory]), JSON.stringify([d0.design, d0.installations, d0.assets, d0.substitutions, d0.designHistory]), `${edit}: nothing else changed`);
  };
  // PLANNED: every edit — added, removed, swapped, and a planned model change (no unit yet: the position's designed model and its design history)
  const p = planned();
  for (const edit of ['add-device', 'remove-device', 'swap-category']) { assert.equal(rule(p, edit), null); ok(edits[edit][0](structuredClone(p))); }
  const pm = ok(edits['substitute-model'][0](structuredClone(p)));
  assert.equal(bar(pm).model, 'SYN-BAR-2 (synthetic)'); assert.deepEqual(pm.installations, [], 'no unit is installed by a planned model change');
  assert.deepEqual(B.positionHistory(pm, bar(pm).id).design.map((h) => [h.kind, h.from, h.to]), [['model', 'generic', 'SYN-BAR-2 (synthetic)']]);
  assert.deepEqual([pm.events[0].type, pm.events[0].outcome, pm.events[0].change.what], ['room.device_swapped', 'ALLOWED', 'model substituted']);
  no(B.replaceUnit(structuredClone(p), 'installer', bar(p).id, { model: 'SYN-BAR-2 (synthetic)' }), /does not hold room\.design/);
  // installed but not commissioned, and first commissioning: no design edit at all (the like-for-like replacement is field work, not a design edit)
  for (const d0 of [installed(), firstCommissioning()]) {
    for (const edit of Object.keys(edits)) refusedHere(d0, edit);
    assert.equal(rule(d0, 'add-device'), `the design is ${d0.design.lifecycle}: changes need a change order`);
    ok(B.replaceUnit(structuredClone(d0), 'installer', bar(d0).id, { why: 'synthetic: like for like' }));
  }
  // recommissioned: a model substitution (and a like-for-like replacement); adding, removing or swapping a device is refused
  const rc = recommissioned();
  for (const edit of ['add-device', 'remove-device', 'swap-category']) refusedHere(rc, edit);
  assert.equal(rule(rc, 'add-device'), 'the design is COMMISSIONING: changes need a change order');
  assert.equal(rule(rc, 'substitute-model'), null); ok(edits['substitute-model'][0](structuredClone(rc)));
  ok(B.replaceUnit(structuredClone(rc), 'installer', bar(rc).id, { why: 'synthetic: like for like' }));
  // accepted, not recommissioned: refused, with the API's pointer to recommissioning
  const acc = structuredClone(rc); acc.design.lifecycle = 'ACCEPTED';
  for (const edit of Object.keys(edits)) refusedHere(acc, edit);
  assert.match(rule(acc, 'add-device'), /an accepted room is recommissioned first \(ACCEPTED → COMMISSIONING, plan\.compile\); a device model can then be substituted$/);
  // the authority refusal comes first, as before, and records nothing
  const n = rc.events.length; no(B.addDevice(rc, 'requestor', 'micceil', { x: 1, y: 1 }), /does not hold room\.design/); assert.equal(rc.events.length, n);
  // the controls read the same rule (BuildRoom disables them and shows the sentence)
  assert.equal(B.editRefusal(rc, 'add-device'), rule(rc, 'add-device')); assert.equal(B.editRefusal(p, 'swap-category'), null); assert.equal(B.editRefusal(rc, 'substitute-model'), null);
});

test('PARITY — the same room through the API’s adapter and through the demonstration’s store: the same reopened tests, reasons, re-run states and acceptance reasons', async () => {
  const toApi = (d) => {
    // the room as the API's tables hold it: the plan rows, the current result of each test, the positions (with their model history), the
    // installation records, and the saved revisions (number, author, snapshot)
    const a = B.analysis(d); const rows = a.applicability.rows.filter((r) => r.applicable).map((r) => ({ test_id: r.id, label: r.label, domain: r.domain, personas: r.personas || [], evidence: r.evidence || [], instrument: !!r.instrument, devices: r.devices || [] }));
    const res = new Map(Object.entries(B.results(d)).map(([id, r]) => [id, { test_id: id, result_label: CE.resultLabel(r), recorded_ms: Date.parse(r.at), recorded_at: r.at }]));
    const positions = B.live(d.design.devices).map((x) => ({ code: x.id, label: x.label, category: x.cat, model: x.model, model_history: (d.designHistory || []).filter((h) => h.position === x.id && h.kind === 'model').map((h) => ({ model: h.from, until: h.at, by: h.by })) }));
    const changes = API.changesFrom(positions, d.installations, Date.parse(d.baseline.at));
    const rv = API.reverificationFrom(rows, res, changes);
    // the design binding as rooms.recommissionImpact computes it (while recommissioned): the revisions, the design now, the model substitutions
    const recom = B.recommissioningBaseline(d);
    const binding = recom ? API.designBindingFact(API.revisionBindingFrom(d.revisions.map((r) => ({ rev_no: r.n, created_by: r.by, snapshot: r.snapshot })), d.approvedRevision, d.design), API.substitutionsFrom(positions, Date.parse(recom.at))) : null;
    const gate = CE.lifecycleBlockers({ from: d.design.lifecycle, to: 'ACCEPTED', classificationApproved: !!d.design.classification.approved && !d.design.classification.approved.stale, openIssues: a.checks, savedRevisions: d.revisions.length, rows: a.applicability.rows, results: d.design.results, hasBaseline: !!d.baseline, hasLiveMonitoringEvidence: false, ...API.gateFacts(rv, changes), designBinding: binding });
    return { rv: rv.map((t) => ({ testId: t.testId, assets: t.assets, reasons: t.reasons, result: t.result, rerun: t.rerun })), gate };
  };
  const toDemo = (d) => ({ rv: B.reverification(d).map((t) => ({ testId: t.testId, assets: t.assets, reasons: t.reasons, result: t.result, rerun: t.rerun })), gate: B.lifecycleConditions(d, 'ACCEPTED') });
  let d = recommissioned(); await tick();
  d = ok(B.replaceUnit(d, 'installer', bar(d).id, { why: 'synthetic: like for like' }));
  const s1 = [toApi(d), toDemo(d)]; assert.deepEqual(s1[0], s1[1], 'after the replacement: every reopened test still to re-run');
  assert.ok(s1[0].rv.length > 0 && s1[0].rv.every((t) => t.rerun)); assert.match(s1[0].gate.join(' | '), /acceptance counts \d+ of \d+ applicable tests as passed and independently verified/);
  await tick();
  const rv = B.reverification(d);
  for (const x of rv.slice(0, 3)) { const r = B.analysis(d).applicability.rows.find((y) => y.id === x.testId); d = ok(B.record(d, 'cxeng', x.testId, { state: 'PASS', kind: r.evidence[0], ref: `synthetic re-run ${x.testId}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined })); }
  const s2 = [toApi(d), toDemo(d)]; assert.deepEqual(s2[0], s2[1], 'after three re-runs: re-run but unverified, and still to re-run');
  assert.equal(s2[0].rv.filter((t) => !t.rerun).length, 3); assert.equal(s2[0].gate.length, 3, J(s2[0].gate));
  for (const x of rv.slice(0, 3)) d = ok(B.verify(d, 'qa_reviewer', x.testId));
  const s3 = [toApi(d), toDemo(d)]; assert.deepEqual(s3[0], s3[1], 'after a different person verified them');
  assert.ok(!s3[0].gate.some((x) => /no longer describes it/.test(x)), 'a like-for-like replacement asks for no design approval, in either');
  // D-38: a model substitution — the design binding, in the API's sentence and in the documented order, from the API's adapter and the store alike
  let m = recommissioned(); await tick();
  m = ok(B.replaceUnit(m, 'designer', bar(m).id, { model: 'SYN-BAR-2 (synthetic)', why: 'synthetic: the newer bar' }));
  const s4 = [toApi(m), toDemo(m)]; assert.deepEqual(s4[0], s4[1], 'after the substitution: the design binding and the reopened tests');
  assert.match(s4[0].gate[0], new RegExp(`^the design changed while the room is recommissioned \\(${bar(m).id} generic → SYN-BAR-2 \\(synthetic\\)\\) and the approved revision 1 no longer describes it: save the change as a revision and have it approved`), J(s4[0].gate));
  assert.match(s4[0].gate[1], /were last recorded before the substitution and must be re-run/); assert.equal(s4[0].gate.length, 2, J(s4[0].gate));
  await tick();
  for (const x of B.reverification(m)) { const r = B.analysis(m).applicability.rows.find((y) => y.id === x.testId); m = ok(B.record(m, 'cxeng', x.testId, { state: 'PASS', kind: r.evidence[0], ref: `synthetic re-run ${x.testId}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined })); }
  for (const x of B.reverification(m)) m = ok(B.verify(m, 'qa_reviewer', x.testId));
  const s5 = [toApi(m), toDemo(m)]; assert.deepEqual(s5[0], s5[1], 'after the re-runs: the design binding alone');
  assert.equal(s5[0].gate.length, 1); assert.match(s5[0].gate[0], /save the change as a revision and have it approved/);
  m = ok(B.saveRevision(m, 'designer', 'synthetic: the substituted bar'));
  const s6 = [toApi(m), toDemo(m)]; assert.deepEqual(s6[0], s6[1], 'after the revision is saved: it needs approval');
  assert.match(s6[0].gate[0], new RegExp(`revision ${m.revisions.length} needs approval \\(room\\.design\\.approve, not its author\\)`));
  m = ok(B.approveRevision(m, 'syseng', m.revisions.length));
  const s7 = [toApi(m), toDemo(m)]; assert.deepEqual(s7[0], s7[1], 'after the approval'); assert.deepEqual(s7[0].gate, [], 'nothing left: the re-acceptance binds the approved revision');
  // D-39: which design edits each state accepts, and the refusal — the API's adapter (domain/design-edits.ts, what rooms.ts runs on POST, PATCH
  // and DELETE of a device) and the store, alike. A category swap is, in the API, a removal and then an addition: it stops at the first.
  const apiEdit = (d, edit) => API_EDITS.designEditFor({ code: d.code, lifecycle: d.design.lifecycle }, !!B.recommissioningBaseline(d), edit);
  const states = { planned: planned(), installed: installed(), firstCommissioning: firstCommissioning(), recommissioned: recommissioned() };
  states.accepted = structuredClone(states.recommissioned); states.accepted.design.lifecycle = 'ACCEPTED';
  for (const [k, d0] of Object.entries(states)) {
    const demo = (fn) => { const r = fn(structuredClone(d0)); return r && 'why' in r ? r.why[0] : null; };
    const disp = (d) => B.live(d.design.devices).find((x) => x.cat === 'display');
    assert.equal(demo((d) => B.addDevice(d, 'designer', 'micceil', { x: 1, y: 1 })), apiEdit(d0, 'add-device'), `${k}: POST /v1/rooms/{room}/devices`);
    assert.equal(demo((d) => B.removeDevice(d, 'designer', disp(d).id)), apiEdit(d0, 'remove-device'), `${k}: DELETE /v1/rooms/{room}/devices/{asset}`);
    assert.equal(demo((d) => B.swapDevice(d, 'designer', bar(d).id, 'camera')), apiEdit(d0, 'remove-device'), `${k}: a category swap (DELETE, then POST)`);
    assert.equal(demo((d) => B.replaceUnit(d, 'designer', bar(d).id, { model: 'SYN-BAR-2 (synthetic)' })), apiEdit(d0, API_EDITS.patchEdit({ model: 'SYN-BAR-2 (synthetic)' })), `${k}: PATCH {model}`);
  }
  assert.equal(API_EDITS.patchEdit({ model: 'SYN-BAR-2 (synthetic)', x: 1 }), 'move-device'); assert.equal(API_EDITS.patchEdit({ x: 1 }), 'move-device'); assert.equal(API_EDITS.patchEdit({}), 'move-device');
  assert.equal(apiEdit(states.recommissioned, 'move-device'), `${states.recommissioned.code} is being recommissioned: only a model substitution is accepted (the asset keeps its id and its position); moving a device needs a change order`);
});
const J = (x) => JSON.stringify(x);
