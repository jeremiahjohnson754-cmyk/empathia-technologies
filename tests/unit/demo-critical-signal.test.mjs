// The Critical Signal (apps/demo/src/gameday/signal; founder, 10 Nov 2026: "A camera feed or production signal becomes unavailable
// during a simulated event… a real connected workflow, not ten isolated scripted screens"). Everything the page says is recomputed
// here from the records it reads: the chain is six estate records and nothing else; what each point shows is simulated, inferred or
// known and says which; the procedure is the one for the hop the observations isolate, for every hop; nothing in a procedure is
// unsafe; only the stadium's technical roles work the incident and someone else checks the fix; and the whole workflow moves the
// game-day engine's own state, so the system reads working again and kick-off is no longer held.
//   node --test tests/unit/demo-critical-signal.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-critical-signal-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as G from './gameday/engine.ts'; export * as GS from './gameday/store.ts'; export * as A from './gameday/signal/access.ts'; export * as M from './gameday/signal/model.ts'; export * as T from './gameday/signal/store.ts'; export * as S from './estate/stadium.ts'; export * as EM from './estate/model.ts'; export * as RD from './estate/reader.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as WR from './worlds/registry.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { G, GS, A, M, T, S, EM, RD, W, P, R, WR } = await import(pathToFileURL(out).href);

const chain = M.chainOf(); const assetIds = new Set(S.STADIUM.assets.map((a) => a.id)); const nodeIds = new Set(S.STADIUM.nodes.map((n) => n.id));
const cfg = (id) => WR.configById(id); const actor = (id) => ({ config: id, label: cfg(id).label });
const ENG = actor('stadium.broadcast_engineer'); const AVIT = actor('stadium.av_it_engineer'); const PROD = actor('stadium.event_producer'); const OPS = actor('stadium.venue_ops_lead'); const FAN = actor('stadium.fan');
const must = (r) => { assert.ok(r.ok, r.why && [].concat(r.why).join(' ')); return r.state; };
const run = (g, n) => { for (let i = 0; i < n; i += 1) g = must(G.advance(g)); return g; };
const fresh = () => { mem.clear(); return W.seed(); };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const allText = () => JSON.stringify([M.HOP_IDS.map((h) => [M.observe(chain, { incident: 'GD-001', failed: h }), M.procedureFor(chain, h), M.evidenceFor(chain, h)]), M.observe(chain, { incident: 'GD-001', failed: null, via: 'fibre' }), M.procedureFor(chain, null), M.PRIOR, M.PROVENANCE_HELP, M.READING_WORD, chain.hops.map((h) => [h.does, h.tap, h.link, h.post])]);

