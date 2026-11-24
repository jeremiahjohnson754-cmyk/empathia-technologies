// Empathia VOICE (Enterprise 3.0 directive 1A; journey J6B-VOICE): the CallPath fixture, the quality method and the perspectives.
//   - the fixture stands on the estate: the room, the UC compute, both switches and the shared-uplink rooms are the estate's own
//     records and edges (no duplicate of Core, no inferred topology);
//   - configured, observed and unknown stay apart: an unobserved hop is UNKNOWN, and the missing-telemetry and stale cases give an
//     UNKNOWN verdict with no hypothesis (a missing record is never "healthy");
//   - the quality method refuses rather than guesses (missing input, impossible value, unknown codec, stale or unobserved sample),
//     its score stays within 1.0 to 4.5, and an estimate keeps the evidence state of its inputs;
//   - privacy: no directory number, no emergency number and no personal contact detail anywhere in the fixture;
//   - access: a caller or visitor cannot open a CallPath; a technician opens it without the signalling section; an executive reads
//     only the overview; every vendor adapter is CONTRACT_ONLY.
//   node --test tests/unit/voice.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-')); const entry = path.join(tmp, 'e.ts'); const out = path.join(tmp, 'm.mjs');
const at = (p) => JSON.stringify(path.join(repo, p));
fs.writeFileSync(entry, [
  `export * as V from ${at('apps/demo/src/voice/model.ts')};`,
  `export { resolve } from ${at('apps/demo/src/registry.pages.ts')};`,
  `export { canOpen, canSee, ROLE_KEYS } from ${at('apps/demo/src/access/policy.ts')};`,
  `export { buildEstate } from ${at('apps/demo/src/search/estate.ts')};`,
  `export * as J from ${at('apps/demo/src/voice/job.ts')};`, `export * as F from ${at('apps/demo/src/flow/model.ts')};`, `export * as MP from ${at('apps/demo/src/mission/model.ts')};`,
  `export * as S from ${at('apps/demo/src/workspace/store.ts')};`, `export { roomRecord as roomRecordOf } from ${at('apps/demo/src/campus/design.ts')};`, `export { WORK_NEEDS } from '@empathia/service-engine';`, `export { FAMILIES, CAPABILITIES } from ${at('packages/ui/src/families.ts')};`, `export { PRODUCT_IDS } from ${at('packages/ui/src/products.ts')};`, `export { roomById } from ${at('apps/demo/src/campus/canon.ts')};`,
].join('\n'));
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic', nodePaths: [path.join(repo, 'node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.png': 'empty', '.webp': 'empty', '.jpg': 'empty' } });
const { V, resolve, canOpen, canSee, ROLE_KEYS, buildEstate, J, F, MP, S, WORK_NEEDS, FAMILIES, CAPABILITIES, PRODUCT_IDS, roomById, roomRecordOf } = await import(pathToFileURL(out).href);
const est = buildEstate(); const has = (type, id) => est.nodes.some((n) => n.type === type && n.id === id);
const edge = (from, rel, to) => est.edges.some((e) => e.from.id === from && e.rel === rel && e.to.id === to);

test('the fixture stands on the estate: every Core record a hop names exists there, and the path follows the estate’s edges', () => {
  assert.ok(has('Room', V.VOICE_ROOM), 'the room is an estate room');
  for (const h of V.FLOW.hops) if (h.estate) assert.ok(has(h.estate.type, h.estate.id), `${h.estate.type} ${h.estate.id} is in the estate`);
  assert.ok(edge(V.VOICE_ROOM, 'PLANS_DEVICE', 'A-0102'), 'the endpoint is a device the room plans');
  assert.ok(edge('SW-ATL-4A', 'FEEDS', 'A-0102'), 'the access switch feeds the endpoint (estate edge)');
  assert.ok(edge('SW-ATL-CORE', 'FEEDS', 'SW-ATL-4A'), 'the core feeds the access switch (estate edge)');
  assert.deepEqual(V.FLOW.hops.map((h) => h.layer), ['endpoint', 'access', 'core', 'wan', 'sbc', 'provider']);
});

test('the device passport: each calling endpoint is the asset installed at that position in the room’s own record, and only that asset leads to a CallPath', () => {
  for (const [room, e] of Object.entries(V.ENDPOINTS)) { const p = roomRecordOf(room).positions.find((x) => x.code === e.position); assert.ok(p, `${room} ${e.position}`); assert.equal(p.asset, e.asset); assert.ok(has('Asset', e.asset)); assert.equal(V.callingRoomOf(e.asset), room); assert.ok(V.flowFor(room).hops[0].label.includes(e.asset)); }
  assert.equal(V.callingRoomOf('AS-0101'), null, 'a display is not a calling endpoint'); assert.equal(V.callingRoomOf('AS-9999'), null);
});
test('the shared uplink’s rooms are recomputed from the estate, not typed by hand', () => {
  const fed = est.edges.filter((e) => e.from.id === V.SHARED_LINK.to && e.rel === 'FEEDS').map((e) => e.to.id);
  const rooms = [...new Set(est.edges.filter((e) => e.rel === 'PLANS_DEVICE' && fed.includes(e.to.id)).map((e) => e.from.id))].sort();
  assert.deepEqual(rooms, [...V.SHARED_LINK.rooms].sort());
});

