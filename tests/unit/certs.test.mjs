// Certification study spaces (apps/demo/src/certs; founder, 18 Nov 2026).
//   CE-01  the published outlines add up: duty weights sum to 100 and each duty's task weights sum to the duty; question counts and times
//          are the handbooks' (CTS 115/100/15, 150 min; CTS-D and CTS-I 110/100/10, 150 min); every fact names a source and the read date
//   CE-02  every written question is well formed: unique id, its certification's duty and task, four distinct options, an answer, a
//          reason; a linked calculator exists in Field Tools
//   CE-03  the banks are substantial and cover every duty of every outline
//   CE-04  calculation drills: every template, many seeds, four distinct options with the right one among them; a drill is rebuilt
//          exactly from its id; spot checks of the arithmetic
//   CE-05  a practice exam follows the outline: allocation sums to the size and tracks the weights; no question twice; the time per
//          question is the real exam's
//   CE-06  scoring and progress: correct counts, per-duty counts, unanswered; missed questions collect and leave when answered right;
//          the best score records only practice exams of 20 or more
//   CE-07  the words: the disclaimer says unofficial, not affiliated or endorsed, not from an AVIXA exam; nothing claims a credential
//   node --test tests/unit/certs.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'certs-')), 'm.mjs');
await esbuild.build({ stdin: { contents: "export * as F from './certs/facts.ts'; export * as E from './certs/exam.ts'; export * as G from './certs/gen.ts'; export * as T from './fieldtools/calc.ts'; export * as U from './certs/guide.ts';", resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { F, E, G, T, U } = await import(pathToFileURL(out).href);
const IDS = ['CTS', 'CTS-D', 'CTS-I'];

test('CE-01 the outlines add up and every fact is sourced', () => {
  for (const id of IDS) { const c = F.CERTS[id];
    assert.equal(c.domains.reduce((a, d) => a + d.weight, 0), 100, `${id} duties`);
    for (const d of c.domains) assert.equal(d.tasks.reduce((a, t) => a + t.weight, 0), d.weight, `${id} ${d.code} tasks`);
    assert.equal(c.minutes, 150); assert.equal(c.questions.scored, 100); assert.equal(c.questions.total, c.questions.scored + c.questions.pilot);
    assert.ok(F.SOURCES[c.source]?.url.startsWith('https://'), `${id} source`);
  }
  assert.deepEqual([F.CERTS.CTS.questions.total, F.CERTS['CTS-D'].questions.total, F.CERTS['CTS-I'].questions.total], [115, 110, 110]);
  assert.deepEqual(F.CERTS.CTS.domains.map((d) => d.weight), [35, 30, 15, 20]); assert.deepEqual(F.CERTS['CTS-D'].domains.map((d) => d.weight), [20, 28, 38, 14]); assert.deepEqual(F.CERTS['CTS-I'].domains.map((d) => d.weight), [17, 12, 12, 39, 12, 8]);
  assert.match(F.READ_ON, /2026/); assert.match(F.CERTS['CTS-D'].prerequisite, /current CTS/); assert.match(F.CERTS['CTS-I'].prerequisite, /current CTS/);
  assert.match(F.CERTS.CTS.delivery, /Confirm with AVIXA/);
});

test('CE-02 every written question is well formed', () => {
  const seen = new Set();
  for (const id of IDS) { const c = F.CERTS[id];
    for (const q of E.BANKS[id]) {
      assert.ok(!seen.has(q.id), `duplicate ${q.id}`); seen.add(q.id); assert.equal(q.cert, id);
      const d = c.domains.find((x) => x.code === q.domain); assert.ok(d, `${q.id} duty ${q.domain}`); assert.ok(d.tasks.some((t) => t.code === q.task), `${q.id} task ${q.task}`);
      assert.equal(q.options.length, 4); assert.equal(new Set(q.options).size, 4, `${q.id} options distinct`); assert.ok(q.options.every((o) => o.trim().length > 0), `${q.id} empty option`);
      assert.ok([0, 1, 2, 3].includes(q.answer)); assert.ok(q.why.length > 20, `${q.id} why`); assert.ok(q.stem.length > 15);
      if (q.tool) assert.ok(T.toolById(q.tool), `${q.id} tool ${q.tool}`);
    }
  }
  const m = E.BANKS['CTS-D'].find((q) => q.id === 'ctsd-m-01'); assert.equal(m.options[m.answer], '0.59 s'); // 0.161 × 288 ÷ 78
});

test('CE-03 the banks cover every duty', () => {
  for (const id of IDS) { const c = F.CERTS[id]; const b = E.BANKS[id];
    assert.ok(b.length >= (id === 'CTS' ? 80 : 40), `${id} has ${b.length}`);
    for (const d of c.domains) assert.ok(b.some((q) => q.domain === d.code), `${id} ${d.code} has questions`);
    for (const d of c.domains) assert.ok(U.GUIDES[id].some((g) => g.domain === d.code), `${id} ${d.code} has a guide`);
  }
  for (const s of U.MATH) for (const f of s.formulas || []) if (f.tool) assert.ok(T.toolById(f.tool), `formula tool ${f.tool}`);
});

test('CE-04 calculation drills', () => {
  for (const id of IDS) for (const seed of [1, 7, 42, 99, 12345, 777777]) {
    for (const q of G.drills(id, 40, seed)) {
      assert.equal(new Set(q.options).size, 4, `${q.id} ${q.options}`); assert.doesNotMatch(q.options.join('|'), /NaN|Infinity|undefined/, q.id);
      assert.ok(q.generated && q.math); const again = G.drillById(id, q.id); assert.deepEqual(again, q, `rebuild ${q.id}`);
      assert.ok(F.CERTS[id].domains.some((d) => d.code === q.domain && d.tasks.some((t) => t.code === q.task)), `${q.id} task`);
    }
  }
  for (const t of G.TEMPLATES) for (const c of t.certs) assert.ok(t.domain[c], `${t.id} maps ${c}`);
  const find = (tid) => { for (let s = 1; s < 2000; s++) { const q = G.drills('CTS', 60, s).find((x) => x.id.startsWith(`gen-${tid}-`)); if (q) return q; } };
  const h = find('hosts'); const p = Number(/\/(\d+)/.exec(h.stem)[1]); assert.equal(Number(h.options[h.answer].replace(/,/g, '')), 2 ** (32 - p) - 2);
  const th = find('throw'); const [, tr, w] = /ratio of ([\d.]+):1 and the image is (\d+)/.exec(th.stem); assert.equal(parseFloat(th.options[th.answer]), +(tr * w).toFixed(1));
  const inv = find('inverse'); const [, l1, d1, d2] = /measures (\d+) dB SPL at (\d+) m.*at (\d+) m/.exec(inv.stem); assert.ok(Math.abs(parseFloat(inv.options[inv.answer]) - (l1 - 20 * Math.log10(d2 / d1))) < 0.06);
});

test('CE-05 a practice exam follows the outline', () => {
  for (const id of IDS) { const c = F.CERTS[id];
    for (const n of [25, 50, 100]) { const a = E.allocation(id, n); assert.equal(Object.values(a).reduce((x, y) => x + y, 0), n);
      for (const d of c.domains) assert.ok(Math.abs(a[d.code] - n * d.weight / 100) < 1, `${id} ${d.code} ${a[d.code]}`); }
    assert.equal(E.capacity(id), 100, `${id} fills a 100-question exam in proportion`);
    const s = E.assemble(id, { mode: 'exam', size: 100, seed: 5 }); assert.equal(s.questions.length, 100); assert.equal(new Set(s.questions.map((q) => q.id)).size, 100, 'no repeats');
    const per = {}; for (const q of s.questions) per[q.domain] = (per[q.domain] || 0) + 1; const a = E.allocation(id, 100);
    for (const d of c.domains) assert.equal(per[d.code] || 0, a[d.code], `${id} ${d.code}: ${per[d.code]} vs ${a[d.code]}`);
    assert.equal(s.seconds, Math.round(c.minutes * 60 / c.questions.total * 100));
    assert.equal(E.assemble(id, { mode: 'study', size: 20, seed: 3 }).seconds, null);
    const dom = E.assemble(id, { mode: 'domain', size: 10, seed: 4, domain: c.domains[0].code }); assert.ok(dom.questions.every((q) => q.domain === c.domains[0].code));
  }
});

test('CE-06 scoring and progress', () => {
  const s = E.assemble('CTS', { mode: 'exam', size: 25, seed: 11 }); const ans = {};
  s.questions.forEach((q, i) => { if (i < 20) ans[q.id] = i < 15 ? q.answer : (q.answer + 1) % 4; });
  const sc = E.score(s, ans); assert.equal(sc.correct, 15); assert.equal(sc.total, 25); assert.equal(sc.unanswered, 5); assert.equal(sc.missed.length, 10); assert.equal(sc.pct, 60);
  assert.equal(Object.values(sc.byDomain).reduce((a, d) => a + d.total, 0), 25);
  let p = E.record({ best: {}, missed: {}, seen: {} }, s, sc); assert.equal(p.best.CTS.pct, 60); assert.equal(p.missed.CTS.length, 10); assert.equal(p.seen.CTS, 25);
  const m = E.assemble('CTS', { mode: 'missed', size: 20, seed: 1, missed: p.missed.CTS }); assert.equal(m.questions.length, 10);
  const all = Object.fromEntries(m.questions.map((q) => [q.id, q.answer])); p = E.record(p, m, E.score(m, all)); assert.equal(p.missed.CTS.length, 0, 'answered right, they leave');
  assert.equal(p.best.CTS.pct, 60, 'a review session is not a practice exam');
  const small = E.assemble('CTS', { mode: 'exam', size: 10, seed: 2 }); const p2 = E.record({ best: {}, missed: {}, seen: {} }, small, E.score(small, Object.fromEntries(small.questions.map((q) => [q.id, q.answer])))); assert.equal(p2.best.CTS, undefined);
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }; E.saveProgress(st, p); assert.deepEqual(E.loadProgress(st), p);
  assert.deepEqual(E.loadProgress({ getItem: () => '{nope', setItem() {} }), { best: {}, missed: {}, seen: {} });
});

test('CE-07 the words', () => {
  const page = fs.readFileSync(path.join(repo, 'apps/demo/src/certs/CertPage.tsx'), 'utf8');
  assert.match(page, /Unofficial study material/); assert.match(page, /not affiliated with or endorsed by AVIXA/); assert.match(page, /no question here is from an AVIXA exam/); assert.match(page, /not a credential and does not predict a result/);
  assert.match(page, /does not convert to it/);
  const all = IDS.flatMap((id) => E.BANKS[id]).map((q) => `${q.stem} ${q.options.join(' ')} ${q.why}`).join(' ');
  assert.doesNotMatch(all, /AON|Kraft|Stefanini|KHC/); assert.doesNotMatch(all, /guaranteed? (to )?pass/i);
});