// ------------------------------------------------------------------------------------------------------------ the chain is the records
test('CS-01 the chain is generated from the estate: six hops in signal order, every hop an equipment record in a place record, nothing missing', () => {
  assert.deepEqual(chain.hops.map((h) => h.id), ['camera', 'fibre', 'patch', 'ccu', 'router', 'switcher']); assert.deepEqual(chain.missing, []); assert.deepEqual(chain.hops.map((h) => h.n), [1, 2, 3, 4, 5, 6]);
  for (const h of chain.hops) {
    const rec = S.STADIUM.assets.find((a) => a.id === h.asset.id); assert.ok(rec, `${h.id} → ${h.asset.id} is an estate asset`); assert.equal(h.asset, rec, 'the hop holds the record itself, not a copy of its words');
    assert.equal(h.place, S.STADIUM.nodes.find((n) => n.id === rec.room), h.id); assert.equal(rec.provenance, 'SYNTHETIC'); assert.equal(h.level?.kind, 'level', h.id);
    if (h.backup) assert.ok(assetIds.has(h.backup.id), `${h.id} standby ${h.backup.id}`);
  }
  assert.ok(assetIds.has(chain.seenAt.asset.id)); assert.equal(chain.seenAt.place.id, 'STA-BCR');
  assert.equal(chain.hops[0].place.id, G.FAULTS['camera-feed'].room, 'the fault’s room is where the chain starts');
  assert.deepEqual(M.placesOf(chain).map((p) => p.id), ['STA-CAM-MAIN', 'STA-MER', 'STA-BCR']);
});
test('CS-02 a record that is not in the estate is reported missing and its hop is not drawn: nothing is invented', () => {
  const without = { ...S.STADIUM, assets: S.STADIUM.assets.filter((a) => a.id !== 'STA-MER-A04') }; const c = M.chainOf(without);
  assert.deepEqual(c.missing, ['STA-MER-A04']); assert.equal(c.hops.length, 5); assert.ok(!c.hops.some((h) => h.id === 'ccu')); assert.deepEqual(c.hops.map((h) => h.n), [1, 2, 3, 4, 5]);
  const noBackup = M.chainOf({ ...S.STADIUM, assets: S.STADIUM.assets.filter((a) => a.id !== 'STA-CAM-MAIN-A03') }); assert.ok(noBackup.missing.includes('STA-CAM-MAIN-A03')); assert.equal(M.hopOf(noBackup, 'fibre').backup, null);
});
test('CS-03 the records added for the chain are small, synthetic, stable and carry no make; the estate still validates', () => {
  assert.deepEqual(EM.validate(S.STADIUM), []);
  const added = ['STA-CAM-MAIN-A02', 'STA-CAM-MAIN-A03', 'STA-MER-A04', 'STA-MER-A05'].map((id) => S.STADIUM.assets.find((a) => a.id === id)); assert.ok(added.every(Boolean));
  const makes = /\b(crestron|extron|qsc|biamp|shure|cisco|poly|logitech|sony|samsung|lg|barco|christie|epson|panasonic|sennheiser|yamaha|bose|jbl|harman|amx|kramer|grass valley|ross|evertz|blackmagic|ikegami|hitachi|canon|fujinon|lawo|riedel|nevion|imagine)\b/i;
  for (const a of added) { assert.equal(a.provenance, 'SYNTHETIC'); assert.equal(a.state, 'IN_SERVICE'); assert.ok(a.qty > 0); assert.doesNotMatch(`${a.label} ${a.cls}`, makes); }
  for (const id of ['STA-CAM-MAIN-A01', 'STA-MER-A01', 'STA-MER-A02', 'STA-MER-A03', 'STA-BCR-A01', 'STA-BCR-A02', 'STA-BCR-A03']) assert.ok(assetIds.has(id), `${id} kept its identifier`);
  for (const id of ['STA-CAM-MAIN', 'STA-BCR', 'STA-MER']) assert.ok(S.STADIUM.nodes.find((n) => n.id === id).plan, `${id} has a place on the plan`);
  assert.doesNotMatch(allText(), makes);
});

// ------------------------------------------------------------------------------------------------------------ observations
test('CS-04 every observation says how it is known and where from: simulated where there is something to look at, inferred where there is not, known from the record', () => {
  for (const failed of [...M.HOP_IDS, null]) {
    const obs = M.observe(chain, { incident: 'GD-007', failed });
    for (const h of chain.hops) {
      const mine = obs.filter((o) => o.hop === h.id); assert.equal(mine.length, 2, h.id);
      const known = mine.find((o) => o.provenance === 'KNOWN'); assert.ok(known && known.reading === null); assert.ok(known.source.includes(h.asset.id), 'a known fact cites its record'); assert.ok(known.text.includes(h.asset.label));
      const seen = M.readingOf(obs, h.id); assert.equal(seen.provenance, h.tap ? 'SIMULATED' : 'INFERRED', h.id);
      if (h.tap) assert.ok(seen.source.includes('GD-007') && /^Simulated indication/.test(seen.source)); else assert.match(seen.source, /^Inferred from/);
    }
    for (const o of obs) { assert.ok(['SIMULATED', 'INFERRED', 'KNOWN'].includes(o.provenance)); assert.ok(o.text.length > 10 && o.source.length > 10); }
  }
  assert.equal(chain.hops.filter((h) => !h.tap).length, 1, 'one hop (the cable) has nothing to look at');
  assert.deepEqual(Object.keys(M.PROVENANCE_HELP).sort(), ['INFERRED', 'KNOWN', 'SIMULATED']);
});
test('CS-05 the readings follow the picture: it passes up to the failed hop, stops there, and nothing arrives after it', () => {
  for (const [k, failed] of M.HOP_IDS.entries()) {
    const obs = M.observe(chain, { incident: 'GD-001', failed }); const r = chain.hops.map((h) => M.readingOf(obs, h.id).reading);
    assert.deepEqual(r, chain.hops.map((_, i) => (i < k ? 'passes' : i === k ? 'stops' : 'nothing')), failed);
  }
  const after = M.observe(chain, { incident: 'GD-001', failed: null, via: 'fibre' }); assert.ok(chain.hops.every((h) => M.readingOf(after, h.id).reading === 'passes')); assert.match(M.readingOf(after, 'fibre').text, /on the standby/);
});
test('CS-06 nothing the model says claims a reading from an instrument: no "measured", "live", "real-time", "monitored" or "certified"', () => {
  assert.doesNotMatch(allText(), /\b(measured|measurement|live|real-?time|monitored|monitoring|certified|production-ready)\b/i);
  assert.doesNotMatch(allText(), /\b(aon|kraft|heinz|khc|stefanini)\b/i);
});