test('configured, observed and unknown stay apart; an unobserved hop is UNKNOWN', () => {
  for (const h of V.FLOW.hops) { assert.equal(h.configured.state, 'DECLARED'); assert.ok(h.configured.source && h.observed.source, 'each claim names its source'); }
  const wan = V.FLOW.hops.find((h) => h.layer === 'wan'); assert.equal(wan.observed.state, 'UNKNOWN');
  assert.ok(!V.FLOW.hops.some((h) => ['MEASURED', 'VERIFIED'].includes(h.observed.state)), 'nothing in a simulation is measured or verified');
  assert.ok(V.SESSION.samples.every((s) => s.state === 'SIMULATED' && /not a packet capture/i.test(s.source)));
});

test('missing provider telemetry and stale samples are UNKNOWN with no hypothesis, never healthy', () => {
  const m = V.caseView('missing'); assert.equal(m.verdict, 'UNKNOWN'); assert.equal(m.samples.length, 0); assert.equal(m.hypothesis, null);
  assert.equal(m.hops.find((h) => h.layer === 'provider').observed.state, 'NOT_CONFIGURED'); assert.match(m.verdictWhy, /not a healthy result/);
  const s = V.caseView('stale'); assert.equal(s.verdict, 'UNKNOWN'); assert.equal(s.hypothesis, null);
  assert.ok(s.samples.every((x) => x.state === 'STALE' && V.ageS(x.at) > V.FRESHNESS_WINDOW_S)); assert.ok(s.samples.every((x) => !V.estimate(x).ok), 'no estimate from a stale sample');
  const d = V.caseView('degraded'); assert.equal(d.verdict, 'OUTSIDE_POLICY'); assert.equal(d.hypothesis.kind, 'HYPOTHESIS'); assert.ok(d.hypothesis.unknowns.length >= 2 && d.hypothesis.cites.length >= 2);
  assert.ok(!/root cause/i.test(d.hypothesis.statement), 'a hypothesis is not worded as a root cause');
  assert.equal(V.caseOf('nonsense'), 'degraded');
});

test('the quality method: reference values, refusals, and a score that cannot leave 1.0 to 4.5', () => {
  const ok = (lossPct, oneWayDelayMs, codec = 'G.711 with PLC', state = 'SIMULATED') => V.estimate({ lossPct, oneWayDelayMs, codec, state });
  const clean = ok(0, 20); assert.ok(clean.ok); assert.equal(clean.r, 91.3); assert.equal(clean.mos, 4.37);   // R = 93.2 − 0.024·80 = 91.28; MOS = 1 + 0.035·R + R(R−60)(100−R)·7e−6 = 4.369
  const lossy = ok(5.1, 66); assert.ok(lossy.ok); assert.equal(lossy.r, 74.1); assert.ok(lossy.mos < clean.mos); assert.equal(lossy.basis, 'SIMULATED', 'an estimate keeps the state of its inputs');
  assert.ok(ok(5.1, 66, 'G.711').mos < lossy.mos, 'the same loss without concealment scores lower');
  assert.ok(ok(1, 400).r < ok(1, 100).r, 'long delay lowers R');
  for (const [l, d] of [[0, 0], [100, 5000], [50, 2000], [0.01, 177.3], [99.9, 0]]) { const e = ok(l, d); assert.ok(e.ok && e.mos >= 1 && e.mos <= 4.5, `mos in range for loss ${l}, delay ${d}`); }
  assert.equal(ok(null, 50).reason, 'MISSING_INPUT'); assert.equal(ok(2, null).reason, 'MISSING_INPUT');
  assert.equal(ok(150, 50).reason, 'INVALID_INPUT'); assert.equal(ok(-1, 50).reason, 'INVALID_INPUT'); assert.equal(ok(Number.NaN, 50).reason, 'INVALID_INPUT'); assert.equal(ok(1, 9e9).reason, 'INVALID_INPUT');
  assert.equal(ok(1, 50, 'Opus').reason, 'NO_SOUNDNESS'); assert.equal(ok(1, 50, 'G.711 with PLC', 'DECLARED').reason, 'UNTRUSTED_STATE'); assert.equal(ok(1, 50, 'G.711 with PLC', 'STALE').reason, 'STALE');
  assert.match(V.METHOD.status, /EXPERIMENTAL/); assert.match(V.METHOD.status, /not independently validated/);   // founder decision E3-D3, 23 Nov 2026
});

test('targets are the tenant’s: a window is judged only against the declared calling policy', () => {
  const [a, , c] = V.SESSION.samples; assert.deepEqual(V.outsidePolicy(a), []); assert.equal(V.outsidePolicy(c).length, 2);
  assert.deepEqual(V.outsidePolicy({ ...a, lossPct: null, jitterMs: null, oneWayDelayMs: null }), [], 'a missing value proves nothing');
});

test('privacy: no directory number, emergency number or personal contact detail in the fixture', () => {
  const text = JSON.stringify({ f: V.FLOWS, s: V.SESSION, a: V.ADAPTERS, c: ['degraded', 'missing', 'stale', 'retest'].map((c) => V.caseView(c)), o: V.caseView('degraded', V.OTHER_SITE_ROOM) });
  assert.ok(!/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/.test(text) && !/\+\d{7,}/.test(text), 'no telephone number');
  assert.ok(!/\b(911|112|999)\b/.test(text), 'no emergency number');
  assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(text), 'no e-mail address'); assert.ok(!/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text), 'no IP address');
  assert.match(V.SESSION.token, /…/, 'the session token is shown shortened'); assert.ok(V.NEVER.some((n) => /emergency number/.test(n)));
});

