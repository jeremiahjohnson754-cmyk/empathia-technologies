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
const entry = `export * as M from './campus/metrics.ts'; export * as MI from './campus/mission.ts'; export * as DEF from './campus/definitions.ts'; export * as D from './campus/design.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as XS from './export/service.ts'; export * as XA from './export/as.ts'; export * as REC from './champion/recognition.ts'; export * as V from './pages/viz.tsx'; export * as TW from './parity/Tower.tsx'; export * as H from './service/history.ts'; export * as AN from './service/analytics.ts'; export * as T from './service/targets.ts'; export * as RP from './refresh/plan.ts'; export * as DE from './dispatch/engine.ts'; export * as PV from './pages/ProViews.tsx'; export * as PC from './parity/core.ts'; export * as PS from './parity/sets.ts'; export * as AR from './campus/asRecord.ts'; export * as XE from './export/estate.ts'; export * as LG from './parity/Ledger.tsx'; export * as ASK from './parity/Ask.tsx'; export * as CN from './campus/canon.ts'; export * as AM from './assurance/model.ts'; export * as U from './search/understand.ts'; export * as V14 from './parity/v14Model.ts'; export * as IM from './intake/model.ts';`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metric-integrity-')); const out = path.join(dir, 'm.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false, nodePaths: [path.join(repo, 'node_modules')],
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined); } }] });
const { M, MI, DEF, D, W, P, R, XS, XA, REC, V, TW, H, AN, PC, PS, AR, XE, LG, ASK, CN, AM, U, V14, IM, T, DE, PV, RP } = await import(pathToFileURL(out).href);
// the Ask answer's lead is static markup (no hooks), so the repository's renderer can read it
const { renderToStaticMarkup } = (await import('node:module')).createRequire(path.join(repo, 'package.json'))('react-dom/server');
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

// MI-13 (27 Nov 2026, Pro premium enterprise intelligence #320): "Open issues" is one population, one per id (campus/definitions.ts,
// issues.open: "the live record wins"). Pro's command center and its drill-down took a room's record issues as they stood and added the
// room's open service requests, so a record issue and the live request of the same id counted twice; Mission Control counted it once.
// The seed does not show it (ISS-0417's record copy is resolved), so the check builds the case: a live request opened under the id of an
// open record issue. recordIssues is the record half the pages list; roomIssuesOf is roomIssues for a page that holds the requests only.
test('MI-13 open issues are one per id on every page: a record issue that a live request of the same id overrides is counted once', () => {
  const ids = new Set(w.incidents.map((i) => i.id));
  const r = recs.find((x) => D.openIssues(x).some((i) => !ids.has(i.id))); const iss = D.openIssues(r).find((i) => !ids.has(i.id));
  const w2 = structuredClone(w); w2.incidents.push({ ...structuredClone(w.incidents.find((i) => M.isOpenRequest(i))), id: iss.id, roomId: r.outline.id, state: 'OPEN', history: [], closedAt: null, restoredAt: null });
  // the record half: the record's copy is overridden by the live request, open or not
  assert.ok(!M.recordIssues(r, w2.incidents).some((i) => i.id === iss.id), 'the live request wins over the record issue of the same id');
  assert.ok(M.recordIssues(r, w.incidents).some((i) => i.id === iss.id), 'without the live request the record issue is open');
  const elsewhere = structuredClone(w2); elsewhere.incidents.at(-1).roomId = recs.find((x) => x.outline.id !== r.outline.id).outline.id;
  assert.ok(M.recordIssues(r, elsewhere.incidents).some((i) => i.id === iss.id), 'a request of the same id in another room leaves this room\u2019s record issue open');
  const closed = structuredClone(w2); closed.incidents.at(-1).state = 'CLOSED';
  assert.ok(!M.recordIssues(r, closed.incidents).some((i) => i.id === iss.id), 'a closed live request still wins: the record copy is not reopened');
  // the two halves add up to the definition, room by room and in total, whatever the workspace
  for (const ws of [w, w2, closed]) for (const x of recs) {
    const live = ws.incidents.filter((i) => i.roomId === x.outline.id && M.isOpenRequest(i));
    assert.equal(M.recordIssues(x, ws.incidents).length + live.length, M.roomIssues(x, ws).length, x.outline.id);
    assert.deepEqual(M.roomIssuesOf(x, ws.incidents), M.roomIssues(x, ws), x.outline.id);
  }
  assert.equal(M.roomIssues(r, w2).filter((i) => i.id === iss.id).length, 1, 'counted once');
  // the parity views: the room passport's "Open issues" fact, and the count the room comparison reads, are the same number. They counted
  // the room record only, so a room with a live request read fewer open issues there than on its campus page (Atlas 4.218 on the seed: 1 against 2, its sightline finding and ISS-0417).
  for (const ws of [w, w2]) { const core = PC.buildCore(ws, { projects: [], decisions: [], funding: [] });
    for (const x of recs) { const want = M.roomIssues(x, ws).length;
      assert.equal(core.get(x.outline.id).facts.find((f) => f[0] === 'Open issues')?.[1], String(want), `${x.outline.id} passport`);
      assert.equal(core.openIssues(x).length, want, `${x.outline.id} comparison`); } }
});

