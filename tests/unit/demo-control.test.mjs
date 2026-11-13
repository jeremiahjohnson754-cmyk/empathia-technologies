// Room Control (apps/demo/src/control; founder, 10 Nov: a fully interactive room panel as a capability of Lite, "able to connect live
// real systems"). The panel is generated from each room's record, so these tests run over all 90 rooms: a room is never offered a
// control for equipment it lacks; a sequence of presses can never leave the room in a state that cannot be (privacy with open
// microphones, a source on a screen of a room that is off); every command names a position of the room; who may operate is V2.5.3's
// rule; every operation is in the ledger; and nothing claims to be connected: the only adapter is SIMULATED and says so.
//   node --test tests/unit/demo-control.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-control-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as C from './control/model.ts'; export * as A from './control/adapter.ts'; export * as T from './control/store.ts'; export * as D from './campus/design.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as M from './campus/metrics.ts'; export * as R from './registry.pages.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { C, A, T, D, W, P, M, R } = await import(pathToFileURL(out).href);
const recs = D.allRecords(); const REF = 'R-ATL-4-218'; const ref = D.roomRecord(REF); const hw = (r) => r.positions.filter((p) => !p.furniture);
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ok = (x) => { assert.ok(!('why' in x), JSON.stringify(x)); return x; };

test('RC-01 a panel is the room’s own equipment: its screens, its cameras, sources its equipment can show; nothing for what it lacks', () => {
  assert.equal(recs.length, 140);   // 13 Nov 2026: + V2.5.3's 50 rooms the estate lacked (founder: "use as many of v2.5.3's rooms as you can"): 90 → 140
  for (const r of recs) { const p = C.panelOf(r); const cats = new Set(hw(r).map((x) => x.cat)); const codes = new Set(r.positions.map((x) => x.code));
    assert.deepEqual(p.displays.map((d) => d.code), hw(r).filter((x) => ['display', 'projector', 'ledwall'].includes(x.cat)).map((x) => x.code), r.outline.id);
    assert.deepEqual(p.cameras.map((c) => c.code), hw(r).filter((x) => ['camera', 'bar'].includes(x.cat)).map((x) => x.code));
    if (!p.displays.length) assert.equal(p.sources.length, 0, 'no screen, nothing to route');
    for (const s of p.sources) { if (s.from) assert.ok(codes.has(s.from), `${r.outline.id}: ${s.id} from ${s.from}`); if (s.kind === 'meeting') assert.ok(cats.has('compute') || cats.has('bar')); if (s.kind === 'share') assert.ok(cats.has('compute')); if (s.kind === 'camera') assert.ok(cats.has('switcher')); }
    assert.ok(p.scenes.some((s) => s.id === 'off')); if (p.scenes.some((s) => s.id === 'meet')) assert.ok(p.sources.some((s) => s.id === 'meeting'));
    if (!cats.has('camera') && !cats.has('bar')) assert.ok(p.lacks.includes('camera')); assert.equal(new Set(p.sources.map((s) => s.id)).size, p.sources.length); }
  const p = C.panelOf(ref); assert.deepEqual(p.sources.map((s) => s.id), ['meeting', 'laptop', 'share']); assert.deepEqual(p.displays.map((d) => d.label), ['Display 1']); assert.deepEqual(p.cameras[0].presets, ['Room', 'Table']); assert.deepEqual(p.lacks, []);
});

test('RC-02 a room is found off; a stored state that no longer fits the room is not used', () => {
  for (const r of recs) { const p = C.panelOf(r); const s = C.initial(p); assert.ok(C.fits(p, s), r.outline.id); assert.equal(s.power, false); assert.equal(s.micMuted, true); assert.ok(Object.values(s.routes).every((x) => x === C.OFF)); }
  const p = C.panelOf(ref); const s = C.initial(p);
  for (const bad of [null, {}, { ...s, v: 2 }, { ...s, volume: 140 }, { ...s, routes: { 'A-0101': 'satellite' } }, { ...s, routes: {} }, { ...s, preset: { 'A-0106': 'Moon' } }, { ...s, routes: { ...s.routes, 'A-9999': 'laptop' } }]) assert.equal(C.fits(p, bad), false, JSON.stringify(bad));
});

