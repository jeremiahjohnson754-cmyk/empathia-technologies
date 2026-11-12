// SIGNAL Cinematic Story (A5, 12 Nov 2026): the scene's shots point at the canon items they claim to (panels, the decision, the beat),
// every recorded take speaks a line that is in the canon word for word, every take file exists, and the ladder take is option D's line.
//   node --test tests/unit/signal-cinematic.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cine-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/cinematic.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const C = await import(pathToFileURL(out).href);
const ch = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/story/s01e01.json'), 'utf8'));
const sc = C.sceneOf('s01e01', ch.items);
const canonLines = ch.items.flatMap((it) => [...(it.bubbles || []).map((b) => [b.who.toLowerCase(), b.text]), ...(it.type === 'beat' ? it.lines.map((l) => [l.who, l.text]) : []), ...(it.type === 'decision' ? it.options.map((o) => ['ray', (o.result.match(/Ray: “([^”]+)”/) || [])[1] || '']) : [])]);

test('the scene is the chapter: one act per canon heading, each shot the canon item of its kind, in order', () => {
  const headings = ch.items.filter((i) => i.type === 'heading').map((h) => h.text); assert.ok(sc.acts.length >= 4); for (const a of sc.acts) assert.ok(headings.includes(a.title), a.title);
  const all = sc.acts.flatMap((a) => a.shots); for (const s of all) assert.equal(ch.items[s.item].type, s.kind, `item ${s.item}`);
  assert.deepEqual(all.map((s) => s.item), [...all.map((s) => s.item)].sort((a, b) => a - b));
  assert.ok(C.cinematicFor('s06e01') && !C.cinematicFor('s07e01'));
});
test('every take speaks a canon line, word for word, in the speaker the canon gives', () => { for (const t of sc.takes) assert.ok(canonLines.some(([w, x]) => w === t.who && C.norm(x) === C.norm(t.text)), `${t.who}: ${t.text}`); });
test('every take file exists; the option that sends the player back to the choice is found from its canon words, with its take', () => {
  for (const t of sc.takes) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', t.src)), t.src);
  const d = ch.items.find((i) => i.type === 'decision'); const back = d.options.filter((o) => C.returnsToChoice(o.result));
  assert.deepEqual(back.map((o) => o.letter), ['D']); const q = C.quoted(back[0].result); assert.ok(q && C.takeFor(sc.takes, q.who, q.text), JSON.stringify(q));
});
test('every spoken line in Act I has its take', () => {
  for (const s of sc.acts.find((a) => /Tuesday night/.test(a.title)).shots) { const it = ch.items[s.item]; const lines = s.kind === 'beat' ? it.lines.map((l) => [l.who, l.text]) : (it.bubbles || []).map((b) => [b.who.toLowerCase(), b.text]);
    for (const [w, x] of lines) assert.ok(C.takeFor(sc.takes, w, x), `${w}: ${x}`); }
});
