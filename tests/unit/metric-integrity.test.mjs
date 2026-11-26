// Metric integrity (founder's commercial-readiness directive, 25 Nov 2026, §4.6): the numbers Mission Control, the campus pages and the
// rooms list show reconcile with the records that produce them; a high average never hides a room at risk; a room the record cannot score
// is never counted healthy; the parts of a headline add up to it; every number on the home page has a definition. Pure functions, against
// the real synthetic records, the real access policy and every role.   node --test tests/unit/metric-integrity.test.mjs
// The browser check of the same rules on the rendered page (the hero button opens the record the sentence names) is in
// tests/browser/demo-core.test.mjs, MC-*-first.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const entry = `export * as M from './campus/metrics.ts'; export * as MI from './campus/mission.ts'; export * as DEF from './campus/definitions.ts'; export * as D from './campus/design.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts';`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metric-integrity-')); const out = path.join(dir, 'm.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false, nodePaths: [path.join(repo, 'node_modules')],
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined); } }] });
const { M, MI, DEF, D, W, P, R } = await import(pathToFileURL(out).href);
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

const w = W.seed(); const recs = D.allRecords();
const opensFor = (role) => (href) => { const r = R.resolve(href.split('?')[0]); return !!r && P.canOpen(role, r); };
const per = (ws) => recs.map((r) => { const h = M.roomHealth(r, ws); const iss = M.roomIssues(r, ws); return { r, h, iss }; });

test('MI-01 the room bands add up to every room, the first three to the scored rooms (131 healthy and 135 scored are both right)', () => {
  const c = M.campusStats(w);
  assert.equal(c.healthy + c.monitor + c.action + c.unscored, c.rooms);
  assert.equal(c.healthy + c.monitor + c.action, c.scored);
  assert.equal(c.rooms, recs.length);
  assert.equal(c.unscored, per(w).filter((x) => x.h.score == null).length);
});

test('MI-02 rooms needing attention and rooms at risk are counted from the rooms, and at risk is a part of needing attention', () => {
  const c = M.campusStats(w); const rows = per(w);
  const risk = rows.filter((x) => x.h.band === 'action' || x.iss.some((i) => i.severity === 'High'));
  const att = rows.filter((x) => risk.includes(x) || x.iss.length || (x.h.score != null && x.h.band !== 'healthy'));
  assert.equal(c.atRisk, risk.length); assert.equal(c.attention, att.length);
  assert.ok(risk.every((x) => att.includes(x)));
  assert.equal(M.attentionQueue(w).length, c.attention, 'the queue Mission Control works from is the same population');
  assert.equal(c.high, rows.reduce((n, x) => n + x.iss.filter((i) => i.severity === 'High').length, 0), 'critical issues: open, severity High');
  assert.equal(c.highRooms, rows.filter((x) => x.iss.some((i) => i.severity === 'High')).length);
  assert.ok(c.highRooms <= c.atRisk, 'every room holding a critical issue is at risk');
  // the records today: the reviewer saw 18 needing attention and 6 critical issues; both are still what the records hold
  assert.equal(c.attention, 18); assert.equal(c.high, 6); assert.equal(c.atRisk, 6);
});

test('MI-03 a high average never hides a room at risk: no area with a room at risk reads Healthy, on the campus, any building or floor', () => {
  const c = M.campusStats(w);
  assert.ok(c.score >= 88, `the campus average is high (${c.score}), which is the case the rule exists for`);
  assert.notEqual(c.band, 'healthy', 'the campus has rooms at risk'); assert.equal(c.meanBand, 'healthy', 'the mean alone would have said Healthy');
  assert.equal(c.score, Math.round(per(w).filter((x) => x.h.score != null).reduce((s, x) => s + x.h.score, 0) / c.scored), 'the average itself is not lowered');
  for (const s of [...c.buildings, ...c.sites]) {
    if (s.atRisk) assert.notEqual(s.band, 'healthy', `${s.b.key}: ${s.atRisk} at risk yet Healthy`);
    if (s.atRisk) assert.notEqual(s.band, 'none', `${s.b.key}: a room at risk is shown, even when nothing is scored`);
    if (!s.atRisk) assert.equal(s.band, M.bandOf(s.score), `${s.b.key}: without a room at risk the status is the band of the mean`);
    const floors = [...new Set(recs.filter((r) => r.outline.building === s.b.key).map((r) => r.outline.floor))];
    for (const f of floors) { const fs_ = M.buildingStats(s.b.key, w, f); if (fs_.atRisk) assert.notEqual(fs_.band, 'healthy', `${s.b.key} floor ${f}`); }
  }
  const atl = c.buildings.find((b) => b.b.key === 'ATL');
  assert.ok(atl.atRisk >= 1 && atl.band !== 'healthy' && atl.lowest.id === 'R-ATL-4-218' && atl.lowest.score === 77, `Atlas: ${JSON.stringify({ s: atl.score, band: atl.band, risk: atl.atRisk, low: atl.lowest })}`);
});