// Changed 23 Nov 2026 (founder decision E3-D2): signalling-side detail belongs to the UC / Voice Administrator (and the Product
// Architect, who sees every surface); the AV Operations Lead and the Systems Engineer no longer read it. Site scope is new.
test('access: who may open what, by the demonstration’s own policy; least privilege for telephony detail', () => {
  const page = (h) => resolve(h); const cp = page('#/voice/callpath/R-ATL-4-218'); const home = page('#/voice'); const rep = page('#/voice/report/R-ATL-4-218');
  assert.ok(cp && home && rep, 'the three addresses are registered');
  for (const r of ['architect', 'ucadmin', 'ops', 'syseng', 'service', 'svcmgr']) assert.ok(canOpen(r, cp), `${r} opens the CallPath`);
  for (const r of ['visitor', 'employee', 'exec', 'designer', 'installer', 'bpm', 'qa', 'sitechamp']) assert.ok(!canOpen(r, cp), `${r} is refused the CallPath`);
  assert.ok(canOpen('exec', home) && !canOpen('employee', home) && !canOpen('visitor', home));
  assert.deepEqual(ROLE_KEYS.filter((r) => canSee(r, cp, 'voice.signalling')).sort(), ['architect', 'ucadmin'], 'signalling-side detail: the UC / Voice Administrator and the architect only');
  assert.ok(canOpen('employee', rep), 'an employee may report a calling problem (V2.5.3 issue.report)');
  for (const r of ROLE_KEYS) assert.equal(V.viewOf(r) !== 'none', canOpen(r, home), `${r}: the view model and the registry agree`);
});

test('least privilege: what the UC / Voice Administrator may and may not open', () => {
  const may = (h) => { const r = resolve(h); return !!r && canOpen('ucadmin', r); };
  for (const h of ['#/voice', '#/voice/callpath/R-ATL-4-218', '#/flow', '#/flow/link/SW-ATL-4A', '#/missionproof', '#/search', '#/campus', '#/campus/ATL/4/R-ATL-4-218', '#/home', '#/investor']) assert.ok(may(h), `opens ${h}`);
  for (const h of ['#/scouter', '#/commissioning/room/R-ATL-4-218', '#/assurance/room/R-ATL-4-218', '#/servicehands', '#/control/R-ATL-4-218', '#/pro/exec', '#/v25/fi', '#/people', '#/request']) assert.ok(!may(h), `refused ${h}`);
});

test('site scope: a room on another site is refused to the site-scoped roles and open to tenant-wide ones; its path is configured only', () => {
  const other = resolve(`#/voice/callpath/${V.OTHER_SITE_ROOM}`); const b = roomById(V.OTHER_SITE_ROOM).building;
  assert.ok(!['ATL', 'NST'].includes(b), 'the room is outside the north campus scope');
  for (const r of ['ucadmin', 'service', 'svcmgr']) { assert.ok(!canOpen(r, other), `${r} is refused the other site’s CallPath`); assert.equal(V.inScope(r, b), false); assert.equal(V.inScope(r, 'ATL'), true); }
  for (const r of ['architect', 'ops', 'syseng']) assert.ok(canOpen(r, other), `${r} reads every site`);
  for (const r of ['employee', 'visitor', 'exec']) assert.ok(!canOpen(r, other));
  const v = V.caseView('degraded', V.OTHER_SITE_ROOM); assert.equal(v.observed, false); assert.equal(v.verdict, 'UNKNOWN'); assert.equal(v.samples.length, 0); assert.equal(v.hypothesis, null);
  assert.ok(v.hops.every((h) => h.observed.state === 'UNKNOWN'), 'nothing was observed on any hop');
  assert.equal(v.hops.find((h) => h.layer === 'access').configured.state, 'UNKNOWN', 'no network record for that building: VOICE does not guess one');
  assert.equal(V.flowFor('R-ATL-4-220'), null, 'a room without a record has no flow');
});

test('after the repair: a later simulated session within targets is WITHIN_POLICY, still simulated, and no estimate is called validated', () => {
  const v = V.caseView('retest'); assert.equal(v.verdict, 'WITHIN_POLICY'); assert.ok(v.samples.every((s) => s.state === 'SIMULATED' && V.outsidePolicy(s).length === 0));
  assert.match(v.downstream, /does not pass an acceptance test/);
});