test('RC-03 no sequence of presses leaves a room in a state that cannot be: 200 random actions in every room', () => {
  let accepted = 0, refused = 0;
  for (const [i, r] of recs.entries()) { const p = C.panelOf(r); let s = C.initial(p); const rand = rng(1000 + i); const pick = (a) => a[Math.floor(rand() * a.length)]; const codes = new Set([...r.positions.map((x) => x.code), r.outline.id]);
    for (let k = 0; k < 200; k += 1) {
      const kind = pick(['power', 'route', 'routeAll', 'volume', 'mute', 'micMute', 'privacy', 'preset', 'scene', 'route', 'volume']);
      const a = kind === 'power' ? { type: 'power', on: rand() < 0.5 } : kind === 'route' ? { type: 'route', display: pick([...p.displays.map((d) => d.code), 'A-NOPE']), source: pick([...p.sources.map((x) => x.id), C.OFF, 'nope']) } : kind === 'routeAll' ? { type: 'routeAll', source: pick([...p.sources.map((x) => x.id), C.OFF]) }
        : kind === 'volume' ? { type: 'volume', value: Math.round(rand() * 140 - 20) } : kind === 'mute' ? { type: 'mute', on: rand() < 0.5 } : kind === 'micMute' ? { type: 'micMute', on: rand() < 0.5 } : kind === 'privacy' ? { type: 'privacy', on: rand() < 0.5 }
        : kind === 'preset' ? { type: 'preset', camera: pick([...p.cameras.map((c) => c.code), 'A-NOPE']), preset: pick(['Room', 'Table', 'Lectern', 'Audience', 'Moon']) } : { type: 'scene', id: pick([...p.scenes.map((x) => x.id), 'party']) };
      const out = C.reduce(p, s, a); const before = JSON.stringify(s);
      if ('why' in out) { refused += 1; assert.ok(out.why.length && out.why.every((w) => w.length > 8)); assert.equal(JSON.stringify(s), before, 'a refusal changes nothing'); continue; }
      accepted += 1; const n = out.state; const tag = `${r.outline.id} #${k} ${JSON.stringify(a)}`;
      assert.ok(C.fits(p, n), tag); assert.equal(n.rev, s.rev + 1, tag); assert.ok(out.said.length > 5, tag); assert.equal(JSON.stringify(s), before, 'the previous state is not mutated');
      if (n.privacy) assert.equal(n.micMuted, true, `privacy with open microphones: ${tag}`);
      if (!n.power) assert.ok(Object.values(n.routes).every((x) => x === C.OFF), `a source on a screen of a room that is off: ${tag}`);
      assert.ok(n.volume >= 0 && n.volume <= 100 && Number.isInteger(n.volume), tag);
      for (const c of out.commands) { assert.ok(codes.has(c.target), `${tag}: command to ${c.target}`); assert.ok(c.why.length > 5); }
      // privacy is also a lock on the panel (microphones cannot be opened while it is on): with the microphones already muted and no camera, turning it on sends nothing
      if (JSON.stringify({ ...n, rev: 0, scene: null, privacy: false }) !== JSON.stringify({ ...s, rev: 0, scene: null, privacy: false })) assert.ok(out.commands.length > 0, `a change with no command: ${tag}`);
      s = n; } }
  assert.ok(accepted > 5000 && refused > 2000, `${accepted} accepted, ${refused} refused`);
});

