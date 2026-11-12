// SIGNAL Physics in Motion (packages/ui/src/physics.ts) against the founder's build package: docs/04-engine-specs.md §6 and the
// reference runtime physics.js. Every physics lab must fail at its start state and pass with its intended setting: the package's QA
// recorded 14 (tests/fixtures/signal-lab-fixes.json); for the other 22 a setting is DERIVED by searching the lab's own controls, and the
// test says which. Restored 11 Nov 2026.   node --test tests/unit/signal-physics.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'signal-physics-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'packages/ui/src/physics.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const P = await import(pathToFileURL(out).href);
const labs = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8')).labs;
const FIX = JSON.parse(fs.readFileSync(path.join(repo, 'tests/fixtures/signal-lab-fixes.json'), 'utf8')).labs;
const PHY = Object.values(labs).filter((L) => L.type === 'physics');

function candidates(c, start) {
  if (c.kind === 'toggle') return [false, true]; if (c.kind === 'select') return c.options.map((o) => o.value);
  const steps = Math.round((c.max - c.min) / c.step); const k = Math.min(steps, 1500); const v = new Set([start]);
  for (let i = 0; i <= k; i += 1) { const x = c.log ? 10 ** (Math.log10(c.min) + (i / k) * (Math.log10(c.max) - Math.log10(c.min))) : c.min + (i / k) * (c.max - c.min); v.add(Math.round(Math.round(x / c.step) * c.step * 1e4) / 1e4); }
  return [...v].filter((x) => x >= c.min && x <= c.max);
}
function search(L) {
  const cs = P.SIMS[L.sim].controls(L); const lists = cs.map((c) => candidates(c, L.start[c.key])); let budget = 3e6; let found = null;
  const walk = (i, s) => { if (found || budget-- <= 0) return; if (i === cs.length) { if (P.phyCheck(L, s).ok) found = s; return; } for (const v of lists[i]) { walk(i + 1, P.phySet(L, s, cs[i].key, v)); if (found) return; } };
  walk(0, P.phyInit(L)); return found;
}

test('SP-01 the 36 physics labs use 24 models, all present; each fails at its start state', () => {
  assert.equal(PHY.length, 36); assert.equal(new Set(PHY.map((L) => L.sim)).size, 24);
  for (const L of PHY) { assert.ok(P.SIMS[L.sim], `${L.id}: ${L.sim}`); assert.equal(P.phyCheck(L, P.phyInit(L)).ok, false, `${L.id} must fail at the start`); assert.ok(P.phyRead(L, P.phyInit(L)).length >= 1); }
});

test('SP-02 the 14 settings the package recorded pass, set through the labs’ own controls by their labels', () => {
  let n = 0;
  for (const L of PHY) { const f = FIX[L.id]; if (!f || (!f.nums && !f.sels)) continue; const cs = P.SIMS[L.sim].controls(L); let s = P.phyInit(L);
    for (const [lbl, v] of [...Object.entries(f.nums || {}), ...Object.entries(f.sels || {})]) { const c = cs.find((x) => x.label === lbl); assert.ok(c, `${L.id}: no control “${lbl}”`); s = P.phySet(L, s, c.key, Number(v)); }
    const c = P.phyCheck(L, s); assert.ok(c.ok, `${L.id}: ${c.why.join(' | ')}`); n += 1; }
  assert.equal(n, 14);
});

test('SP-03 for the 22 without a recorded setting, a passing one exists among the lab’s own controls (DERIVED by search)', () => {
  const derived = PHY.filter((L) => !FIX[L.id]?.nums && !FIX[L.id]?.sels); assert.equal(derived.length, 22);
  for (const L of derived) {
    // colour: three 256-step sliders are too many to search; the derived setting is the target mix the lab names
    const s = L.sim === 'color' ? ['r', 'g', 'b'].reduce((t, k, i) => P.phySet(L, t, k, L.target[i]), P.phyInit(L)) : search(L);
    assert.ok(s && P.phyCheck(L, s).ok, `${L.id} (${L.sim}): no setting of its own controls passes`); }
});