test('J6B steps 5 and 6 on the real service engine: assigned, evidence, an independent reviewer; the job proves nothing by itself', () => {
  const ok = (x, l) => assert.equal(x, null, `${l}: ${x && x.why.join('; ')}`);
  const w = S.seed(); const reh = [];
  assert.equal(J.jobView(w, V.VOICE_ROOM), null, 'no report, no job');
  // what Assurance and APEX read back (24 Nov 2026): outside the targets with no job; unknown where nothing was observed; nothing for a room with no call flow
  { const r0 = J.callingReading(w, V.VOICE_ROOM); assert.equal(r0.state, 'OUTSIDE'); assert.equal(r0.vcase, 'degraded'); assert.equal(r0.basis, 'SIMULATED'); assert.match(r0.says, /3 of 6 windows.*No job has been raised/); assert.equal(r0.href, `#/voice/callpath/${V.VOICE_ROOM}`); assert.ok(resolve(r0.uplink));
    assert.equal(J.callingReading(w, V.OTHER_SITE_ROOM).state, 'UNKNOWN'); assert.equal(J.callingReading(w, V.OTHER_SITE_ROOM).uplink, null); assert.equal(J.callingReading(w, 'R-ATL-4-220'), null); }
  const before = MP.readiness(w, 'degraded', reh); assert.equal(before.deps.find((d) => d.id === 'calling').ready, 'AT_RISK'); assert.match(before.deps.find((d) => d.id === 'calling').why, /No job has been raised/);
  const made = S.raiseIncident(w, 'requestor', { roomId: V.VOICE_ROOM, roomName: 'Atlas 4.218 — Executive Boardroom', buildingKey: 'ATL', title: `${J.VOICE_TITLE}: audio breaking up`, summary: 'Reported from the room’s calling page.' });
  assert.ok(made.id, JSON.stringify(made)); let j = J.jobView(w, V.VOICE_ROOM); assert.equal(j.incident.id, made.id); assert.deepEqual(j.steps.map((s) => s.done), [true, false, false, false]);
  ok(S.triage(w, 'svcmgr', made.id, 'High'), 'triage'); ok(S.assign(w, 'svcmgr', made.id, 'tech-ana'), 'assign'); ok(S.accept(w, 'service', made.id), 'accept');
  const wo = S.workOrderOf(w, S.incidentOf(w, made.id).workOrderId); const tools = WORK_NEEDS[wo.workType]?.tools || [];
  if (!S.preflightFor(w, wo.id, { access: true, safety: true, heightPermit: true, tools }).ok) ok(S.replanWindow(w, 'svcmgr', made.id), 'replan');
  ok(S.start(w, 'service', made.id, { access: true, safety: true, heightPermit: true, tools }), 'start');
  assert.ok(S.submitForVerification(w, 'service', made.id), 'handing over without field evidence is refused');
  ok(S.recordEvidence(w, 'service', made.id, 'photo', 'SYNTHETIC: uplink patch lead on ATL-4A port 48 reseated; interface counters photographed'), 'evidence');
  ok(S.submitForVerification(w, 'service', made.id), 'submit');
  assert.ok(S.verify(w, 'service', made.id), 'the technician does not verify their own work');
  j = J.jobView(w, V.VOICE_ROOM); assert.equal(j.verified, false); assert.deepEqual(j.steps.map((s) => s.done), [true, true, true, false]);
  assert.equal(J.callingReading(w, V.VOICE_ROOM).state, 'OUTSIDE', 'evidence handed over but not verified: Assurance and APEX still read the degraded session');
  // a job that is not verified leaves the mission where it was, whatever a later session shows
  assert.equal(MP.readiness(w, 'retest', reh).deps.find((d) => d.id === 'calling').ready, 'UNKNOWN');
  ok(S.verify(w, 'cxeng', made.id), 'verify'); j = J.jobView(w, V.VOICE_ROOM); assert.equal(j.verified, true); assert.equal(j.incident.verifiedBy !== 'service', true); assert.match(j.says, /does not pass an acceptance test/);
  // verified, but the evidence still shows the degraded call: at risk. Verified AND a later session within targets: ready, on simulated evidence
  assert.equal(MP.readiness(w, 'degraded', reh).deps.find((d) => d.id === 'calling').ready, 'AT_RISK');
  const after = MP.readiness(w, 'retest', reh); const c = after.deps.find((d) => d.id === 'calling'); assert.equal(c.ready, 'READY'); assert.equal(c.basis, 'SIMULATED'); assert.match(c.why, /simulated evidence only/);
  assert.equal(after.deps.find((d) => d.id === 'uplink').ready, 'READY');
  // Assurance and APEX now read the later session, because the repair is verified by a second person: within the targets, still simulated
  { const r1 = J.callingReading(w, V.VOICE_ROOM); assert.equal(r1.state, 'WITHIN'); assert.equal(r1.vcase, 'retest'); assert.equal(r1.basis, 'SIMULATED'); assert.match(r1.says, /verified by cxeng/); assert.match(r1.href, /\?case=retest$/); }
  // the mission is still not ready: the host room has no accepted baseline and no rehearsal is recorded. Unknown and missing never count as ready.
  assert.equal(after.overall, 'NOT_READY'); assert.equal(after.deps.find((d) => d.id === 'host').ready, 'NOT_READY'); assert.equal(after.deps.find((d) => d.id === 'rehearsal').ready, 'NOT_READY');
  const withReh = MP.readiness(w, 'retest', [{ at: '2026-11-24T10:00:00Z', by: 'ops', note: 'full run' }]); assert.equal(withReh.deps.find((d) => d.id === 'rehearsal').ready, 'READY'); assert.equal(withReh.overall, 'NOT_READY', 'a rehearsal does not accept the host room');
  for (const k of ['missing', 'stale']) assert.equal(MP.readiness(w, k, reh).deps.find((d) => d.id === 'calling').ready, 'UNKNOWN', `${k} evidence is unknown, never ready`);
});