test('RC-04 the reference room, press by press: choosing a source switches the room on; privacy closes it; scenes set it; the sentence follows', () => {
  const p = C.panelOf(ref); let s = C.initial(p); assert.equal(C.sentenceOf(ref, p, s), 'Atlas 4.218 is off.');
  let o = ok(C.reduce(p, s, { type: 'route', display: 'A-0101', source: 'meeting' })); s = o.state;
  assert.deepEqual(o.commands.map((c) => [c.target, c.verb, c.value]), [['A-0101', 'power', true], ['A-0101', 'route', 'meeting']]); assert.equal(s.power, true); assert.equal(o.said, 'Display 1 shows the meeting.');
  assert.equal(C.sentenceOf(ref, p, s), 'Atlas 4.218 shows the meeting, volume 50, microphones muted.');
  assert.match(C.reduce(p, s, { type: 'route', display: 'A-0101', source: 'meeting' }).why[0], /already shows the meeting/);
  o = ok(C.reduce(p, s, { type: 'micMute', on: false })); s = o.state; assert.deepEqual(o.commands.map((c) => [c.target, c.verb, c.value]), [['A-0103', 'mic-mute', false]], 'microphones are muted at the audio processor');
  o = ok(C.reduce(p, s, { type: 'privacy', on: true })); s = o.state; assert.equal(s.micMuted, true); assert.deepEqual(o.commands.map((c) => [c.target, c.verb, c.value]), [['A-0103', 'mic-mute', true], ['A-0106', 'camera', false]]);
  assert.match(C.reduce(p, s, { type: 'micMute', on: false }).why[0], /turn privacy off before/); assert.match(C.reduce(p, s, { type: 'preset', camera: 'A-0106', preset: 'Table' }).why[0], /cameras are closed/);
  o = ok(C.reduce(p, s, { type: 'privacy', on: false })); s = o.state; assert.equal(s.micMuted, true, 'turning privacy off does not open the microphones by itself');
  o = ok(C.reduce(p, s, { type: 'mute', on: true })); s = o.state; o = ok(C.reduce(p, s, { type: 'volume', value: 70 })); s = o.state; assert.equal(s.muted, false, 'turning the volume up un-mutes'); assert.equal(s.volume, 70);
  o = ok(C.reduce(p, s, { type: 'volume', value: 400 })); s = o.state; assert.equal(s.volume, 100); assert.match(C.reduce(p, s, { type: 'volume', value: 999 }).why[0], /already 100/); assert.match(C.reduce(p, s, { type: 'volume', value: NaN }).why[0], /number from 0 to 100/);
  o = ok(C.reduce(p, s, { type: 'scene', id: 'present' })); s = o.state; assert.equal(s.routes['A-0101'], 'laptop'); assert.equal(s.volume, 45); assert.equal(s.micMuted, false); assert.equal(s.scene, 'present');
  assert.equal(C.sentenceOf(ref, p, s), 'Atlas 4.218 shows the laptop, volume 45, microphones on.');
  o = ok(C.reduce(p, s, { type: 'preset', camera: 'A-0106', preset: 'Table' })); s = o.state; assert.equal(s.scene, 'present', 'a camera preset does not end the scene’s routing');
  o = ok(C.reduce(p, s, { type: 'scene', id: 'meet' })); s = o.state; assert.equal(s.preset['A-0106'], 'Room'); assert.equal(s.routes['A-0101'], 'meeting'); assert.equal(s.volume, 55);
  o = ok(C.reduce(p, s, { type: 'scene', id: 'off' })); s = o.state; assert.equal(s.power, false); assert.equal(s.micMuted, true); assert.equal(C.sentenceOf(ref, p, s), 'Atlas 4.218 is off.'); assert.match(C.reduce(p, s, { type: 'scene', id: 'off' }).why[0], /already off/);
  assert.match(C.reduce(p, s, { type: 'scene', id: 'party' }).why[0], /no such scene/); assert.match(C.reduce(p, s, { type: 'route', display: 'A-NOPE', source: 'laptop' }).why[0], /not in this room/);
});

