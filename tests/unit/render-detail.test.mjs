// Adaptive detail in the shared 3D renderer (apps/demo/src/play/gl.ts), 24 Nov 2026.
//
// Why: the campus scene measured 7 frames a second against its floor of 8 in two regressions on a machine that had not stalled, and 16
// to 18 at phone size: the scenes are bound by the number of pixels drawn where there is no fast graphics processor. The founder's
// target is 30 frames a second on ordinary hardware. The renderer now draws fewer pixels when it cannot hold 24, down to half
// resolution, and returns to full resolution only with headroom.
//   RD-01  the rule: slow frames lower the detail by the shortfall (bounded each second), never below the minimum; fast frames raise it
//          in small steps, never above full; the band between holds; nonsense input changes nothing
//   RD-02  it settles: from any start, a machine whose speed depends on pixels drawn reaches a level and stays there (no hunting)
//   RD-03  the governor decides on whole seconds, does not count the warm-up frames or frames after a pause or a hidden tab, and stays at full detail when told
//   RD-04  fewer pixels must buy speed: a scene bound by its geometry gets full detail back and keeps it; a scene that gains keeps the gain
//   node --test tests/unit/render-detail.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-detail-')); const out = path.join(tmp, 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/play/gl.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
const G = await import(pathToFileURL(out).href);

test('RD-01 the rule lowers detail when frames are slow, raises it only with headroom, and stays within its limits', () => {
  const { governDetail: g, DETAIL_MIN, PACE_SLOW, PACE_FAST, DETAIL_STEP_MAX, DETAIL_STEP_MIN } = G;
  assert.equal(DETAIL_MIN, 0.5); assert.equal(PACE_SLOW, 24); assert.equal(PACE_FAST, 50); assert.equal(DETAIL_STEP_MAX, 0.6); assert.equal(DETAIL_STEP_MIN, 0.8);
  assert.equal(g(1, 22), 0.8, 'just short of the pace: the smallest step down'); assert.equal(g(1, 12), 0.71, 'half the pace: the square root of a half, because pixels go with the square of the detail'); assert.equal(g(1, 9), 0.61); assert.equal(g(1, 3), 0.6, 'however slow, one second takes no more than the largest step');
  assert.equal(g(0.61, 15), 0.5, 'the last step stops at the minimum'); assert.equal(g(0.5, 5), 0.5, 'never below the minimum, however slow');
  assert.equal(g(1, 24), 1, 'at the pace it holds'); assert.equal(g(0.64, 30), 0.64, 'between the two paces it holds: 30 is not headroom'); assert.equal(g(0.64, 50), 0.64);
  assert.equal(g(0.5, 60), 0.56, 'fast at reduced detail: a smaller step up'); assert.equal(g(0.95, 120), 1, 'never above full'); assert.equal(g(1, 120), 1);
  for (const bad of [0, -3, NaN, Infinity * 0]) assert.equal(g(0.8, bad), 0.8, `a frame rate of ${bad} changes nothing`);
});

test('RD-02 on a machine whose speed depends on the pixels drawn, the detail settles and does not hunt', () => {
  const { governDetail: g } = G;
  // frames per second = k / detail², the behaviour measured in software rendering; k is the rate at full detail
  for (const k of [3, 7, 9, 14, 20, 23, 26, 40, 49, 55, 90]) for (const start of [1, 0.5, 0.72]) {
    let d = start; const seen = []; for (let i = 0; i < 40; i += 1) { d = g(d, k / (d * d)); seen.push(d); }
    const tail = seen.slice(-10); assert.equal(new Set(tail).size, 1, `rate ${k} at full detail, starting at ${start}: settled, got ${tail.join(' ')}`);
    const end = tail[0]; const fps = k / (end * end);
    assert.ok(end >= 0.5 && end <= 1); if (end > 0.5) assert.ok(fps >= 24, `rate ${k}: above the minimum only if the pace is held (${fps.toFixed(1)} at ${end})`);
    if (k >= 24) assert.ok(fps >= 24, `a machine that holds the pace at full detail is never left below it (${k})`);
  }
  // and a machine that is fast at full detail returns there
  { let d = 0.5; for (let i = 0; i < 40; i += 1) d = g(d, 60 / (d * d)); assert.equal(d, 1, 'a fast machine ends at full detail'); }
});

// feed a governor frames from a pretend machine for `seconds`; fpsAt(detail) is how fast that machine draws at a detail level
const run = (gov, fpsAt, seconds) => { const trace = []; for (let sec = 0; sec < seconds; sec += 1) { const fps = fpsAt(gov.detail); const ms = 1000 / fps; let t = 0; while (t < 1000) { gov.frame(ms); t += ms; } trace.push(gov.detail); } return trace; };