// 24 Nov 2026 — J6B-VOICE step 4 ("Pro/APEX records an explainable operational hypothesis, not a root-cause certainty") and step 6
// ("Assurance records the relevant operational state; issue closure does not imply a passing acceptance test"), on the engines.
test('APEX records VOICE’s hypothesis as a hypothesis: its own words, citations and unknowns, lowest confidence, read-only; refused without authority, a source or evidence, and refused twice', () => {
  const w = S.seed(); const view = V.caseView('degraded', V.VOICE_ROOM); const vh = J.apexHypothesisFrom(w, V.VOICE_ROOM);
  assert.ok(vh, 'a degraded session with a hypothesis is offered to APEX');
  assert.equal(vh.id, view.hypothesis.id); assert.equal(vh.text, view.hypothesis.statement); assert.deepEqual(vh.evidence, view.hypothesis.cites);
  assert.equal(vh.confidence, 'low'); assert.equal(vh.action.tier, 'A2'); assert.equal(vh.action.runbook, undefined, 'no runbook: nothing can be executed from it');
  for (const u of view.hypothesis.unknowns) assert.ok(vh.caveat.includes(u), `the caveat carries the unknown: ${u}`);
  assert.match(vh.caveat, /not a root cause/); assert.match(vh.caveat, /simulated/); assert.deepEqual(vh.next, [view.hypothesis.wouldChange]);
  assert.deepEqual(vh.from, { product: 'VOICE', id: 'VH-0001', href: `#/voice/callpath/${V.VOICE_ROOM}` }); assert.ok(resolve(vh.from.href));
  // nothing to record where VOICE has no hypothesis: another room, a room with no flow
  assert.equal(J.apexHypothesisFrom(w, V.OTHER_SITE_ROOM), null); assert.equal(J.apexHypothesisFrom(w, 'R-ATL-4-220'), null);
  const made = S.raiseIncident(w, 'requestor', { roomId: V.VOICE_ROOM, roomName: 'Atlas 4.218 — Executive Boardroom', buildingKey: 'ATL', title: `${J.VOICE_TITLE}: audio breaking up`, summary: 'Reported from the room’s calling page.' });
  const opened = S.openApex(w, 'svcmgr', made.id, () => []); assert.ok(opened.id, JSON.stringify(opened)); const H = () => w.apexCases.find((c) => c.id === opened.id);
  const before = H().hypotheses.length; assert.equal(J.apexCaseWith(w, V.VOICE_ROOM, 'VH-0001'), null);
  assert.ok(S.apexRecordHypothesis(w, 'requestor', opened.id, vh)?.why, 'a requester does not write on an APEX case');
  assert.ok(S.apexRecordHypothesis(w, 'svcmgr', opened.id, { ...vh, from: undefined })?.why, 'no source, no record');
  assert.ok(S.apexRecordHypothesis(w, 'svcmgr', opened.id, { ...vh, evidence: [] })?.why, 'no cited evidence, no record');
  assert.ok(S.apexRecordHypothesis(w, 'svcmgr', opened.id, { ...vh, confidence: 'high' })?.why, 'another product’s hypothesis is not recorded as proven');
  assert.equal(H().hypotheses.length, before, 'the refusals wrote nothing');
  assert.equal(S.apexRecordHypothesis(w, 'svcmgr', opened.id, vh), null);
  const rec = H().hypotheses.find((x) => x.id === 'VH-0001'); assert.ok(rec); assert.equal(rec.from.product, 'VOICE'); assert.equal(H().hypotheses.length, before + 1);
  assert.equal(H().key, 'generic'); assert.equal(H().hypotheses[0].id, 'VH-0001', 'the symptom library abstained (confidence none), so a cited hypothesis ranks above the abstention');
  // on a case whose own leading hypothesis is stronger, it ranks below it and after the case's own at the same rank
  { const seeded = w.apexCases.find((c) => c.seeded && c.roomId === V.VOICE_ROOM); assert.ok(seeded, 'the seeded case is in the VOICE room'); const own = seeded.hypotheses.map((x) => x.id); assert.equal(S.apexRecordHypothesis(w, 'svcmgr', seeded.id, vh), null);
    const ids = seeded.hypotheses.map((x) => x.id); assert.equal(ids[0], own[0], 'the case’s leading hypothesis stays first'); const rank = { high: 3, medium: 2, low: 1, none: 0 }; const at = ids.indexOf('VH-0001');
    assert.ok(at > 0, ids.join(' ')); assert.deepEqual(ids.filter((x) => x !== 'VH-0001'), own, 'the case’s own hypotheses keep their order');
    for (let i = 1; i < seeded.hypotheses.length; i += 1) assert.ok(rank[seeded.hypotheses[i - 1].confidence] >= rank[seeded.hypotheses[i].confidence], `ranked by confidence: ${ids.join(' ')}`); }
  assert.ok(H().layers.find((l) => l.layer === 'network').observations.some((o) => o.startsWith('VOICE VH-0001: ')), 'its citations are on the network layer, marked as VOICE’s');
  assert.ok(S.apexRecordHypothesis(w, 'svcmgr', opened.id, vh)?.why, 'the same hypothesis is not recorded twice'); assert.equal(H().hypotheses.length, before + 1);
  assert.equal(J.apexCaseWith(w, V.VOICE_ROOM, 'VH-0001').id, opened.id, 'the CallPath can say which case holds it');
  const ev = w.events.filter((e) => e.type === 'apex.hypothesis_recorded'); assert.equal(ev.filter((e) => e.outcome === 'ALLOWED').length, 2); assert.equal(ev.filter((e) => e.outcome === 'DENIED').length, 5); assert.match(ev.find((e) => e.outcome === 'ALLOWED').detail, /a hypothesis, not a root cause/);
  // acting on it stays read-only: A2 compares, and there is no runbook to run
  const o = S.apexAct(w, 'svcmgr', opened.id, 'VH-0001', { tier: 'A4' }, null); assert.equal(o.outcome, 'BLOCKED'); assert.match(o.detail, /no runbook/);
});

