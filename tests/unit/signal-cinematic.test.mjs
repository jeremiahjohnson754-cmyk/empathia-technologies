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
const sc = C.CINEMATIC.s01e01; const ch = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/story/s01e01.json'), 'utf8'));
const canonLines = ch.items.flatMap((it) => [...(it.bubbles || []).map((b) => [b.who.toLowerCase(), b.text]), ...(it.type === 'beat' ? it.lines.map((l) => [l.who, l.text]) : []), ...(it.type === 'decision' ? it.options.map((o) => ['ray', (o.result.match(/Ray: “([^”]+)”/) || [])[1] || '']) : [])]);

test('each shot points at the canon item of its kind', () => { for (const s of sc.shots) assert.equal(ch.items[s.item].type, s.kind === 'decision' ? 'decision' : s.kind === 'beat' ? 'beat' : 'panel', `item ${s.item}`); });
test('every take speaks a canon line, word for word, in the speaker the canon gives', () => { for (const t of sc.takes) assert.ok(canonLines.some(([w, x]) => w === t.who && C.norm(x) === C.norm(t.text)), `${t.who}: ${t.text}`); });
test('every take file exists; the ladder take is the line option D gives Ray', () => {
  for (const t of sc.takes) assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', t.src)), t.src);
  const d = ch.items.find((i) => i.type === 'decision'); const o = d.options.find((x) => x.letter === sc.ladder.letter);
  const t = sc.takes.find((x) => x.src === sc.ladder.take); assert.ok(o.result.includes(t.text.replace(/’/g, "'")) || C.norm(o.result).includes(C.norm(t.text)));
});
test('every spoken line in the scene has its take', () => {
  for (const s of sc.shots) { const it = ch.items[s.item]; const lines = s.kind === 'beat' ? it.lines.map((l) => [l.who, l.text]) : (it.bubbles || []).map((b) => [b.who.toLowerCase(), b.text]);
    for (const [w, x] of lines) assert.ok(C.takeFor(sc, w, x), `${w}: ${x}`); }
});