// MI-14 (27 Nov 2026, review of e7f9930d and d2fdc908): the other counts of open issues those commits did not reach. The portfolio brief's
// per-room "Open issues", the parity set "Rooms with an open issue", the ledger's assurance conclusions ("differs from its baseline on N
// open issues") and the Ask answer "Why is Atlas 4.218 degraded?" counted the room record only; the set left out Atlas 4.220, whose only
// open issue is the request ISS-0421, and the answer said 1 open issue where the room page says 2.
test('MI-14 the portfolio brief, the parity set and ledger, and the Ask answer count open issues as the room page does', () => {
  const ids = new Set(w.incidents.map((i) => i.id));
  const r0 = recs.find((x) => D.openIssues(x).some((i) => !ids.has(i.id))); const iss = D.openIssues(r0).find((i) => !ids.has(i.id));
  const w2 = structuredClone(w); w2.incidents.push({ ...structuredClone(w.incidents.find((i) => M.isOpenRequest(i))), id: iss.id, roomId: r0.outline.id, state: 'OPEN', history: [], closedAt: null, restoredAt: null, apexId: null, recurrenceOf: null });
  for (const ws of [w, w2]) {
    const want = new Map(recs.map((x) => [x.outline.id, M.roomIssues(x, ws)]));
    const rows = XE.estatePackage(recs, ws.incidents, by).sections.find((x) => x.id === 'rooms').table.rows;
    for (const row of rows) assert.equal(row.open, want.get(row.id).length, `brief ${row.id}`);
    for (const d of XE.estatePackage(recs, ws.incidents, by).dossier.rooms) assert.deepEqual([...d.openIssues].sort(), want.get(d.id).map((i) => i.id).sort(), `dossier ${d.id}`);
    const core = PC.buildCore(ws, { projects: [], decisions: [], funding: [] });
    assert.deepEqual(PS.setOf('room:issues').items(core).map((x) => x.id).sort(), [...want].filter(([, v]) => v.length).map(([k]) => k).sort(), 'Rooms with an open issue');
    const cs = LG.conclusions(core);
    for (const x of recs.filter((y) => y.baselines.length)) { const c = cs.find((k) => k.id === `C-A-${x.outline.id.slice(2)}`); const n = want.get(x.outline.id).length;
      assert.equal(!!c, n > 0, `ledger ${x.outline.id}`); if (c) { assert.match(c.text, new RegExp(`on ${n} open issues?$`), c.text); assert.deepEqual(c.evidence.map((e) => e.id).sort(), want.get(x.outline.id).map((i) => i.id).sort(), `ledger evidence ${x.outline.id}`); } }
  }
  const ref = CN.roomById('R-ATL-4-218'); const why = ASK.QUESTIONS.find((q) => q.id === 'why').answer(PC.buildCore(w, { projects: [], decisions: [], funding: [] }), ref);
  assert.match(renderToStaticMarkup(why.lead), /It has 2 open issues/, 'Atlas 4.218: its sightline finding and ISS-0417');
  assert.deepEqual(why.cites.filter((x) => x.type === 'Issue').map((x) => x.id).sort(), M.roomIssues(D.allRecords().find((x) => x.outline.id === ref.id), w).map((i) => i.id).sort(), 'the answer cites the open issues it counts');
});