test('an Assurance run writes a drift record when calling is outside its targets, and only a retest that finds it within them clears it: not a verified job, not an unknown reading, not a role without the run authority', () => {
  const ok = (x, l) => assert.equal(x, null, `${l}: ${x && x.why.join('; ')}`); const w = S.seed(); const room = V.VOICE_ROOM; const run = (who, f = J.callingFinding(w, room)) => S.assuranceRun(w, who, room, 'test run', f ? [f] : []);
  assert.equal(J.callingFinding(w, 'R-ATL-4-220'), null, 'no call flow, nothing to find'); assert.deepEqual(S.driftOf(w, room), []);
  const f0 = J.callingFinding(w, room); assert.equal(f0.state, 'OUTSIDE'); assert.equal(f0.subject, 'Calling'); assert.equal(f0.basis, 'SIMULATED'); assert.equal(f0.source.product, 'VOICE'); assert.equal(f0.incidentId, null);
  assert.ok(run('requestor').why, 'a requester does not run Assurance'); assert.deepEqual(S.driftOf(w, room), []);
  const r1 = run('cxeng'); assert.deepEqual(r1, { opened: ['DR-0001'], cleared: [], standing: [] });
  const d = () => S.driftOf(w, room)[0]; assert.equal(d().id, 'DR-0001'); assert.equal(d().cleared, null); assert.equal(d().opened.by, 'cxeng'); assert.match(d().opened.says, /outside the declared calling targets/); assert.equal(d().basis, 'SIMULATED');
  assert.deepEqual(run('cxeng'), { opened: [], cleared: [], standing: ['DR-0001'] }, 'a second run with the same finding does not write a second record'); assert.equal(S.driftOf(w, room).length, 1);
  // an unknown reading clears nothing; a WITHIN finding for another subject clears nothing
  assert.deepEqual(run('cxeng', { ...f0, state: 'UNKNOWN', says: 'no session observed' }), { opened: [], cleared: [], standing: ['DR-0001'] }); assert.equal(d().cleared, null);
  assert.deepEqual(run('cxeng', { ...f0, subject: 'Something else', state: 'WITHIN' }), { opened: [], cleared: [], standing: [] }); assert.equal(d().cleared, null);
  // the job: reported, repaired, handed over. Until a second person verifies, the reading is still OUTSIDE and the record stands
  const made = S.raiseIncident(w, 'requestor', { roomId: room, roomName: 'Atlas 4.218 — Executive Boardroom', buildingKey: 'ATL', title: `${J.VOICE_TITLE}: audio breaking up`, summary: 'Reported from the room’s calling page.' });
  ok(S.triage(w, 'svcmgr', made.id, 'High'), 'triage'); ok(S.assign(w, 'svcmgr', made.id, 'tech-ana'), 'assign'); ok(S.accept(w, 'service', made.id), 'accept');
  const wo = S.workOrderOf(w, S.incidentOf(w, made.id).workOrderId); const tools = WORK_NEEDS[wo.workType]?.tools || [];
  if (!S.preflightFor(w, wo.id, { access: true, safety: true, heightPermit: true, tools }).ok) ok(S.replanWindow(w, 'svcmgr', made.id), 'replan');
  ok(S.start(w, 'service', made.id, { access: true, safety: true, heightPermit: true, tools }), 'start'); ok(S.recordEvidence(w, 'service', made.id, 'photo', 'SYNTHETIC: uplink patch lead reseated'), 'evidence'); ok(S.submitForVerification(w, 'service', made.id), 'submit');
  assert.deepEqual(run('cxeng'), { opened: [], cleared: [], standing: ['DR-0001'] }, 'work handed over is not a retest'); assert.equal(d().incidentId, made.id, 'the standing record now names the job raised for it');
  ok(S.verify(w, 'cxeng', made.id), 'verify'); assert.equal(J.callingFinding(w, room).state, 'WITHIN');
  assert.equal(d().cleared, null, 'verifying the repair does not clear the record: only an Assurance run does');
  // the technician who did the repair, the service manager and the operations lead do not hold the run authority: none of them clears it
  for (const who of ['service', 'svcmgr', 'opslead']) { assert.ok(run(who).why, `${who} does not run Assurance`); assert.equal(d().cleared, null); }
  assert.deepEqual(run('cxeng'), { opened: [], cleared: ['DR-0001'], standing: [] }); assert.equal(d().cleared.by, 'cxeng'); assert.match(d().cleared.says, /within the declared calling targets/);
  const cl = w.events.find((e) => e.type === 'assurance.drift_cleared' && e.outcome === 'ALLOWED'); assert.match(cl.detail, /retest/); assert.match(cl.detail, /accepted baseline is unchanged/);
  assert.deepEqual(run('cxeng'), { opened: [], cleared: [], standing: [] }, 'within the targets and nothing open: nothing to write'); assert.equal(S.driftOf(w, room).length, 1);
  assert.equal(J.apexHypothesisFrom(w, room), null, 'and VOICE no longer offers APEX a hypothesis: the later session is within the targets');
  // a workspace saved before drift records existed is read with none, not with an error
  { const old = JSON.parse(JSON.stringify(S.seed())); delete old.drift; delete old.seq.drift; const store = new Map([['empathia.demo.workspace.v1', JSON.stringify(old)]]); const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) } });
    try { const l = S.load(); assert.deepEqual(l.drift, []); assert.equal(l.seq.drift, 0); } finally { if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete globalThis.localStorage; } }
});