// ------------------------------------------------------------------------------------------------------------ isolation and procedure, for every hop
test('CS-07 for every hop: the observations isolate exactly that hop, and the procedure chosen is the one for it', () => {
  const titles = new Set();
  for (const failed of M.HOP_IDS) {
    const obs = M.observe(chain, { incident: 'GD-001', failed }); const iso = M.isolate(chain, obs);
    assert.equal(iso.hop, failed); assert.equal(iso.by, M.hopOf(chain, failed).tap ? 'SIMULATED' : 'INFERRED'); assert.ok(iso.why.length > 20);
    const p = M.procedureFor(chain, iso.hop); assert.equal(p.hop, failed); assert.equal(p.id, `proc-${failed}`); titles.add(p.title); assert.ok(p.restores && p.steps.length >= 3 && p.never.length >= 1 && p.after.length > 10, failed);
    for (const id of p.uses) assert.ok(assetIds.has(id), `${failed} uses ${id}`);
    const h = M.hopOf(chain, failed); assert.ok(p.uses.includes(h.asset.id)); if (h.backup) assert.ok(p.uses.includes(h.backup.id), 'the standby on record is what the procedure uses');
    assert.equal(new Set(p.steps.map((s) => s.id)).size, p.steps.length);
  }
  assert.equal(titles.size, 6, 'six hops, six different procedures');
  assert.equal(M.isolate(chain, M.observe(chain, { incident: 'GD-001', failed: null })).hop, null);
  const hold = M.procedureFor(chain, null); assert.equal(hold.hop, null); assert.equal(hold.restores, null); assert.match(hold.title, /call the duty broadcast engineer/);
});
test('CS-08 observations that disagree isolate nothing, and then nothing is changed on a guess', () => {
  const a = M.observe(chain, { incident: 'GD-001', failed: 'patch' }); const b = M.observe(chain, { incident: 'GD-001', failed: 'router' });
  const mixed = a.map((o, i) => (o.hop === 'router' ? b[i] : o)); const iso = M.isolate(chain, mixed);
  assert.equal(iso.hop, null); assert.match(iso.why, /disagree/); assert.match(M.procedureFor(chain, iso.hop).never.join(' '), /Nothing is changed on a guess/);
});
test('CS-09 no procedure step asks for anything unsafe: no work at height, no re-seating or pulling a cable, no defeating a protection, no switching power', () => {
  const unsafe = /\b(climb|ladder|scaffold|at height|roof|gantry|harness|re-?seat|re-?plug|unplug|pull (out|the|a)|hot.?plug|bypass|defeat|override|jumper out|disable|open (the |a )?(rack|unit|camera|cabinet|panel)|power (it )?(off|down|cycle)|switch (it )?off|isolator|breaker|mains)\b/i;
  for (const hop of [...M.HOP_IDS, null]) { const p = M.procedureFor(chain, hop);
    for (const s of p.steps) assert.doesNotMatch(s.do, unsafe, `${p.id} ${s.id}: ${s.do}`);
    assert.doesNotMatch(p.title, unsafe); for (const n of p.never) assert.match(n, /^(Nobody|Nothing|The )/, `${p.id}: a prohibition is stated as one`);
    if (hop) { assert.match(p.steps[0].do, /^Tell the director/, 'the programme is protected first'); assert.ok(p.steps.every((s) => s.at === 'seen' || M.HOP_IDS.includes(s.at))); assert.equal(p.steps[p.steps.length - 1].at, 'seen', 'the last step is to look at the picture'); }
  }
});
test('CS-10 the scenario is decided by the incident number alone: the same incident tells the same story, and six in a row cover every hop', () => {
  assert.equal(M.failedHopOf('GD-001'), 'fibre'); assert.equal(M.failedHopOf('GD-001'), M.failedHopOf('GD-001'));
  assert.deepEqual(new Set(['GD-001', 'GD-002', 'GD-003', 'GD-004', 'GD-005', 'GD-006'].map(M.failedHopOf)).size, 6); assert.ok(M.HOP_IDS.includes(M.failedHopOf('x')));
});

