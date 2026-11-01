// Unit tests of the room story assembler (apps/demo/src/story/assemble.ts): it assembles one room's lifecycle from the records the
// demonstration holds, invents nothing, computes its summary from its entries and keeps the evidence labels it was given.
//   node --test apps/demo/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './bundle.mjs';

const M = await load('src/story/assemble.ts', 'src/workspace/store.ts', 'src/search/estate.ts', 'src/workspace/records.ts', 'src/build/store.ts', 'src/build/impact.ts', 'src/registry.ts');
const A = M.story_assemble, W = M.workspace_store, E = M.search_estate, R = M.workspace_records, B = M.build_store, I = M.build_impact, REG = M.registry;
const ok = (r) => { if (r && typeof r === 'object' && 'why' in r) throw new Error(r.why.join('; ')); return r; };
const sources = (w, draft = null) => ({ draft, w, est: E.buildEstate(draft), R: R.assemble(w, draft) });
const stage = (s, k) => s.stages.find((x) => x.key === k);
const allEntries = (s) => s.stages.flatMap((x) => x.entries);

/** A Build a Room draft walked through the governed path to baseline v1, then recommissioned (the store's own functions). */
function acceptedThenRecommissioned() {
  let d = ok(B.createDraft({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer'));
  d = ok(B.saveRevision(d, 'designer', 'initial layout'));
  assert.ok('why' in B.transition(d, 'syseng', 'DESIGN_APPROVED'), 'refused before the classification is approved');   // logs a DENIED event
  d = ok(B.approveClassification(d, 'syseng'));
  d = ok(B.transition(d, 'syseng', 'DESIGN_APPROVED')); d = ok(B.transition(d, 'opslead', 'INSTALLATION_PENDING')); d = ok(B.transition(d, 'installer', 'INSTALLED_UNVERIFIED')); d = ok(B.transition(d, 'syseng', 'COMMISSIONING'));
  const app = B.analysis(d).applicability.rows.filter((r) => r.applicable);
  for (const r of app) d = ok(B.record(d, 'cxeng', r.id, { state: 'PASS', kind: r.evidence[0], ref: `synthetic observation ${r.id}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined }));
  for (const r of app) d = ok(B.verify(d, 'architect', r.id));
  d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED')); d = ok(B.transition(d, 'syseng', 'COMMISSIONING'));
  return { d, applicable: app.length };
}

test('an estate room: entries in several stages, from the graph, the Executive records and the service workspace', () => {
  const w = W.seed(); const s = A.assembleStory('R-ATL-4-218', sources(w));
  assert.equal(s.found, true); assert.equal(s.kind, 'estate');
  assert.equal(s.room.name, 'Atlas 4.218 Boardroom'); assert.equal(s.room.building, 'Atlas Tower'); assert.equal(s.room.site, 'North Campus');
  for (const k of ['request', 'design', 'authorize', 'baseline', 'operate']) assert.ok(stage(s, k).entries.length > 0, `${k} has a record`);
  assert.ok(stage(s, 'operate').entries.some((e) => /ISS-0417/.test(e.what)) && stage(s, 'operate').entries.some((e) => /ISS-0380/.test(e.what)), 'both incidents of the room');
  assert.ok(stage(s, 'request').entries[0].what.includes('REQ-0031'), 'the request of the project the room belongs to');
});

test('nothing is invented: a stage without a record is empty, an unrecorded actor or reason is null, a project without an edge is not linked', () => {
  const w = W.seed(); const s = A.assembleStory('R-ATL-4-218', sources(w));
  assert.equal(stage(s, 'verify').entries.length, 0); assert.equal(stage(s, 'learn').entries.length, 0);
  assert.ok(STAGE_EMPTY(s, 'learn').length > 10, 'an empty stage says how a record would arise');
  const req = stage(s, 'request').entries[0]; assert.equal(req.who, null, 'the seed records no requester');
  const th = A.assembleStory('R-NST-2-101', sources(w));
  assert.equal(stage(th, 'request').entries.length, 0, 'PRJ-NST-TH exists in the records but no edge links it to the town hall');
  assert.equal(stage(th, 'design').entries.length, 0); assert.ok(th.gaps.some((g) => /Devices of this room/.test(g)));
  const none = A.assembleStory('R-NOPE', sources(w)); assert.equal(none.found, false); assert.equal(allEntries(none).length, 0);
});
const STAGE_EMPTY = (s, k) => stage(s, k).empty;

test('the summary is computed from the records, never typed', () => {
  const w = W.seed(); const s = A.assembleStory('R-ATL-4-218', sources(w));
  const openInc = w.incidents.filter((i) => i.roomId === 'R-ATL-4-218' && !['CLOSED', 'CANCELLED'].includes(i.state)).length;
  const openWo = w.workOrders.filter((x) => x.roomId === 'R-ATL-4-218' && !['DONE', 'CANCELLED'].includes(x.state)).length;
  assert.equal(s.summary.open.length, openInc + openWo);
  assert.equal(s.summary.stagesWithRecords, s.stages.filter((x) => x.entries.length).length);
  assert.equal(s.summary.entries, allEntries(s).length);
  assert.equal(s.summary.evidence.reduce((n, [, v]) => n + v, 0), allEntries(s).length);
  const kb = R.assemble(w, null).rooms.find((r) => r.id === 'R-ATL-4-218').baseline;
  assert.equal(s.summary.baseline.version, kb.version); assert.equal(s.summary.tests.verified, kb.verifiedTests); assert.equal(s.summary.tests.applicable, kb.applicableTests);
  assert.match(s.summary.tests.text, /record states/); assert.match(s.summary.tests.source, /declared by the synthetic seed/);
});

test('evidence keeps its label: seeded summaries are DECLARED, diagnoses MODELED, simulations SIMULATED — never promoted', () => {
  const w = W.seed();
  ok(W.openApex(w, 'cxeng', 'ISS-0421', () => []));
  ok(W.fiPropose(w, 'syseng', 'R-ATL-4-220', 'HUD', [{ id: 'TP-1', label: 'seat row 1' }], [{ id: 'LAEQ', label: 'LAeq at seats', adapter: 'ADP-SLM' }]));
  W.fiEligibility(w, 'syseng', w.fiSessions[0].id);
  const s = A.assembleStory('R-ATL-4-220', sources(w));
  assert.ok(stage(s, 'baseline').entries.every((e) => e.evidence === 'DECLARED'), 'a seeded baseline summary is DECLARED');
  const apex = stage(s, 'operate').entries.find((e) => /APEX diagnosis/.test(e.what)); assert.equal(apex.evidence, 'MODELED');
  const fi = stage(s, 'verify').entries.find((e) => /Physical Validation/.test(e.what)); assert.ok(['SIMULATED', 'DECLARED'].includes(fi.evidence));
  assert.ok(!allEntries(s).some((e) => e.evidence === 'PASS_VERIFIED'), 'nothing in a seeded room is a verified result');
  const dep = stage(s, 'operate').entries.find((e) => /^Depends on/.test(e.what)); assert.equal(dep.evidence, 'OBSERVED'); assert.match(dep.detail, /not polled/);
});

test('a Learn case and a refusal of the room reach the story with their actors and reasons', () => {
  const w = W.seed();
  const r = W.proposeCase(w, 'cxeng', 'ISS-0398', { title: 'Blank display at class start', lesson: 'Check the input mapping against the commissioned configuration first.', permission: true, deidentified: true }); ok(r);
  W.smeReview(w, 'cxeng', r.id, 'approve', '');   // refused: the proposer is not the reviewer (separation of duties)
  const s = A.assembleStory('R-ATL-4-231', sources(w));
  const lc = stage(s, 'learn').entries.find((e) => e.what.includes(r.id)); assert.ok(lc); assert.equal(lc.who, 'Commissioning Engineer'); assert.match(lc.why, /ISS-0398/);
  const refusal = allEntries(s).find((e) => e.outcome === 'DENIED'); assert.ok(refusal, 'the refused SME review is in the story'); assert.match(refusal.why, /separation of duties/);
  assert.ok(s.summary.open.some((o) => o.text.includes(r.id)), 'the case awaiting review is an open item');
});

test('a Build a Room draft: design, authorize, commission, verify and baseline from its own records and ledger; a change carries from, to, why and affected objects', () => {
  const { d, applicable } = acceptedThenRecommissioned(); const w = W.seed();
  const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const before = structuredClone(d); const after = ok(B.swapDevice(structuredClone(d), 'designer', bar.id, 'camera', 'like-for-like camera (synthetic)'));
  I.attachImpact(after, I.computeImpact(before, after, w));
  const s = A.assembleStory(after.code, sources(w, after));
  assert.equal(s.kind, 'draft');
  for (const k of ['design', 'authorize', 'commission', 'verify', 'baseline']) assert.ok(stage(s, k).entries.length > 0, `${k} has a record`);
  const swap = stage(s, 'design').entries.find((e) => /swapped for/.test(e.what));
  assert.equal(swap.from, 'Video bar 1 (bar)'); assert.equal(swap.to, 'Camera 1 (camera)'); assert.equal(swap.why, 'like-for-like camera (synthetic)'); assert.equal(swap.who, 'Designer / CAD / Revit');
  assert.ok(swap.items.some((x) => /baseline/.test(x.text)) && swap.items.some((x) => /^device PA-/.test(x.text)), 'affected objects: devices and the baseline');
  assert.match(swap.phase, /while COMMISSIONING · baseline v1 current/);
  // the verifications are events; the re-verification the swap requires is a state of the room (no time, no actor) beside them
  const ver = stage(s, 'verify').entries.filter((e) => !e.state); assert.equal(ver.reduce((n, e) => n + e.items.length, 0), applicable, 'every verification, from the result records');
  assert.ok(ver.every((e) => e.evidence === 'PASS_VERIFIED' && e.who === 'Product Architect'));
  assert.ok(stage(s, 'verify').entries.some((e) => e.state && /^Re-verification required/.test(e.what)), 'the swap during recommissioning requires re-verification');
  assert.equal(stage(s, 'commission').entries.filter((e) => /results? recorded/.test(e.what)).reduce((n, e) => n + e.items.length, 0), applicable);
  const bl = stage(s, 'baseline').entries; assert.equal(bl.length, 1); assert.equal(bl[0].who, 'Document Reviewer / QA'); assert.equal(bl[0].evidence, 'PASS_VERIFIED');
  assert.ok(allEntries(s).some((e) => e.outcome === 'DENIED' && /DESIGN_APPROVED refused/.test(e.what)), 'the refusal in the room ledger');
  assert.equal(s.summary.state.value, 'COMMISSIONING'); assert.equal(s.summary.baseline.version, 1);
  assert.ok(s.summary.open.some((o) => /Recommissioning in progress/.test(o.text)));
  assert.equal(stage(s, 'request').entries.length, 0); assert.ok(s.gaps.some((g) => /intake request/.test(g)));
});

test('every entry links to a page of this demonstration that holds the record', () => {
  const { d } = acceptedThenRecommissioned(); const w = W.seed();
  for (const id of ['R-ATL-4-218', 'R-ATL-4-220', 'R-ATL-4-231', 'R-NST-2-101', d.code]) {
    const s = A.assembleStory(id, sources(w, d));
    for (const e of allEntries(s)) { assert.match(e.href, /^#\//, `${id}: ${e.what}`); assert.ok(REG.NATIVE.has(REG.areaKey(e.href)), `${id}: ${e.href} is a native page`); assert.ok(e.linkLabel.length > 3); }
    for (const o of s.summary.open) assert.ok(REG.NATIVE.has(REG.areaKey(o.href)));
  }
  assert.ok(REG.NATIVE.has(REG.areaKey('#/story/R-ATL-4-218')), 'the story page itself is native');
});

test('a perspective changes density, never data', () => {
  assert.equal(A.densityOf('visitor'), 'narrative'); assert.equal(A.densityOf('employee'), 'narrative');
  assert.equal(A.densityOf('cxeng'), 'technical'); assert.equal(A.densityOf('syseng'), 'technical'); assert.equal(A.densityOf('qa'), 'technical');
  assert.equal(A.densityOf('exec'), 'impact'); assert.equal(A.densityOf('bpm'), 'impact');
  assert.equal(A.assembleStory.length, 2, 'the assembler takes a room and its sources — no perspective');
});

test('a swap during recommissioning: “Re-verification required” under Verify, linked to the plan, names each reopened test with its reasons; their results no longer count', () => {
  const { d } = acceptedThenRecommissioned(); const w = W.seed(); const bar = B.live(d.design.devices).find((x) => x.cat === 'bar');
  const before = structuredClone(d); const after = ok(B.swapDevice(structuredClone(d), 'designer', bar.id, 'camera', 'like-for-like camera (synthetic)'));
  I.attachImpact(after, I.computeImpact(before, after, w));
  const rv = B.reverification(after); const s = A.assembleStory(after.code, sources(w, after));
  const e = stage(s, 'verify').entries.find((x) => /^Re-verification required/.test(x.what));
  assert.ok(e, 'the entry is under Verify'); assert.equal(e.href, '#/v25/build?tab=checks'); assert.equal(e.linkLabel, 'Open the plan'); assert.equal(e.state, true); assert.equal(e.evidence, 'DERIVED');
  assert.equal(e.items.length, rv.length); assert.ok(rv.every((t) => e.items.some((x) => x.text.startsWith(`${t.testId} · `) && x.text.includes(t.reasons[0]) && x.text.includes('recorded on the previous device · must be re-run and verified again'))));
  assert.match(e.what, new RegExp(`${rv.length} tests reopened by the substitution of Video bar 1 while baseline v1 is recommissioned`));
  assert.ok(s.summary.open.some((o) => /^Re-verification required/.test(o.text) && o.href === '#/v25/build?tab=checks'));
  assert.equal(s.summary.tests.verified, B.analysis(after).counts.verified - rv.length, 'the summary no longer counts the reopened results'); assert.match(s.summary.tests.text, /reopened by a substitution no longer count/);
  const swap = stage(s, 'design').entries.find((x) => /swapped for/.test(x.what)); assert.match(swap.impact, new RegExp(`${rv.length} tests reopened`));
  const recs = stage(s, 'commission').entries.filter((x) => /results? recorded/.test(x.what)).flatMap((x) => x.items);
  assert.equal(recs.filter((x) => /recorded on the previous device/.test(x.text)).length, rv.length, 'each reopened result is marked where it is listed');
  assert.equal(s.summary.baseline.version, 1); assert.equal(s.summary.baseline.state, 'CURRENT');
});