test('MI-04 unknown is never healthy: an unscored room is never in the Healthy band, and an unscored room with a High issue is at risk', () => {
  for (const x of per(w)) {
    if (x.h.score == null) assert.equal(x.h.band, 'none', x.r.outline.id);
    if (x.h.score == null && x.iss.some((i) => i.severity === 'High')) assert.ok(M.atRisk(x.h, x.iss), x.r.outline.id);
  }
  const unscoredRisk = per(w).filter((x) => x.h.score == null && M.atRisk(x.h, x.iss));
  assert.ok(unscoredRisk.length >= 2, 'the records hold unscored rooms with an open High design deficiency (MER 1.130, BCN 3.237)');
  // and the queue puts them with the rooms at risk, ahead of every room that is not at risk (until 25 Nov they came after Low issues)
  const q = M.attentionQueue(w); const lastRisk = q.map((x) => x.risk).lastIndexOf(true); const firstNot = q.findIndex((x) => !x.risk);
  assert.ok(lastRisk < firstNot, `at-risk rooms first: last at risk ${lastRisk}, first not ${firstNot}`);
  for (const x of unscoredRisk) assert.ok(q.findIndex((y) => y.r.outline.id === x.r.outline.id) < firstNot, x.r.outline.id);
  assert.equal(M.areaStatus(null, 0), 'none'); assert.equal(M.areaStatus(null, 1), 'monitor'); assert.equal(M.areaStatus(99, 1), 'monitor'); assert.equal(M.areaStatus(99, 0), 'healthy'); assert.equal(M.areaStatus(60, 1), 'action');
});

test('MI-05 closing the critical request lowers the counts everywhere at once, and the area statuses follow', () => {
  const w2 = structuredClone(w); w2.incidents.find((i) => i.id === 'ISS-0417').state = 'CLOSED';
  const a = M.campusStats(w), b = M.campusStats(w2);
  assert.equal(b.high, a.high - 1); assert.equal(b.highRooms, a.highRooms - 1); assert.equal(b.atRisk, a.atRisk - 1);
  assert.equal(b.attention, a.attention, 'Atlas 4.218 still needs attention: its sightline finding is open');
  assert.ok(b.score >= a.score);
});

test('MI-06 the headline for every role: the items waiting for it, whose parts by verb add up to it; decisions are only what a person decides', () => {
  const all = MI.priorities(w);
  for (const role of P.ROLE_KEYS) {
    const { mine, others } = MI.prioritiesFor(role, opensFor(role), all);
    const by = (v) => mine.filter((p) => p.verb === v).length;
    assert.equal(by('Take action') + by('Resume') + by('Review'), mine.length, role);
    assert.ok(mine.every((p) => opensFor(role)(p.href)), `${role}: an item it cannot open`);
    assert.equal(new Set([...mine, ...others].map((p) => p.id)).size, mine.length + others.length, `${role}: an item counted twice`);
    assert.ok(mine.length + others.length <= all.length, role);
    // a decision is a Review: never a triage, a repair or an issue (the home page used to call 21 items decisions; 3 were)
    for (const p of mine.filter((x) => x.verb === 'Review')) assert.ok(/^(Approve or refuse|Accept baseline|Fund )/.test(p.title), `${role}: ${p.title}`);
  }
  assert.equal(all.filter((p) => p.verb === 'Review').length, 3);
});

test('MI-07 the record the home sentence names first is the record its button opens: the most severe issue of the first room at risk', () => {
  const q = M.attentionQueue(w); const first = q[0]; const iss = first.issues[0];
  assert.equal(first.r.outline.id, 'R-ATL-4-218'); assert.equal(iss.id, 'ISS-0417'); assert.equal(iss.severity, 'High'); assert.ok(iss.live && iss.href === '#/v25/service?id=ISS-0417');
  // the newest live request, which the button used to open, is another record
  const newest = MI.incidents(w).find((i) => i.live); assert.equal(newest.id, 'ISS-0421'); assert.notEqual(newest.id, iss.id);
  assert.equal(first.issues.findIndex((i) => i.severity !== 'High') === -1 || first.issues.findIndex((i) => i.severity === 'High') <= first.issues.findIndex((i) => i.severity !== 'High'), true, 'most severe first');
});

test('MI-08 every number on the home page has a definition with a meaning, population, exclusions, denominator, evidence and freshness', () => {
  for (const id of DEF.HOME_METRICS) {
    const m = DEF.METRICS[id]; assert.ok(m, id); assert.equal(m.id, id);
    for (const k of ['label', 'meaning', 'counts', 'excludes', 'denominator', 'evidence', 'freshness', 'roles']) assert.ok(typeof m[k] === 'string' && m[k].length > 0, `${id}.${k}`);
    assert.ok(['MODELED', 'NOT_AVAILABLE'].includes(m.evidence), id);
    assert.doesNotMatch(`${m.meaning} ${m.counts}`, /\b(live monitoring|measured|real-time)\b/i, `${id} claims evidence it does not have`);
  }
  assert.equal(new Set(DEF.HOME_METRICS.map((id) => DEF.METRICS[id].label)).size, DEF.HOME_METRICS.length, 'one label for one number');
  assert.equal(DEF.METRICS['actions.overdue'].evidence, 'NOT_AVAILABLE', 'no record carries a due date: overdue is not computed, and says so');
});
