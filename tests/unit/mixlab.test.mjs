// Mix the Stream (founder, 12 Nov 2026, 14:40 CT): the model's arithmetic is the textbook's (dB sums, Sabine, critical distance, the
// compressor curve, inverse square, the fills' delay), the five rooms get harder, the console starts unmixed (and each room's traps are
// set), and a careful engineer's mix passes every scene of every room while the console as handed over does not.
//   node --test tests/unit/mixlab.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mix-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/mixlab/model.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const M = await import(pathToFileURL(out).href);
const near = (a, b, e = 0.05) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);

test('decibel arithmetic, Sabine, critical distance, compressor, inverse square and fill delay are the textbook formulas', () => {
  near(M.dbSum([0, 0]), 3.01); near(M.dbSum([0, -120]), 0);
  const r = M.roomOf('medium'); const [w, l, h] = r.dims; const S = 2 * (w * l + w * h + l * h);
  near(M.rt60(r), (0.161 * w * l * h) / (S * r.absorption), 1e-9); near(M.criticalDistance(r), 0.057 * Math.sqrt((8 * w * l * h) / M.rt60(r)), 1e-9);
  assert.equal(M.compOut(-10, -20, 4), -17.5); assert.equal(M.compOut(-30, -20, 4), -30);
  const g = { x: 0, y: 0, z: 1.2, aim: Math.PI / 2, spread: 3, line: false };
  near(M.spread(g, 0, 2, 30) - M.spread(g, 0, 4, 30), 6.02);
  near(M.hpfAt(50, 100), -12); assert.equal(M.hpfAt(200, 100), 0);
  for (const d of M.ROOMS.flatMap((x) => x.groups.filter((gg) => gg.delayable).map((gg) => [x, gg]))) assert.ok(M.delayNeeded(d[0], d[1]) >= 10, d[1].label);
});
test('five rooms, made for this lab, each harder than the last; channel counts fit the console; scenes grow with difficulty', () => {
  assert.deepEqual(M.ROOMS.map((r) => r.key), ['basement', 'small', 'medium', 'large', 'mega']);
  M.ROOMS.forEach((r, i) => { assert.equal(r.difficulty, i + 1); assert.equal(r.inputs.length, r.channels); assert.ok(r.channels <= 32); assert.ok(r.groups.some((g) => g.kind === 'wedge') && r.groups.some((g) => g.kind === 'sub')); });
  assert.ok(M.ROOMS[3].groups.some((g) => g.kind === 'array') && M.ROOMS[4].groups.some((g) => g.kind === 'delay'));
  assert.ok(M.sceneOrder(M.ROOMS[0]).length < M.sceneOrder(M.ROOMS[4]).length);
  assert.deepEqual(M.layersOf(32), [[0, 8], [8, 16], [16, 24], [24, 32]]);
});
test('the console as handed over is unmixed, with the traps set: the click is in the mains, the basement laptop clips', () => {
  const small = M.freshMix('small'); const a = M.analyse(small, 'worship'); assert.equal(a.clickLeak, true);
  const base = M.freshMix('basement'); const lap = base.strips.findIndex((s) => s.kind === 'play'); assert.equal(M.channel(base.strips[lap], 'video').clip, true);
  for (const r of M.ROOMS) assert.ok(M.score(M.goals(M.freshMix(r.key), M.analyse(M.freshMix(r.key), 'worship'))) < M.PASS, r.key);
});
function solve(roomKey, scene) {
  const r = M.roomOf(roomKey); const m = M.freshMix(roomKey);
  for (const s of m.strips) { const src = M.SOURCES[s.kind];
    s.gain = Math.round(-18 - src.level - Math.max(0, src.crest - 9)); s.hpf = src.hpf >= 80 ? src.hpf : 0;
    s.fader = src.vocal ? 0 : s.kind === 'play' ? -4 : s.kind === 'amb' ? 0 : -8; s.main = s.kind !== 'amb' && s.kind !== 'click'; s.stream = s.kind === 'amb' ? -14 : s.kind === 'click' ? M.OFF : 0;
    if (src.vocal) { s.comp = { on: true, thr: Math.round(-18 - Math.max(0, src.crest - 9) - 5), ratio: 3, att: 10, rel: 120 }; s.rev = -8; }
    if (s.kind === 'click') s.fader = M.OFF;
    if (src.mic && s.kind !== 'amb' && M.liveOffset(scene, s.kind) <= -10 && scene !== 'worship' && scene !== 'soundcheck') s.mute = true;
    if (s.kind === 'choir') s.eq[2] = { f: 2000, g: -4, q: 2 };
    s.wedge = s.wedge.map((w, j) => (src.vocal && j === 0 && s.kind !== 'choir' ? -6 : M.OFF));
  }
  m.fx.revMain = M.rt60(r) > 1.6 ? M.OFF : -14; m.fx.revStream = -4;
  for (const g of r.groups.filter((g) => g.delayable)) m.delays[g.key] = M.delayNeeded(r, g);
  for (let k = 0; k < 6; k++) { const a = M.analyse(m, scene); const tgt = scene === 'sermon' ? r.targetDbA - 8 : r.targetDbA; m.main += tgt - a.fohDbA; m.stream += -16 - a.streamLufs; }
  return m;
}
test('a careful engineer’s mix passes every scene of every room', () => {
  for (const r of M.ROOMS) for (const sc of M.sceneOrder(r)) { const m = solve(r.key, sc); const a = M.analyse(m, sc); const s = M.score(M.goals(m, a));
    assert.ok(s >= M.PASS, `${r.key} ${sc}: ${s} ${M.goals(m, a).filter((g) => !g.ok).map((g) => g.key)}`); near(a.streamLufs, -16, 0.6); }
});
test('the goals react to what the lessons teach: a hot wedge send rings, reverb in a live room fails, a misaligned fill fails', () => {
  const m = solve('large', 'worship'); const v = m.strips.findIndex((s) => s.kind === 'vocal'); m.strips[v].wedge[0] = 10; m.strips[v].gain += 10;
  const a = M.analyse(m, 'worship'); assert.ok(a.feedback.some((f) => f.i === v && f.margin < 0)); assert.equal(M.goals(m, a).find((g) => g.key === 'feedback').ok, false);
  const m2 = solve('large', 'worship'); m2.fx.revMain = 6; assert.equal(M.goals(m2, M.analyse(m2, 'worship')).find((g) => g.key === 'revmain').ok, false);
  const m3 = solve('mega', 'worship'); m3.delays.dt = 0; assert.equal(M.goals(m3, M.analyse(m3, 'worship')).find((g) => g.key === 'delay').ok, false);
  assert.ok(M.calculations(m3, M.analyse(m3, 'worship'), 0).some((c) => /Sabine/.test(c.name)));
});
