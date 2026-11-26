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
const entry = `export * as M from './campus/metrics.ts'; export * as MI from './campus/mission.ts'; export * as DEF from './campus/definitions.ts'; export * as D from './campus/design.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as XS from './export/service.ts'; export * as XA from './export/as.ts'; export * as REC from './champion/recognition.ts'; export * as V from './pages/viz.tsx'; export * as TW from './parity/Tower.tsx'; export * as H from './service/history.ts'; export * as AN from './service/analytics.ts'; export * as PC from './parity/core.ts'; export * as PS from './parity/sets.ts'; export * as AR from './campus/asRecord.ts';`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metric-integrity-')); const out = path.join(dir, 'm.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false, nodePaths: [path.join(repo, 'node_modules')],
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined); } }] });
const { M, MI, DEF, D, W, P, R, XS, XA, REC, V, TW, H, AN, PC, PS, AR } = await import(pathToFileURL(out).href);
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

// MI-09 and MI-10 (26 Nov 2026, found during the 4231f6a2 regression): "open service request" had three rules. The campus and
// Mission Control counted OPEN to VERIFYING and REOPENED; Pro's Issue Intelligence, the commissioning and assurance pages and three
// exports counted anything not CLOSED or CANCELLED, so the RESOLVED request in the seed (ISS-0402, "fixed and checked") was open there
// and not on Mission Control; the role home and the champion's site pages listed two states that do not exist and left VERIFYING and
// REOPENED out. Two rules now live in workspace/requests.ts: open (not fixed yet;
// definitions.ts, requests.open) and not closed (still on the service board, never labelled open). Every page reads one of them.
const OPEN_STATES = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED'];
const by = { role: 'svcmgr', at: '2026-11-26T00:00:00Z', build: 'test' };
test('MI-09 one rule for an open service request: resolved is not open, and Mission Control, the service queue, the room report and the site handover agree', () => {
  assert.ok(w.incidents.some((i) => i.state === 'RESOLVED'), 'the seed holds a request resolved but not closed, so this check tests something');
  assert.equal(typeof M.isOpenRequest, 'function', 'campus/metrics.ts exports the rule');
  for (const s of ['RESOLVED', 'OPEN', 'VERIFYING']) assert.equal(M.isUnclosedRequest({ state: s }), true, s);
  for (const s of ['CLOSED', 'CANCELLED']) assert.equal(M.isUnclosedRequest({ state: s }), false, s);
  for (const s of ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']) assert.equal(M.isOpenRequest({ state: s }), OPEN_STATES.includes(s), s);
  const mc = MI.incidents(w).filter((i) => i.live).length;   // Mission Control's "Open service requests"
  assert.equal(w.incidents.filter(M.isOpenRequest).length, mc);
  assert.match(XS.serviceQueuePackage(w, by).sections.find((s) => s.id === 'standing').text[0], new RegExp(`^${mc} open request`), 'the service queue export');
  const room = w.incidents.find((i) => i.state === 'RESOLVED').roomId; const r = recs.find((x) => x.outline.id === room);
  const kpi = XA.asPackage(r, w.incidents, by).kpis.find((k) => k.label === 'Open service requests');
  assert.equal(kpi.value, String(w.incidents.filter((i) => i.roomId === room && M.isOpenRequest(i)).length), 'the room assurance report');
  // the trend beside an "open" tile ends on the tile's number: a request leaves the backlog when it was fixed, not when it was closed
  assert.equal(typeof M.requestFixedAt, 'function');
  assert.equal(V.weekBacklog(w.incidents, (i) => i.openedAt, M.requestFixedAt).at(-1), mc, 'the open-jobs trend ends on the open count');
  // when a request was fixed: its last move out of the open states, which is the fix, not the later close (review of dd83dfe7)
  const h = (...xs) => xs.map(([to, at]) => ({ to, at, by: 't' }));
  assert.equal(M.requestFixedAt({ state: 'CLOSED', openedAt: '2026-10-01T00:00:00Z', closedAt: '2026-10-20T00:00:00Z', history: h(['OPEN', '2026-10-01T00:00:00Z'], ['VERIFYING', '2026-10-05T00:00:00Z'], ['RESOLVED', '2026-10-06T00:00:00Z'], ['CLOSED', '2026-10-20T00:00:00Z']) }), '2026-10-06T00:00:00Z', 'resolved on the 6th, closed on the 20th: fixed on the 6th');
  assert.equal(M.requestFixedAt({ state: 'CLOSED', openedAt: '2026-10-01T00:00:00Z', closedAt: '2026-10-30T00:00:00Z', history: h(['OPEN', '2026-10-01T00:00:00Z'], ['RESOLVED', '2026-10-06T00:00:00Z'], ['REOPENED', '2026-10-09T00:00:00Z'], ['RESOLVED', '2026-10-12T00:00:00Z'], ['CLOSED', '2026-10-30T00:00:00Z']) }), '2026-10-12T00:00:00Z', 'reopened and fixed again: the second fix');
  assert.equal(M.requestFixedAt({ state: 'CANCELLED', openedAt: '2026-10-01T00:00:00Z', closedAt: null, history: h(['OPEN', '2026-10-01T00:00:00Z'], ['CANCELLED', '2026-10-03T00:00:00Z']) }), '2026-10-03T00:00:00Z', 'canceled: when it was canceled');
  assert.equal(M.requestFixedAt({ state: 'REOPENED', openedAt: '2026-10-01T00:00:00Z', history: h(['OPEN', '2026-10-01T00:00:00Z'], ['RESOLVED', '2026-10-06T00:00:00Z'], ['REOPENED', '2026-10-09T00:00:00Z']) }), null, 'reopened: open, not fixed');
  const w2 = structuredClone(w); const j = w2.incidents.find((i) => i.state === 'TRIAGED'); j.state = 'VERIFYING';
  assert.ok(REC.handover(w2, j.buildingKey, 0).open.some((x) => x.startsWith(`${j.id}:`)), 'a request awaiting verification is still open at its site');
  j.state = 'REOPENED'; assert.ok(REC.handover(w2, j.buildingKey, 0).open.some((x) => x.startsWith(`${j.id}:`)), 'a reopened request is open at its site');
  // the service queue export's headline: the requests not open are said as resolved and as closed or canceled, each its own number
  const notClosed = w.incidents.filter(M.isUnclosedRequest).length;
  const head = XS.serviceQueuePackage(w, by).headline;
  assert.match(head, new RegExp(`${notClosed - mc} resolved, waiting to be closed`), head);
  assert.match(head, new RegExp(`${w.incidents.length - notClosed} closed or canceled`), head);
  // the Control Tower's queue: a canceled request is not open there either (review of dd83dfe7)
  const w3 = structuredClone(w); const k = w3.incidents.find((i) => i.state === 'TRIAGED'); k.state = 'CANCELLED';
  assert.ok(!TW.queueOf(recs, w3).some((x) => x.id === k.id), 'a canceled request leaves the Control Tower queue');
  assert.ok(TW.queueOf(recs, w).filter((x) => x.source === 'workspace').every((x) => M.isOpenRequest(x.inc)), 'the Control Tower queue holds open requests only');
});

test('MI-11 service analytics counts "not closed", and says so; a canceled request leaves its backlog', () => {
  const w3 = structuredClone(w); const k = w3.incidents.find((i) => i.state === 'TRIAGED'); k.state = 'CANCELLED'; k.history.push({ to: 'CANCELLED', at: new Date().toISOString(), by: 't' });
  const job = H.workspaceJobs(w3).find((j) => j.id === k.id);
  assert.ok(job.closedAt, 'a canceled request is closed in the service history, at its cancel');
  const all = H.workspaceJobs(w3); const t = Date.now() + 1000;
  assert.equal(AN.stats(all, 0, t).backlog, w3.incidents.filter(M.isUnclosedRequest).length, 'the backlog at the end is the requests not closed');
  const src = ['apps/demo/src/pages/ServiceAnalytics.tsx', 'apps/demo/src/export/serviceAnalytics.ts', 'apps/demo/src/service/analytics.ts'].map((f) => fs.readFileSync(path.join(repo, f), 'utf8')).join('\n');
  assert.doesNotMatch(src, /open at the end|Open at the end|Open at end|<th scope="col">Open<\/th>|label: 'Open', kind: 'number'/, 'the analytics count of jobs not closed is never labelled open');
});

// What MI-10 cannot see: a rule written as an object map, a positive === chain, a list split over lines, a rule on closed dates, and a
// trend over another variable than w.incidents. The reviews of dd83dfe7 and 98606e71 found such rules by reading; they are fixed (the
// bell, the Control Tower, analytics, the parity views, the room assurance export, Investigate).
test('MI-10 no page or export keeps its own list of open service states, or counts "open" as "not closed"', () => {
  const src = path.join(repo, 'apps/demo/src'); const own = path.join(src, 'workspace/requests.ts'); const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.tsx?$/.test(e.name) && f !== own) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, k) => { const where = `${path.relative(repo, f)}:${k + 1}`;
      if (/!\s*\(?\s*DONE\.includes\(/.test(l)) hits.push(`${where} counts open as not closed`);
      // any list of service states, in any order, that is the open rule, a copy of part of it, or its complement
      for (const m of l.matchAll(/\[\s*(['"][A-Z_]+['"](?:\s*,\s*['"][A-Z_]+['"])*)\s*\]/g)) { const set = new Set(m[1].match(/[A-Z_]+/g));
        const eq = (xs) => xs.length === set.size && xs.every((x) => set.has(x));
        const partial = set.size >= 4 && [...set].every((x) => OPEN_STATES.includes(x)) && ['TRIAGED', 'VERIFYING', 'REOPENED'].some((x) => set.has(x));   // work orders have no triaged, verifying or reopened
        if (eq(OPEN_STATES) || eq(['RESOLVED', 'CLOSED', 'CANCELLED']) || eq(['CLOSED', 'CANCELLED']) || partial) hits.push(`${where} ${m[0]}`); }
      // "not resolved and not closed" means open but forgets canceled: a negated list of the fixed states, or the same as a chain
      if (/!\s*\[\s*['"](CLOSED|RESOLVED)['"]\s*,\s*['"](CLOSED|RESOLVED)['"]\s*\]\.includes\(/.test(l) || /state\s*!==\s*['"](CLOSED|RESOLVED)['"]\s*&&\s*[\w.]*state\s*!==\s*['"](CLOSED|RESOLVED)['"]/.test(l)) hits.push(`${where} open as not fixed`);
      // a backlog trend of service requests ends a request when it was fixed or canceled (requestFixedAt, alone or after a restore), never at its close alone
      if (/weekBacklog\(\s*w\.incidents/.test(l) && !/requestFixedAt/.test(l)) hits.push(`${where} a request trend that ends at the close`); });
  } } };
  walk(src);
  assert.deepEqual(hits, [], 'use isOpenRequest or isUnclosedRequest from workspace/requests.ts');
});

// MI-12 (re-review of 98606e71): a canceled request is neither open nor fixed, and the room assurance export reads its own room only.
test('MI-12 a canceled request is not open or fixed anywhere; the room assurance export reads only its own room; analytics does not count a cancel as a close', () => {
  const cancel = (ws) => { const x = structuredClone(ws); const k = x.incidents.find((i) => i.state === 'TRIAGED'); k.state = 'CANCELLED'; k.history.push({ to: 'CANCELLED', at: new Date().toISOString(), by: 't' }); return { x, k }; };
  const { x: w3, k } = cancel(w);
  // fixed (resolved or closed) is its own rule: the Control Tower's "resolved incidents" and the time to restore read it
  for (const [st, want] of [['RESOLVED', true], ['CLOSED', true], ['CANCELLED', false], ['OPEN', false], ['VERIFYING', false]]) assert.equal(M.isFixedRequest({ state: st }), want, st);
  // the parity views: a canceled request is not an open issue
  const core = PC.buildCore(w3, { projects: [], decisions: [], funding: [] });
  assert.ok(!PS.setOf('iss:open').items(core).some((i) => i.id === k.id), 'a canceled request is not in Open issues');
  assert.ok(!PS.setOf('iss:resolved').items(core).some((i) => i.id === k.id), 'nor is it called resolved');
  // the live request wins over a room record with the same id, as in roomIssues: ISS-0417 is open in the workspace (High, with an APEX
  // case) though Atlas 4.218's earlier record calls it resolved (re-review of 446b3b30)
  const seedCore = PC.buildCore(w, { projects: [], decisions: [], funding: [] });
  const live = w.incidents.filter((i) => M.isOpenRequest(i) && recs.some((r) => r.issues.some((x) => x.id === i.id)));
  assert.ok(live.length >= 1, 'the seed holds an open request whose id is also on a room record, so this check tests something');
  for (const i of live) { assert.ok(PS.setOf('iss:open').items(seedCore).some((x) => x.id === i.id), `${i.id} is an open issue`); assert.ok(!PS.setOf('iss:resolved').items(seedCore).some((x) => x.id === i.id), `${i.id} is not resolved`); }
  for (const i of live) { const e = seedCore.byType.Issue.find((x) => x.id === i.id);   // its passport says the live state too, not the record's
    assert.ok(e.sub.includes(i.state) && !/RESOLVED/.test(e.sub), e.sub); assert.match(String(e.facts.find((f) => f[0] === 'State')?.[1]), new RegExp(`^${i.state}`), JSON.stringify(e.facts)); }
  // the room assurance export: the same seventeen dimensions as the room page, which reads the room's own requests
  for (const r of recs.filter((x) => w.incidents.some((i) => i.roomId === x.outline.id))) {
    const page = AR.assuranceDims(r, w.incidents.filter((i) => i.roomId === r.outline.id)).map((d) => d.state);
    const rows = XA.asPackage(r, w.incidents, by).sections.find((s) => s.id === 'dims').table.rows.map((x) => x.state.toLowerCase());
    assert.deepEqual(rows, page, r.outline.id);
  }
  const nst = recs.find((x) => x.outline.id === 'R-NST-2-101');
  assert.deepEqual(AR.assuranceDims(nst, w.incidents).filter((d) => d.state !== 'match').map((d) => d.name), AR.assuranceDims(nst, w.incidents.filter((i) => i.roomId === nst.outline.id)).filter((d) => d.state !== 'match').map((d) => d.name), 'other rooms’ requests never reach a room’s dimensions');
  // service analytics: a canceled job leaves the backlog but is not counted closed, and is no first-time fix
  const jobs = H.workspaceJobs(w3); const t = Date.now() + 1000;
  const closedIds = jobs.filter((j) => j.closedAt && !j.canceled).map((j) => j.id);
  assert.ok(jobs.find((j) => j.id === k.id).canceled, 'the history marks a canceled job');
  assert.equal(AN.stats(jobs, 0, t).closed, closedIds.length, 'closed counts closes, not cancels');
});
