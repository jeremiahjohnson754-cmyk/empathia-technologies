// The IT Onboarding Success Guide (apps/demo/src/onboard). Founder, 11 Nov 2026, §08 Product A: "an organization-specific professional
// onboarding and development program" in four distinct editions; "Use only permitted tenant-specific information"; "No universal
// public version should expose one company's internal systems." Held here: the programme covers the founder's list and holds no
// tenant detail; personalisation comes from records and is never invented; each item is done only by whoever it names; checks are
// marked in the store; a milestone is derived; a person's progress is shown only to them, their manager and (in part) their mentor;
// publishing keeps the earlier revision; stored state is untrusted. The programme is a DRAFT and makes no claim of qualification.
//   node --test tests/unit/demo-onboard.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }; globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-onboard-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as G from './onboard/program.ts'; export * as O from './onboard/store.ts'; export * as R from './onboard/roles.ts'; export * as F from './onboard/profile.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as D from './connect/directory.ts'; export * as N from './campus/canon.ts'; export * as PG from './registry.pages.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { G, O, R, F, W, P, D, N, PG } = await import(pathToFileURL(out).href);
const fresh = () => { mem.clear(); return W.seed(); }; const lines = (w, type) => w.events.filter((e) => e.type === type);
const rightFor = (id) => G.checkById(id).questions.map((q) => q.answer); const FIVE = Object.fromEntries(G.COMPETENCIES.map((c) => [c.id, 1]));
const NOTE = 'Agreed: shadow two more visits, then take a job alone.';

test('OB-01 the programme covers the founder’s list: six phases from before day one to day ninety, every topic, checks, rubrics, reviews, four editions', () => {
  assert.deepEqual(G.PHASES.map((p) => p.id), ['pre', 'day1', 'week1', 'month1', 'day60', 'day90']); assert.ok(G.ITEMS.length >= 30); assert.equal(new Set(G.ITEMS.map((i) => i.id)).size, G.ITEMS.length);
  for (const p of G.PHASES) assert.ok(G.ITEMS.some((i) => i.phase === p.id), p.id);
  for (const t of Object.keys(G.TOPICS)) assert.ok(G.ITEMS.some((i) => i.topic === t), `no item for ${t}`);
  for (const k of ['learn', 'meet', 'do', 'exercise', 'review']) assert.ok(G.ITEMS.some((i) => i.kind === k), k);
  assert.deepEqual(G.REVIEWS, ['w1-review', 'm1-review', 's1-review', 'n1-review'], 'a first-week conversation and the 30/60/90-day reviews'); assert.ok(G.ITEMS.filter((i) => i.rubric).length >= 6);
  assert.ok(G.ITEMS.filter((i) => i.confirm === 'mentor').length >= 4, 'mentor participation'); assert.ok(G.ITEMS.filter((i) => i.confirm === 'manager').length >= 8, 'manager milestones');
  for (const i of G.ITEMS) { assert.ok(i.title.length > 12 && i.why.length > 20, i.id); if (i.confirm === 'check') assert.ok(G.checkById(i.check), i.id); if (i.owner) assert.equal(i.confirm, i.owner, `${i.id}: an owner’s own task is confirmed by that owner`); if (i.kind === 'review') assert.equal(i.confirm, 'manager'); }
  assert.equal(G.CHECKS.length, 6); for (const c of G.CHECKS) { assert.ok(G.ITEMS.some((i) => i.check === c.id), c.id); for (const q of c.questions) assert.ok(q.options.length === 3 && q.answer >= 0 && q.answer < 3 && q.why.length > 40); }
  assert.ok(new Set(G.CHECKS.flatMap((c) => c.questions.map((q) => q.answer))).size === 3, 'the right answer is not always in the same place');
  assert.deepEqual(Object.keys(G.EDITIONS), ['employee', 'manager', 'mentor', 'administrator']);
  assert.equal(G.EDITIONS.employee.holds, 'What to learn, whom to meet, what to do, and how to succeed.'); assert.equal(G.EDITIONS.manager.holds, 'Milestones, approvals, access readiness, assignment expectations, and progress.');
  assert.equal(G.EDITIONS.mentor.holds, 'Coaching plans, demonstrations, technical exercises, and feedback.'); assert.equal(G.EDITIONS.administrator.holds, 'Tenant-specific publishing, version control, localization, and reporting.');
  assert.equal(G.COMPETENCIES.length, 5); assert.deepEqual([...G.RATINGS], ['Not yet', 'With help', 'Independently']); assert.deepEqual([...G.PATHWAY_EXAMPLES], ['CTS (AVIXA)', 'CAPM (PMI)', 'CompTIA Network+']);
});

