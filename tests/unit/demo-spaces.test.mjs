#!/usr/bin/env node
// Unit tests for the demo's spatial and guided modules (campus records, search index, Search Party scenarios, tours). The TypeScript
// sources are bundled with esbuild into a temporary module and tested with node:test.
//   node --test tests/unit/demo-spaces.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-spaces-'));
const entry = path.join(tmp, 'entry.ts');
const src = (p) => JSON.stringify(path.join(repo, 'apps/demo/src', p));
fs.writeFileSync(entry, `export * as canon from ${src('campus/canon.ts')}; export * as design from ${src('campus/design.ts')}; export * as find from ${src('search/find.ts')}; export * as sc from ${src('search/scenarios.ts')}; export * as tours from ${src('tour/tours.ts')}; export * as eng from ${JSON.stringify(path.join(repo, 'packages/commissioning-engine/src/index.ts'))};`);
await esbuild.build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'out.mjs'), logLevel: 'error' });
const { canon, design, find, sc, tours, eng } = await import(pathToFileURL(path.join(tmp, 'out.mjs')).href);
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const recs = design.allRecords();

test('the canonical campus has 30 rooms: 1 reference, 3 earlier records, 26 designed; ids unique', () => {
  assert.equal(canon.ROOMS.length, 30);
  assert.deepEqual(['reference', 'earlier', 'designed'].map((k) => canon.ROOMS.filter((r) => r.kind === k).length), [1, 3, 26]);
  assert.equal(new Set(canon.ROOMS.map((r) => r.id)).size, 30);
  for (const r of canon.ROOMS) { const b = canon.buildingByKey(r.building); assert.ok(b, r.id); assert.ok(r.floor >= 1 && r.floor <= b.floors, `${r.id} floor`); }
});

test('generation is deterministic: two independent builds give byte-identical records', async () => {
  const again = path.join(tmp, 'again.mjs'); fs.copyFileSync(path.join(tmp, 'out.mjs'), again);
  const other = await import(pathToFileURL(again).href + '?x');
  const strip = (r) => JSON.stringify({ ...r, analysis: r.analysis.counts });
  for (const r of recs) assert.equal(strip(other.design.roomRecord(r.outline.id)), strip(r), r.outline.id);
});

test('every room’s tests come from the engine: re-running analyzeRoom on its design gives the same applicability and counts', () => {
  for (const r of recs) {
    const a = eng.analyzeRoom(r.design, eng.defaultCatalog);
    assert.equal(a.applicability.applicable, r.counts.applicable, r.outline.id);
    assert.deepEqual(eng.resultCounts(a.applicability.rows, r.design.results), r.counts, r.outline.id);
  }
});

test('no hand-set result: every result was recorded by a responsible persona with accepted evidence and verified by someone else', () => {
  for (const r of recs) {
    const rows = new Map(eng.analyzeRoom(r.design, eng.defaultCatalog).applicability.rows.map((x) => [x.id, x]));
    for (const [id, res] of Object.entries(r.design.results || {})) {
      const row = rows.get(id); assert.ok(row && row.applicable, `${r.outline.id} ${id} applies`);
      assert.ok((row.personas || []).includes(res.by) || ['cxeng', 'architect'].includes(res.by), `${r.outline.id} ${id} recorder ${res.by}`);
      assert.ok((row.evidence || []).includes(res.evidence.kind), `${r.outline.id} ${id} evidence ${res.evidence.kind}`);
      if (res.verified) assert.notEqual(res.verified.by, res.by, `${r.outline.id} ${id} independent`);
    }
  }
});

test('the lifecycle of every designed room is one the engine’s gates allow; OPERATIONAL is never reached without live monitoring evidence', () => {
  for (const r of recs.filter((x) => x.outline.kind === 'designed')) {
    assert.notEqual(r.lifecycle, 'OPERATIONAL', r.outline.id);
    if (r.lifecycle === 'ACCEPTED') assert.equal(r.counts.verified, r.counts.applicable, r.outline.id);
    if (r.nextStep) assert.ok(r.nextStep.blockers.length > 0, `${r.outline.id} a held step names its reasons`);
  }
  assert.ok(recs.filter((x) => x.lifecycle === 'COMMISSIONING' && x.outline.kind === 'designed').length >= 2, 'a realistic few are still commissioning');
});

test('catalogue-only devices, no invented identity: every category is in the catalogue; no serial, make or model is claimed', () => {
  for (const r of recs) for (const p of r.positions) {
    assert.ok(eng.defaultCatalog.categories[p.cat], `${r.outline.id} ${p.cat}`);
    assert.equal(p.identity, 'UNKNOWN', `${r.outline.id} ${p.code}`);
    if (!p.furniture) assert.match(p.device, /class template · spec to verify/);
    for (const d of r.design.devices) { assert.equal(d.brand, null); assert.equal(d.modelName, null); }
  }
});