// Founder directive of 24 Nov (completion §6): "Repair completion does not automatically establish operational readiness"; "Failed
// retests retain unresolved drift"; "MissionProof reads readiness from the appropriate verified evidence"; "Reopened or recurring
// incidents correctly affect operational readiness"; "Missing or stale evidence does not produce misleading readiness declarations".
// Before this test MissionProof read the degraded call unless the address named another case, read the uplink as ready whenever the
// address said "retest", and counted calling ready on a verified repair while Assurance still held an open drift record.
test('readiness follows the records: not from the address alone, not before the Assurance retest, and not after a reopen or a new report', () => {
  const ok = (x, l) => assert.equal(x, null, `${l}: ${x && x.why.join('; ')}`); const w = S.seed(); const room = V.VOICE_ROOM; const dep = (c, id) => MP.readiness(w, c, []).deps.find((d) => d.id === id);
  const run = () => S.assuranceRun(w, 'cxeng', room, 'test run', [J.callingFinding(w, room)]);
  const repair = (title) => { const made = S.raiseIncident(w, 'requestor', { roomId: room, roomName: 'Atlas 4.218 — Executive Boardroom', buildingKey: 'ATL', title: `${J.VOICE_TITLE}: ${title}`, summary: 'Reported from the room’s calling page.' });
    ok(S.triage(w, 'svcmgr', made.id, 'High'), 'triage'); ok(S.assign(w, 'svcmgr', made.id, 'tech-ana'), 'assign'); ok(S.accept(w, 'service', made.id), 'accept');
    const wo = S.workOrderOf(w, S.incidentOf(w, made.id).workOrderId); const tools = WORK_NEEDS[wo.workType]?.tools || [];
    if (!S.preflightFor(w, wo.id, { access: true, safety: true, heightPermit: true, tools }).ok) ok(S.replanWindow(w, 'svcmgr', made.id), 'replan');
    ok(S.start(w, 'service', made.id, { access: true, safety: true, heightPermit: true, tools }), 'start'); ok(S.recordEvidence(w, 'service', made.id, 'photo', 'SYNTHETIC: patch lead reseated'), 'evidence'); ok(S.submitForVerification(w, 'service', made.id), 'submit'); return made.id; };
  // nothing repaired: the record is the degraded call, and naming the later case in the address makes nothing ready
  assert.equal(MP.caseOnRecord(w), 'degraded'); assert.equal(dep('degraded', 'calling').ready, 'AT_RISK');
  assert.equal(dep('retest', 'calling').ready, 'UNKNOWN'); assert.equal(dep('retest', 'uplink').ready, 'UNKNOWN', 'the address alone does not make the uplink ready'); assert.match(dep('retest', 'uplink').why, /no repair is on record/);
  // Assurance records the drift; the repair is done and handed over: still nothing ready, and the technician cannot verify the work
  assert.deepEqual(run().opened, ['DR-0001']); const job = repair('audio breaking up');
  assert.ok(S.verify(w, 'service', job)?.why, 'the technician who did the work cannot verify it'); assert.equal(MP.caseOnRecord(w), 'degraded'); assert.equal(dep('retest', 'calling').ready, 'UNKNOWN'); assert.equal(dep('retest', 'uplink').ready, 'UNKNOWN'); assert.match(dep('retest', 'uplink').why, /is not verified/);
  // verified by a second person: the later session is now on record, the uplink reads from it, but calling waits for the retest
  ok(S.verify(w, 'cxeng', job), 'verify'); assert.equal(MP.caseOnRecord(w), 'retest'); assert.equal(dep('retest', 'uplink').ready, 'READY');
  { const c = dep('retest', 'calling'); assert.equal(c.ready, 'UNKNOWN', 'a verified repair is not readiness while a drift record is open'); assert.match(c.why, /DR-0001 is still open/); assert.match(c.why, /Only an Assurance retest clears it/); }
  assert.notEqual(MP.readiness(w, 'retest', []).overall, 'READY');
  // a retest that still finds it outside keeps the record, and readiness stays where it was
  assert.deepEqual(S.assuranceRun(w, 'cxeng', room, 'failed retest', [{ ...J.callingFinding(w, room), state: 'OUTSIDE', says: 'still outside in the retest window' }]), { opened: [], cleared: [], standing: ['DR-0001'] }); assert.equal(dep('retest', 'calling').ready, 'UNKNOWN');
  // the retest that finds it within clears the record: now, and only now, calling is ready, and it says which record was cleared
  assert.deepEqual(run().cleared, ['DR-0001']); { const c = dep('retest', 'calling'); assert.equal(c.ready, 'READY'); assert.match(c.why, /retest cleared drift record DR-0001/); assert.match(c.why, /simulated evidence only/); }
  // the job is reopened: the later session is no longer the record; readiness drops; a new run writes a new record and keeps the old one
  ok(S.reopen(w, 'svcmgr', job, 'the fault came back on the next call'), 'reopen'); assert.equal(MP.caseOnRecord(w), 'degraded'); assert.equal(dep(MP.caseOnRecord(w), 'calling').ready, 'AT_RISK');
  assert.equal(dep('retest', 'calling').ready, 'UNKNOWN'); assert.equal(dep('retest', 'uplink').ready, 'UNKNOWN');
  assert.deepEqual(run().opened, ['DR-0002']); const all = S.driftOf(w, room); assert.equal(all.length, 2); assert.ok(all.find((d) => d.id === 'DR-0001').cleared, 'the cleared record is kept as history'); assert.equal(all.find((d) => d.id === 'DR-0002').cleared, null);
});

