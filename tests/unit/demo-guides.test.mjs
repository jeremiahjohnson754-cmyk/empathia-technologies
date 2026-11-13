// "How do I use this room?" (apps/demo/src/guides/roomGuide.ts; founder's directive of 11 Nov 2026 §08, the End User Success & Training
// Guide: "The guide must retrieve the correct authorized room configuration … Do not present control instructions for devices that are
// not in that room."). The guide is generated from each room's own record, so these tests run over all 90 rooms: no sentence names
// equipment the room lacks, every step's equipment is in the room, the sections follow what the room can do, and nothing asks anyone to
// open, unplug or restart the room's equipment.
//   node --test tests/unit/demo-guides.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-guides-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as G from './guides/roomGuide.ts'; export * as D from './campus/design.ts'; export * as C from './control/model.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { G, D, C } = await import(pathToFileURL(out).href);
const recs = D.allRecords(); const guides = recs.map((r) => [r, G.roomGuide(r)]);
const catsOf = (r) => new Set(r.positions.filter((p) => !p.furniture).map((p) => p.cat));
const texts = (g) => [g.summary, ...g.supports.map((s) => s.because), ...g.sections.flatMap((s) => [s.title, s.lead, ...s.steps.flatMap((x) => [x.do, x.why || ''])])];
// a sentence that says the room does NOT have something is not an instruction for it; nor is one about the person's own laptop
const positive = (t) => t.replace(/\bno (touch panel|camera|microphones of its own|microphones|room system|screen)\b/gi, '').replace(/has no touch panel and no room system/gi, '').replace(/your laptop’s own microphone and camera/gi, '');

test('RG-01 a guide for every one of the 90 rooms: its own id, a draft, always how to adjust, finish and get help', () => {
  assert.equal(guides.length, 90); assert.equal(new Set(guides.map(([, g]) => g.id)).size, 90);
  for (const [r, g] of guides) { assert.equal(g.roomId, r.outline.id); assert.equal(g.status, 'DRAFT'); assert.ok(g.summary.includes(r.outline.name)); assert.ok(g.objectives.length >= 3 && g.sources.length >= 1);
    for (const id of ['controls', 'end', 'help']) assert.ok(g.sections.some((s) => s.id === id), `${r.outline.id} ${id}`);
    for (const s of g.sections) { assert.ok(s.steps.length >= 1 && s.lead.length > 10, `${r.outline.id} ${s.id}`); for (const x of s.steps) assert.ok(x.do.length > 15 && /[.”]$/.test(x.do), x.do); }
    assert.deepEqual(G.roomGuide(r), g, 'the same record gives the same guide'); }
});
test('RG-02 no sentence in any guide names equipment its room does not have', () => {
  let checked = 0;
  for (const [r, g] of guides) { const cats = catsOf(r);
    for (const t of texts(g)) for (const [re, need, what] of G.MENTIONS) if (re.test(positive(t))) { checked += 1; assert.ok(need.some((c) => cats.has(c)), `${r.outline.id} has no ${what}, but its guide says: “${t}”`); } }
  assert.ok(checked > 300, String(checked));
  // and the other way: the rooms that lack a thing are a real part of the estate, so the rule is exercised
  for (const cat of ['touch', 'camera', 'micceil', 'compute']) assert.ok(recs.some((r) => !catsOf(r).has(cat)) && recs.some((r) => catsOf(r).has(cat)), cat);
});
test('RG-03 every step’s equipment is in the room, so the page can ring it on the room’s plan', () => {
  for (const [r, g] of guides) { const cats = catsOf(r); for (const s of g.sections) for (const x of s.steps) for (const u of x.uses) assert.ok(cats.has(u), `${r.outline.id} ${s.id}: “${x.do}” uses ${u}`); }
});
test('RG-04 the sections follow what the room can do: its panel decides', () => {
  for (const [r, g] of guides) { const p = C.panelOf(r); const has = (id) => g.sections.some((s) => s.id === id); const meet = p.sources.some((s) => s.id === 'meeting');
    assert.equal(has('camera'), p.cameras.length > 0, `${r.outline.id} camera`); assert.equal(has('share'), p.sources.some((s) => s.id === 'laptop'), `${r.outline.id} share`); assert.equal(has('start'), meet || p.displays.length > 0, `${r.outline.id} start`);
    const start = g.sections.find((s) => s.id === 'start'); if (start) assert.equal(/joins the meeting itself/.test(start.lead), meet, `${r.outline.id}: only a room with a room system is told it joins by itself`);
    assert.equal(g.operatedBy === 'touch panel', !!p.touch); assert.deepEqual(g.lacks, p.lacks);
    assert.equal(g.supports[0].yes, meet && p.hears && p.cameras.length > 0); assert.equal(g.supports[1].yes, p.sources.some((s) => s.id === 'laptop'));
    const end = g.sections.find((s) => s.id === 'end'); assert.equal(end.steps.some((x) => /Leave or End/.test(x.do)), meet, `${r.outline.id}: only a room that joins is told to leave`); }
  assert.ok(new Set(guides.map(([, g]) => g.operatedBy)).size >= 2, 'the estate has rooms operated in more than one way');
});
test('RG-05 nothing asks anyone to open a cabinet, unplug the room’s equipment, restart it, or move a camera or microphone', () => {
  for (const [r, g] of guides) for (const t of texts(g)) for (const s of t.split(/(?<=[.:])\s+/)) {
    if (/cabinet|at the wall|restart|the room’s equipment/i.test(s)) assert.match(s, /^Do not /, `${r.outline.id}: “${s}”`);
    if (/unplug/i.test(s)) assert.ok(/^Do not /.test(s) || /from your laptop/.test(s), `${r.outline.id}: “${s}”`);
    assert.ok(!/ladder|climb|ceiling tile|password is|reset the|factory reset/i.test(s), `${r.outline.id}: “${s}”`); }
});
test('RG-06 three rooms that differ: the reference boardroom, a room with no touch panel, a room with no camera', () => {
  const ref = G.roomGuide(D.roomRecord('R-ATL-4-218')); assert.match(ref.title, /How to use Atlas 4\.218/); assert.ok(ref.sections.find((s) => s.id === 'start').steps[0].do.includes('look for your meeting'));
  const noTouch = guides.find(([r]) => !catsOf(r).has('touch') && C.panelOf(r).displays.length); assert.ok(noTouch); assert.notEqual(noTouch[1].operatedBy, 'touch panel'); assert.match(noTouch[1].sections.find((s) => s.id === 'controls').lead, /no touch panel/);
  const noCam = guides.find(([r]) => !C.panelOf(r).cameras.length && C.panelOf(r).displays.length); if (noCam) { assert.ok(!noCam[1].sections.some((s) => s.id === 'camera')); assert.equal(noCam[1].supports[0].yes, false); }
  const notBuilt = guides.find(([, g]) => g.notReady); if (notBuilt) assert.match(notBuilt[1].notReady, /may not be installed or working yet/);
});
