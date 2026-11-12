// SIGNAL × Lite (founder, 12 Nov 2026, 14:25 CT): every "Try it in Lite" place is a real campus room opened at real Lite addresses (layers,
// overlays, states, measurements; never a lens, so the reader's role decides what is drawn), every glossary term it maps is a glossary
// headword, every Season 1 chapter has its place, and text is matched to the longest term it names.
//   node --test tests/unit/signal-lite.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sglite-')), 'm.mjs');
await esbuild.build({ entryPoints: [path.join(repo, 'apps/demo/src/signal/lite.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const L = await import(pathToFileURL(out).href);
const canon = fs.readFileSync(path.join(repo, 'apps/demo/src/campus/canon.ts'), 'utf8');
const OVERLAYS = ['camera', 'mic', 'speaker', 'sight', 'access', 'infra'], LAYERS = ['furniture', 'av', 'network', 'power', 'control', 'environment', 'occupancy', 'wayfinding'], STATES = ['designed', 'commissioned', 'current', 'proposed'];

test('every Lite place is a campus room, opened only with Lite layers, overlays, states and measurements (no lens)', () => {
  for (const t of Object.values(L.LITE_TRIES)) {
    assert.ok(canon.includes(`R('${t.room}', '${t.roomName.replace(/^./, (c) => c)}`) || canon.includes(`R('${t.room}',`), t.room);
    const q = new URLSearchParams(t.q); assert.ok(!q.has('mode'), `${t.key} sets a lens`);
    for (const k of q.keys()) assert.ok(['ly', 'ov', 'state', 'xm'].includes(k), `${t.key}: ${k}`);
    for (const v of (q.get('ov') || '').split(',').filter(Boolean)) assert.ok(OVERLAYS.includes(v), `${t.key} overlay ${v}`);
    for (const v of (q.get('ly') || '').split(',').filter(Boolean)) assert.ok(LAYERS.includes(v), `${t.key} layer ${v}`);
    if (q.has('state')) assert.ok(STATES.includes(q.get('state')), t.key);
    assert.match(L.liteHref(t), /^#\/lite\/room\/R-[A-Z]+-\d-\d+\?/); assert.ok(t.look.length > 40 && t.title.length > 5);
  }
});
test('every Season 1 chapter has its place, and every mapped term is a glossary headword', () => {
  for (const e of ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']) assert.ok(L.liteForChapter(`s01e${e}`), e);
  const terms = new Set((JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/app-data.json'), 'utf8')).glossary || []).map((t) => t.term));
  for (const term of Object.keys(L.LITE_BY_TERM)) assert.ok(terms.has(term), `not a glossary headword: ${term}`);
  assert.equal(L.liteForChapter('s02e01'), null);
});
test('text is matched by whole words to the longest term it names; the caveat says modeled, not measured', () => {
  assert.equal(L.liteForText('Set your gain staging first')?.key, 'mic');
  assert.equal(L.liteForText('A ground loop makes hum')?.key, 'power');
  assert.equal(L.liteForText('the comb filter moves between seats')?.key, 'coverage');
  assert.equal(L.liteForText('Gainsborough paints'), null);
  assert.match(L.LITE_CAVEAT, /not the story’s church/); assert.match(L.LITE_CAVEAT, /never a measurement/);
});
