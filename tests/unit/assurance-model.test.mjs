#!/usr/bin/env node
// The Assurance estate model (apps/demo/src/assurance/model.ts, 13 Nov 2026): V2.5.3's remedies, cost model, ready checks, change impact
// and signals on this campus's records. Each rule the pages state is checked here against the records.
//   node --test tests/unit/assurance-model.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'as-model-'));
fs.writeFileSync(path.join(tmp, 'entry.ts'), `export * from '${repo}/apps/demo/src/assurance/model.ts';\nexport { seed } from '${repo}/apps/demo/src/workspace/store.ts';\nexport { allRecords, openIssues, DEMO_NOW } from '${repo}/apps/demo/src/campus/design.ts';\n`);
await esbuild.build({ entryPoints: [path.join(tmp, 'entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const M = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const W = M.seed(); const I = W.incidents; const recs = M.allRecords();

test('every room is sorted into at most one remedy, by the stated rules, most severe first', () => {
  for (const r of recs) {
    const rem = M.remedyOf(r, I); const open = M.openIssues(r);
    if (open.some(M.isLayoutIssue)) assert.equal(rem, 'redesign', r.outline.id);
    else if (open.some((i) => /missing_required_equipment/.test(i.source))) assert.equal(rem, 'replace', r.outline.id);
    else if (r.counts.failed || open.some((i) => i.severity === 'High')) assert.equal(rem, 'minor', r.outline.id);
    else if (!open.length && !r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE') && !I.some((i) => i.roomId === r.outline.id && !['CLOSED', 'CANCELLED'].includes(i.state))) assert.equal(rem, null, r.outline.id);
  }
  assert.equal(M.remedyOf(recs.find((r) => r.outline.id === 'R-MER-1-140'), I), 'redesign');
});

test('the cost model: eighteen components; a recommissioning buys nothing; a replacement prices its equipment and what follows from it', () => {
  assert.equal(M.BUDGET_COMPONENTS.length, 18);
  const a = M.costScope({ level: 'A', hw: [], relocate: 0, furniture: null, reconfig: true, extra: [] });
  const line = (c, k) => c.lines.find((l) => l.k === k);
  assert.equal(line(a, 'equipment').hi, 0); assert.equal(line(a, 'commissioning').lo, 300); assert.equal(line(a, 'commissioning').hi, 900);   // 3–6 h at $110–150
  const b = M.costScope({ level: 'B', hw: [{ cat: 'dsp', qty: 1, action: 'add' }], relocate: 0, furniture: null, reconfig: true, extra: [] });
  assert.equal(line(b, 'equipment').lo, 2600); assert.equal(line(b, 'equipment').hi, 6400);
  assert.ok(line(b, 'tax').hi > 0 && line(b, 'contingency').hi > 0 && line(b, 'network').hi > 0 && line(b, 'licenses').hi > 0);
  assert.equal(b.capexLo, b.lines.filter((l) => l.kind === 'capex').reduce((s, l) => s + l.lo, 0));
  const E = M.assuranceEstate(I); assert.equal(E.withRemedy.length, Object.values(E.byRemedy).reduce((s, x) => s + x.n, 0)); assert.ok(E.lo > 0 && E.hi > E.lo);
});

test('which way it is moving: four weeks; an issue opened on the record shows up only in the weeks after it was opened', () => {
  const tr = M.assuranceTrend(I); assert.equal(tr.length, 4);
  for (const w of tr) assert.equal(w.match + w.drift + w.fail, w.total);
  const opened = Date.parse(recs.find((r) => r.outline.id === 'R-ATL-7-112').events.find((e) => e.type === 'issue.opened').at);
  const r = recs.find((x) => x.outline.id === 'R-ATL-7-112');
  assert.equal(M.worstAt(r, I, opened - 864e5), 'match'); assert.equal(M.worstAt(r, I, opened + 864e5), 'drift');
});

test('ready checks: eleven for each high and mission-critical room in use; the answer is the worst check; standard rooms are not listed', () => {
  const L = M.readyList(I); assert.ok(L.length > 50);
  for (const x of L) { assert.equal(x.checks.length, 11); assert.notEqual(x.crit, 'Standard'); const worst = x.checks.some((c) => c.out === 'attention') ? 'attention' : x.checks.some((c) => c.out === 'note') ? 'note' : 'ready'; assert.equal(x.out, worst); }
  assert.equal(L[0].room.outline.id, 'R-ATL-4-218'); assert.equal(L[0].out, 'attention');
  const s = M.nextSession(L[0].room, W); assert.equal(s.generated, false);   // 4.218 has a booking on the workspace
});

test('change impact: a floor switch reaches only that floor’s rooms; mission-critical rooms come first; a room’s layout change reaches one room', () => {
  const i = M.changeImpact('network', 'ATL/4'); assert.ok(i.rooms.length > 0 && i.rooms.every((r) => r.outline.building === 'ATL' && r.outline.floor === 4));
  const w = i.rooms.map((r) => M.CRIT_W[M.criticalityOf(r)]); assert.deepEqual(w, [...w].sort((a, b) => b - a));
  assert.equal(M.changeImpact('layout', 'R-MER-1-140').rooms.length, 1);
  for (const c of M.plannedChanges(recs, I)) assert.ok(M.changeImpact(c.kind, c.target).rooms.length >= 1, c.name);
});

test('signals hold at least two signs from the records, and never a failure date; deficiencies get a target by severity', () => {
  for (const s of M.maintenanceSignals(I)) { assert.ok(s.evidence.length >= 2); assert.ok(!s.evidence.some((e) => /will fail|fails on|failure date/i.test(e))); }
  for (const r of recs) for (const i of M.openIssues(r)) { const m = M.deficiencyMeta(r, i); if (m.due !== 'before installation') assert.equal((Date.parse(m.due) - Date.parse(m.found)) / 864e5, M.TARGET_DAYS[i.severity]); }
});