test('SP-04 the models are the reference’s formulas', () => {
  const T = (sim, extra, start) => ({ id: 'T', type: 'physics', sim, start, ...extra });
  assert.equal(Math.round(P.SIMS.invsq.model({ d: 2 }, T('invsq', { l1: 100 })).lvl * 100) / 100, 93.98, 'inverse square: −6 dB per doubling');
  assert.equal(Math.round(P.SIMS.soundspeed.model({ T: 20 }, T('soundspeed', { dist: 343 })).c * 10) / 10, 343.4, 'c = 331.3 + 0.606·T');
  assert.equal(Math.round(P.SIMS.sabine.model({ A: 0 }, T('sabine', { V: 1000, A0: 161 })).rt * 100) / 100, 1, 'RT60 = 0.161·V/A');
  assert.equal(Math.round(P.SIMS.bits.model({ n: 16 }, T('bits', {})).dr * 10) / 10, 98.1, '6.02·n + 1.76');
  const sh = P.SIMS.shannon.model({ n: 2, snr: 0 }, T('shannon', { B: 5, eff: 0.5 })); assert.equal(sh.C, 5, 'C = B·log2(1 + 1) at 0 dB'); assert.equal(sh.use, 5);
  const dr = P.SIMS.drift.model({ ppm: 10, hours: 1 }, T('drift', { fps: 25 })); assert.ok(Math.abs(dr.drift - 0.036) < 1e-9); assert.ok(Math.abs(dr.frames - 0.9) < 1e-9);
  assert.equal(P.SIMS.lever.model({ x: 2 }, T('lever', { load: 100, span: 10 })).R2, 20); assert.equal(Math.round(P.SIMS.fspl.model({ d: 1000, body: false, frame: false }, T('fspl', { f: 1000, tx: 0, sens: -90, bodyLoss: 6, frameLoss: 3 })).fspl * 100) / 100, 92.44, 'FSPL at 1 km, 1 GHz');
  const fl = P.SIMS.flicker.model({ fps: 50, x: 100 }, T('flicker', { mains: 50, m: 0.3 })); assert.equal(Math.round(fl.n * 100) / 100, 1); assert.ok(fl.depth < 1e-9, 'a whole number of pulses: no bands');
});

test('SP-05 controls behave as the reference’s: sliders clamp, selects take only their options, toggles take booleans', () => {
  const L = PHY.find((x) => x.sim === 'fspl'); const s = P.phyInit(L);
  assert.equal(P.phySet(L, s, 'd', 9999).d, 200); assert.equal(P.phySet(L, s, 'body', true).body, true); assert.equal(P.phySet(L, s, 'body', 1), s); assert.equal(P.phySet(L, s, 'nope', 1), s);
  const F = PHY.find((x) => x.sim === 'flicker'); const f = P.phyInit(F); assert.equal(P.phySet(F, f, 'fps', 33), f); assert.equal(P.phySet(F, f, 'fps', 50).fps, 50);
  assert.equal(P.phyCheck({ id: 'X', type: 'physics', sim: 'nope', start: {} }, {}).ok, false);
});

test('SP-06 the guard rules each fire on the labs’ own data: a shutter longer than a frame, a storm not yet tested, more cooling than needed, a stopped wheel, a poll rate over budget, a grid denser than needed', () => {
  const one = (sim) => PHY.find((x) => x.sim === sim); const why = (L, s) => P.phyCheck(L, s).why.join(' ');
  const F = one('flicker'); assert.match(why(F, P.phySet(F, P.phySet(F, P.phyInit(F), 'fps', 59.94), 'x', 25)), /longer than one frame/);
  const R = one('fresnel'); assert.match(why(R, P.phySet(R, P.phySet(R, P.phyInit(R), 'rain', 0), 'h', R.hMax || 60)), /Test it in the storm/);
  const C = one('cooling'); assert.match(why(C, P.phySet(C, P.phyInit(C), 'n', 5)), /more units than the mechanical engineer needs/);
  const S = one('sampling'); assert.equal(P.phyCheck(S, P.phySet(S, P.phyInit(S), 'rps', 0)).ok, false, 'a stopped wheel is not a frozen one');
  const Q = one('poll'); assert.match(why(Q, P.phySet(Q, P.phyInit(Q), 'T', 1)), /more than the monitoring server’s budget/);
  const G = one('ceiling'); assert.ok(G.minS > 1.5, 'the lab sets a density floor'); assert.match(why(G, P.phySet(G, P.phyInit(G), 's', 1.5)), /Much denser than needed/);
});