test('OB-02 the programme holds no tenant detail and makes no claim: no organisation, person, building or room is named; nothing says certified or guaranteed; nothing unsafe is told', () => {
  const text = JSON.stringify([G.PHASES, G.ITEMS, G.CHECKS, G.COMPETENCIES, G.EDITIONS]);
  const names = [...D.people().flatMap((p) => p.name.split(' ')), ...N.BUILDINGS.map((b) => b.name), ...N.BUILDINGS.map((b) => b.short), 'Northstar', 'Atlas', 'Empathia'].filter((x) => x && x.length > 3);
  for (const n of new Set(names)) assert.ok(!new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text), `the programme names “${n}”`);
  assert.ok(!/\bR-[A-Z]{3}-\d/.test(text)); assert.ok(!/certified|guarantee|accredited|qualif(y|ies) you/i.test(text));
  const risky = /\b(open (a|the) (rack|cabinet)|unplug|mains|climb|bypass)\b/i; for (const i of G.ITEMS) assert.ok(!risky.test(`${i.title} ${i.why} ${(i.rubric || []).join(' ')}`), i.id);
  const src = fs.readFileSync(path.join(repo, 'apps/demo/src/onboard/program.ts'), 'utf8'); assert.match(src, /DRAFT\./); assert.ok(!/from '\.\.\/(connect|campus|knowledge|workspace)/.test(src), 'the programme imports no tenant record');
});