test('RC-05 a room with a switcher routes through it, and can put a camera on a screen; several screens are named in the sentence', () => {
  const r = recs.find((x) => hw(x).some((p) => p.cat === 'switcher') && C.panelOf(x).displays.length >= 2 && hw(x).some((p) => p.cat === 'camera')); assert.ok(r, 'a room with a switcher, cameras and two screens exists');
  const p = C.panelOf(r); const cam = p.sources.find((s) => s.kind === 'camera'); assert.ok(cam); let s = C.initial(p);
  let o = ok(C.reduce(p, s, { type: 'route', display: p.displays[0].code, source: cam.id })); s = o.state;
  assert.ok(o.commands.some((c) => c.target === p.switcher.code && c.verb === 'route' && c.value === `${cam.from}→${p.displays[0].code}`), JSON.stringify(o.commands));
  assert.deepEqual(C.pathsOf(p, s), [{ display: p.displays[0].code, source: cam.id, via: [cam.from, p.switcher.code] }]);
  o = ok(C.reduce(p, s, { type: 'routeAll', source: 'laptop' })); s = o.state; assert.ok(p.displays.every((d) => s.routes[d.code] === 'laptop')); assert.match(o.said, new RegExp(`All ${p.displays.length} screens show the laptop|The screen shows`));
  o = ok(C.reduce(p, s, { type: 'route', display: p.displays[1].code, source: 'meeting' })); s = o.state; assert.match(C.sentenceOf(r, p, s), /shows the laptop on .+, the meeting on /);
  assert.deepEqual(C.metersOf(C.initial(p)), { mic: 0, program: 0 }); assert.ok(C.metersOf(s).program > 0); assert.equal(C.metersOf({ ...s, muted: true }).program, 0); assert.equal(C.metersOf({ ...s, micMuted: false }).mic, 0.62);
});

test('RC-06 the only adapter is SIMULATED and says so on every answer; a unit with an open problem on record answers with that problem', () => {
  assert.deepEqual(A.connected(), [], 'no adapter reaches real equipment'); assert.equal(A.adapterFor(REF).id, 'simulated'); assert.equal(A.SIMULATED.provenance, 'SIMULATED'); assert.match(A.SIMULATED.label, /no equipment is contacted/);
  const p = C.panelOf(ref); const o = ok(C.reduce(p, C.initial(p), { type: 'scene', id: 'meet' })); const fb = A.SIMULATED.send(REF, o.commands, { 'A-0101': 'Farthest seats beyond the planning viewing distance' });
  assert.equal(fb.length, o.commands.length); assert.ok(fb.every((f) => f.provenance === 'SIMULATED' && f.ok && f.said.startsWith(f.target)));
  assert.ok(fb.filter((f) => f.target === 'A-0101').every((f) => /open problem on this unit: Farthest seats/.test(f.caution))); assert.ok(fb.filter((f) => f.target !== 'A-0101').every((f) => !f.caution));
  const src = fs.readFileSync(path.join(repo, 'apps/demo/src/control/adapter.ts'), 'utf8') + fs.readFileSync(path.join(repo, 'apps/demo/src/control/store.ts'), 'utf8') + fs.readFileSync(path.join(repo, 'apps/demo/src/control/Panel.tsx'), 'utf8');
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.(usb|serial|bluetooth)/, 'the control code has no way to reach a network or a device');
});