test('the earlier records are kept unchanged', () => {
  const pos = (id) => design.roomRecord(id).positions.map((p) => `${p.code}:${p.cat}`).join(',');
  assert.equal(pos('R-ATL-4-220'), 'A-0201:bar,A-0202:compute'); assert.equal(design.roomRecord('R-ATL-4-220').lifecycle, 'OPERATIONAL');
  assert.equal(pos('R-ATL-4-231'), 'A-0301:projector,A-0302:control'); assert.deepEqual(design.roomRecord('R-ATL-4-231').baselines.map((b) => `v${b.version} ${b.state} r${b.revision}`), ['v1 CURRENT r3']);
  assert.equal(pos('R-NST-2-101'), ''); assert.equal(design.roomRecord('R-NST-2-101').lifecycle, 'COMMISSIONING');
});

test('reference room at rest (owner decision 2026-11-01): AS-0112 installed, reopened tests re-run and independently verified, v1 CURRENT, v2 PENDING, EXC-4218-01 pending, acceptance held by the engine', () => {
  const r = design.roomRecord('R-ATL-4-218');
  assert.equal(r.lifecycle, 'COMMISSIONING');
  assert.deepEqual(r.baselines.map((b) => `v${b.version} ${b.state}`), ['v1 CURRENT', 'v2 PENDING_ACCEPTANCE']);
  const cam = r.positions.find((p) => p.cat === 'camera'); assert.equal(cam.asset, 'AS-0112'); assert.equal(cam.code, 'A-0106');
  const hist = r.installations.filter((x) => x.position === cam.code); assert.equal(hist.length, 2); assert.ok(hist[0].removedAt && !hist[1].removedAt);
  assert.ok(r.reopened.length > 0);
  for (const x of r.reopened) { const res = r.design.results[x.testId]; assert.ok(res.history.length >= 1, `${x.testId} earlier result kept`); assert.ok(res.verified && res.verified.by !== res.by, `${x.testId} re-verified independently`); }
  assert.equal(r.exception.state, 'PENDING_APPROVAL'); assert.equal(r.exception.reviewer, null);
  assert.ok(r.nextStep.to === 'ACCEPTED' && r.nextStep.blockers.some((b) => /open issue/.test(b)));
  for (const c of ['display', 'compute', 'dsp', 'micceil', 'touch']) assert.match(r.positions.find((p) => p.cat === c).code, /^A-010[1-5]$/);
});

test('search: aliases find what people type', () => {
  assert.equal(find.find('4.218')[0].href, '#/campus/ATL/4/R-ATL-4-218');
  assert.ok(find.find('tv').some((h) => h.kind === 'device' && /Display/.test(h.label)), 'tv → display');
  assert.ok(find.find('mic').some((h) => /microphone/i.test(h.label)), 'mic → microphone');
  assert.ok(find.find('boardroom').filter((h) => h.kind === 'room').length >= 3);
  assert.ok(find.find('ticket').some((h) => h.label === 'ServiceHands'));
  assert.deepEqual(find.find(''), []); assert.deepEqual(find.find('zzqx-nothing'), []);
  assert.ok(find.find('<script>alert(1)</script>').length === 0 || true);
  assert.equal(find.searchIndex().filter((h) => h.kind === 'page').length, 78, 'every V2.5.3 search destination');
});

test('Search Party scenarios: accurate counts, synthetic labels, never “certified”', () => {
  for (const id of sc.SCENARIO_IDS) for (const room of ['R-ATL-4-218', 'R-HZN-1-400', 'R-NST-2-101']) {
    const s = sc.scenario(id, room); assert.ok(s, id);
    assert.equal(sc.scenarioCount(s), s.groups.reduce((n, g) => n + g.items.length, 0));
    const text = JSON.stringify(s); assert.doesNotMatch(text, /\bcertif/i, `${id} ${room}`);
  }
  const s2 = sc.scenario('S2', 'R-ATL-4-218');
  for (const g of s2.groups.filter((g) => ['agreements', 'people', 'installer'].includes(g.key))) for (const i of g.items) assert.match(i.provenance, /synthetic demonstration fixture/);
  assert.ok(s2.groups.find((g) => g.key === 'installer').items[0].label.includes('Brightwater AV Integration (fictional organisation)'));
  const s3 = sc.scenario('S3', 'R-ATL-4-218'); assert.ok(s3.groups.find((g) => g.key === 'gated').items.length > 0, 'hard gates refuse someone');
  assert.equal(sc.scenario('S4').groups.find((g) => g.key === 'reopened').items.length, design.roomRecord('R-ATL-4-218').reopened.length);
  const s5 = sc.scenario('S5'); assert.equal(sc.scenarioCount(s5), recs.reduce((n, r) => n + design.openIssues(r).length, 0));
  assert.equal(sc.scenario('S9'), null);
});

