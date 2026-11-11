// The SIGNAL learning content at the founder's build-package revision (packages/signal-canon/data/app-data.json and gates.json),
// carried unchanged. Founder, 11 Nov 2026: "Restore all authored SIGNAL seasons, chapters, panels, scenarios, progression systems,
// learning tools ... Preserve narrative content exactly." Held here: the counts are the package's own; every interactive piece a
// chapter carries exists in the bundle; every gate in reading order points at something real; nothing the earlier library held has
// been lost. The byte-for-byte hold is signal-canon.test.mjs (SC-01). This file proves the data is whole; it does not prove that a
// page plays it (docs/restoration/SIGNAL_INVENTORY.md says which do).
//   node --test tests/unit/signal-library.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const data = path.join(repo, 'packages/signal-canon/data');
const J = (p) => JSON.parse(fs.readFileSync(path.join(data, p), 'utf8'));
const A = J('app-data.json'); const gates = J('gates.json'); const stats = J('stats.json'); const index = J('story/index.json');
const items = index.flatMap((c) => J(`story/${c.id}.json`).items.map((i) => ({ ...i, chapter: c.id })));
const SET = { quiz: 'quizzes', lesson: 'lessons', drill: 'drills', incident: 'incidents', lab: 'labs', boss: 'bosses', meltdown: 'meltdowns' };
const count = (list, key) => list.reduce((m, x) => { m[key(x)] = (m[key(x)] || 0) + 1; return m; }, {});
const has = (kind, id) => (kind === 'review' ? /^S([1-9]|1[0-2])$/.test(id) && !!A.seasons[id.slice(1)] : !!A[SET[kind]]?.[id]);

test('SL-01 the bundle holds what the package says it holds, set by set', () => {
  const n = (k) => Object.keys(A[k]).length;
  assert.equal(n('lessons'), stats.lessons); assert.equal(n('quizzes'), stats.quizzes); assert.equal(n('quizzes'), 693);
  assert.equal(Object.values(A.quizzes).reduce((s, q) => s + q.qs.length, 0), stats.quiz_questions); assert.equal(stats.quiz_questions, 2105);
  assert.equal(n('drills'), stats.drills); assert.deepEqual(count(Object.values(A.drills), (d) => d.type), stats.drill_types);
  assert.equal(n('labs'), stats.labs); assert.deepEqual(count(Object.values(A.labs), (l) => l.type), stats.lab_types);
  assert.equal(n('incidents'), stats.incidents); assert.equal(n('cases'), stats.cases); assert.equal(n('meltdowns'), stats.meltdowns); assert.equal(n('bosses'), stats.boss_levels);
  assert.equal(A.glossary.length, stats.glossary_terms); assert.equal(n('formulas'), stats.formulas); assert.equal(n('plates'), stats.fieldbook_plates); assert.equal(n('discoveries'), stats.discoveries); assert.equal(n('quests'), stats.quests);
  assert.equal(A.chapters.length, stats.chapters); assert.equal(n('seasons'), stats.seasons); assert.equal(Object.values(A.decisionIndex).reduce((s, d) => s + d.length, 0), stats.decisions);
  assert.equal(A.timeline.length, stats.quick_facts_in_learn); assert.equal(n('sysmaps'), 12); assert.equal(A.explorers.length, 4); assert.equal(A.askOffline.length, 20); assert.equal(A.roles.length, 5);
  assert.deepEqual([n('lessons'), n('drills'), n('labs'), n('incidents'), n('cases'), n('meltdowns'), n('bosses'), n('formulas'), A.glossary.length, n('plates')], [161, 146, 91, 121, 62, 5, 12, 125, 522, 160]);
});

test('SL-02 the orders the product shows things in are complete: each is every id of its set, once', () => {
  for (const [order, set] of [['lessonOrder', 'lessons'], ['drillOrder', 'drills'], ['labOrder', 'labs'], ['incidentOrder', 'incidents'], ['caseOrder', 'cases'], ['meltdownOrder', 'meltdowns']]) {
    assert.equal(new Set(A[order]).size, A[order].length, order); assert.deepEqual([...A[order]].sort(), Object.keys(A[set]).sort(), order); }
  for (const l of Object.values(A.lessons)) assert.ok(A.lessonDomains.includes(l.domain), l.domain);
});

test('SL-03 every interactive piece a chapter carries exists in the bundle: 747 mounted between panels and 232 after a twist', () => {
  const mounts = items.filter((i) => i.type === 'mount'); const twists = items.filter((i) => i.type === 'twist');
  assert.equal(mounts.length, 747); assert.deepEqual(count(mounts, (m) => m.kind), { lesson: 148, quiz: 246, drill: 128, incident: 121, lab: 75, review: 12, boss: 12, meltdown: 5 });
  assert.equal(twists.length, stats.twists); assert.deepEqual(count(twists, (t) => t.test_kind), { quiz: 224, drill: 8 });
  for (const m of mounts) assert.ok(has(m.kind, m.id), `${m.chapter}: ${m.kind} ${m.id} is mounted and is not in the bundle`);
  for (const t of twists) assert.ok(has(t.test_kind, t.test_id), `${t.chapter}: the twist’s ${t.test_kind} ${t.test_id} is not in the bundle`);
  assert.equal(mounts.length + twists.length, 979);
});