test('RC-07 operating a room: V2.5.3 decides who; every operation and every refusal of a role is in the ledger; the room’s record and baseline do not change', () => {
  mem.clear(); const w = W.seed(); const recBefore = JSON.stringify(D.roomRecord(REF)); const ev0 = w.events.length;
  const v = T.act(w, 'visitor', REF, { type: 'scene', id: 'meet' }); assert.match(v.why[0], /Visitor does not operate rooms/); assert.equal(w.events[0].type, 'room.control'); assert.equal(w.events[0].outcome, 'DENIED'); assert.equal(T.stateOf(REF).power, false);
  assert.ok(!T.mayOperate('visitor') && !T.mayOperate('qa') && T.mayOperate('employee') && T.mayOperate('service'));
  assert.deepEqual(P.ROLE_KEYS.filter((k) => T.mayOperate(k)), P.ROLE_KEYS.filter((k) => P.allows({ action: 'control.use' }, k)));
  const d = T.act(w, 'employee', REF, { type: 'scene', id: 'meet' }); assert.ok(!('why' in d), JSON.stringify(d)); assert.equal(d.state.power, true); assert.equal(d.feedback.length > 3, true); assert.match(d.adapter, /Simulated/);
  assert.equal(w.events[0].type, 'room.control'); assert.equal(w.events[0].outcome, 'ALLOWED'); assert.equal(w.events[0].aggregate, REF); assert.match(w.events[0].detail, /^Meet: .* · \d+ command\(s\) · simulated · Employee$/);
  assert.equal(T.stateOf(REF).routes['A-0101'], 'meeting', 'the panel state is kept for the room');
  assert.ok(d.feedback.every((f) => !f.caution), 'a design finding on the record is not a fault of the unit: no caution in the reference room');
  { const room = 'R-ATL-7-112'; const rec = D.roomRecord(room); const iss = rec.issues.find((i) => i.state !== 'RESOLVED' && /does not wake from standby/.test(i.title)); assert.ok(iss && iss.positions.length === 1, 'a room whose display has a reported problem exists');
    const x = T.act(w, 'employee', room, { type: 'power', on: true }); assert.ok(!('why' in x), JSON.stringify(x)); assert.ok(x.feedback.some((f) => f.target === iss.positions[0] && /open problem on this unit: Display does not wake from standby on the first try/.test(f.caution)), 'the display with a reported problem answers with it'); }
  const n = w.events.length; const again = T.act(w, 'employee', REF, { type: 'route', display: 'A-0101', source: 'meeting' }); assert.match(again.why[0], /already shows/); assert.equal(w.events.length, n, 'nothing changed, nothing sent, no ledger line');
  assert.match(T.act(w, 'employee', 'R-NOPE', { type: 'power', on: true }).why[0], /No room has this address/);
  assert.equal(JSON.stringify(D.roomRecord(REF)), recBefore, 'operating the room does not touch its record, its installations or its baselines');
  mem.set('empathia.demo.control.v1', JSON.stringify({ [REF]: { v: 1, power: true, routes: { 'A-0101': 'satellite' } } })); assert.equal(T.stateOf(REF).power, false, 'a stored state that does not fit starts clean');
  mem.set('empathia.demo.control.v1', 'not json'); assert.equal(T.stateOf(REF).power, false); assert.equal(T.stateOf('R-NOPE'), null); assert.ok(w.events.length > ev0);
});

test('RC-08 the role matrix, all fifteen roles: who opens a panel, who operates it, who gets Engineer mode — each from V2.5.3’s tables, and the store agrees with the page', () => {
  const page = R.resolve(`#/control/${REF}`); const eng = R.resolve(`#/control/${REF}?mode=engineer`); assert.ok(page && eng);
  const rows = P.ROLE_KEYS.map((k) => ({ k, open: P.canOpen(k, page), operate: P.canDo ? P.canDo(k, page, 'control.use') : P.allows({ action: 'control.use' }, k), engineer: P.canOpen(k, eng) }));
  assert.equal(rows.length, 16);   // sixteen since the Site Champion became a dedicated role (founder, 11 Nov 2026)
  assert.deepEqual(rows.filter((r) => r.open).map((r) => r.k), P.ROLE_KEYS.filter((k) => P.allows({ area: 'control' }, k)));
  assert.deepEqual(rows.filter((r) => r.engineer).map((r) => r.k), P.ROLE_KEYS.filter((k) => P.allows({ area: 'control' }, k) && P.allows({ field: 'control.engineer' }, k)));
  assert.deepEqual(rows.filter((r) => !r.open).map((r) => r.k).sort(), ['qa', 'visitor'], 'the two roles with no control area never reach a panel');
  for (const r of rows) { assert.ok(!r.engineer || r.open, `${r.k}: Engineer mode without the panel`); assert.ok(!r.operate || r.open, `${r.k}: operates a panel it cannot open`); }
  assert.ok(rows.find((r) => r.k === 'employee').open && !rows.find((r) => r.k === 'employee').engineer && !rows.find((r) => r.k === 'exec').engineer && rows.find((r) => r.k === 'service').engineer);
  // the store is asked directly, as a page that had been tampered with would: it gives the same answer as the policy, and writes the refusal down
  for (const r of rows) { mem.clear(); const w = W.seed(); const out = T.act(w, r.k, REF, { type: 'power', on: true });
    assert.equal(!('why' in out), P.allows({ action: 'control.use' }, r.k), r.k);
    assert.equal(w.events[0].type, 'room.control'); assert.equal(w.events[0].outcome, 'why' in out ? 'DENIED' : 'ALLOWED', r.k);
    if ('why' in out) assert.equal(T.stateOf(REF).power, false, `${r.k}: a refused role changed the room`); }
});