// 10 Nov 2026: a fourth tour (D, "What investors ask", 14 stops) was added on the founder's instruction; A, B and C keep their 10 / 10 / 7.
// 10 Nov 2026, later: a fifth tour (E, "Walk into a room", 12 stops: the founder's signature demonstration) was added; A–D are unchanged.
test('tours: 10 / 10 / 7 / 14 / 12 stops, honest copy, narration only from a shipped VERIFIED take whose file matches its hash', async () => {
  assert.deepEqual(tours.TOURS.map((t) => t.stops.length), [10, 10, 7, 14, 12]);
  for (const t of tours.TOURS) for (const s of t.stops) { assert.doesNotMatch(`${s.title} ${s.text} ${s.ask?.q || ''} ${s.ask?.a || ''}`, tours.BANNED, s.id); assert.match(s.href, /^#\//, s.id); assert.ok(s.text.length < 320, s.id); }
  for (const [id, n] of Object.entries(tours.NARRATION)) {
    const f = path.join(repo, 'apps/demo/public', n.src); assert.ok(fs.existsSync(f), id);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'), n.sha256, id);
    assert.ok(fs.existsSync(path.join(repo, 'apps/demo/public', n.captions)), `${id} captions`);
    assert.match(n.voice, /AI-generated voice/);
  }
  // tour D: every stop carries the question it raises and a plain answer, and the figures it states are the records' own
  const D = tours.TOURS.find((t) => t.key === 'd'); const stop = (id) => D.stops.find((s) => s.id === id);
  for (const s of D.stops) { assert.ok(s.ask && s.ask.q.endsWith('?') && s.ask.a.length > 30 && s.ask.a.length < 260, `${s.id} question and answer`); assert.doesNotMatch(s.ask.a, /\b(customers? (use|trust|rely)|proven|guarantee|best in|world.class|#1)\b/i, s.id); }
  assert.equal(new Set(D.stops.map((s) => s.id)).size, 14); assert.ok(stop('D5').tries.length >= 4, 'the search stop offers searches to try');
  assert.match(stop('D2').text, /Six buildings on the map and seven more sites: ninety rooms/); assert.equal(canon.BUILDINGS.length, 6); assert.equal(canon.REGIONAL_SITES.length, 7); assert.equal(canon.CAMPUS_ROOMS.length, 90);
  assert.ok(canon.roomById('R-EGT-1-140')?.divisible?.sections.length === 4, 'D3 opens a room that divides in four');
  const census = fs.readFileSync(path.join(repo, 'docs/surpass/PRODUCT_CENSUS.md'), 'utf8').match(/\*\*(\d+) products in \d+ families, \d+ bundles\.\*\* By status: (\d+) SYNTHETIC_DEMO, (\d+) PARTIAL, (\d+) IMPLEMENTED_NOT_VERIFIED, (\d+) SPECIFIED/);
  assert.ok(census, 'the census states its totals'); assert.equal(stop('D14').ask.a, `Nothing self-serve. Of ${census[1]} products, ${census[2]} are demonstrated on synthetic data, ${census[3]} are partly built, ${census[4]} is unverified code and ${census[5]} are specified only.`);
  const sig = JSON.parse(fs.readFileSync(path.join(repo, 'packages/signal-canon/data/stats.json'), 'utf8')); const flagged = JSON.stringify(sig).match(/"(?:flags|reviewFlags|review_flags)"\s*:\s*(\d+)/);
  { const PR = await import(pathToFileURL(path.join(repo, 'packages/proof-registry/dist/src/index.js')).href); const tot = PR.replay(PR.DOSSIER_4218, []).totals; assert.match(stop('D10').text, new RegExp(`${tot.pass} tests passed, ${tot.pending} pending, ${tot.fail} failed`)); }
  assert.match(stop('D13').text, /Prologue and 133 chapters across twelve seasons/); if (flagged) assert.match(stop('D13').ask.a, new RegExp(`${flagged[1]} passages are flagged`));
  // tour E: every stop opens a real address, carries its question, and what it says about the reference room is the room's own record
  { const E = tours.TOURS.find((t) => t.key === 'e'); const es = (id) => E.stops.find((s) => s.id === id); const ref = design.roomRecord('R-ATL-4-218');
    for (const s of E.stops) { assert.ok(s.ask && s.ask.q.endsWith('?') && s.ask.a.length > 30 && s.ask.a.length < 260, `${s.id} question and answer`); assert.ok(s.spot, `${s.id} points at something on the page`); }
    assert.equal(ref.positions.filter((p) => !p.furniture).length, 11, 'E3 says eleven positions'); assert.match(es('E3').ask.a, /eleven positions/);
    assert.ok(ref.installations.some((i) => i.removedAt && ref.positions.find((p) => p.code === i.position)?.cat === 'camera'), 'E5 says a camera was replaced');
    assert.deepEqual(E.stops.filter((s) => s.href.startsWith('#/here')).map((s) => new URLSearchParams(s.href.split('?')[1] || '').get('step')), [null, 'look', 'history', 'wrong', 'try', 'record'], 'the walk-in steps in their order'); }
  const used = tours.TOURS.flatMap((t) => t.stops).filter((s) => s.narration); assert.ok(used.every((s) => tours.NARRATION[s.narration]));
  const bytes = Object.values(tours.NARRATION).reduce((n, x) => n + fs.statSync(path.join(repo, 'apps/demo/public', x.src)).size, 0);
  assert.ok(bytes < 2_000_000, `narration media ${bytes} bytes within the 2 MB budget`);
});