test('a new calling report after a verified repair is the record: the earlier repair no longer speaks for the room', () => {
  const ok = (x, l) => assert.equal(x, null, `${l}: ${x && x.why.join('; ')}`); const w = S.seed(); const room = V.VOICE_ROOM;
  const first = S.raiseIncident(w, 'requestor', { roomId: room, roomName: 'Atlas 4.218 — Executive Boardroom', buildingKey: 'ATL', title: `${J.VOICE_TITLE}: audio breaking up`, summary: 'first report' });
  ok(S.triage(w, 'svcmgr', first.id, 'High'), 'triage'); ok(S.assign(w, 'svcmgr', first.id, 'tech-ana'), 'assign'); ok(S.accept(w, 'service', first.id), 'accept');
  const wo = S.workOrderOf(w, S.incidentOf(w, first.id).workOrderId); const tools = WORK_NEEDS[wo.workType]?.tools || []; if (!S.preflightFor(w, wo.id, { access: true, safety: true, heightPermit: true, tools }).ok) ok(S.replanWindow(w, 'svcmgr', first.id), 'replan');
  ok(S.start(w, 'service', first.id, { access: true, safety: true, heightPermit: true, tools }), 'start'); ok(S.recordEvidence(w, 'service', first.id, 'photo', 'SYNTHETIC: patch lead reseated'), 'evidence'); ok(S.submitForVerification(w, 'service', first.id), 'submit'); ok(S.verify(w, 'cxeng', first.id), 'verify');
  assert.equal(MP.caseOnRecord(w), 'retest'); assert.equal(MP.readiness(w, 'retest', []).deps.find((d) => d.id === 'calling').ready, 'READY');
  const second = S.raiseIncident(w, 'requestor', { roomId: room, roomName: 'Atlas 4.218 — Executive Boardroom', buildingKey: 'ATL', title: `${J.VOICE_TITLE}: dropped again`, summary: 'second report' });
  assert.equal(J.jobView(w, room).incident.id, second.id, 'the newest report is the room’s job'); assert.equal(J.callingReading(w, room).state, 'OUTSIDE'); assert.equal(MP.caseOnRecord(w), 'degraded');
  assert.equal(MP.readiness(w, MP.caseOnRecord(w), []).deps.find((d) => d.id === 'calling').ready, 'AT_RISK'); assert.equal(MP.readiness(w, 'retest', []).deps.find((d) => d.id === 'calling').ready, 'UNKNOWN', 'and the later case cannot be read as ready: the open job is not verified');
});

test('FLOW (J6A): claims by layer from the estate’s own edges, UNKNOWN where nothing is recorded, dependents by the impact traversal', () => {
  const v = F.linkView('SW-ATL-4A'); assert.ok(v); assert.deepEqual(v.rooms.map((r) => r.id), [...V.SHARED_LINK.rooms].sort());
  const by = (l) => v.claims.filter((c) => c.layer === l);
  assert.ok(by('L1').some((c) => c.state === 'DECLARED' && /Powered from/.test(c.label)) && by('L1').some((c) => c.state === 'UNKNOWN' && /Cabling/.test(c.label)));
  const feeds = by('L2').find((c) => /Feeds 5 networked devices/.test(c.label)); assert.ok(feeds && feeds.state === 'OBSERVED' && feeds.refs.length === 5, 'the five observed port-table edges');
  assert.ok(by('L3').some((c) => /Uplink: fed by Core switch/.test(c.label) && c.state === 'DECLARED')); assert.ok(by('L3').some((c) => /WAN/.test(c.label) && c.state === 'UNKNOWN'));
  assert.ok(by('APP').some((c) => c.state === 'MODELED' && /not an observed stream/.test(c.source))); assert.ok(by('APP').some((c) => /timing/i.test(c.label) && c.state === 'UNKNOWN'));
  assert.equal(v.claims.find((c) => c.label === 'Uplink interface counters').state, 'SIMULATED'); assert.equal(F.linkView('SW-ATL-4A', 'stale').claims.find((c) => c.label === 'Uplink interface counters').state, 'STALE');
  assert.ok(!v.claims.some((c) => ['MEASURED', 'VERIFIED'].includes(c.state))); assert.equal(F.linkView('SW-NOPE'), null);
  assert.equal(F.networkNodes().length, est.nodes.filter((n) => n.type === 'NetworkNode').length);
  assert.equal(F.stateOf('OBSERVED (switch port table)'), 'OBSERVED'); assert.equal(F.stateOf('anything else'), 'DECLARED');
  for (const r of ['architect', 'ops', 'syseng', 'service', 'svcmgr', 'ucadmin']) assert.ok(canOpen(r, resolve('#/flow/link/SW-ATL-4A')), `${r} reads FLOW`);
  for (const r of ['visitor', 'employee', 'exec', 'bpm']) assert.ok(!canOpen(r, resolve('#/flow')), `${r} is refused FLOW`);
});

test('product families (founder decision E3-D1): the nine products keep their ids; eight capabilities are added; every built one has a registered address', () => {
  const products = CAPABILITIES.filter((c) => c.kind === 'product').map((c) => c.id); assert.deepEqual([...products].sort(), [...PRODUCT_IDS].sort(), 'the original nine, by id');
  const caps = CAPABILITIES.filter((c) => c.kind === 'capability').map((c) => c.id).sort(); assert.deepEqual(caps, ['accord', 'flow', 'forge', 'missionproof', 'omnipresence', 'prism', 'sentinel', 'voice']);
  assert.equal(new Set(CAPABILITIES.map((c) => c.id)).size, 17); assert.equal(FAMILIES.length, 6);
  for (const c of CAPABILITIES) { if (c.built) assert.ok(resolve(`#${c.demo}`), `${c.name}: ${c.demo} is a registered address`); else assert.equal(c.demo, undefined, `${c.name} is not built and has no address`); }
  // changed 24 Nov 2026: PRISM, SENTINEL, ACCORD, FORGE and OMNIPRESENCE are built (tests/unit/modules.test.mjs), so nothing is listed as not built
  assert.deepEqual(CAPABILITIES.filter((c) => !c.built).map((c) => c.id), [], 'every capability is built');
});

test('adapters: one mock, every vendor row CONTRACT_ONLY', () => {
  assert.equal(V.ADAPTERS.filter((a) => a.status === 'MOCK').length, 1);
  assert.ok(V.ADAPTERS.filter((a) => a.id !== 'voice.mock').every((a) => a.status === 'CONTRACT_ONLY' && /Not connected/.test(a.note)));
});
