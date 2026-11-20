// SIGNAL's title page (apps/demo/src/signal/titlepage.gen.ts; founder, 16 Nov 2026: "SIGNAL needs to feel like SIGNAL"): extracted from
// the founder's reference build by scripts/signal/extract-titlepage.py and shown unedited.
//   TP-01  it names the reference build it came from, and carries nothing that runs or loads: no script, no handler, no outside address
//   TP-02  every figure and gradient the cover and the cast portraits use exists in the canon's own sprite sheet
//   TP-03  its contents agree with the canon: the eleven prologue chapters by id, the twelve seasons by name and order
//   node --test tests/unit/signal-titlepage.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tp-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/titlepage.gen.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { TITLE_PAGE: T, COVER_SVG } = await import(pathToFileURL(out).href);
const canon = path.join(repo, 'packages/signal-canon/data'); const defs = fs.readFileSync(path.join(canon, 'art/defs.svg'), 'utf8');
const all = COVER_SVG + T.cast.map((c) => c.svg).join('');

test('TP-01 it names its source and carries nothing that runs or loads', () => {
  assert.match(T.source_sha256, /^80f8d992851f9651/);
  assert.ok(COVER_SVG.startsWith('<svg') && COVER_SVG.endsWith('</svg>'));
  assert.ok(!/<script|\son[a-z]+=|javascript:|base64|<foreignObject|<image|<iframe/i.test(all));
  assert.deepEqual([...all.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/')), []);
  assert.deepEqual([...COVER_SVG.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]), ['SIGNAL', 'SIGNAL', 'AN EMPATHIA LEARN STORY']);
});

test('TP-02 every figure and gradient it uses exists in the canon sprite sheet or in the cover itself', () => {
  const local = new Set([...COVER_SVG.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const refs = new Set([...all.matchAll(/url\(#([^)]+)\)/g), ...all.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]));
  assert.ok(refs.size >= 4); for (const r of refs) assert.ok(local.has(r) || defs.includes(`id="${r}"`), `${r} resolves`);
  assert.deepEqual(T.needs.filter((r) => !defs.includes(`id="${r}"`)), []);
});

test('TP-03 the prologue chapters and the twelve seasons agree with the canon', () => {
  const ix = JSON.parse(fs.readFileSync(path.join(canon, 'story/index.json'), 'utf8')); const chapters = ix.chapters || ix;
  const pro = chapters.filter((c) => /^pro\d\d$/.test(c.id)).map((c) => c.id);
  assert.deepEqual(T.toc.map((c) => c.id), pro); assert.equal(T.toc.length, 11);
  const seasons = JSON.parse(fs.readFileSync(path.join(canon, 'seasons.json'), 'utf8')); const name = (n) => { const s = Array.isArray(seasons) ? seasons.find((x) => (x.n ?? x.season ?? x.id) === n) : seasons[String(n)]; return typeof s === 'string' ? s : s?.title ?? s?.name; };
  const arc = T.arc.flatMap((a) => a.seasons); assert.deepEqual(arc.map((s) => s.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const s of arc) assert.equal(s.title, name(s.n), `season ${s.n}`);
  assert.deepEqual(T.cast.map((c) => c.name), ['Maya', 'Ray']); assert.match(T.time, /7:12 AM/);
});
