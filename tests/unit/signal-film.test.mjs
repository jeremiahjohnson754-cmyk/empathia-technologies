// SIGNAL Story Director (founder 18 Nov 2026 11:59 and 16:41): the interactive film of every chapter is a valid graph — a title first and
// credits last, every canon decision and conversation exactly once, every reviewed footage clip placed once, every playable scene
// anchored to the canon text it stages, every conditional line tied to a real option — and the Ten Seats acoustics reproduce the canon's
// own numbers (seat 13: 1.7 m, 4.96 ms, 101 Hz; seat 12: 123 Hz; fill −6 dB shallower, not gone; re-aim: the ten seats' notches gone,
// the balcony front weaker).
//   node --test tests/unit/signal-film.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'film-')); const entry = path.join(tmp, 'e.ts'); const out = path.join(tmp, 'm.mjs');
const src = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(entry, `export * as D from ${src('signal/film/director.ts')}; export * as A from ${src('signal/film/acoustics.ts')}; export * as C from ${src('signal/cinematic.ts')};`);
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { D, A, C } = await import(pathToFileURL(out).href);
const dir = path.join(repo, 'packages/signal-canon/data/story');
const chapters = fs.readdirSync(dir).filter((f) => /^s\d\de\d\d\.json$/.test(f)).map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items]);

test('every chapter of every season builds a valid film (title, credits, each decision and conversation once, no empty act)', () => {
  assert.ok(chapters.length >= 133, `chapters ${chapters.length}`);
  for (const [id, items] of chapters) { assert.ok(D.filmFor(id)); const shots = D.buildFilm(id, items); assert.deepEqual(D.validateFilm(id, items, shots), [], id); }
});
test('Ten Seats: the five playable scenes stand where the canon investigates, each anchored to its text, in story order', () => {
  const items = chapters.find(([id]) => id === 's01e01')[1]; const shots = D.buildFilm('s01e01', items);
  assert.deepEqual(shots.filter((s) => s.kind === 'play').map((s) => s.id), ['measure', 'cards', 'board', 'filltest', 'verify']);
  const at = (k, id) => shots.findIndex((s) => s.kind === k && (s.id === id || s.item === id));
  assert.ok(at('decision', 'BR-S01E01-01') < at('play', 'measure') && at('play', 'verify') < shots.length - 1);
  assert.deepEqual(shots.filter((s) => s.kind === 'decision').map((s) => s.id), ['BR-S01E01-01', 'BR-S01E01-02', 'BR-S01E01-03']);
  assert.equal(shots.filter((s) => s.kind === 'talk').length, 1);
});
test('Season 1: every reviewed footage clip and every recorded take is in the film, and every file exists', () => {
  let clips = 0;
  for (const [id, items] of chapters.filter(([c]) => c.startsWith('s01'))) {
    const shots = D.buildFilm(id, items); const foot = shots.filter((s) => s.kind === 'footage'); clips += foot.length;
    assert.equal(foot.length, (C.FOOTAGE[id] || []).length, `${id} footage`);
    for (const f of foot) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', f.src)), f.src);
    for (const t of C.TAKES[id] || []) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', t.src)), t.src);
  }
  assert.ok(clips >= 35, `Season 1 clips in the films: ${clips}`);   // 32 Season 1 shots + the three Ten Seats clips
});
test('the acoustics reproduce the canon’s numbers', () => {
  const s13 = A.SEATS.find((s) => s.id === 'R8-13'); const s12 = A.SEATS.find((s) => s.id === 'R8-12');
  assert.equal(Math.round(A.delayMs(s13) * 100) / 100, 4.96); assert.equal(Math.round(A.firstNotch(s13)), 101); assert.equal(Math.round(A.notchSpacing(s13)), 202);
  assert.equal(Math.round(A.firstNotch(s12)), 123); assert.equal(Math.round(A.notchSpacing(s12)), 245);
  const before = A.reading(s13, A.RIG_START); const down = A.reading(s13, { ...A.RIG_START, fillDb: -6 }); const after = A.reading(s13, { ...A.RIG_START, fill: 'reaimed' });
  assert.ok(before.first === 101 && before.depth < -10, JSON.stringify(before));
  assert.ok(down.first && down.depth > before.depth && down.depth < -3, `fill −6 dB: shallower, not gone ${JSON.stringify(down)}`);
  for (const s of A.TEN) assert.equal(A.reading(s, { ...A.RIG_START, fill: 'reaimed' }).first, null, `${s.id} after the re-aim`);
  assert.equal(after.first, null);
  assert.ok(A.notchesMove(A.TEN.map((s) => s.id), A.RIG_START), 'the first notch differs in every one of the ten seats');
  const bal = A.SEATS.find((s) => s.balcony); assert.ok(A.responseDb(bal, { ...A.RIG_START, fill: 'reaimed' }, 500) < A.responseDb(bal, A.RIG_START, 500), 'balcony front weaker after the re-aim');
  for (const s of A.SEATS.filter((x) => !x.hollow && !x.balcony)) assert.equal(A.reading(s, A.RIG_START).first, null, `${s.id} is not hollow`);
});
test('the film’s own store ignores rubbish and never throws', () => {
  globalThis.localStorage = { s: { 'empathia.signal.film.v1': '{"s01e01":{"at":"x","plays":7,"sound":"yes"}}' }, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; } };
  assert.deepEqual(D.loadFilm('s01e01'), { at: 0, plays: {}, sound: null });
  globalThis.localStorage.s['empathia.signal.film.v1'] = 'not json'; assert.deepEqual(D.loadFilm('s01e01'), D.emptyFilm());
  delete globalThis.localStorage;
});
