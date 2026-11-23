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
  `export * as S from ${at('apps/demo/src/workspace/store.ts')};`, `export { WORK_NEEDS } from '@empathia/service-engine';`, `export { FAMILIES, CAPABILITIES } from ${at('packages/ui/src/families.ts')};`, `export { PRODUCT_IDS } from ${at('packages/ui/src/products.ts')};`, `export { roomById } from ${at('apps/demo/src/campus/canon.ts')};`,
].join('\n'));
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic', nodePaths: [path.join(repo, 'node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.png': 'empty', '.webp': 'empty', '.jpg': 'empty' } });
const { V, resolve, canOpen, canSee, ROLE_KEYS, buildEstate, J, F, MP, S, WORK_NEEDS, FAMILIES, CAPABILITIES, PRODUCT_IDS, roomById } = await import(pathToFileURL(out).href);
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
  // a job that is not verified leaves the mission where it was, whatever a later session shows
  assert.equal(MP.readiness(w, 'retest', reh).deps.find((d) => d.id === 'calling').ready, 'UNKNOWN');
  ok(S.verify(w, 'cxeng', made.id), 'verify'); j = J.jobView(w, V.VOICE_ROOM); assert.equal(j.verified, true); assert.equal(j.incident.verifiedBy !== 'service', true); assert.match(j.says, /does not pass an acceptance test/);
  // verified, but the evidence still shows the degraded call: at risk. Verified AND a later session within targets: ready, on simulated evidence
  assert.equal(MP.readiness(w, 'degraded', reh).deps.find((d) => d.id === 'calling').ready, 'AT_RISK');
  const after = MP.readiness(w, 'retest', reh); const c = after.deps.find((d) => d.id === 'calling'); assert.equal(c.ready, 'READY'); assert.equal(c.basis, 'SIMULATED'); assert.match(c.why, /simulated evidence only/);
  assert.equal(after.deps.find((d) => d.id === 'uplink').ready, 'READY');
  // the mission is still not ready: the host room has no accepted baseline and no rehearsal is recorded. Unknown and missing never count as ready.
  assert.equal(after.overall, 'NOT_READY'); assert.equal(after.deps.find((d) => d.id === 'host').ready, 'NOT_READY'); assert.equal(after.deps.find((d) => d.id === 'rehearsal').ready, 'NOT_READY');
  const withReh = MP.readiness(w, 'retest', [{ at: '2026-11-24T10:00:00Z', by: 'ops', note: 'full run' }]); assert.equal(withReh.deps.find((d) => d.id === 'rehearsal').ready, 'READY'); assert.equal(withReh.overall, 'NOT_READY', 'a rehearsal does not accept the host room');
  for (const k of ['missing', 'stale']) assert.equal(MP.readiness(w, k, reh).deps.find((d) => d.id === 'calling').ready, 'UNKNOWN', `${k} evidence is unknown, never ready`);
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
