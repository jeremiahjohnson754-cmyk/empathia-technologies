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

// 25 Nov 2026, founder decision on distant spectators: "Preserve full graphical detail for nearby spectators. Simplify distant
// spectators dynamically. Preserve crowd density, atmosphere and visual identity."
//   RC-06  the far figure: one face a quarter; from any direction in its quarter at or above the seat it covers exactly the area the
//          whole figure covers; the figure's colours; it faces every eye in its quarter that is above the seat
//   RC-07  the level goes by the size on the screen, with a band so nothing flickers; what is near is whole
test('RC-06 a far figure is one face that covers what the whole figure covers from anywhere in its quarter, in the figure’s colours', () => {
  assert.deepEqual(G.FAR_QUARTERS, [{ sx: 1, sz: 1 }, { sx: -1, sz: 1 }, { sx: 1, sz: -1 }, { sx: -1, sz: -1 }]); assert.deepEqual(G.FIGURE, { w: 0.22, d: 0.2, h: 0.8, skin: [0.78, 0.6, 0.47] });
  const X = 30, Y = 9, Z = 55; const lists = [[], [], [], []]; G.figureFar(X, Y, Z, '#0E8F83', lists); const whole = []; G.figureVerts(X, Y, Z, '#0E8F83', whole);
  const corners = (v) => { const p = []; for (let i = 0; i < v.length; i += 9) p.push([v[i], v[i + 1], v[i + 2]]); return p; };
  // the area a set of triangles covers seen from the direction v (far away): each triangle that faces v, by how squarely it faces it
  const covers = (list, v) => tris(list).reduce((sum, x) => sum + Math.max(0, G.dot(facing(x), v)) / 2, 0);
  const shirt = G.hex('#0E8F83');
  lists.forEach((list, f) => { const { sx, sz } = G.FAR_QUARTERS[f]; assert.equal(list.length, 6 * 9, 'two triangles a figure, where the whole figure sends six and holds ten');
    const pts = corners(list); const t = tris(list);
    // from every direction in the quarter, level or from above, it covers exactly what the whole figure covers: the same density, the same brightness
    for (let k = 0; k < 300; k++) { const a = rnd(f * 500 + k) * Math.PI / 2, e = rnd(f * 700 + k) * Math.PI / 2; const v = [sx * Math.cos(a) * Math.cos(e), Math.sin(e), sz * Math.sin(a) * Math.cos(e)];
      const far1 = covers(list, v), all = covers(whole, v); assert.ok(Math.abs(far1 - all) < 1e-9, `quarter ${f}, from ${v.map((n) => n.toFixed(2))}: the far face covers ${far1}, the whole figure ${all}`); }
    // its shape is not the figure's: it leans back 0.30 m over its 0.8 m, which seen from the edge of its quarter is 0.22 m sideways at most
    const uniq = (ps) => [...new Map(ps.map((q) => [q.join(), q])).values()]; const foot = uniq(pts.filter((q) => q[1] === Y)), head = uniq(pts.filter((q) => q[1] !== Y)); assert.equal(foot.length, 2); assert.equal(head.length, 2);
    const mid = (ps) => [ps.reduce((s2, q) => s2 + q[0], 0) / ps.length, ps.reduce((s2, q) => s2 + q[2], 0) / ps.length]; const back = [mid(head)[0] - mid(foot)[0], mid(head)[1] - mid(foot)[1]]; const lean = Math.hypot(...back);
    assert.ok(Math.abs(lean - (0.44 * 0.4) / Math.hypot(0.44, 0.4)) < 1e-9, `it leans back ${lean} m`); assert.ok(back[0] * sx < 0 && back[1] * sz < 0, 'away from its quarter');
    let side = 0; for (let k = 0; k <= 90; k++) { const a = (k / 90) * Math.PI / 2; const view = [sx * Math.cos(a), sz * Math.sin(a)]; side = Math.max(side, Math.abs(back[0] * view[1] - back[1] * view[0])); } assert.ok(side < 0.225, `seen from the edge of its quarter the lean is ${side} m sideways`);
    // from straight above it covers the area of the head
    const area = t.reduce((s2, x) => { const c = facing(x); return s2 + Math.abs(c[1]) / 2; }, 0); assert.ok(Math.abs(area - 0.44 * 0.4) < 1e-9, `the head's area from above (${area})`);
    // it stands on the seat and is as tall as the figure
    assert.equal(Math.min(...pts.map((p) => p[1])), Y); assert.ok(Math.abs(Math.max(...pts.map((p) => p[1])) - (Y + 0.8)) < 1e-12);
    // it faces every eye in its quarter that is above the seat, near or far, low or high
    for (let k = 0; k < 200; k++) { const eye = [X + sx * (0.5 + rnd(f * 1000 + k) * 300), Y + 0.1 + rnd(f * 2000 + k) * 200, Z + sz * (0.5 + rnd(f * 3000 + k) * 300)]; for (const x of t) assert.ok(G.dot(facing(x), G.sub(eye, x[0].p)) > 0, `quarter ${f}: the face looks away from an eye in its own quarter (${eye})`); }
    // every corner carries the shirt's colour; in place of a direction, where on the face it is: -1 at the foot, 1 at the far edge (the renderer colours and lights it from that)
    for (const x of t) for (const q of x) { q.c.forEach((c, i) => assert.ok(Math.abs(c - shirt[i]) < 1e-6)); assert.deepEqual(q.n, [0, q.p[1] === Y ? -1 : 1, 0]); }
  });
  // every figure of a section is still there: as many far faces as figures, each where its figure is
  const sec = [[], [], [], [], []], far = [[], [], [], []]; for (let i = 0; i < 40; i++) { const x = 20 + i * 2.3, z = 50 + (i % 4); G.figureFaces(x, 9, z, '#C9302C', sec); G.figureFar(x, 9, z, '#C9302C', far); }
  assert.equal(sec[4].length / 54, 40); for (const l of far) assert.equal(l.length / 54, 40, 'no person is dropped from a far crowd');
  // the shares the renderer lights and colours it by are the whole figure's own faces as that eye sees them: so much head, so much of each side
  const faces = [[], [], [], [], []]; G.figureFaces(X, Y, Z, '#0E8F83', faces);
  for (let k = 0; k < 400; k++) { const a = rnd(k + 0.11) * Math.PI * 2, e = rnd(k + 0.57) * Math.PI / 2; const v = [Math.cos(a) * Math.cos(e) * (1 + rnd(k) * 200), Math.sin(e) * (1 + rnd(k) * 200), Math.sin(a) * Math.cos(e) * (1 + rnd(k) * 200)];
    const [pz, nz, px, nx, top] = faces.map((l) => covers(l, v)); const sideX = px + nx, sideZ = pz + nz; const sh = G.farShares(v);
    assert.ok(Math.abs(sh.sideX - sideX / (sideX + sideZ)) < 1e-9, `from ${v.map((n) => n.toFixed(1))}: the side that looks along x is ${sideX / (sideX + sideZ)} of the sides, the far face is lit as ${sh.sideX}`);
    assert.ok(Math.abs(sh.head - top / (sideX + sideZ + top)) < 1e-9, `the head is ${top / (sideX + sideZ + top)} of what is seen, the far face shows ${sh.head}`); }
  assert.deepEqual(G.farShares([0, 5, 0]), { sideX: 0.5, head: 1 }, 'from straight above, all head'); assert.equal(G.farShares([3, 0, 0]).head, 0, 'from level, no head'); assert.equal(G.farShares([3, 0, 0]).sideX, 1); assert.equal(G.farShares([3, -2, 1]).head, 0, 'from below, no head');
  const g = fs.readFileSync(path.join(repo, 'apps/demo/src/play/gl.ts'), 'utf8');
  assert.ok(g.includes('if (vNor.y * 0.5 + 0.5 > 1.0 - uFar.y) c = shade(mix(vec3(0.78, 0.6, 0.47), uTint, uUseTint), vec3(0.0, 1.0, 0.0));'), 'the head share is the head’s colour, lit from above, dimmed with the rest when a side is dimmed');
  assert.ok(g.includes('else c = uFar.x * shade(vCol, vec3(uFar.z, 0.0, 0.0)) + (1.0 - uFar.x) * shade(vCol, vec3(0.0, 0.0, uFar.w));'), 'the rest is each visible side lit as itself, in the shares the eye sees');
  // the far figure has a program of its own: the shader every other thing is drawn with has no far branch to pay for (measured: with the branch in it, the stadium at full quality fell from 31 frames in five seconds to 19 for the same picture)
  const fsMain = g.slice(g.indexOf('const FS = `'), g.indexOf('}`;', g.indexOf('const FS = `'))); assert.ok(fsMain.length > 200 && !/uFar|shade\(/.test(fsMain), 'the shared shader is as it was');
  assert.ok(g.includes('gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS_FAR))') && g.includes('gl.useProgram(this.far.p)') && /this\.tally\.tris \+= count \/ 3;\n    gl\.useProgram\(this\.prog\);/.test(g), 'and the renderer goes back to it after every run of far figures');
});

test('RC-07 the level of detail goes by the size on the screen; what is near is drawn whole; nothing flickers on the line', () => {
  const { pixelsTall: px, lodLevel: lod, LOD_NEAR_PX, LOD_BAND } = G; assert.equal(LOD_NEAR_PX, 6); assert.equal(LOD_BAND, 0.15);
  const f = 684 / 2 / Math.tan(0.45);   // the stadium's lens on a canvas 684 pixels tall
  assert.ok(Math.abs(px(0.8, 100, 0.9, 684) - 0.8 / 100 * f) < 1e-9); assert.ok(px(0.8, 200, 0.9, 684) < px(0.8, 100, 0.9, 684), 'farther is smaller'); assert.ok(Math.abs(px(0.8, 100, 0.9, 342) - px(0.8, 100, 0.9, 684) / 2) < 1e-9, 'half the pixels, half the size: the adaptive detail is counted');
  assert.equal(px(0.8, 0, 0.9, 684), Infinity, 'at the eye, as large as can be'); assert.ok(px(0.8, 100, 1.05, 684) < px(0.8, 100, 0.9, 684), 'a wider lens makes it smaller');
  // near: whole. A spectator 30 m away on that canvas is about 19 pixels tall
  assert.ok(px(0.8, 30, 0.9, 684) > 15); assert.equal(lod(px(0.8, 30, 0.9, 684), 0), 0); assert.equal(lod(px(0.8, 30, 0.9, 684), 1), 0, 'and comes back whole when the camera comes near');
  // far: simple. Across the bowl, 200 m, under 3 pixels
  assert.ok(px(0.8, 200, 0.9, 684) < 3); assert.equal(lod(px(0.8, 200, 0.9, 684), 0), 1);
  // the band: between 5.1 and 6.9 pixels it stays what it was
  assert.equal(lod(5.5, 0), 0); assert.equal(lod(5.5, 1), 1); assert.equal(lod(6.5, 0), 0); assert.equal(lod(6.5, 1), 1); assert.equal(lod(5.0, 0), 1); assert.equal(lod(7.0, 1), 0);
  let flips = 0, was = 0; for (let k = 0; k < 400; k++) { const now = lod(6 + Math.sin(k * 0.7) * 0.6, was); if (now !== was) flips += 1; was = now; } assert.equal(flips, 0, 'a size that hovers on the line changes nothing');
  for (const bad of [NaN, undefined, -1]) assert.equal(lod(bad, 1), 0, 'with no size to go by, whole');
  // the stadium asks through the renderer, which says whole unless the scene is slow, and uses the nearest of a section's spectators
  const s = fs.readFileSync(path.join(repo, 'apps/demo/src/play/StadiumLive.tsx'), 'utf8'); const g = fs.readFileSync(path.join(repo, 'apps/demo/src/play/gl.ts'), 'utf8');
  assert.ok(s.includes('r.lod(g.mesh, eye, fovy, 0.8, g.lod)') && s.includes('figureFar(') && s.includes('r.drawFar(g.mesh, model, tn, run.first, run.count, sx, sz, toEye)') && s.includes('r.gov.simplifies = true;')); assert.ok(g.includes('Math.hypot(eye[0] - m.c[0], eye[1] - m.c[1], eye[2] - m.c[2]) - m.r'), 'the distance is to the nearest edge of the section, so the nearest spectator decides');
});
