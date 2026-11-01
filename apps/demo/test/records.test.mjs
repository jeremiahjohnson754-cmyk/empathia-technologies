// Unit tests of the demonstration's records (apps/demo/src/workspace/records.ts): what the KPI passports, Mission Control, APEX and the
// room story read. Truth rules: a status comes only from a record; a history comes from the ledger events that record it; one room has
// one accepted baseline on record, which every page reads.
//   node --test apps/demo/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from './bundle.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const KPI = await import(pathToFileURL(path.join(repo, 'packages/kpi-engine/dist/src/index.js')).href);
const M = await load('src/workspace/records.ts', 'src/workspace/store.ts', 'src/build/store.ts', 'src/story/assemble.ts', 'src/search/estate.ts');
const R = M.workspace_records, W = M.workspace_store, B = M.build_store, A = M.story_assemble, E = M.search_estate;
const ok = (r) => { if (r && typeof r === 'object' && 'why' in r) throw new Error(r.why.join('; ')); return r; };
function commissioning() {
  let d = ok(B.createDraft({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer'));
  d = ok(B.saveRevision(d, 'designer', 'initial layout')); d = ok(B.approveClassification(d, 'syseng'));
  assert.ok('why' in B.transition(d, 'designer', 'DESIGN_APPROVED'), 'a refusal is logged on the way (room.lifecycle:DESIGN_APPROVED, DENIED)');
  for (const [p, to] of [['syseng', 'DESIGN_APPROVED'], ['opslead', 'INSTALLATION_PENDING'], ['installer', 'INSTALLED_UNVERIFIED'], ['syseng', 'COMMISSIONING']]) d = ok(B.transition(d, p, to));
  return d;
}

test('(a) a project’s governance status comes only from its records: the Build a Room room has no funding record, so it is not recorded — never FUNDED', () => {
  const w = W.seed(); const d = commissioning(); const Rs = R.assemble(w, d);
  const p = (id) => Rs.projects.find((x) => x.id === id);
  assert.equal(p(d.code).governance, null, 'no decision and no funding record for the draft');
  assert.ok(!Rs.funding.some((f) => f.projectId === d.code) && !Rs.decisions.some((x) => x.projectId === d.code));
  assert.equal(p('PRJ-ATLAS-AV').governance, 'FUNDED', 'its AUTHORIZED funding record'); assert.equal(p('PRJ-NST-TH').governance, 'APPROVED', 'its latest decision (scope revision 2)');
  const funded = KPI.passports(Rs).find((x) => x.id === 'projects_funded');
  assert.deepEqual(funded.drill, ['PRJ-ATLAS-AV']); assert.equal(funded.numerator, Rs.funding.filter((f) => f.kind === 'AUTHORIZED').length);
});

test('(b) the Build a Room room’s project history is read from its allowed lifecycle changes, oldest first; refusals are not history', () => {
  const w = W.seed(); const d = commissioning(); const h = R.assemble(w, d).projects.find((x) => x.id === d.code).history;
  const allowed = d.events.filter((e) => e.type === 'room.lifecycle_changed' && e.outcome === 'ALLOWED');
  assert.equal(h.length, allowed.length); assert.ok(h.length >= 4, 'not empty');
  assert.deepEqual(h.map((x) => x.to), ['DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'FIELD_ACTIVE'], 'entering COMMISSIONING is field work');
  assert.deepEqual(h.map((x) => x.at), [...allowed].reverse().map((e) => e.at));
  assert.ok(d.events.some((e) => e.type.startsWith('room.lifecycle:') && e.outcome === 'DENIED'), 'the refusal is in the ledger');
  const started = KPI.passports(R.assemble(w, d)).find((x) => x.id === 'projects_started'); assert.ok(started.drill.includes(d.code), 'so the KPI sees it start field work');
});

test('(c) one accepted baseline per room on record: APEX, the KPI records and the story read the same one (Atlas 4.218: v1)', () => {
  const w = W.seed(); const Rs = R.assemble(w, null);
  const kb = Rs.rooms.find((r) => r.id === 'R-ATL-4-218').baseline;
  assert.deepEqual(R.acceptedBaseline(Rs, 'R-ATL-4-218'), { version: kb.version, evidence: kb.applicableTests }); assert.equal(kb.version, 1);
  assert.equal(A.assembleStory('R-ATL-4-218', { draft: null, w, est: E.buildEstate(null), R: Rs }).summary.baseline.version, 1, 'the story says v1 too');
  for (const r of Rs.rooms) assert.deepEqual(R.acceptedBaseline(Rs, r.id), r.baseline ? { version: r.baseline.version, evidence: r.baseline.applicableTests } : null, r.id);
  assert.equal(R.acceptedBaseline(Rs, 'R-NST-2-101'), null, 'the town hall has none: APEX says there is nothing to compare');
  // the draft: its own baseline, once accepted, through the same record
  let d = commissioning(); const app = B.analysis(d).applicability.rows.filter((r) => r.applicable);
  for (const r of app) d = ok(B.record(d, 'cxeng', r.id, { state: 'PASS', kind: r.evidence[0], ref: `synthetic ${r.id}`, instrument: r.instrument ? 'SYN-METER-01 (synthetic)' : undefined }));
  for (const r of app) d = ok(B.verify(d, 'architect', r.id));
  d = ok(B.transition(d, 'qa_reviewer', 'ACCEPTED'));
  assert.deepEqual(R.acceptedBaseline(R.assemble(w, d), d.code), { version: 1, evidence: Object.keys(d.baseline.results).length });
});