// MI-15 (27 Nov 2026, review of e7f9930d and d2fdc908, finding 7): the Assurance state reads open issues as the room page does. Its rule
// says a room "failed a check" when "a recorded test failed, or a high-severity issue is open", but it looked for the High issue on the
// room record only: Atlas 4.218, whose High request ISS-0417 is open (issues.critical counts it), read "Drifted"; and a High record issue
// that a resolved request of the same id overrides still read "Failed a check" beside a drill row of no open issue.
test('MI-15 the Assurance state counts a High open request as a high-severity open issue, and an overridden record issue as none', () => {
  const high = (x, ws) => M.roomIssues(x, ws).some((i) => i.severity === 'High');
  const check = (ws, label) => { for (const x of recs) { const s = AR.asState(x, ws.incidents).state; const failed = !!x.counts.failed || high(x, ws);
    assert.equal(s === 'failed', failed, `${label} ${x.outline.id}: ${s}`);
    if (!failed && x.baselines.some((b) => b.state === 'CURRENT') && !x.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE')) assert.equal(s, M.roomIssues(x, ws).length ? 'drift' : 'matched', `${label} ${x.outline.id}`); } };
  check(w, 'seed');
  assert.equal(AR.asState(recs.find((x) => x.outline.id === 'R-ATL-4-218'), w.incidents).state, 'failed', 'Atlas 4.218: ISS-0417 is High and open');
  // the reverse: a High record issue whose live request of the same id is resolved
  const r = recs.find((x) => !x.counts.failed && D.openIssues(x).some((i) => i.severity === 'High')); const iss = D.openIssues(r).find((i) => i.severity === 'High');
  const w2 = structuredClone(w); w2.incidents.push({ ...structuredClone(w.incidents.find((i) => i.state === 'RESOLVED')), id: iss.id, roomId: r.outline.id, apexId: null, recurrenceOf: null });
  check(w2, 'overridden');
});

// MI-16 (27 Nov 2026, re-review of c7bcc0aa, finding 1): the assurance trend decides a room's run as the Assurance state does. c7bcc0aa
// made asState count a High open request as a failure; its twin worstAt (assurance/model.ts), which the four-week trend and the estate
// export's trend read, still looked at the record only, so on the seed Atlas 4.218 was "Failed a check" in the tile and "found drift" in
// this week's run on the same page.
test('MI-16 the assurance trend reads each room as the Assurance state does: this week’s run and the state agree room by room', () => {
  const as = { failed: 'fail', drift: 'drift', matched: 'match', none: 'none' };
  const ids = new Set(w.incidents.map((i) => i.id));
  const r0 = recs.find((x) => D.openIssues(x).some((i) => !ids.has(i.id))); const iss = D.openIssues(r0).find((i) => !ids.has(i.id));
  const shared = structuredClone(w); shared.incidents.push({ ...structuredClone(w.incidents.find((i) => M.isOpenRequest(i))), id: iss.id, roomId: r0.outline.id, state: 'OPEN', history: [], closedAt: null, restoredAt: null, apexId: null, recurrenceOf: null });
  const rh = recs.find((x) => !x.counts.failed && D.openIssues(x).some((i) => i.severity === 'High')); const ih = D.openIssues(rh).find((i) => i.severity === 'High');
  const over = structuredClone(w); over.incidents.push({ ...structuredClone(w.incidents.find((i) => i.state === 'RESOLVED')), id: ih.id, roomId: rh.outline.id, apexId: null, recurrenceOf: null });
  for (const [ws, label] of [[w, 'seed'], [shared, 'shared id'], [over, 'overridden']]) {
    for (const x of recs) assert.equal(AM.worstAt(x, ws.incidents, D.DEMO_NOW), as[AR.asState(x, ws.incidents).state], `${label} ${x.outline.id}`);
    const now = AM.assuranceTrend(ws.incidents, recs).at(-1); const read = recs.filter((x) => { const c = x.baselines.find((b) => b.state !== 'PENDING_ACCEPTANCE'); return c && Date.parse(c.at) <= D.DEMO_NOW; });
    assert.equal(now.fail, read.filter((x) => AR.asState(x, ws.incidents).state === 'failed').length, `${label}: this week's failures`);
  }
  assert.equal(AM.worstAt(recs.find((x) => x.outline.id === 'R-ATL-4-218'), w.incidents, D.DEMO_NOW), 'fail', 'Atlas 4.218: ISS-0417 is High and open');
});

// MI-17 (re-review of c7bcc0aa, finding 2): the search sentence "rooms with open issues" and its negation count open issues as the room page
// does. They read the room record only, so on the seed "rooms with open issues" left out Atlas 4.220, whose only open issue is the request
// ISS-0421, and "rooms with no issues" listed it. A layer ("audio problems") is read from the record: a request names no device position.
test('MI-17 search: "rooms with open issues" and "rooms with no issues" count the room’s open issues as the room page does', () => {
  const ids = new Set(w.incidents.map((i) => i.id));
  const r0 = recs.find((x) => D.openIssues(x).some((i) => !ids.has(i.id))); const iss = D.openIssues(r0).find((i) => !ids.has(i.id));
  const closed = structuredClone(w); closed.incidents.push({ ...structuredClone(w.incidents.find((i) => i.state === 'RESOLVED')), id: iss.id, roomId: r0.outline.id, apexId: null, recurrenceOf: null });
  for (const [ws, label] of [[w, 'seed'], [closed, 'overridden']]) {
    const want = recs.filter((x) => M.roomIssues(x, ws).length > 0).length;
    assert.equal(U.understand('rooms with open issues', { incidents: ws.incidents }).total, want, `${label}: with`);
    assert.equal(U.understand('rooms with no issues', { incidents: ws.incidents }).total, recs.length - want, `${label}: without`);
  }
  const a420 = U.understand('rooms with open issues at atlas', { incidents: w.incidents, limit: 200 });
  assert.ok(a420.rows.some((x) => x.id === 'R-ATL-4-220'), 'Atlas 4.220 (ISS-0421) is a room with an open issue');
});

// MI-18 (re-review of c7bcc0aa, finding 7): the V1.4 Operations Ready gate "No open incident on the room" is mandatory, and it read the
// room record only: Atlas 4.220 passed it ("nothing open") while ISS-0421 is open on it.
test('MI-18 V1.4 Operations Ready: the mandatory gate "No open incident on the room" fails while any open issue or request is on the room', () => {
  for (const x of recs) { const g = V14.readiness(x, w).crit.find((c) => c.id === 'itsm-linkage'); if (g.state === 'NOT_APPLICABLE') continue; const iss = M.roomIssues(x, w);
    assert.equal(g.state, iss.length ? 'FAIL' : 'PASS', `${x.outline.id}: ${g.why}`); for (const i of iss) assert.ok(g.why.includes(i.id), `${x.outline.id} names ${i.id}`); }
  const g = V14.readiness(recs.find((x) => x.outline.id === 'R-ATL-4-220'), w).crit.find((c) => c.id === 'itsm-linkage');
  assert.equal(g.state, 'FAIL'); assert.match(g.why, /ISS-0421/);
});

// MI-19 (re-review of c7bcc0aa, finding 9): a new request's "Already on record" facts give the room's open issues as the room page does,
// naming both sources; for Atlas 4.220 they said "Open issues: none, room record" while ISS-0421 is open.
test('MI-19 Intake: the "Already on record" open issues are the room’s open issues, record and live requests', () => {
  for (const id of ['R-ATL-4-218', 'R-ATL-4-220']) { const f = IM.known(IM.blank('add-devices', { roomId: id }), w.incidents).find((x) => x[0] === 'Open issues');
    const iss = M.roomIssues(recs.find((x) => x.outline.id === id), w);
    assert.ok(iss.length, id); for (const i of iss.slice(0, 2)) assert.ok(f[1].includes(i.title), `${id}: ${i.id} ${i.title} in "${f[1]}"`);
    assert.match(f[1], new RegExp(`^${iss.length} open`), `${id}: the count first`); assert.match(f[2], /ServiceHands/, `${id}: names the live source`); }
});

// MI-20 and MI-21 (re-review of c7bcc0aa, finding 8): two latent splits, not reached by the seed or by any id the app makes (a request id is ISS-04xx,
// a record issue's ISS-<room>). The Control Tower queue left out a record issue only when an open request shared its id, so one whose
// request was closed came back; the ledger's "layer with the most open issues" counted a record issue its live request overrides.
test('MI-20 the Control Tower queue leaves out a record issue that a live request overrides, open or closed', () => {
  const rh = recs.find((x) => D.openIssues(x).some((i) => i.positions.length)); const ih = D.openIssues(rh).find((i) => i.positions.length);
  const over = structuredClone(w); over.incidents.push({ ...structuredClone(w.incidents.find((i) => i.state === 'RESOLVED')), id: ih.id, roomId: rh.outline.id, apexId: null, recurrenceOf: null });
  for (const [ws, label] of [[w, 'seed'], [over, 'overridden']]) {
    const q = TW.queueOf(recs, ws); const want = recs.flatMap((x) => M.roomIssues(x, ws).map((i) => i.id)).sort();
    assert.deepEqual(q.map((x) => x.id).sort(), want, `${label}: the queue holds each open issue once`); }
});
test('MI-21 the ledger’s "layer with the most open issues" counts the record issues no live request overrides', () => {
  const rh = recs.find((x) => D.openIssues(x).some((i) => i.positions.length)); const ih = D.openIssues(rh).find((i) => i.positions.length);
  const over = structuredClone(w); over.incidents.push({ ...structuredClone(w.incidents.find((i) => i.state === 'RESOLVED')), id: ih.id, roomId: rh.outline.id, apexId: null, recurrenceOf: null });
  for (const [ws, label] of [[w, 'seed'], [over, 'overridden']]) {
    const core = PC.buildCore(ws, { projects: [], decisions: [], funding: [] }); const c = LG.conclusions(core).find((k) => k.id === 'C-P-LAYER');
    const layers = {}; recs.forEach((x) => M.recordIssues(x, ws.incidents).forEach((i) => i.positions.forEach((p) => { const l = x.positions.find((y) => y.code === p)?.layer || 'unknown'; layers[l] = (layers[l] || 0) + 1; })));
    const total = Object.values(layers).reduce((a, n) => a + n, 0); assert.match(c.text, new RegExp(`\\(\\d+ of ${total}\\)$`), `${label}: ${c.text}`);
    // its evidence is the issues it counts: the record issues no live request overrides that name a position (it admitted every Issue not
    // RESOLVED, so the live requests, which name no position, and a canceled one, which is not open, too)
    const counted = recs.flatMap((x) => M.recordIssues(x, ws.incidents).filter((i) => i.positions.length).map((i) => `${x.outline.id}|${i.id}`)).sort();
    assert.deepEqual(c.evidence.map((e) => `${e.roomId}|${e.id}`).sort(), counted, `${label}: the evidence is the counted issues`);
  }
});

// MI-22 to MI-24 (the health slice, found 27 Nov ~03:55 UTC): the parity views (the Control Tower, the ledger, the sets, Ask, Compare and
// the passport) scored rooms by their own rule (parity/core.ts healthOf: 25, 12 and 5 per open RECORD issue, up to 30 for unverified
// tests, every room scored) under the labels Mission Control uses for campus/metrics.ts roomHealth (15, 8 and 4 per open issue, record
// or live; failed and untested tests apart; a room whose record holds no test result is not scored). One rule now: roomHealth.
const NODESK = { projects: [], decisions: [], funding: [] };
const healthFixtures = () => {
  // the seed, and the seed with a High live request opened in a room that is Healthy with nothing open (the record-only rule missed it)
  const calm = recs.find((x) => { const h = M.roomHealth(x, w); return h.band === 'healthy' && !M.roomIssues(x, w).length && x.outline.building === 'FRG'; });
  const hot = structuredClone(w); const src = hot.incidents.find((i) => i.id === 'ISS-0417');
  hot.incidents.push({ ...structuredClone(src), id: 'ISS-9901', roomId: calm.outline.id, buildingKey: calm.outline.building, roomName: calm.outline.name, apexId: null, recurrenceOf: null });
  // and a canceled request in that room: it is not open, so nothing counts it and nothing cites it (the review of 27 Nov: the ledger cited
  // every issue record not RESOLVED, so a CANCELLED request stood as evidence of a health it does not lower)
  const gone = structuredClone(w); gone.incidents.push({ ...structuredClone(src), id: 'ISS-9902', state: 'CANCELLED', roomId: calm.outline.id, buildingKey: calm.outline.building, roomName: calm.outline.name, apexId: null, recurrenceOf: null });
  return [[w, 'seed'], [hot, `High request in ${calm.outline.id}`], [gone, `canceled request in ${calm.outline.id}`]];
};
test('MI-22 the parity core, the ledger and Ask score a room by the campus health rule, and say "not scored" where it does', () => {
  for (const [ws, label] of healthFixtures()) {
    const core = PC.buildCore(ws, NODESK); const cs = LG.conclusions(core);
    for (const r of recs) {
      const h = M.roomHealth(r, ws);
      const c = cs.find((k) => k.id === `C-H-${r.outline.id.slice(2)}`); assert.ok(c, `${label}: ledger C-H ${r.outline.id}`);
      assert.match(c.text, h.score == null ? /: not scored/ : new RegExp(`: ${M.BAND_LABEL[h.band]}, ${h.score} of 100$`), `${label}: ${c.text}`);
      // the ledger cites the issues it counts: the room's open issues (issues.open), not every issue record that is not RESOLVED
      const cited = c.evidence.filter((e) => e.type === 'Issue').map((e) => e.id).sort();
      assert.deepEqual(cited, core.openIssues(r).map((i) => i.id).sort(), `${label}: ledger C-H ${r.outline.id} cites its open issues`);
      // the room's passport fact says the same health
      const fact = core.get(r.outline.id).facts.find((f) => f[0] === 'Health')?.[1];
      assert.equal(fact, h.score == null ? 'not scored' : `${h.score} of 100`, `${label}: passport Health of ${r.outline.id}`);
    }
    // Ask: the score in bold is the room's (anchored, so 7 cannot pass on 77); an unscored room is said to be not scored, in a sentence
    const ask = (id) => renderToStaticMarkup(ASK.QUESTIONS.find((q) => q.id === 'why').answer(core, CN.roomById(id)).lead);
    const ref = CN.roomById('R-ATL-4-218'); const h = M.roomHealth(recs.find((x) => x.outline.id === ref.id), ws);
    const why = ask(ref.id);
    assert.match(why, new RegExp(`<b>${h.score} of 100</b> \\(${M.BAND_LABEL[h.band]}\\)`), `${label}: Ask gives Atlas 4.218 the room's health ${h.score}: ${why.slice(0, 160)}`);
    const un = recs.find((r) => M.roomHealth(r, ws).score == null);
    if (un) { const t = ask(un.outline.id); assert.match(t, /is <b>not scored<\/b> by the campus health rule: its record holds no test result/, `${label}: Ask on unscored ${un.outline.id}: ${t.slice(0, 200)}`); assert.doesNotMatch(t, /has a health of <b>not scored/, `${label}: ${t.slice(0, 120)}`); }
    else assert.fail(`${label}: the seed should hold an unscored room for this check`);
  }
});
// MI-23 checks the figures the Tower is given (towerFigures, a reshaping of campusStats); that the page draws them is MC-health-01 in
// tests/browser/demo-core.test.mjs, which reads the rendered ring and tile beside Mission Control's (the review of 27 Nov: MI-23 alone
// would pass if the page drew something else, and on the old code it failed only because towerFigures did not exist).
test('MI-23 the Control Tower’s campus health, its sites’ health and its rooms needing attention are Mission Control’s', () => {
  for (const [ws, label] of healthFixtures()) {
    const core = PC.buildCore(ws, NODESK); const c = M.campusStats(ws); const t = TW.towerFigures(ws);
    assert.deepEqual([t.campus.score, t.campus.band], [c.score, c.band], `${label}: campus health`);
    assert.equal(t.attention, c.attention, `${label}: rooms needing attention`);
    assert.equal(t.sites.length, CN.BUILDINGS.length, `${label}: one site per campus building`);
    for (const s of t.sites) { const b = c.buildings.find((x) => x.b.key === s.key); assert.deepEqual([s.score, s.band], [b.score, b.band], `${label}: site ${s.key}`); }
  }
});
test('MI-24 the sets behind those numbers hold the same rooms: needing attention, and the ten lowest scored', () => {
  for (const [ws, label] of healthFixtures()) {
    const core = PC.buildCore(ws, NODESK); const rows = per(ws);
    const want = rows.filter((x) => M.needsAttention(x.h, x.iss)).map((x) => x.r.outline.id).sort();
    assert.deepEqual(PS.setOf('room:monitor').items(core).map((x) => x.id).sort(), want, `${label}: room:monitor is the rooms needing attention`);
    const worst = PS.setOf('as:worst').items(core).map((x) => M.roomHealth(recs.find((r) => r.outline.id === x.id), ws).score);
    const low = rows.map((x) => x.h.score).filter((s) => s != null).sort((a, b) => a - b).slice(0, 10);
    assert.deepEqual(worst, low, `${label}: as:worst is the ten lowest scored rooms, lowest first`);
  }
});

// MI-25 to MI-27 (the service-target slice, #320 and the Pro register's PRO-IS-01, 27 Nov): three copies of the restore target existed.
// service/history.ts SLA_HOURS (8, 48 and 120 h: Service analytics), dispatch/engine.ts RESTORE_HOURS (the same: the dispatch board) and
// pages/Estate.tsx TARGET_DAYS (1, 2 and 5 days: the Pro command center's "Past their target"), so a Mission critical request open 12 h
// was breached on the dispatch board and not past target in Pro. One rule now: the dispatch board's slaOf, from SLA_HOURS.
const H12 = 12 * 3600e3;
const targetFixtures = () => {
  // the seed, and the seed with a Mission critical request opened 12 hours ago in Atlas 4.218 (past 8 h, inside 1 day)
  const mc = structuredClone(w); const src = mc.incidents.find((i) => i.id === 'ISS-0417');
  mc.incidents.push({ ...structuredClone(src), id: 'ISS-9903', severity: 'Mission critical', state: 'OPEN', openedAt: new Date(Date.now() - H12).toISOString(), restoredAt: null, closedAt: null, history: [{ to: 'OPEN', at: new Date(Date.now() - H12).toISOString(), by: 'requestor' }], apexId: null, recurrenceOf: null, workOrderId: null });
  // and a Mission critical request restored after 20 h and resolved: late, but not open, so no open count holds it (the review of
  // af85e226: dropping the "open" condition from pastTargetOf passed every test)
  const done = structuredClone(mc); const at = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  done.incidents.push({ ...structuredClone(src), id: 'ISS-9904', severity: 'Mission critical', state: 'RESOLVED', openedAt: at(30), restoredAt: at(10), closedAt: null, history: [{ to: 'OPEN', at: at(30), by: 'requestor' }, { to: 'RESOLVED', at: at(10), by: 'tech-ana' }], apexId: null, recurrenceOf: null, workOrderId: null });
  return [[w, 'seed'], [mc, 'Mission critical request open 12 h'], [done, 'and a resolved one restored late']];
};
const breachedOpen = (ws, now) => ws.incidents.filter((i) => ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED'].includes(i.state) && DE.slaOf(i.severity, i.openedAt, i.restoredAt, now).state === 'breached').map((i) => i.id).sort();
test('MI-25 one restore target: Pro\'s past-target rule is the dispatch board\'s (8, 48 and 120 h)', () => {
  for (const s of ['Mission critical', 'High', 'Standard']) { assert.equal(DE.RESTORE_HOURS[s], H.SLA_HOURS[s].restore, `${s}: the dispatch board's restore target is Service analytics'`); assert.equal(T.SLA_HOURS[s].restore, H.SLA_HOURS[s].restore, `${s}: one table`); }
  for (const [ws, label] of targetFixtures()) {
    const now = Date.now();
    assert.deepEqual([...T.pastTargetOf(ws.incidents, now)].map((i) => i.id).sort(), breachedOpen(ws, now), `${label}: Pro's past-target requests are the open requests the dispatch board shows breached`);
  }
  assert.ok(T.pastTargetOf(targetFixtures()[1][0].incidents, Date.now()).some((i) => i.id === 'ISS-9903'), 'a Mission critical request open 12 h is past its 8 h target');
});
test('MI-26 the set behind "Past their target" holds exactly those requests, and every role that may open it sees them all', () => {
  const roles = ['visitor', 'employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect'];
  for (const [ws, label] of targetFixtures()) {
    const core = PC.buildCore(ws, NODESK); const set = PS.setOf('iss:late');
    assert.ok(set, 'the set iss:late exists');
    const items = set.items(core);
    assert.deepEqual(items.map((x) => x.id).sort(), breachedOpen(ws, Date.now()), `${label}: iss:late is the breached open requests (their issues)`);
    // the review of af85e226: the set listed Request records, which the service manager and the technician may not see, so a tile
    // reading 1 opened a set reading 0 for them. Every role the set's authority admits must see every record it counts.
    for (const role of roles) if (P.allows(PS.setAuthority('iss:late'), role)) assert.equal(items.filter((x) => P.allows({ entity: x.type }, role)).length, items.length, `${label}: ${role} may open iss:late and sees all ${items.length}`);
  }
});
test('MI-27 Issue Intelligence\'s twelve-month service figures are Service analytics\' over the same jobs and months', () => {
  for (const [ws, label] of targetFixtures()) {
    const k = PV.issueKpis(ws, Date.now()); const jobs = [...H.syntheticHistory(), ...H.workspaceJobs(ws)]; const ms = AN.months(12);
    const s = AN.stats(jobs, ms[0].from, ms[ms.length - 1].to);
    assert.equal(k.mttrH, s.mttrH, `${label}: median time to restore`); assert.equal(k.restoreSla, s.restoreSla, `${label}: restored within target`); assert.equal(k.reopen, s.reopen, `${label}: reopened after closure`);
    assert.deepEqual(k.late.map((i) => i.id).sort(), breachedOpen(ws, Date.now()), `${label}: past target`);
    assert.equal(k.escalated, null, 'no record carries an escalation, so "escalated" is not counted');
  }
});

// MI-28 (the Pro register's PRO-AS-04/05, 28 Nov): Asset Intelligence's refresh exposure is the refresh plan's own figures, over the same
// units and the same planning assumptions (a service life per class: a planning assumption, never a manufacturer's end-of-support
// date, which no record holds). V2.5.3 showed lifecycle status by support end date; the records here can support only the planned life.
test('MI-28 Asset Intelligence\'s refresh exposure is the refresh plan\'s: units in service, past their planned life, due by the horizon', () => {
  const a = RP.defaultAssumptions(); const jobs = H.syntheticHistory();
  const custom = { ...a, life: { ...a.life, display: 1, camera: 2 } };
  for (const [as, label] of [[a, 'starting assumptions'], [custom, 'displays 1 year, cameras 2']]) for (const only of [null, 'ATL']) {
    const units = RP.unitsInService(as, jobs).filter((u) => !only || u.building === only);
    const x = RP.refreshExposure(as, jobs, only, 3);
    assert.equal(x.inService, units.length, `${label} ${only || 'campus'}: units in service`);
    assert.equal(x.past, units.filter((u) => u.overdue).length, `${label} ${only || 'campus'}: due in ${RP.NOW_YEAR} or earlier`);
    assert.equal(x.dueBy, RP.strategy(units, 3, as).reduce((n, r) => n + r.units, 0), `${label} ${only || 'campus'}: due by ${RP.NOW_YEAR + 3}, as the refresh plan's tile`);
    assert.deepEqual(x.years.map((y) => y.units), RP.strategy(units, 3, as).map((r) => r.units), `${label} ${only || 'campus'}: units per year, as the refresh plan's chart`);
  }
  assert.ok(RP.refreshExposure(custom, jobs, null, 3).past > RP.refreshExposure(a, jobs, null, 3).past, 'a shorter planned life puts more units past it');
});

// MI-29 (the review of 17d52076): the planner's assumptions survive a reload exactly as the page lets them be set, and a damaged entry
// falls back to the starting value field by field instead of breaking the plan or Asset Intelligence.
test('MI-29 the refresh assumptions: kept as set, damaged entries ignored field by field, one key', () => {
  const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  try {
    const d = RP.defaultAssumptions();
    const set = { ...d, life: { ...d.life, display: 1, camera: 30 }, cost: { display: 2_000_000_000, camera: 0 }, serviceSignal: 20 };
    RP.saveAssumptions(set); assert.ok(mem.has(RP.ASSUMPTIONS_KEY), 'saved under the one key');
    assert.deepEqual(RP.loadAssumptions(), set, 'every value the page lets a planner set comes back (life 1 to 30, any cost, signal 1 to 20)');
    for (const raw of ['{', 'null', '[]', '"x"', '42', '{"life":null}', '{"life":[3]}']) { mem.set(RP.ASSUMPTIONS_KEY, raw); assert.deepEqual(RP.loadAssumptions(), d, `${raw}: the starting assumptions`); }
    mem.set(RP.ASSUMPTIONS_KEY, JSON.stringify({ life: { display: -1, camera: 'x', speaker: 0, bar: 1e9, projector: 4 }, cost: { display: -5, camera: 'y' }, serviceSignal: 99, currency: 'dollars' }));
    const x = RP.loadAssumptions();
    assert.deepEqual(x.life, { ...d.life, projector: 4 }, 'only the sensible life (projector 4) is kept'); assert.deepEqual(x.cost, {}, 'no damaged cost'); assert.equal(x.serviceSignal, d.serviceSignal); assert.equal(x.currency, d.currency);
    mem.set(RP.ASSUMPTIONS_KEY, '{"__proto__":{"polluted":1},"life":{"__proto__":{"x":1}}}'); RP.loadAssumptions(); assert.equal({}.polluted, undefined, 'no prototype pollution'); assert.equal({}.x, undefined);
  } finally { delete globalThis.localStorage; }
});
