// What a frame costs, counted (apps/demo/src/play/gl.ts), 25 Nov 2026. Roadmap A19: per-frame cost.
//
// Why: measured in software rendering, a frame costs about a millisecond for every thousand triangles sent to be drawn, and the stadium
// sent 104,474 of them: 39,024 were lit windows on distant towers, each a box twelve triangles thick of which two can be seen, and
// 46,920 were the crowd, ten a figure of which the graphics card discards about four as back faces after working on them. Neither
// changes the picture. So: a window is one face; a section of the crowd sends only the faces that can look at the eye; a section wholly
// outside the view is not sent. Each rule here must never leave out something that could be seen.
//   RC-01  quadVerts: two triangles, wound to face the side the normal points to, whatever order the corners come in
//   RC-02  boundOf: the sphere holds every vertex of the buffer
//   RC-03  sphereInView: never says "not in view" of a point the view draws; says it of spheres wholly behind, beside, above and beyond
//   RC-04  figureFaces: the same vertices as figureVerts, sorted by the way they look; facesSeen never hides a face that looks at the eye
//   RC-05  the stadium uses them, and the renderer counts what it draws
//   node --test tests/unit/render-cost.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-cost-')); const out = path.join(tmp, 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/play/gl.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
const G = await import(pathToFileURL(out).href);
const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const tris = (v) => { const t = []; for (let i = 0; i < v.length; i += 27) t.push([0, 1, 2].map((k) => ({ p: [v[i + k * 9], v[i + k * 9 + 1], v[i + k * 9 + 2]], n: [v[i + k * 9 + 3], v[i + k * 9 + 4], v[i + k * 9 + 5]], c: [v[i + k * 9 + 6], v[i + k * 9 + 7], v[i + k * 9 + 8]] }))); return t; };
/** the way a triangle's front looks: counter-clockwise seen from that side, which is the side WebGL keeps when back faces are culled */
const facing = (t) => G.cross(G.sub(t[1].p, t[0].p), G.sub(t[2].p, t[0].p));

test('RC-01 a one-sided face is two triangles that face the side its normal points to', () => {
  const corners = [[0, 0, 5], [4, 0, 5], [4, 2, 5], [0, 2, 5]];
  for (const [n, order] of [[[0, 0, 1], [0, 1, 2, 3]], [[0, 0, -1], [0, 1, 2, 3]], [[0, 0, 1], [3, 2, 1, 0]], [[0, 0, -1], [1, 2, 3, 0]]]) {
    const v = []; G.quadVerts(order.map((i) => corners[i]), n, '#FFD98A', v); assert.equal(v.length, 6 * 9, 'six vertices: two triangles, where a box spends thirty-six');
    for (const t of tris(v)) { assert.ok(G.dot(facing(t), n) > 0, `faces the way its normal points (${n})`); for (const q of t) { assert.deepEqual(q.n, n); assert.deepEqual(q.c.map((x) => Math.round(x * 255)), [255, 217, 138]); } }
    const area = tris(v).reduce((a, t) => a + Math.hypot(...facing(t)) / 2, 0); assert.ok(Math.abs(area - 8) < 1e-9, 'the two triangles cover the face once');
  }
  // against the box it replaces: the box's outer face is the same rectangle, and the box spends ten more triangles on faces a viewer outside cannot see
  const box = []; G.boxVerts({ min: [0, 0, 4.9], max: [4, 2, 5], color: '#FFD98A' }, box); assert.equal(box.length / 27, 12); assert.equal(tris(box).filter((t) => G.dot(facing(t), [0, 0, 1]) > 0).length, 2);
});

test('RC-02 the bounding sphere holds every vertex', () => {
  assert.deepEqual(G.boundOf([]), { c: [0, 0, 0], r: 0 });
  for (let k = 0; k < 20; k++) { const v = []; const n = 3 + Math.floor(rnd(k) * 60); for (let i = 0; i < n; i++) v.push((rnd(k * 100 + i) - 0.5) * 300, rnd(k * 200 + i) * 40, (rnd(k * 300 + i) - 0.5) * 200, 0, 1, 0, 1, 1, 1);
    const b = G.boundOf(v); for (let i = 0; i < v.length; i += 9) assert.ok(Math.hypot(v[i] - b.c[0], v[i + 1] - b.c[1], v[i + 2] - b.c[2]) <= b.r + 1e-6, 'a vertex outside its sphere'); }
  const one = []; G.boxVerts({ min: [10, 0, -2], max: [14, 6, 2], color: '#ffffff' }, one); const b = G.boundOf(one); assert.deepEqual(b.c, [12, 3, 0]); assert.ok(Math.abs(b.r - Math.hypot(4, 6, 4) / 2) < 1e-9);
});

