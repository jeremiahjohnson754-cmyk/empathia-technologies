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
].join('\n'));
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic', nodePaths: [path.join(repo, 'node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.png': 'empty', '.webp': 'empty', '.jpg': 'empty' } });
const { V, resolve, canOpen, canSee, ROLE_KEYS, buildEstate } = await import(pathToFileURL(out).href);
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
  assert.match(V.METHOD.status, /SPECIFIED/);
});

test('targets are the tenant’s: a window is judged only against the declared calling policy', () => {
  const [a, , c] = V.SESSION.samples; assert.deepEqual(V.outsidePolicy(a), []); assert.equal(V.outsidePolicy(c).length, 2);
  assert.deepEqual(V.outsidePolicy({ ...a, lossPct: null, jitterMs: null, oneWayDelayMs: null }), [], 'a missing value proves nothing');
});

test('privacy: no directory number, emergency number or personal contact detail in the fixture', () => {
  const text = JSON.stringify({ f: V.FLOW, s: V.SESSION, a: V.ADAPTERS, c: ['degraded', 'missing', 'stale'].map(V.caseView) });
  assert.ok(!/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/.test(text) && !/\+\d{7,}/.test(text), 'no telephone number');
  assert.ok(!/\b(911|112|999)\b/.test(text), 'no emergency number');
  assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(text), 'no e-mail address'); assert.ok(!/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text), 'no IP address');
  assert.match(V.SESSION.token, /…/, 'the session token is shown shortened'); assert.ok(V.NEVER.some((n) => /emergency number/.test(n)));
});

test('access: who may open what, by the demonstration’s own policy', () => {
  const page = (h) => resolve(h); const cp = page('#/voice/callpath/R-ATL-4-218'); const home = page('#/voice'); const rep = page('#/voice/report/R-ATL-4-218');
  assert.ok(cp && home && rep, 'the three addresses are registered');
  for (const r of ['architect', 'ops', 'syseng', 'service', 'svcmgr']) assert.ok(canOpen(r, cp), `${r} opens the CallPath`);
  for (const r of ['visitor', 'employee', 'exec', 'designer', 'installer', 'bpm', 'qa', 'sitechamp']) assert.ok(!canOpen(r, cp), `${r} is refused the CallPath`);
  assert.ok(canOpen('exec', home) && !canOpen('employee', home) && !canOpen('visitor', home));
  for (const r of ['architect', 'ops', 'syseng']) assert.ok(canSee(r, cp, 'voice.signalling'), `${r} reads signalling-side detail`);
  for (const r of ['service', 'svcmgr']) assert.ok(!canSee(r, cp, 'voice.signalling'), `${r} does not`);
  assert.ok(canOpen('employee', rep), 'an employee may report a calling problem (V2.5.3 issue.report)');
  for (const r of ROLE_KEYS) assert.equal(V.viewOf(r) !== 'none', canOpen(r, home), `${r}: the view model and the registry agree`);
});

test('adapters: one mock, every vendor row CONTRACT_ONLY', () => {
  assert.equal(V.ADAPTERS.filter((a) => a.status === 'MOCK').length, 1);
  assert.ok(V.ADAPTERS.filter((a) => a.id !== 'voice.mock').every((a) => a.status === 'CONTRACT_ONLY' && /Not connected/.test(a.note)));
});