test('RD-03 the governor: decides on whole seconds of frames, does not count warm-up frames or frames that say nothing, and can be told to stay at full detail', () => {
  const { DetailGovernor, WARM_FRAMES } = G; assert.equal(WARM_FRAMES, 5);
  { const g = new DetailGovernor(); for (let i = 0; i < WARM_FRAMES; i += 1) g.frame(900); assert.equal(g.detail, 1, 'the first frames compile and upload; however long they take, they decide nothing');
    assert.deepEqual(run(g, () => 10, 3), [0.65, 0.5, 0.5], 'then a slow scene is helped within two seconds: 10 frames a second at full detail, by the shortfall each second'); }
  { const g = new DetailGovernor(); for (let i = 0; i < WARM_FRAMES + 9; i += 1) g.frame(100); assert.equal(g.detail, 1, 'part of a second decides nothing'); }
  { const g = new DetailGovernor(); for (const ms of [0, -5, NaN, 1001, 60000]) g.frame(ms); for (let i = 0; i < 20; i += 1) g.frame(1500); assert.equal(g.detail, 1, 'the first frame, a frame after a pause and a frame after a hidden tab are not counted'); }
  { const g = new DetailGovernor(false); for (let i = 0; i < 100; i += 1) g.frame(200); assert.equal(g.detail, 1, 'told to stay at full detail, it stays, however slow'); }
  { const g = new DetailGovernor(); assert.deepEqual([...new Set(run(g, () => 40, 10))], [1], 'a scene that holds the pace is never touched'); assert.equal(g.notPixelBound, false); }
  const src = fs.readFileSync(path.join(repo, 'apps/demo/src/play/gl.ts'), 'utf8');
  assert.match(src, /detail=full/, 'the address can turn it off'); assert.match(src, /const dpr = dprFull \* this\.detail;/, 'the canvas is drawn at the device ratio times the detail');
  for (const f of ['CampusLife.tsx', 'ExpoLive.tsx', 'StadiumLive.tsx']) { const s2 = fs.readFileSync(path.join(repo, 'apps/demo/src/play', f), 'utf8'); assert.match(s2, /r\.pace\(now - last\)/, `${f} tells the renderer how long each frame took`); assert.match(s2, /data-detail=/, `${f} shows the level it is drawing at`); }
});

test('RD-04 fewer pixels must buy speed: a scene they do not speed up gets its full detail back and keeps it; a scene they do speed up keeps the gain', () => {
  const { DetailGovernor, DETAIL_WORTH, WARM_FRAMES } = G; assert.equal(DETAIL_WORTH, 1.25);
  const warmed = () => { const g = new DetailGovernor(); for (let i = 0; i < WARM_FRAMES; i += 1) g.frame(16); return g; };
  // bound by something other than pixels: 8 frames a second whatever the detail
  { const g = warmed(); const tr = run(g, () => 8, 10); assert.deepEqual(tr.slice(0, 5), [0.6, 0.5, 0.5, 1, 1], 'it steps down, watches two seconds at the minimum, and returns to full detail: a softer picture for no speed is a loss');
    assert.equal(g.notPixelBound, true); assert.equal(g.adaptive, false); assert.deepEqual([...new Set(tr.slice(3).concat(run(g, () => 8, 10)))], [1], 'it does not try again'); }
  // a small gain is not enough: 8 at full, 9.5 at half (1.19 times)
  { const g = warmed(); const tr = run(g, (d) => 8 + (1 - d) * 3, 12); assert.equal(tr[tr.length - 1], 1); assert.equal(g.notPixelBound, true); }
  // slow warm-up frames must not make a poor scene look good: the first frames take a third of a second each, then 8 whatever the detail
  { const g = new DetailGovernor(); for (let i = 0; i < WARM_FRAMES; i += 1) g.frame(333); const tr = run(g, () => 8, 12); assert.equal(tr[tr.length - 1], 1, 'warm-up frames are not the full-detail pace'); assert.equal(g.notPixelBound, true); }
  // a real gain is kept though the scene is still below the pace: 9 at full, 16 at half (1.78 times; the campus on the test machine
  // measured 9 to 10 and 21 to 23, the stadium 5 and 8 to 9)
  { const g = warmed(); const tr = run(g, (d) => 9 + (1 - d) * 14, 12); assert.equal(tr[tr.length - 1], 0.5); assert.equal(g.notPixelBound, false); assert.equal(g.adaptive, true); }
  { const g = warmed(); const tr = run(g, (d) => 5 + (1 - d) * 7, 12); assert.equal(tr[tr.length - 1], 0.5, '5 at full and 8.5 at half is 1.7 times: kept'); assert.equal(g.notPixelBound, false); }
  // one that reaches the pace before the minimum stops there and is never judged: 17 at full, about 30 at 64% (the expo on the test
  // machine measured 16 to 17 and about 30)
  { const g = warmed(); const tr = run(g, (d) => 17 + (1 - d) * 36, 12); const end = tr[tr.length - 1]; assert.ok(end > 0.5 && end < 1, `settled between: ${end}`); assert.equal(new Set(tr.slice(-6)).size, 1); assert.equal(g.notPixelBound, false); }
});