test('RC-03 the view test never leaves out what the view draws, and leaves out what is wholly outside it', () => {
  // the stadium's own cameras: the overview, the seat and the pitch side, at the page's aspect
  const cams = [{ eye: [120, 150, 180], at: [0, 4, 0], fov: 0.9 }, { eye: [24, 10.2, 54.5], at: [-4, 1, 0], fov: 0.9 }, { eye: [-10, 1.7, 37], at: [8, 3, 0], fov: 1.05 }];
  for (const [ci, cam] of cams.entries()) { const vp = G.m4.mul(G.m4.persp(cam.fov, 768 / 684, 0.5, 900), G.m4.look(cam.eye, cam.at));
    const clip = (p) => [0, 1, 2, 3].map((i) => vp[i] * p[0] + vp[4 + i] * p[1] + vp[8 + i] * p[2] + vp[12 + i]);
    let inside = 0, outside = 0, culled = 0;
    for (let k = 0; k < 4000; k++) { const p = [(rnd(ci * 9000 + k) - 0.5) * 900, (rnd(ci * 9000 + k + 0.3) - 0.2) * 300, (rnd(ci * 9000 + k + 0.7) - 0.5) * 900]; const c = clip(p); const drawn = c[3] > 0 && Math.abs(c[0]) <= c[3] && Math.abs(c[1]) <= c[3] && Math.abs(c[2]) <= c[3];
      if (drawn) { inside += 1; assert.ok(G.sphereInView(vp, p, 0.001), `camera ${ci}: a point the view draws was called out of view (${p})`); assert.ok(G.sphereInView(vp, [p[0] + 3, p[1], p[2] - 3], 8), 'a sphere that holds a drawn point is in view'); }
      else { outside += 1; if (!G.sphereInView(vp, p, 0.001)) culled += 1; } }
    assert.ok(inside > 50 && outside > 1000, `the sample covers both (${inside} in, ${outside} out)`); assert.equal(culled, outside, 'a point outside the view is exactly a point outside one of its sides');
    const f = G.norm(G.sub(cam.at, cam.eye)); const along = (d) => [cam.eye[0] + f[0] * d, cam.eye[1] + f[1] * d, cam.eye[2] + f[2] * d];
    assert.ok(G.sphereInView(vp, along(100), 5), 'ahead'); assert.ok(!G.sphereInView(vp, along(-40), 5), 'behind the eye'); assert.ok(!G.sphereInView(vp, along(1200), 5), 'beyond the far side'); assert.ok(G.sphereInView(vp, along(903), 5), 'straddling the far side is kept');
    assert.ok(G.sphereInView(vp, along(-3), 5), 'a sphere around the eye is kept'); const up = [0, 1, 0]; const side = G.norm(G.cross(f, up)); const far = along(100);
    assert.ok(!G.sphereInView(vp, [far[0] + side[0] * 400, far[1], far[2] + side[2] * 400], 5), 'far to one side'); assert.ok(!G.sphereInView(vp, [far[0] - side[0] * 400, far[1], far[2] - side[2] * 400], 5), 'far to the other');
    assert.ok(G.sphereInView(vp, [far[0] + side[0] * 400, far[1], far[2] + side[2] * 400], 400), 'the same place, large enough to reach into the view'); }
});

