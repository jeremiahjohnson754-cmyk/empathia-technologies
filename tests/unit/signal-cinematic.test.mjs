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
  const all = sc.acts.flatMap((a) => a.shots).filter((s) => s.kind !== 'footage'); for (const s of all) assert.equal(ch.items[s.item].type, s.kind, `item ${s.item}`);
  assert.deepEqual(all.map((s) => s.item), [...all.map((s) => s.item)].sort((a, b) => a - b));
  assert.ok(C.cinematicFor('s06e01') && !C.cinematicFor('s07e01'));
});
test('every take speaks a canon line, word for word, in the speaker the canon gives', () => { for (const t of sc.takes) assert.ok(canonLines.some(([w, x]) => w === t.who && C.norm(x) === C.norm(t.text)), `${t.who}: ${t.text}`); });
test('every take file exists; the option that sends the player back to the choice is found from its canon words, with its take', () => {
  for (const t of sc.takes) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', t.src)), t.src);
  const d = ch.items.find((i) => i.type === 'decision'); const back = d.options.filter((o) => C.returnsToChoice(o.result));
  assert.deepEqual(back.map((o) => o.letter), ['D']); const q = C.quoted(back[0].result); assert.ok(q && C.takeFor(sc.takes, q.who, q.text), JSON.stringify(q));
});
test('every line Maya and Ray speak in the episode has its take, and every footage file exists', () => {
  for (const f of C.FOOTAGE.s01e01 || []) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', f.src)), f.src);
  for (const s of sc.acts.flatMap((a) => a.shots).filter((x) => x.kind !== 'footage')) { const it = ch.items[s.item]; const lines = s.kind === 'beat' ? it.lines.map((l) => [l.who, l.text]) : (it.bubbles || []).map((b) => [b.who.toLowerCase(), b.text]);
    for (const [w, x] of lines.filter(([w]) => w === 'maya' || w === 'ray')) assert.ok(C.takeFor(sc.takes, w, x), `${w}: ${x}`); }
});
// Season 1 (12 Nov 2026): every take of every chapter speaks a line its chapter gives that speaker, word for word, and its file exists;
// every voice heard is one the founder chose.
test('Season 1: every take is its chapter\'s canon line, in the canon speaker, with its file, in a chosen voice', () => {
  const chapters = Object.keys(C.TAKES).filter((k) => /^s01e/.test(k)); assert.ok(chapters.length >= 10, chapters.join());
  let n = 0;
  for (const id of chapters) {
    const it = JSON.parse(fs.readFileSync(path.join(repo, `packages/signal-canon/data/story/${id}.json`), 'utf8')).items;
    const lines = it.flatMap((i) => [...(i.bubbles || []).map((b) => [b.who.toLowerCase(), b.text]), ...(i.type === 'beat' ? i.lines.map((l) => [l.who.toLowerCase(), l.text]) : []), ...(i.type === 'decision' ? i.options.map((o) => C.quoted(o.result)).filter(Boolean).map((q) => [q.who, q.text]) : [])]);
    for (const t of C.TAKES[id]) { n++;
      assert.ok(lines.some(([w, x]) => w === t.who && C.norm(x) === C.norm(t.text)), `${id} ${t.who}: ${t.text}`);
      assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', t.src)), t.src);
      assert.ok(C.VOICES[t.who], `${t.who} has no chosen voice`); }
  }
  assert.ok(n >= 80, `${n} takes`);
});
test('Season 1 footage: every clip exists, is labelled as generated, and opens on a shot the scene actually has', () => {
  for (const [id, clips] of Object.entries(C.FOOTAGE).filter(([k]) => /^s01e/.test(k))) {
    const items = JSON.parse(fs.readFileSync(path.join(repo, `packages/signal-canon/data/story/${id}.json`), 'utf8')).items; const scn = C.sceneOf(id, items);
    for (const f of clips) {
      assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', f.src)), f.src); assert.match(f.note, /Generated footage/);
      assert.ok(['panel', 'beat', 'decision'].includes(items[f.before]?.type), `${id} before ${f.before}`);
      assert.ok(scn.acts.some((a) => a.shots.some((s) => s.kind === 'footage' && s.src === f.src)), `${id} ${f.src} not placed`); }
  }
});