test('SL-04 the gate list is every gate in reading order: 1,366, each pointing at a decision or a piece that exists, in its own chapter', () => {
  assert.equal(gates.length, 1366); assert.deepEqual(count(gates, (g) => g.tier), stats.gates); assert.deepEqual(stats.gates, { hard: 537, soft: 488, opt: 341 });
  assert.deepEqual(count(gates, (g) => g.kind), { decision: 387, quiz: 470, lesson: 148, drill: 136, incident: 121, lab: 75, review: 12, boss: 12, meltdown: 5 });
  const decisions = new Set(items.filter((i) => i.type === 'decision').map((d) => `${d.chapter}:${d.id}`)); const chapters = new Set(index.map((c) => c.id));
  for (const g of gates) { assert.ok(chapters.has(g.chapter), g.chapter); if (g.kind === 'decision') assert.ok(decisions.has(`${g.chapter}:${g.id}`), `${g.chapter}: decision ${g.id}`); else assert.ok(has(g.kind, g.id), `${g.chapter}: ${g.kind} ${g.id}`); }
  // what the story cannot go on without, in the source: every decision, and 150 pieces
  const hard = gates.filter((g) => g.tier === 'hard'); assert.deepEqual(count(hard, (g) => g.kind), { decision: 387, drill: 79, lab: 42, review: 12, boss: 12, meltdown: 5 });
  assert.equal(gates.filter((g) => g.twist).length, 232); assert.ok(gates.filter((g) => g.twist).every((g) => g.tier === 'soft'));
  for (let i = 1; i < gates.length; i++) if (gates[i].chapter === gates[i - 1].chapter) assert.ok(gates[i].index > gates[i - 1].index, `${gates[i].chapter}: gates are in reading order`);
});

test('SL-05 the content’s own cross-references hold: a lesson’s quiz, a case’s incident and quiz, a boss and a review for each season', () => {
  for (const [id, l] of Object.entries(A.lessons)) { assert.ok(l.cards.length >= 1, id); if (l.quiz) assert.ok(A.quizzes[l.quiz], `${id} → ${l.quiz}`); for (const p of l.plates || []) assert.ok(A.plates[String(p)], `${id}: plate ${p}`); }
  for (const [id, c] of Object.entries(A.cases)) { if (c.incident) assert.ok(A.incidents[c.incident], `${id} → ${c.incident}`); if (c.quiz) assert.ok(A.quizzes[c.quiz], `${id} → ${c.quiz}`); }
  for (const [id, q] of Object.entries(A.quizzes)) { assert.ok(q.title && q.qs.length >= 1, id); }
  assert.deepEqual(Object.keys(A.bosses).sort(), Array.from({ length: 12 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`)); for (const [id, b] of Object.entries(A.bosses)) { assert.equal(`S${String(b.se).padStart(2, '0')}`, id); assert.ok(b.steps.length >= 3 && b.win && b.lose, id); }
  for (const [id, m] of Object.entries(A.meltdowns)) { assert.equal(m.id, id); assert.ok(A.seasons[String(m.season)], id); }
  for (const k of Object.keys(A.tierOf)) { const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)]; assert.ok(kind === 'case' ? A.cases[id] : has(kind, id), `tierOf names ${k}`); }
  for (const d of Object.values(A.discoveries)) assert.ok(A.chapters.some((c) => c.id === d.ch) || /^pro\d\d$/.test(d.ch), `discovery in ${d.ch}`);
});

test('SL-06 nothing the earlier library held is lost: every id it has is in the bundle', () => {
  const old = JSON.parse(fs.readFileSync(path.join(repo, 'packages/domain-data/data/SIGNAL_LIB.json'), 'utf8'));
  for (const set of ['lessons', 'quizzes', 'labs', 'drills', 'incidents', 'cases', 'formulas']) for (const id of Object.keys(old[set])) assert.ok(A[set][id], `${set} ${id}`);
  const terms = new Set(A.glossary.map((g) => g.id)); for (const g of old.glossary) assert.ok(terms.has(g.id), g.id);
  assert.equal(Object.keys(A.quizzes).length - Object.keys(old.quizzes).length, 470, 'the quizzes the earlier library lacked');
});

test('SL-07 the bundle names no real organisation the project must not name, and carries its review flags', () => {
  const text = JSON.stringify(A);
  assert.equal(/\b(AON|Aon|Kraft|Heinz|Stefanini|KHC)\b/.test(text), false);
  assert.equal(/\b(Shure|Crestron|Q-SYS|Biamp|Extron|Cisco|Polycom|Logitech|Microsoft|Webex|Sennheiser|Yamaha|Sony|Panasonic|Samsung|Barco|Epson|Audinate|Netgear)\b/.test(text), false, 'a real maker is named');
  assert.ok(Object.values(A.lessons).every((l) => typeof l.flag === 'string' && l.flag.length > 0), 'each lesson carries its review flag: the content is a draft and says so');
  assert.equal(Object.keys(J('flags.json')).length, stats.review_flags);
});