test('RC-04 a figure sorted by the way its faces look is the same figure; no face that looks at the eye is ever withheld', () => {
  assert.deepEqual(G.FIGURE_SIDES, [{ axis: 2, sign: 1 }, { axis: 2, sign: -1 }, { axis: 0, sign: 1 }, { axis: 0, sign: -1 }, { axis: 1, sign: 1 }]);
  const whole = []; G.figureVerts(30, 9, 55, '#0E8F83', whole); const lists = [[], [], [], [], []]; G.figureFaces(30, 9, 55, '#0E8F83', lists);
  assert.deepEqual(lists.flat(), whole, 'the five lists, end to end, are the figure'); assert.equal(whole.length / 27, 10, 'ten triangles a figure');
  lists.forEach((list, f) => { const { axis, sign } = G.FIGURE_SIDES[f]; const want = [0, 0, 0]; want[axis] = sign; assert.equal(list.length, 54); for (const t of tris(list)) { for (const q of t) assert.deepEqual(q.n, want); assert.ok(G.dot(facing(t), want) > 0, 'and it is wound to face that way'); } });
  // a section: figures along a row; for eyes all round it, every triangle that faces the eye belongs to a list that is drawn
  const sec = [[], [], [], [], []]; for (let i = 0; i < 40; i++) G.figureFaces(20 + i * 0.6 + rnd(i) * 0.2, 9 + Math.floor(i / 10) * 0.85, 50 + Math.floor(i / 10) * 0.9, '#C9302C', sec);
  const span = sec.map((list, f) => { const { axis } = G.FIGURE_SIDES[f]; let lo = Infinity, hi = -Infinity; for (let i = axis; i < list.length; i += 9) { lo = Math.min(lo, list[i]); hi = Math.max(hi, list[i]); } return { lo, hi }; });
  let withheld = 0, sent = 0, all = 0, wrong = 0;
  for (let k = 0; k < 600; k++) { const eye = [(rnd(k) - 0.5) * 400, (rnd(k + 0.4) - 0.3) * 200, (rnd(k + 0.8) - 0.5) * 400];
    sec.forEach((list, f) => { const { axis, sign } = G.FIGURE_SIDES[f]; const drawn = G.facesSeen(eye, axis, sign, span[f].lo, span[f].hi); all += list.length / 27; if (drawn) sent += list.length / 27; else withheld += list.length / 27;
      if (!drawn) for (const t of tris(list)) if (G.dot(facing(t), G.sub(eye, t[0].p)) > 0) wrong += 1; }); }
  assert.equal(wrong, 0, 'a face that looks at the eye was withheld'); assert.ok(withheld > all * 0.3 && sent < all * 0.7, `from all round, well under the whole crowd is sent (${sent} of ${all})`);
  // straight above, only the tops and nothing else can be said to look away for certain on every side: the test errs toward drawing
  assert.ok(G.facesSeen([30, 80, 55], 1, 1, span[4].lo, span[4].hi)); assert.ok(!G.facesSeen([30, 2, 55], 1, 1, span[4].lo, span[4].hi), 'from below the seats the tops look away');
  assert.ok(G.facesSeen([500, 10, 55], 0, 1, span[2].lo, span[2].hi) && !G.facesSeen([500, 10, 55], 0, -1, span[3].lo, span[3].hi), 'from the east, the east faces and not the west');
});

test('RC-05 the stadium spends its triangles on what can be seen, and the renderer counts what it draws', () => {
  const s = fs.readFileSync(path.join(repo, 'apps/demo/src/play/StadiumLive.tsx'), 'utf8'); const g = fs.readFileSync(path.join(repo, 'apps/demo/src/play/gl.ts'), 'utf8');
  assert.equal((s.match(/quadVerts\(\[[^\n]*?, lit, windows\)/g) || []).length, 4, 'a band of windows is four faces, one for each side of its tower'); assert.ok(!/boxVerts\([^\n]*color: lit \}, windows\)/.test(s), 'and no longer a box');
  assert.ok(s.includes('if (!r.seen(g.mesh, 1)) continue;'), 'a section outside the view is not drawn'); assert.ok(s.includes('facesSeen(eye, axis, sign, part.lo, part.hi)') && s.includes('figureFaces('), 'only the faces that can look at the eye are sent');
  assert.ok(g.includes('this.tally.draws += 1; this.tally.tris += count / 3;') && g.includes('this.canvas.dataset.tris = String(t.tris)'), 'the count of a frame is on the canvas for a test to hold to a budget');
  assert.ok(g.includes('seen(m: Mesh, pad = 0): boolean { return !this.vp || m.r <= 0 || sphereInView(this.vp, m.c, m.r + pad); }'), 'with nothing known, a mesh is drawn');
});
