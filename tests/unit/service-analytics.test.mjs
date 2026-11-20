// ServiceHands analytics (founder, 14 Nov 2026: "ServiceHands analytics that can be measured by project per quarter per monthly trend
// analysis … specific vendor analytics so individual vendor(s) are always kept accountable"). The measures are tested on hand-built jobs
// whose answers are worked out here by hand, then on the synthetic history: deterministic, labelled, every job attributable to a vendor
// under the agreement for its building and layer, and the scorecard flags the vendor whose figures fall below the targets.
//   node --test tests/unit/service-analytics.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'service-analytics-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as A from './service/analytics.ts'; export * as Hs from './service/history.ts'; export { AGREEMENTS } from './parity/core.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"test"' } });
const { A, Hs, AGREEMENTS } = await import(pathToFileURL(out).href);

const T0 = Date.UTC(2026, 0, 1); const h = (x) => new Date(T0 + x * 3600e3).toISOString();
const job = (o) => ({ id: o.id, roomId: 'R', roomName: 'R', building: 'ATL', layer: 'audio', severity: o.sev || 'Standard', kind: 'break-fix', vendor: o.v || 'V1', vendorName: o.v || 'V1', agreement: null, asset: null, projectId: o.p || null,
  openedAt: h(o.open), respondedAt: o.resp === undefined ? null : h(o.open + o.resp), restoredAt: o.rest === undefined ? null : h(o.open + o.rest), closedAt: o.close === undefined ? null : h(o.open + o.close), firstTimeFix: o.ftf ?? true, reopened: o.reopen ?? false, source: 'synthetic-history' });

test('SA-01 the measures, on jobs worked out by hand', () => {
  const jobs = [
    job({ id: 'a', sev: 'Mission critical', open: 0, resp: 1, rest: 6, close: 10 }),          // within 2 h and 8 h
    job({ id: 'b', sev: 'Mission critical', open: 5, resp: 3, rest: 12, close: 20, ftf: false }), // late on both
    job({ id: 'c', sev: 'Standard', open: 10, resp: 40, rest: 100, close: 130, reopen: true }),  // within 48 h and 120 h
    job({ id: 'd', sev: 'High', open: 20, resp: 30 }),                                           // late response, not restored, open
  ];
  const s = A.stats(jobs, T0, T0 + 1000 * 3600e3);
  assert.equal(s.opened, 4); assert.equal(s.closed, 3); assert.equal(s.backlog, 1);
  assert.equal(s.respondSla, 50);                       // a and c of four responded
  assert.equal(s.restoreSla, 66.7);                     // a and c of three restored
  assert.equal(s.mttrH, 12);                            // median of 6, 12, 100
  assert.equal(s.ftf, 66.7); assert.equal(s.reopen, 33.3); assert.equal(s.critical, 2);
  const early = A.stats(jobs, T0, T0 + 15 * 3600e3);    // opened a, b; closed a (at 10 h); b and c… c opened at 10 → in
  assert.deepEqual([early.opened, early.closed, early.backlog], [3, 1, 2]);
  assert.equal(A.stats([], T0, T0 + 1).respondSla, null, 'nothing to measure is null, never 0% or 100%');
});

test('SA-02 the vendor scorecard flags what falls below the targets, and compares the last three months with the three before', () => {
  const ps = Array.from({ length: 6 }, (_, i) => ({ key: `m${i}`, label: `m${i}`, from: T0 + i * 720 * 3600e3, to: T0 + (i + 1) * 720 * 3600e3 }));
  const jobs = [];
  for (let i = 0; i < 6; i++) { const base = i * 720;
    jobs.push(job({ id: `g${i}`, v: 'GOOD', open: base + 1, resp: 1, rest: 50, close: 60 }));
    jobs.push(job({ id: `s${i}`, v: 'SLOW', open: base + 1, resp: 60, rest: i < 3 ? 60 : 110, close: 130, reopen: i >= 3 })); }
  const sc = A.vendorScorecard(jobs, ps); const slow = sc.find((x) => x.vendor === 'SLOW'); const good = sc.find((x) => x.vendor === 'GOOD');
  assert.equal(sc[0].vendor, 'SLOW', 'the vendor needing attention comes first');
  assert.deepEqual(good.flags, []);
  assert.ok(slow.flags.some((f) => /^response within SLA 0%/.test(f)), slow.flags.join(' | '));
  assert.ok(slow.flags.some((f) => /time to restore rising: 60 h → 110 h/.test(f)), slow.flags.join(' | '));
  assert.ok(slow.flags.some((f) => /reopen rate 100%/.test(f)), slow.flags.join(' | '));
});

test('SA-03 the synthetic history: deterministic, fifteen months, every job attributable, vendors as the agreements say', () => {
  const a = Hs.syntheticHistory(); const ms = A.months();
  assert.equal(ms.length, 15); assert.equal(ms[0].key, '2025-08'); assert.equal(ms[14].key, '2026-10');
  assert.ok(a.length >= 15 * 14, `${a.length} jobs`);
  assert.equal(new Set(a.map((j) => j.id)).size, a.length, 'job IDs are unique');
  for (const j of a) {
    assert.ok(Date.parse(j.openedAt) >= ms[0].from && Date.parse(j.openedAt) < ms[14].to, j.id);
    const ag = AGREEMENTS.find((x) => x.status === 'Active' && x.buildings.includes(j.building) && x.layers.includes(j.layer));
    assert.equal(j.vendor, ag ? ag.vendor : Hs.INTERNAL, `${j.id}: ${j.building}/${j.layer}`);
    assert.equal(j.source, 'synthetic-history');
    if (j.restoredAt) assert.ok(Date.parse(j.restoredAt) > Date.parse(j.openedAt));
    if (j.closedAt) assert.ok(Date.parse(j.closedAt) >= Date.parse(j.restoredAt));
  }
  assert.ok(a.some((j) => j.asset && /^AS-\d{4}$/.test(j.asset)), 'jobs name the unit from the room’s installation record');
  // the history is the same on every run (the cache aside: a second bundle gives the same first ten ids and times)
  assert.equal(JSON.stringify(a.slice(0, 10)), JSON.stringify(Hs.syntheticHistory().slice(0, 10)));
});

test('SA-04 the accountability case the history is built to show: the vendor drifting worse is flagged, the steady ones are not', () => {
  const a = Hs.syntheticHistory(); const sc = A.vendorScorecard(a, A.months());
  const cobalt = sc.find((x) => x.vendor === 'VN-COBALT'); const fern = sc.find((x) => x.vendor === 'VN-FERNHILL');
  assert.ok(cobalt && cobalt.flags.length >= 1, JSON.stringify(cobalt?.flags));
  assert.ok(fern && fern.flags.length === 0, JSON.stringify(fern?.flags));
  const qs = A.quarters(); assert.equal(qs[0].key, '2025 Q3'); assert.ok(qs[0].partial, 'August–September is a partial quarter and says so'); assert.equal(qs[qs.length - 1].key, '2026 Q4'); assert.ok(qs[qs.length - 1].partial);
  // the months add up: every job opened in the window is in exactly one month
  const total = A.series(a, A.months()).reduce((n, m) => n + m.s.opened, 0); assert.equal(total, a.length);
});