// 25 Nov 2026 (founder: "Simplify distant spectators dynamically… Maintain a full-quality override… The engine should intelligently
// balance fidelity and responsiveness"). A scene that can draw its distant things simply gives that up first and pixels second.
//   RD-05  the order of what is given up, and that a machine which holds the pace gives up nothing; one retry of the whole figures
//   RD-06  the override pins full quality whatever the pace, and handing it back starts measuring afresh
// a pretend machine asked for its pace at every frame (the pace changes the moment the drawing does); returns the states passed through, in order, and the last
const run2 = (gov, fpsAt, seconds) => { const seen = []; for (let sec = 0; sec < seconds; sec += 1) { let t = 0; while (t < 1000) { const ms = 1000 / fpsAt(gov.detail, gov.simple, sec); gov.frame(ms); t += ms; const st = `${gov.simple ? 'simple' : 'whole'} ${gov.detail}`; if (seen.at(-1) !== st) seen.push(st); } } return seen; };

test('RD-05 a scene that can simplify gives up what cannot be seen first, pixels second, and nothing on a machine that holds the pace', () => {
  const { DetailGovernor, SIMPLE_RETRY } = G; assert.equal(SIMPLE_RETRY, 3);
  // a scene that does not say it can simplify is governed exactly as before (RD-01 to RD-04 above are unchanged)
  const plain = new DetailGovernor(); assert.equal(plain.simplifies, false); run2(plain, () => 9, 6); assert.equal(plain.simple, false, 'nothing to simplify, so nothing is');
  // a fast machine: whole figures, full resolution
  const fast = new DetailGovernor(); fast.simplifies = true; assert.deepEqual(run2(fast, () => 58, 6), ['whole 1']);
  // a machine that only needed the figures simplified keeps every pixel: 20 whole, 27 simple
  const mid = new DetailGovernor(); mid.simplifies = true; assert.deepEqual(run2(mid, (d, simple) => (simple ? 27 : 20) / (d * d), 8), ['whole 1', 'simple 1'], 'the slow second turns the simple drawing on and no pixel is touched, then or later');
  // the stadium on the test machine: 5 whole, 6 simple at full resolution, about 11 simple at half: the figures first, then the pixels, and the gain kept
  const slow = new DetailGovernor(); slow.simplifies = true; assert.deepEqual(run2(slow, (d, simple) => (simple ? 6 : 5) * (1 + (1 - d) * 1.7), 12), ['whole 1', 'simple 1', 'simple 0.6', 'simple 0.5'], 'in that order, and it stays: half the pixels buy more than a quarter more speed here');
  // a scene that fewer pixels do not speed up: the pixels come back (RD-04's rule) and the simple drawing stays, since it is what helps
  const bound = new DetailGovernor(); bound.simplifies = true; const b = run2(bound, (d, simple) => (simple ? 6 : 5), 12); assert.deepEqual(b.slice(0, 2), ['whole 1', 'simple 1']); assert.equal(b.at(-1), 'simple 1'); assert.equal(bound.notPixelBound, true);
  // a slow start on a capable machine (two seconds at 15 while the page settles, then 58): the whole figures are tried again after three clear seconds, and kept
  const hiccup = new DetailGovernor(); hiccup.simplifies = true; assert.deepEqual(run2(hiccup, (d, simple, sec) => (sec < 2 ? 15 : 58), 12), ['whole 1', 'simple 1', 'whole 1'], 'a slow start does not cost a capable machine its whole figures for good');
  // a machine quick only because the figures are simple: the retry shows it, the simple drawing comes back and is not tried again
  const edge = new DetailGovernor(); edge.simplifies = true; assert.deepEqual(run2(edge, (d, simple) => (simple ? 55 : 20), 30), ['whole 1', 'simple 1', 'whole 1', 'simple 1'], 'one retry, no hunting between the two');
});

test('RD-06 full quality is pinned whatever the pace, and handing it back starts measuring afresh', () => {
  const { DetailGovernor } = G;
  const pinned = new DetailGovernor(false); pinned.simplifies = true; assert.equal(pinned.full, true, 'the address switch pins it from the start'); assert.deepEqual(run2(pinned, () => 4, 6), ['whole 1'], 'at four frames a second, still whole and at full resolution');
  const g = new DetailGovernor(); g.simplifies = true; run2(g, (d, simple) => (simple ? 6 : 5) * (1 + (1 - d) * 1.7), 8); assert.equal(g.simple, true); assert.equal(g.detail, 0.5);
  g.setFull(true); assert.equal(g.full, true); assert.equal(g.simple, false); assert.equal(g.detail, 1, 'pinning takes effect at once, not a second later'); assert.deepEqual(run2(g, () => 5, 4), ['whole 1']);
  g.setFull(false); assert.equal(g.full, false); const again = run2(g, (d, simple) => (simple ? 6 : 5) * (1 + (1 - d) * 1.7), 8); assert.deepEqual(again, ['whole 1', 'simple 1', 'simple 0.6', 'simple 0.5'], 'handed back, it decides again from the start');
  const src = fs.readFileSync(path.join(repo, 'apps/demo/src/play/gl.ts'), 'utf8'); assert.ok(src.includes('if (!this.gov.simple && !this.forceSimple) return 0;'), 'no level but whole unless the scene is slow (or the diagnostic switch asks)'); assert.ok(src.includes('setFull(on: boolean) { this.gov.setFull(on); if (on) this.forceSimple = false; }'), 'full quality overrides the diagnostic switch too');
});