// ------------------------------------------------------------------------------------------------------------ what is written down
test('CS-11 an outcome is recorded only when it says what was done; a check only when it names the picture and one more piece of evidence', () => {
  const p = M.procedureFor(chain, 'fibre'); const all = p.steps.map((s) => s.id);
  assert.deepEqual(M.outcomeProblems(p, { restored: true, done: all, note: '' }), []);
  assert.match(M.outcomeProblems(p, { restored: true, done: all.slice(1), note: '' }).join(' '), /1 of 4 is not ticked/);
  assert.match(M.outcomeProblems(p, { restored: false, done: [], note: 'no' }).join(' '), /at least 8 characters/); assert.deepEqual(M.outcomeProblems(p, { restored: false, done: [], note: 'still dark after the changeover' }), []);
  assert.match(M.outcomeProblems(M.procedureFor(chain, null), { restored: true, done: ['hold-1', 'hold-2'], note: '' }).join(' '), /does not restore the feed/);
  assert.match(M.outcomeProblems(p, { restored: true, done: all, note: 'x'.repeat(301) }).join(' '), /under 300/);
  for (const hop of M.HOP_IDS) { const ev = M.evidenceFor(chain, hop); assert.deepEqual(ev.map((e) => e.id), ['wall', 'tap', 'cut', 'tagged']); assert.ok(ev[0].required && ev.slice(1).every((e) => !e.required)); for (const e of ev) assert.ok(assetIds.has(e.record), `${hop} ${e.id} → ${e.record}`); }
  const ev = M.evidenceFor(chain, 'fibre'); assert.equal(ev[0].record, 'STA-BCR-A03'); assert.equal(ev[1].record, 'STA-CAM-MAIN-A03', 'the tap evidence names the standby that is now carrying the picture');
  assert.match(M.evidenceProblems(ev, []).join(' '), /Name the evidence that the picture is back/); assert.match(M.evidenceProblems(ev, ['wall']).join(' '), /at least two/); assert.match(M.evidenceProblems(ev, ['cut', 'tagged']).join(' '), /picture is back/);
  assert.deepEqual(M.evidenceProblems(ev, ['wall', 'tap']), []); assert.match(M.evidenceNote(ev, ['wall', 'tap']), /^evidence: .*STA-BCR-A03.*STA-CAM-MAIN-A03/);
});

// ------------------------------------------------------------------------------------------------------------ who may
test('CS-12 only the stadium’s technical roles work the incident; production and operations leads check it; a guest configuration opens nothing', () => {
  assert.deepEqual([...A.SIGNAL_WORK], ['stadium.broadcast_engineer', 'stadium.av_it_engineer', 'stadium.service_technician', 'stadium.msp_engineer']);
  assert.deepEqual([...A.SIGNAL_VERIFY], [...A.SIGNAL_WORK, 'stadium.event_producer', 'stadium.venue_ops_lead']); assert.deepEqual([...A.SIGNAL_OPEN], [...A.SIGNAL_VERIFY]);
  for (const id of A.SIGNAL_OPEN) { const c = cfg(id); assert.ok(c && c.world === 'stadium', id); assert.ok(['engineering', 'production', 'operations'].includes(c.purpose), id); assert.ok(RD.seesEquipment(RD.readerOf(c)), `${id} is a role that is shown equipment`); }
  for (const c of WR.ROLE_CONFIGS) { const open = A.SIGNAL_OPEN.includes(c.id); assert.equal(A.mayOpenSignal(c.id), open, c.id); assert.equal(A.signalAuthority(c.id) === undefined, open, c.id); if (!open) { assert.equal(A.mayWorkSignal(c.id), false); assert.equal(A.mayVerifySignal(c.id), false); } }
  for (const id of ['stadium.fan', 'stadium.away_fan', 'stadium.premium_guest', 'stadium.visitor', 'stadium.guest_services', 'stadium.executive', 'stadium.venue_admin', 'stadium.security_safety_lead', 'university.av_it_engineer', 'convention.convention_broadcast_engineer', null, undefined, '', 'broadcast_engineer']) assert.equal(A.mayOpenSignal(id), false, String(id));
  assert.deepEqual(A.signalAuthority('stadium.fan').roles, []); assert.match(A.signalAuthority(null).why, /guest, public or other configuration/);
});
test('CS-13 the address is refused before the page is loaded: as a fan (or with no configuration) no View-as role opens it; as the engineer every role does', () => {
  const page = R.PAGES.find((p) => p.id === 'gameday.signal'); assert.ok(page && page.path === '/gameday/incident/:fault' && typeof page.load === 'function'); assert.equal(R.PAGES.filter((p) => p.id === 'gameday.signal').length, 1, 'registered once');
  const who = (h) => { const at = R.resolve(h); assert.equal(at.page.id, 'gameday.signal', h); return P.whoCanOpen(at); };
  for (const as of ['stadium.fan', 'stadium.away_fan', 'stadium.visitor', 'stadium.premium_guest', 'stadium.guest_services', 'stadium.executive', 'nonsense']) assert.deepEqual(who(`#/gameday/incident/camera-feed?as=${as}`), [], as);
  assert.deepEqual(who('#/gameday/incident/camera-feed'), [], 'the default configuration is the visitor');
  for (const as of A.SIGNAL_OPEN) assert.equal(who(`#/gameday/incident/camera-feed?as=${as}&step=verify`).length, 15, as);
  assert.equal(R.resolve('#/gameday').page.id, 'gameday', 'the game-day page keeps its address');
  assert.equal(A.signalHref('stadium.broadcast_engineer'), '#/gameday/incident/camera-feed?as=stadium.broadcast_engineer'); assert.equal(A.signalHref('stadium.event_producer', 'verify'), '#/gameday/incident/camera-feed?as=stadium.event_producer&step=verify');
  assert.equal(A.SIGNAL_STEPS.length, 10); assert.ok(A.isSignalStep('observe') && !A.isSignalStep('nope') && !A.isSignalStep(null));
});
test('CS-14 a role is shown only the rooms its reader level reaches: the production lead checks the fix without being shown the equipment room’s records', () => {
  assert.equal(RD.readerOf(cfg('stadium.event_producer')), 'staff'); assert.equal(RD.readerOf(cfg('stadium.broadcast_engineer')), 'restricted');
  assert.equal(RD.shown(chain.index, 'staff', 'STA-MER'), false); assert.equal(RD.shown(chain.index, 'staff', 'STA-BCR'), true); assert.equal(RD.shown(chain.index, 'staff', 'STA-CAM-MAIN'), true);
  for (const p of M.placesOf(chain)) { assert.equal(RD.shown(chain.index, 'restricted', p.id), true); assert.equal(RD.shown(chain.index, 'public', p.id), false, `${p.id} is never shown to the public`); }
});

