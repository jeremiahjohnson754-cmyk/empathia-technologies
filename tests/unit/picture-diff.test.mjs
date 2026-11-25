// The limits a simplified drawing must meet, and that they catch what they are for (tests/lib/picture-diff.mjs), 25 Nov 2026.
//
// Founder, 24 Nov 2026: acceptable visual differences are to be defined from the quality requirements, not derived from what the new
// drawing happens to produce. This suite pins the limits and shows, on made pictures of a stand, which changes they refuse (a dimmer
// crowd, a thinner crowd, a crowd of another colour, a crowd smeared into its average) and which they accept (the same crowd, each
// person a pixel aside or leaning). It was written before the simplified crowd was measured.
//   PD-01  the colour arithmetic is CIELAB: known colours, known differences
//   PD-02  the limits are the ones written down; the same picture differs in nothing
//   PD-03  what must be refused is refused
//   PD-04  what may be accepted is accepted; identical parts of a picture cannot dilute a difference elsewhere
//   node --test tests/unit/picture-diff.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { BLOCK, LIMITS, lab, deltaE, comparePictures, verdict } from '../lib/picture-diff.mjs';

const W = 320, H = 192; const BG = [20, 24, 32], STEP = [34, 40, 52], HOME = [14, 143, 131], HEAD = [199, 153, 120];
/** a stand at night: rows of steps, and on them people as marks 3 wide and 4 tall (a head-coloured top row), one every `gap` pixels */
function stand({ gap = 8, shirt = HOME, dim = 1, drop = () => false, shift = () => 0, lean = false, only = null } = {}) {
  const px = new Uint8ClampedArray(W * H * 4); const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, y % 8 === 7 ? STEP : BG);
  let n = 0; for (let y = 2; y + 4 < H; y += 8) for (let x = 2 + (y % 16 ? 0 : 4); x + 3 < W; x += gap) { n += 1; if (only && !only(x, y)) { for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) put(x + dx, y + dy, dy === 0 ? HEAD : HOME); continue; } if (drop(n)) continue; const s = shift(n);
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) put(x + dx + s + (lean && dy < 2 ? 1 : 0), y + dy, (dy === 0 ? HEAD : shirt).map((c) => c * dim)); }
  return px;
}
const judge = (simple) => { const c = comparePictures(stand(), simple, W, H); return { c, bad: verdict(c) }; };

test('PD-01 colours are compared in CIELAB', () => {
  const near = (a, b, t = 0.05) => assert.ok(Math.abs(a - b) <= t, `${a} against ${b}`);
  const w = lab(255, 255, 255), k = lab(0, 0, 0), r = lab(255, 0, 0); near(w[0], 100); near(w[1], 0); near(w[2], 0); near(k[0], 0); near(r[0], 53.24); near(r[1], 80.09); near(r[2], 67.2);
  near(deltaE(w, k), 100); assert.equal(deltaE(r, r), 0); const g1 = lab(128, 128, 128), g2 = lab(129, 129, 129); assert.ok(deltaE(g1, g2) > 0.2 && deltaE(g1, g2) < 0.6, 'one step of grey is well under what an eye notices');
  assert.ok(deltaE(lab(...HOME), lab(14, 133, 143)) > 5, 'the home colour turned toward blue is a different colour');
});

test('PD-02 the limits are the ones written down, and the same picture differs in nothing', () => {
  assert.equal(BLOCK, 16); assert.deepEqual(LIMITS, { nearPixels: 0, meanDE: 1.0, p99DE: 2.3, maxDE: 5.0, texturedL: 2, medianContrast: [0.90, 1.10], p95Contrast: [0.80, 1.25] });
  const { c, bad } = judge(stand()); assert.equal(c.pixels, 0); assert.equal(c.differing, 0); assert.equal(c.blocks, (W / 16) * (H / 16)); assert.deepEqual(bad, []);
  assert.throws(() => comparePictures(stand(), new Uint8ClampedArray(8), W, H), /not the same size/);
});

test('PD-03 a crowd that is dimmer, thinner, another colour, or smeared into its average is refused', () => {
  const dimmer = judge(stand({ dim: 0.75 })); assert.ok(dimmer.bad.length > 0, `a crowd a quarter dimmer: ${JSON.stringify(dimmer.c)}`);
  const thinner = judge(stand({ drop: (n) => n % 5 === 0 })); assert.ok(thinner.bad.length > 0, `one spectator in five missing: ${JSON.stringify(thinner.c)}`);
  const bluer = judge(stand({ shirt: [14, 110, 170] })); assert.ok(bluer.bad.length > 0, `the home colour changed: ${JSON.stringify(bluer.c)}`);
  // the smear: every block painted its own average colour. The averages are the whole drawing's, so colour alone would pass it
  const whole = stand(); const smear = new Uint8ClampedArray(whole); for (let by = 0; by < H; by += 16) for (let bx = 0; bx < W; bx += 16) { const s = [0, 0, 0]; for (let y = by; y < by + 16; y++) for (let x = bx; x < bx + 16; x++) for (let k2 = 0; k2 < 3; k2++) s[k2] += whole[(y * W + x) * 4 + k2]; for (let y = by; y < by + 16; y++) for (let x = bx; x < bx + 16; x++) for (let k2 = 0; k2 < 3; k2++) smear[(y * W + x) * 4 + k2] = Math.round(s[k2] / 256); }
  const sm = comparePictures(whole, smear, W, H); assert.ok(sm.meanDE < 0.5, 'its block averages are right'); const bad = verdict(sm); assert.ok(bad.some((b) => /texture/.test(b)), `and it is refused for its texture: ${JSON.stringify(sm)}`);
});

test('PD-04 the same crowd with each person a pixel aside, or leaning, is accepted; identical parts of a picture cannot hide a difference', () => {
  const aside = judge(stand({ shift: (n) => (n % 3 === 0 ? 1 : 0) })); assert.ok(aside.c.pixels > 0); assert.deepEqual(aside.bad, [], `a third of the crowd one pixel aside: ${JSON.stringify(aside.c)}`);
  const leaning = judge(stand({ lean: true })); assert.ok(leaning.c.pixels > 0); assert.deepEqual(leaning.bad, [], `every person leaning by a pixel: ${JSON.stringify(leaning.c)}`);
  // a quarter of the picture dimmed, the rest identical: judged over the blocks that differ, it is refused as firmly as if it were the whole picture
  const part = comparePictures(stand(), stand({ dim: 0.75, only: (x, y) => x < W / 2 && y < H / 2 }), W, H); assert.ok(part.differing <= part.blocks / 4 + 1 && part.differing > 0); assert.ok(verdict(part).length > 0, `a dimmer corner is not excused by the rest: ${JSON.stringify(part)}`);
});
