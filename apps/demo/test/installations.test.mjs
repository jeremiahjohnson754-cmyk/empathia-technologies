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
const M = await load('src/build/impact.ts', 'src/build/store.ts', 'src/workspace/store.ts', 'src/story/assemble.ts', 'src/search/estate.ts', 'src/workspace/records.ts');
const I = M.build_impact, B = M.build_store, W = M.workspace_store, A = M.story_assemble, E = M.search_estate;
const ok = (r) => { if (r && typeof r === 'object' && 'why' in r) throw new Error(r.why.join('; ')); return r; };
const no = (r, re) => { assert.ok(r && 'why' in r, 'refused'); if (re) assert.match(r.why.join(' | '), re); return r; };
const tick = () => new Promise((r) => setTimeout(r, 5));   // time passes between a change and the next records (as it does on site)

function planned() { const d = ok(B.createDraft({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer')); return ok(B.saveRevision(d, 'designer', 'initial layout')); }
function installed() { let d = planned(); d = ok(B.approveClassification(d, 'syseng')); for (const [p, to] of [['syseng', 'DESIGN_APPROVED'], ['opslead', 'INSTALLATION_PENDING'], ['installer', 'INSTALLED_UNVERIFIED']]) d = ok(B.transition(d, p, to)); return d; }
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

test('PARITY — the same room through the API’s adapter and through the demonstration’s store: the same reopened tests, reasons, re-run states and acceptance reasons', async () => {
  const toApi = (d) => {
    // the room as the API's tables hold it: the plan rows, the current result of each test, the positions, the installation records
    const a = B.analysis(d); const rows = a.applicability.rows.filter((r) => r.applicable).map((r) => ({ test_id: r.id, label: r.label, domain: r.domain, personas: r.personas || [], evidence: r.evidence || [], instrument: !!r.instrument, devices: r.devices || [] }));
    const res = new Map(Object.entries(B.results(d)).map(([id, r]) => [id, { test_id: id, result_label: CE.resultLabel(r), recorded_ms: Date.parse(r.at), recorded_at: r.at }]));
    const positions = B.live(d.design.devices).map((x) => ({ code: x.id, label: x.label, category: x.cat, model: x.model, model_history: [] }));
    const changes = API.changesFrom(positions, d.installations, Date.parse(d.baseline.at));
    const rv = API.reverificationFrom(rows, res, changes);
    const gate = CE.lifecycleBlockers({ from: d.design.lifecycle, to: 'ACCEPTED', classificationApproved: !!d.design.classification.approved && !d.design.classification.approved.stale, openIssues: a.checks, savedRevisions: d.revisions.length, rows: a.applicability.rows, results: d.design.results, hasBaseline: !!d.baseline, hasLiveMonitoringEvidence: false, ...API.gateFacts(rv, changes) });
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
});
const J = (x) => JSON.stringify(x);