// ------------------------------------------------------------------------------------------------------------ the store: authority, engine, ledger
const opened = () => { const w = fresh(); let g = run(G.start(), 2); const r = T.simulateLoss(w, g, ENG); assert.ok(r.ok, r.why); return { w, g: r.state, id: r.id }; };
const denied = (w) => w.events.filter((e) => e.outcome === 'DENIED' && e.type.startsWith('gameday.incident.'));
test('CS-15 the scenario starts through the engine’s own inject: one incident on the game-day record, a line in the ledger, and it cannot be opened twice', () => {
  const { w, g, id } = opened(); assert.equal(id, 'GD-001'); assert.equal(g.incidents.length, 1); assert.equal(g.incidents[0].fault, 'camera-feed'); assert.equal(M.incidentOf(g).id, id);
  assert.equal(w.events[0].type, 'gameday.incident.opened'); assert.equal(w.events[0].aggregate, id); assert.equal(w.events[0].by, 'Broadcast Engineer'); assert.match(w.events[0].detail, /Harborlight Stadium \(fictional\), simulated event/);
  const again = T.simulateLoss(w, g, ENG); assert.equal(again.ok, false); assert.match(again.why.join(' '), /already open/); assert.equal(denied(w).length, 1);
  const fan = T.simulateLoss(fresh(), G.start(), FAN); assert.equal(fan.ok, false); const prod = T.simulateLoss(fresh(), G.start(), PROD); assert.equal(prod.ok, false); assert.match(prod.why.join(' '), /does not start this scenario/);
});
test('CS-16 every refusal says why, changes nothing and is written to the ledger: wrong role, wrong order, a guest, the wrong incident', () => {
  const { w, g, id } = opened(); const frozen = JSON.stringify(g);
  const cases = [[PROD, 'ACKNOWLEDGED', /checks a fix/], [OPS, 'ACKNOWLEDGED', /checks a fix/], [FAN, 'ACKNOWLEDGED', /not shown game-day incidents/], [ENG, 'DISPATCHED', /next step is acknowledged/], [ENG, 'FIXED', /next step is acknowledged/], [PROD, 'VERIFIED', /next step is acknowledged/]];
  for (const [a, to, why] of cases) { const before = denied(w).length; const r = T.step(w, g, a, id, to); assert.equal(r.ok, false, `${a.label} ${to}`); assert.match(r.why.join(' '), why); assert.equal(denied(w).length, before + 1); assert.equal(denied(w)[0].by, a.label); assert.match(denied(w)[0].detail, /^refused: /); }
  assert.equal(JSON.stringify(g), frozen, 'a refusal never changes the event');
  const other = must(G.inject(g, 'ribbon-east')); const wrong = T.step(w, other, ENG, other.incidents[1].id, 'ACKNOWLEDGED'); assert.equal(wrong.ok, false); assert.match(wrong.why.join(' '), /not the camera feed incident/);
  assert.equal(T.step(w, g, ENG, 'GD-999', 'ACKNOWLEDGED').ok, false);
});
test('CS-17 the whole workflow, end to end, on the engine’s own state: degraded and holding kick-off, then restored, then checked by someone else, and the system reads working', () => {
  let { w, g, id } = opened(); const title = G.FAULTS['camera-feed'].title;
  assert.equal(G.systems(g).broadcast, 'DEGRADED'); assert.ok(G.holds(g).some((h) => h.startsWith(title)), 'kick-off is held'); assert.equal(G.advance(g).ok, false); assert.equal(G.report(g).held, true);
  const found = M.observe(chain, { incident: id, failed: M.failedHopOf(id) }); const iso = M.isolate(chain, found); const proc = M.procedureFor(chain, iso.hop); assert.equal(iso.hop, 'fibre'); assert.match(proc.title, /backup fibre path/);
  g = must(T.step(w, g, ENG, id, 'ACKNOWLEDGED')); assert.equal(G.advance(g).ok, false, 'acknowledging does not release the hold');
  g = must(T.step(w, g, ENG, id, 'DISPATCHED', `procedure: ${proc.title}`)); assert.equal(G.systems(g).broadcast, 'DEGRADED');
  const no = T.notRestored(w, g, ENG, id, 'the backup path shows no link either'); assert.ok(no.ok); assert.equal(no.state, g, 'an attempt that did not work moves nothing'); assert.equal(G.advance(g).ok, false);
  g = must(T.step(w, g, ENG, id, 'FIXED', M.outcomeNote(proc, { restored: true, done: proc.steps.map((s) => s.id), note: 'primary path tagged' })));
  assert.equal(G.systems(g).broadcast, 'AWAITING_CHECK'); assert.deepEqual(G.holds(g), [], 'the fix releases kick-off'); assert.match(M.incidentOf(g).notes.FIXED, /backup fibre path; 4 of 4 procedure steps done; note: primary path tagged/);
  const self = T.step(w, g, ENG, id, 'VERIFIED', 'evidence: none'); assert.equal(self.ok, false); assert.match(self.why.join(' '), /someone other than the person who made it/); assert.equal(M.incidentOf(g).step, 'FIXED');
  const ev = M.evidenceFor(chain, iso.hop); g = must(T.step(w, g, PROD, id, 'VERIFIED', M.evidenceNote(ev, ['wall', 'tap'])));
  assert.equal(G.systems(g).broadcast, 'OK'); assert.deepEqual(G.holds(g), []); assert.equal(G.numbers(g).openIncidents, 0); assert.equal(G.report(g).held, false);
  const i = M.incidentOf(g); assert.deepEqual(i.by, { OPEN: 'simulation', ACKNOWLEDGED: 'Broadcast Engineer', DISPATCHED: 'Broadcast Engineer', FIXED: 'Broadcast Engineer', VERIFIED: 'Event Producer / Show Caller' }); assert.match(i.notes.VERIFIED, /^evidence: The camera 3 tile on the multiviewer wall shows a picture \(STA-BCR-A03\)/);
  assert.ok(G.report(g).lines.some((l) => l === 'Broadcast programme chain: working')); assert.ok(G.report(g).lines.some((l) => l.startsWith(`${id} ${title}`) && l.endsWith('verified')));
  g = must(G.advance(g)); assert.equal(g.phase, 'first-half', 'kick-off goes ahead');
  const lines = T.ledgerOf(w, id); assert.deepEqual(lines.filter((e) => e.outcome === 'ALLOWED').map((e) => e.type).reverse(), ['gameday.incident.opened', 'gameday.incident.acknowledged', 'gameday.incident.dispatched', 'gameday.incident.not_restored', 'gameday.incident.fixed', 'gameday.incident.verified']);
  assert.equal(lines.filter((e) => e.outcome === 'DENIED').length, 1); assert.equal(lines.find((e) => e.type === 'gameday.incident.verified').by, 'Event Producer / Show Caller'); assert.match(lines.find((e) => e.type === 'gameday.incident.verified').detail, /STA-BCR-A03/);
  // the same stored event is what the game-day page reads on return
  GS.keep(g); const back = GS.load(); assert.deepEqual(back, g); assert.equal(G.systems(back).broadcast, 'OK');
  assert.match(M.readingOf(M.observe(chain, { incident: id, failed: null, via: 'fibre' }), 'fibre').text, /standby/);
});
test('CS-18 the workflow restores the system for every scenario: whichever hop failed, its own procedure and a different checker bring broadcast back to working', () => {
  for (let k = 0; k < 6; k += 1) {
    const w = fresh(); let g = run(G.start(), 2); let id = '';
    for (let j = 0; j <= k; j += 1) { g = must(T.simulateLoss(w, g, AVIT)); id = M.incidentOf(g).id; if (j < k) { for (const s of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED']) g = must(T.step(w, g, AVIT, id, s)); g = must(T.step(w, g, OPS, id, 'VERIFIED')); } }
    const failed = M.failedHopOf(id); const proc = M.procedureFor(chain, M.isolate(chain, M.observe(chain, { incident: id, failed })).hop); assert.equal(proc.hop, failed, id);
    for (const s of ['ACKNOWLEDGED', 'DISPATCHED']) g = must(T.step(w, g, AVIT, id, s)); g = must(T.step(w, g, AVIT, id, 'FIXED', M.outcomeNote(proc, { restored: true, done: proc.steps.map((s) => s.id), note: '' })));
    g = must(T.step(w, g, OPS, id, 'VERIFIED', M.evidenceNote(M.evidenceFor(chain, failed), ['wall', 'cut']))); assert.equal(G.systems(g).broadcast, 'OK', id); assert.deepEqual(G.holds(g), [], id);
  }
});

// ------------------------------------------------------------------------------------------------------------ invariants over random action sequences
const PUBLIC_LEAK = /STA-|GD-\d|camera|fibre|incident|broadcast|router|switcher|multiviewer|gallery|platform|rack|network|equipment|control room|fault/i;
function invariants(g, label) {
  for (const i of g.incidents) {
    const at = G.STEPS.indexOf(i.step); assert.ok(at >= 0, label);
    for (const [k, s] of G.STEPS.entries()) assert.equal(!!i.by[s], k <= at, `${label} ${i.id}: every step up to ${i.step} has an author and none after`);
    if (i.step === 'VERIFIED') { assert.ok(i.by.FIXED, `${label}: no VERIFIED without FIXED`); assert.notEqual(i.by.VERIFIED, i.by.FIXED, `${label}: the verifier is not the fixer`); }
    if (i.notes) for (const s of Object.keys(i.notes)) assert.ok(i.by[s], `${label}: a note belongs to a step that was taken`);
  }
  const ids = g.incidents.map((i) => i.id); assert.equal(new Set(ids).size, ids.length, label);
  const sys = G.systems(g);
  for (const k of Object.keys(sys)) { const mine = g.incidents.filter((i) => G.FAULTS[i.fault].system === k && i.step !== 'VERIFIED'); assert.equal(sys[k], !mine.length ? 'OK' : mine.every((i) => i.step === 'FIXED') ? 'AWAITING_CHECK' : 'DEGRADED', `${label} ${k}`); }
  const pub = JSON.stringify(G.publicView(g)); assert.doesNotMatch(pub, PUBLIC_LEAK, `${label}: the public view carries no incident or room data`);
  assert.deepEqual(Object.keys(G.publicView(g)).sort(), ['best', 'gates', 'notes', 'phase']);
}
test('CS-19 engine invariants over 400 random action sequences (16,000 actions): no VERIFIED without FIXED, verifier ≠ fixer, systems follow the incidents, the public view never carries incident or room data', () => {
  const faults = Object.keys(G.FAULTS); const people = ['Broadcast Engineer', 'AV / IT Engineer', 'Venue Operations Lead', 'Event Producer / Show Caller', 'Fan']; let moves = 0; let refused = 0;
  for (let seed = 1; seed <= 400; seed += 1) { const r = rng(seed); let g = G.start(); const pick = (xs) => xs[Math.floor(r() * xs.length)];
    for (let n = 0; n < 40; n += 1) { const x = r(); const before = JSON.stringify(g);
      const res = x < 0.18 ? G.advance(g) : x < 0.42 ? G.inject(g, pick(faults)) : g.incidents.length ? G.respond(g, pick(g.incidents).id, pick(G.STEPS), pick(people), r() < 0.3 ? 'a note' : undefined) : G.inject(g, 'camera-feed');
      assert.equal(JSON.stringify(g), before, 'the engine never mutates the state it is given');
      if (res.ok) { g = res.state; moves += 1; } else { refused += 1; assert.ok(res.why.length > 5); }
      invariants(g, `seed ${seed} action ${n}`);
    } }
  assert.ok(moves > 3000 && refused > 3000, `${moves} moves, ${refused} refusals`);
});
test('CS-20 store invariants over 300 random sequences as all fourteen stadium roles: only technical roles ever work the incident, the checker is always another role, and every outcome is in the ledger', () => {
  const configs = WR.configsOf('stadium'); assert.equal(configs.length, 14); const work = new Set(A.SIGNAL_WORK.map((id) => cfg(id).label)); const verify = new Set(A.SIGNAL_VERIFY.map((id) => cfg(id).label)); let verified = 0;
  for (let seed = 1; seed <= 300; seed += 1) { const r = rng(seed * 7919); const w = fresh(); let g = run(G.start(), Math.floor(r() * 5)); const pick = (xs) => xs[Math.floor(r() * xs.length)]; let allowed = 0; let refusedN = 0;
    for (let n = 0; n < 45; n += 1) { const c = pick(configs); const a = { config: c.id, label: c.label }; const cur = M.incidentOf(g); const x = r(); const before = JSON.stringify(g);
      const res = !cur || (cur.step === 'VERIFIED' && x < 0.5) ? T.simulateLoss(w, g, a) : x < 0.08 ? T.notRestored(w, g, a, cur.id, 'still dark after the changeover') : T.step(w, g, a, cur.id, x < 0.6 ? G.STEPS[G.STEPS.indexOf(cur.step) + 1] || 'VERIFIED' : pick(G.STEPS), r() < 0.5 ? 'words kept' : undefined);
      if (res.ok) { allowed += 1; g = res.state; } else { refusedN += 1; assert.equal(JSON.stringify(g), before); assert.ok(res.why.length && res.why.every((y) => y.length > 8), 'a refusal says why'); }
      invariants(g, `seed ${seed} action ${n}`);
      for (const i of g.incidents) { for (const s of ['ACKNOWLEDGED', 'DISPATCHED', 'FIXED']) if (i.by[s]) assert.ok(work.has(i.by[s]), `${i.by[s]} worked ${i.id}`); if (i.by.VERIFIED) { assert.ok(verify.has(i.by.VERIFIED)); assert.notEqual(i.by.VERIFIED, i.by.FIXED); } }
    }
    const mine = w.events.filter((e) => e.type.startsWith('gameday.incident.')); assert.equal(mine.filter((e) => e.outcome === 'ALLOWED').length, allowed, `seed ${seed}`); assert.equal(mine.filter((e) => e.outcome === 'DENIED').length, refusedN, `seed ${seed}`);
    for (const e of mine) assert.ok(configs.some((c) => c.label === e.by), e.by);
    verified += g.incidents.filter((i) => i.step === 'VERIFIED').length;
  }
  assert.ok(verified > 100, `the random walks finish incidents too (${verified})`);
});

// ------------------------------------------------------------------------------------------------------------ history and people
test('CS-21 history and people are read from records: every earlier incident sits on a hop of this chain, the summary is counted, and the numbers on post are the event’s', () => {
  for (const p of M.PRIOR) { assert.ok(assetIds.has(p.asset), p.id); assert.ok(chain.hops.some((h) => h.asset.id === p.asset), `${p.id} is on this chain`); assert.equal(p.provenance, 'SYNTHETIC'); assert.match(p.day, /^Simulated event day/); assert.match(p.id, /^HLS-INC-\d{4}$/); }
  assert.equal(new Set(M.PRIOR.map((p) => p.id)).size, M.PRIOR.length);
  let g = run(G.start(), 2); g = must(G.inject(g, 'program-return')); g = must(G.inject(g, 'camera-feed')); g = must(G.inject(g, 'ribbon-east')); const cur = M.incidentOf(g); const h = M.historyOf(chain, g, cur);
  assert.equal(h.prior.length, M.PRIOR.length); assert.equal(h.prior.filter((p) => p.hop === 'fibre').length, 2); assert.ok(h.summary.includes('Camera fibre, primary path: 2 earlier incidents on record.'));
  assert.deepEqual(h.thisEvent.map((x) => x.id), ['GD-001'], 'the other broadcast incident of this event, and not the ribbon board'); assert.ok(h.summary.includes('One other broadcast incident in this event.'));
  const people = M.peopleOf(chain, g); assert.deepEqual(people.map((t) => t.team), ['broadcast', 'technology']); assert.equal(people[0].owner, true); assert.equal(G.FAULTS['camera-feed'].owner, 'broadcast');
  for (const t of people) assert.equal(t.onPost, G.PHASE[g.phase].staff[t.team]); assert.deepEqual(people.flatMap((t) => t.posts.flatMap((p) => p.hops)).sort(), [...M.HOP_IDS].sort(), 'every hop has someone responsible');
  assert.notEqual(M.peopleOf(chain, G.start())[0].onPost, people[0].onPost, 'the numbers on post change with the phase');
  for (const t of people) for (const p of t.posts) assert.doesNotMatch(p.post, /\b(Mr|Ms|Mrs|Dr)\b|[A-Z][a-z]+ [A-Z][a-z]+ \(/, 'positions, not people');
});
