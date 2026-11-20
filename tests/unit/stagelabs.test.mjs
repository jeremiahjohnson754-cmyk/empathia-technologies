// Light the Stage and Shoot the Service (founder, 12 Nov 2026): the lighting lab's arithmetic (candela over the beam's solid angle,
// inverse square, beam diameter, DMX footprints and overlaps, spill on the screen) and the video lab's (banding as the fractional part
// of refreshes per exposure, shutter angle, the incident-meter exposure equation, lip-sync from frame times) are the textbook's; the
// rigs as handed over fail and a careful setup passes.
//   node --test tests/unit/stagelabs.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-'));
const load = async (f) => { const out = path.join(dir, `${path.basename(f)}.mjs`); await esbuild.build({ entryPoints: [path.join(repo, f)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' }); return import(pathToFileURL(out).href); };
const L = await load('apps/demo/src/mixlab/light.ts'); const V = await load('apps/demo/src/mixlab/video.ts');

test('lighting arithmetic: candela, inverse square, beam diameter, footprints and overlaps', () => {
  assert.ok(Math.abs(L.candela(1000, 60) - 1000 / (2 * Math.PI * (1 - Math.cos(Math.PI / 6)))) < 1e-9);
  assert.ok(Math.abs(L.beamDiameter(10, 90) - 20) < 1e-9);
  assert.equal(L.lastAddr({ kind: 'par', addr: 17 }), 24); assert.equal(L.lastAddr({ kind: 'mover', addr: 1 }), 16);
  assert.deepEqual(L.collisions({ hung: [{ id: 1, kind: 'par', addr: 1 }, { id: 2, kind: 'par', addr: 8 }, { id: 3, kind: 'par', addr: 17 }] }), [[1, 2]]);
  const h = { id: 1, kind: 'profile', pos: 'FOH2', addr: 1, target: 'pastor', level: 100, cct: 4300, hue: 0, zoom: 26 }; const half = { ...h, level: 50 };
  const s = L.SUBJECTS[0]; assert.ok(Math.abs(L.lux(half, s) - L.lux(h, s) / 2) < 1e-9); assert.equal(L.lux({ ...h, pos: 'FOH1', target: 'leader' }, s), 0); assert.ok(L.lux({ ...h, pos: 'FOH1', target: 'leader' }, L.SUBJECTS[1]) > 0);
});
test('the rig as handed over fails the sermon look; a careful rig passes the sermon and the worship look', () => {
  const f = L.freshRig(); assert.ok(L.lightScore(L.lightGoals(f, L.analyseRig(f), 'sermon')) < 75);
  const good = { hung: [
    { id: 1, kind: 'profile', pos: 'FOH2', addr: 1, target: 'pastor', level: 75, cct: 4300, hue: 0, zoom: 26 },
    { id: 2, kind: 'fresnel', pos: 'FOH4', addr: 3, target: 'pastor', level: 50, cct: 4300, hue: 0, zoom: 22 },
    { id: 3, kind: 'fresnel', pos: 'BK3', addr: 6, target: 'pastor', level: 100, cct: 4300, hue: 0, zoom: 40 },
    { id: 4, kind: 'par', pos: 'BK4', addr: 9, target: 'band', level: 80, cct: 5600, hue: 220, zoom: 25 }] };
  const a = L.analyseRig(good); const gs = L.lightGoals(good, a, 'sermon'); assert.equal(L.lightScore(gs), 100, gs.filter((g) => !g.ok).map((g) => `${g.key} ${g.value}`).join('; '));
  const w = structuredClone(good); w.hung[0].level = 0; w.hung[1].level = 0; w.hung[2].level = 20; w.hung.push({ id: 5, kind: 'mover', pos: 'FOH1', addr: 17, target: 'leader', level: 70, cct: 5600, hue: 0, zoom: 14 });
  assert.equal(L.lightScore(L.lightGoals(w, L.analyseRig(w), 'worship')), 100);
  const spilled = structuredClone(good); spilled.hung[3] = { ...spilled.hung[3], pos: 'FOH3', target: 'band', kind: 'fresnel', zoom: 60 }; assert.ok(L.analyseRig(spilled).spill.length >= 1);
});
test('video arithmetic: the canon’s stripe (3840 × 1/50 = 76.8), shutter angle, exposure, lip-sync', () => {
  assert.equal(V.bandFraction(3840, 50), 0.8); assert.equal(V.banded(3840, 50), true); assert.equal(V.banded(3840, 60), false); assert.equal(V.banded(120, 60), false); assert.equal(V.banded(120, 50), true);
  assert.equal(V.angle(59.94, 60), 360); assert.equal(V.angle(50, 100), 180);
  assert.equal(V.evError({ shutter: 60, iso: 400, f: 5.6, nd: 0, wb: 4300 }, 1200), 0);
  assert.equal(V.lipSyncError({ fps: 59.94, audioDelay: 50, cams: [], pgm: 0, pvw: 0, key: false }), 0);
});
test('the cameras as handed over fail; a careful setup passes every cue', () => {
  const f = V.freshVideo(); assert.ok(V.videoScore(V.videoGoals(f, 0)) < 75);
  const cams = [{ shutter: 60, iso: 400, f: 5.6, nd: 0, wb: 4300 }, { shutter: 60, iso: 400, f: 5.6, nd: 0, wb: 4300 }];
  V.CUES.forEach((c, i) => { const r = { fps: 59.94, cams, audioDelay: 50, pgm: c.pgm, pvw: 3, key: c.key_ }; const gs = V.videoGoals(r, i); assert.equal(V.videoScore(gs), 100, `${c.key}: ${gs.filter((g) => !g.ok).map((g) => g.key)}`); });
});