test('OB-03 personalisation comes from records and is never invented: what the organisation has not provided is null, and says who provides it', () => {
  const p = F.profile(); assert.equal(p.tenant, 'Northstar'); assert.equal(p.starterRole, 'service'); assert.ok(p.starter && p.manager && p.mentor && p.champion, 'the directory names each of them');
  assert.equal(p.manager.role, 'svcmgr'); assert.equal(p.mentor.role, 'syseng'); assert.ok(p.manager.buildings.includes(p.site) && p.mentor.buildings.includes(p.site)); assert.equal(p.rooms, N.roomsIn(p.site).length);
  assert.deepEqual(p.fields.map((f) => f.id), ['employer', 'role', 'department', 'locations', 'reporting', 'mentor', 'contacts', 'software', 'standards', 'training', 'equipment', 'access', 'vendors', 'hr'], 'the founder’s twelve kinds of information, with the mentor and vendors');
  const recorded = p.fields.filter((f) => f.value !== null).map((f) => f.id); assert.deepEqual(recorded, ['employer', 'role', 'locations', 'reporting', 'mentor', 'contacts']);
  for (const f of p.fields) { assert.ok(f.from.length > 8, f.id); if (f.value === null) assert.match(f.from, /administrator provides it|none is listed here/, f.id); }
  assert.match(F.fieldOf(p, 'employer').value, /synthetic organisation/); assert.equal(F.fieldOf(p, 'reporting').value, `${p.manager.name}, ${p.manager.title}`);
  for (const i of G.ITEMS.filter((x) => x.needs)) assert.ok(F.fieldOf(p, i.needs), `${i.id} needs a field the profile has`);
  for (const i of G.ITEMS.filter((x) => x.place)) { const h = F.placeHref(i.place, p); assert.ok(h === null || /^#\//.test(h), i.id); if (h) assert.ok(PG.resolve(h.split('?')[0]), `${i.id} → ${h} is a registered page`); }
  assert.equal(F.placeHref('people-manager', { ...p, manager: null }), null, 'no record, no link');
});

test('OB-04 who holds which edition: technical staff read the programme; each other edition is its holder’s; nobody outside is admitted', () => {
  assert.deepEqual(R.editionsFor('service'), ['employee']); assert.deepEqual(R.editionsFor('svcmgr'), ['employee', 'manager']); assert.deepEqual(R.editionsFor('syseng'), ['employee', 'mentor']);
  assert.deepEqual(R.editionsFor('steward'), ['employee', 'administrator']); assert.deepEqual(R.editionsFor('architect'), ['employee', 'administrator']);
  for (const r of ['visitor', 'employee', 'exec', 'sitechamp', 'bpm', 'ipm', 'qa']) assert.deepEqual(R.editionsFor(r), [], r);
  for (const r of P.rolesFor({ area: 'learn' })) assert.ok(R.editionsFor(r).includes('employee'), r);
  assert.deepEqual(P.ROLE_KEYS.map((r) => R.seesProgress(r)).filter((x) => x === 'own').length, 1); assert.equal(R.seesProgress('service'), 'own'); assert.equal(R.seesProgress('svcmgr'), 'manager'); assert.equal(R.seesProgress('syseng'), 'mentor'); assert.equal(R.seesProgress('steward'), 'counts'); assert.equal(R.seesProgress('installer'), 'none');
});

test('OB-05 an item is done only by whoever it names, across every item and all sixteen roles; refusals are in the ledger; a check item is never ticked', () => {
  for (const it of G.ITEMS.filter((i) => i.kind !== 'review')) for (const role of P.ROLE_KEYS) { const w = fresh(); const r = O.completeItem(w, role, it.id, 'Feedback: clear order, good notes.');
    const should = it.confirm === 'self' ? role === 'service' : it.confirm === 'mentor' ? role === 'syseng' : it.confirm === 'manager' ? role === 'svcmgr' : false;
    assert.equal(!r.why, should, `${it.id} by ${role}`); assert.equal(!!O.obView(w).done[it.id], should, `${it.id} by ${role}`); if (!should) assert.equal(lines(w, 'onboard.item_done').at(-1)?.outcome, 'DENIED', `${it.id} by ${role}`); }
  const w = fresh(); assert.match(O.completeItem(w, 'service', 'd1-mentor').why[0], /is confirmed by the mentor\. The .* cannot say it is done/); assert.match(O.completeItem(w, 'svcmgr', 'pre-welcome').why[0], /confirmed by the starter/);
  assert.match(O.completeItem(w, 'service', 'd1-security').why[0], /done by passing its check\. Nobody ticks it/); assert.match(O.completeItem(w, 'svcmgr', 'm1-review').why[0], /recorded with its ratings/); assert.ok(O.completeItem(w, 'service', 'nope').why);
  assert.deepEqual(O.completeItem(w, 'service', 'pre-welcome'), { ok: true }); assert.deepEqual(O.completeItem(w, 'service', 'pre-welcome'), { ok: true }); assert.equal(lines(w, 'onboard.item_done').filter((e) => e.outcome === 'ALLOWED').length, 1, 'once');
  assert.ok(O.completeItem(w, 'syseng', 'w1-shadow', 'x'.repeat(301)).why); assert.match(O.completeItem(w, 'syseng', 'w1-shadow', '').why[0], /An exercise is confirmed with its feedback/); assert.deepEqual(O.completeItem(w, 'syseng', 'd1-mentor'), { ok: true }, 'a meeting needs no feedback'); O.completeItem(w, 'syseng', 'w1-shadow', 'Showed the order: power, source, sound, far end.'); assert.match(lines(w, 'onboard.item_done')[0].detail, /confirmed by the mentor · Showed the order/);
});

test('OB-06 a check is marked in the store, taken only by the starter, passed only with every answer right, and passing is what completes its item', () => {
  for (const role of P.ROLE_KEYS.filter((r) => r !== 'service')) { const w = fresh(); assert.ok(O.takeCheck(w, role, 'security', rightFor('security')).why, role); assert.equal(lines(w, 'onboard.check_taken').at(-1)?.outcome, 'DENIED'); assert.deepEqual(O.obView(w).checks, {}); }
  const w = fresh(); for (const bad of [null, [], [0], [0, 9], ['0', '1'], [0.5, 1]]) assert.ok(O.takeCheck(w, 'service', 'security', bad).why, JSON.stringify(bad)); assert.ok(O.takeCheck(w, 'service', 'nope', [0, 0]).why);
  const right = rightFor('security'); const one = [right[0], (right[1] + 1) % 3]; const a = O.takeCheck(w, 'service', 'security', one); assert.equal(a.passed, false); assert.equal(a.score, 1); assert.deepEqual(a.wrong, [1]); assert.ok(!O.obView(w).done['d1-security']);
  const b = O.takeCheck(w, 'service', 'security', right); assert.equal(b.passed, true); assert.ok(O.obView(w).done['d1-security'], 'passing completes the item'); assert.equal(O.obView(w).checks.security.tries, 2);
  // was: the ledger line carried the score. A person's result is shown to them and their manager only
  assert.match(lines(w, 'onboard.check_taken')[0].detail, /Check “Security basics” was taken \(try 2\)\. The result is shown to the starter and their manager and is not written here/); assert.ok(!lines(w, 'onboard.check_taken').some((e) => /\d of \d|passed/.test(e.detail)), 'no result in the ledger');
  O.takeCheck(w, 'service', 'security', one); assert.ok(!O.obView(w).done['d1-security'], 'a later failed try is the record: the item is open again');
});

test('OB-07 a review is the manager’s, with five ratings and a note; nobody rates themselves; a milestone is derived from the record, never clicked', () => {
  for (const role of P.ROLE_KEYS.filter((r) => r !== 'svcmgr')) { const w = fresh(); const r = O.recordReview(w, role, 'm1-review', FIVE, NOTE); assert.ok(r.why, role); assert.equal(lines(w, 'onboard.review_recorded').at(-1)?.outcome, 'DENIED'); }
  let w = fresh(); assert.match(O.recordReview(w, 'service', 'm1-review', FIVE, NOTE).why[0], /nobody rates themselves/);
  assert.match(O.recordReview(w, 'svcmgr', 'm1-review', { ...FIVE, safe: 5 }, NOTE).why[0], /Give a rating for “Works safely and within the role”/); assert.ok(O.recordReview(w, 'svcmgr', 'm1-review', FIVE, 'ok').why); assert.ok(O.recordReview(w, 'svcmgr', 'd1-signin', FIVE, NOTE).why);
  assert.deepEqual(O.recordReview(w, 'svcmgr', 'm1-review', FIVE, NOTE), { ok: true }); let ph = O.phases(O.obView(w)).find((p) => p.phase === 'month1'); assert.equal(ph.reviewed, true); assert.equal(ph.met, false, 'a review alone does not meet a milestone');
  assert.ok(!/Agreed/.test(lines(w, 'onboard.review_recorded')[0].detail), 'the note is not copied into the ledger');
  // do the whole programme, each act by the role it belongs to
  w = fresh(); for (const it of G.ITEMS) { if (it.kind === 'review') O.recordReview(w, 'svcmgr', it.id, FIVE, NOTE); else if (it.confirm === 'check') O.takeCheck(w, 'service', it.check, rightFor(it.check)); else O.completeItem(w, it.confirm === 'self' ? 'service' : it.confirm === 'mentor' ? 'syseng' : 'svcmgr', it.id, 'Feedback: clear order, good notes.'); }
  const all = O.phases(O.obView(w)); assert.ok(all.every((p) => p.met)); const rep = O.report(O.obView(w)); assert.deepEqual(rep.items, { done: G.ITEMS.length, total: G.ITEMS.length }); assert.deepEqual(rep.checks, { passed: 6, total: 6 }); assert.deepEqual(rep.reviews, { recorded: 4, total: 4 }); assert.deepEqual(rep.milestones, { met: 6, total: 6 });
  assert.ok(!/Agreed|rating/i.test(JSON.stringify(rep)), 'the report is counts only');
});

test('OB-08 a person’s progress is personal: whole to the starter and their manager, the mentor’s items to the mentor, nothing to anyone else', () => {
  const w = fresh(); O.completeItem(w, 'service', 'pre-welcome', 'Read it on the train.'); O.completeItem(w, 'syseng', 'w1-shadow', 'Showed the order.'); O.takeCheck(w, 'service', 'security', [0, 1]); O.recordReview(w, 'svcmgr', 'w1-review', FIVE, NOTE); const s = O.obView(w);
  assert.deepEqual(O.viewFor('service', s), s); assert.deepEqual(O.viewFor('svcmgr', s), s);
  const m = O.viewFor('syseng', s); assert.deepEqual(m.reviews, {}, 'a mentor is shown no review'); assert.equal(m.done['w1-shadow'].note, 'Showed the order.'); assert.equal(m.done['pre-welcome'].note, '', 'the starter’s own notes stay theirs'); assert.equal(m.checks.security.tries, 0); assert.ok(!/Agreed|train/.test(JSON.stringify(m)));
  for (const role of P.ROLE_KEYS.filter((r) => !['service', 'svcmgr', 'syseng'].includes(r))) { const v = O.viewFor(role, s); assert.deepEqual([v.done, v.checks, v.reviews], [{}, {}, {}], role); assert.ok(!/Agreed|train|Showed/.test(JSON.stringify(v)), role); }
});

test('OB-09 publishing is the administrator’s: a revision with a note and a review date; the earlier one is kept, archived; freshness is said', () => {
  for (const role of P.ROLE_KEYS.filter((r) => !['steward', 'architect'].includes(r))) { const w = fresh(); assert.ok(O.publish(w, role, 'Added the vendor section for this site.').why, role); assert.equal(lines(w, 'onboard.published').at(-1)?.outcome, 'DENIED'); assert.equal(O.obView(w).revisions.length, 1); }
  const w = fresh(); const first = O.obView(w).revisions; assert.equal(first.length, 1); assert.equal(first[0].rev, 1); assert.equal(first[0].state, 'PUBLISHED'); assert.equal(first[0].at, w.seededAt);
  assert.ok(O.publish(w, 'steward', 'short').why); assert.ok(O.publish(w, 'steward', 'Added the vendor section.', 10).why); assert.ok(O.publish(w, 'steward', 'Added the vendor section.', 400).why);
  assert.deepEqual(O.publish(w, 'steward', 'Added the vendor section for this site.', 90), { ok: true, rev: 2 }); const revs = O.obView(w).revisions; assert.deepEqual(revs.map((r) => `${r.rev}:${r.state}`), ['1:ARCHIVED', '2:PUBLISHED']); assert.equal(revs[1].by, 'steward');
  const now = Date.parse(revs[1].at); assert.equal(O.freshnessOf(O.obView(w), now).state, 'CURRENT'); assert.equal(O.freshnessOf(O.obView(w), now + 70 * 864e5).state, 'DUE'); assert.equal(O.freshnessOf(O.obView(w), now + 91 * 864e5).state, 'STALE'); assert.equal(O.freshnessOf(O.obView(w), now).rev.rev, 2);
  assert.match(lines(w, 'onboard.published')[0].detail, /Revision 2 .* published for this organisation; to be reviewed within 90 days/);
});

test('OB-10 stored state is untrusted: unknown items, a tick by the wrong role, a forged pass, a half-rated review and a revision by a non-administrator all read as nothing', () => {
  const w = fresh(); const at = '2026-11-10T09:00:00Z';
  w.ob = { done: { nope: { at, by: 'service' }, 'd1-mentor': { at, by: 'service' }, 'pre-welcome': { at: 'yesterday', by: 'service' }, 'd1-security': { at, by: 'service' }, 'pre-start': { at, by: 'svcmgr', note: 5 }, 'w1-walk': { at, by: 'service', note: 'ok' } },
    checks: { security: { at, score: 9, of: 2, passed: true }, service: { at, score: 1, of: 2, passed: true }, nope: { at, score: 2, of: 2 } }, reviews: { 'm1-review': { at, ratings: { record: 2 }, note: 'x' }, 'd1-signin': { at, ratings: FIVE, note: NOTE }, 'n1-review': { at, ratings: FIVE, note: NOTE } },
    revisions: [{ rev: 7, at, by: 'service', note: 'I published this', reviewBy: at }] };
  const s = O.obView(w); assert.deepEqual(Object.keys(s.done).sort(), ['pre-start', 'w1-walk']); assert.equal(s.done['pre-start'].note, '');
  assert.deepEqual(Object.keys(s.checks), ['service']); assert.equal(s.checks.service.passed, false, 'one of two is not a pass, whatever was stored'); assert.ok(!s.done['w1-jobs']);
  assert.deepEqual(Object.keys(s.reviews), ['n1-review']); assert.equal(s.revisions.length, 1); assert.equal(s.revisions[0].rev, 1); assert.equal(s.revisions[0].by, 'architect', 'a revision by a role that cannot publish is not one: the seeded revision stands');
  for (const bad of [null, 5, 'x', [], { done: 'no', checks: [], reviews: 3, revisions: {} }]) { w.ob = bad; const v = O.obView(w); assert.deepEqual([v.done, v.checks, v.reviews], [{}, {}, {}]); assert.equal(v.revisions.length, 1); }
  assert.equal(O.obView(null).revisions.length, 1);
});
