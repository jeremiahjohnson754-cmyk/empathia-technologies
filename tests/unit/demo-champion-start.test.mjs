// A Site Champion's first weeks (apps/demo/src/champion/start.ts and the two store actions). Founder, 11 Nov 2026: the Site Champion
// has its own "profile, onboarding, training". Held here: the lessons never tell anyone to open equipment, touch power or climb; the
// check is marked in the store and the safety question must be right; "read" is the champion's own word, once; the list is read from
// the record; stored state is untrusted; no other role has the page or either action; nothing here grants a permission.
//   node --test tests/unit/demo-champion-start.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-champion-start-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as C from './champion/store.ts'; export * as T from './champion/start.ts'; export * as G from './champion/recognition.ts'; export * as N from './campus/canon.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as B from './build/store.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { C, T, G, N, W, P, R, B } = await import(pathToFileURL(out).href);
const SC = 'sitechamp'; const SITE = P.CHAMPION_SITES[0]; const others = P.ROLE_KEYS.filter((k) => k !== SC); const rooms = N.roomsIn(SITE);
const fresh = () => { mem.clear(); return W.seed(); };
const right = T.CHECK.map((q) => q.answer); const lines = (w, type) => w.events.filter((e) => e.type === type);
const readAll = (w) => { for (const l of T.LESSONS) C.markRead(w, SC, l.id); };
const LINKS = { site: '#/site', docs: '#/docs/x', profile: null };

test('CS-01 six lessons and six questions; no lesson tells anyone to open equipment, touch power, climb or get past a lock, and none carries a code', () => {
  assert.equal(T.LESSONS.length, 6); assert.equal(T.CHECK.length, 6); assert.equal(new Set(T.LESSONS.map((l) => l.id)).size, 6);
  const risky = /\b(open (a|the) (rack|cabinet|equipment)|unplug|climb|mains|bypass|get past)\b/i;
  for (const l of T.LESSONS) for (const p of l.points) for (const s of p.split(/(?<=[.:])\s+/)) if (risky.test(s)) assert.match(s, /^(Do not|Never)\b/, `${l.id}: “${s}”`);
  assert.ok(T.LESSONS.find((l) => l.id === 'safety').points.some((p) => /^Do not open a rack/.test(p)));
  const all = JSON.stringify([T.LESSONS, T.CHECK]); assert.ok(!/\b\d{4,}\b/.test(all), 'no code-like number'); assert.ok(!/certif|qualified to|licen[cs]ed/i.test(all), 'claims no qualification');
  for (const q of T.CHECK) { assert.ok(q.options.length >= 3 && q.answer >= 0 && q.answer < q.options.length && q.why.length > 40, q.id); }
  assert.deepEqual(T.CHECK.filter((q) => q.required).map((q) => q.id), ['q-safety']);
  // the right answer is not always in the same place
  assert.ok(new Set(right).size >= 3);
});

test('CS-02 marking: only one whole-number choice per question is an answer; five of six pass only with the safety question right', () => {
  for (const bad of [null, 'x', [], right.slice(0, 5), [...right, 0], right.map(String), right.map((a, i) => (i === 0 ? 9 : a)), right.map((a, i) => (i === 0 ? -1 : a)), right.map((a, i) => (i === 0 ? 0.5 : a))]) assert.equal(T.mark(bad), null, JSON.stringify(bad));
  assert.deepEqual(T.mark(right), { score: 6, of: 6, wrong: [], passed: true });
  const flip = (ids) => right.map((a, i) => (ids.includes(T.CHECK[i].id) ? (a + 1) % T.CHECK[i].options.length : a));
  assert.equal(T.mark(flip(['q-report'])).passed, true); assert.equal(T.mark(flip(['q-report'])).score, 5);
  const s = T.mark(flip(['q-safety'])); assert.equal(s.score, 5); assert.equal(s.passed, false, 'five right but the safety question wrong does not pass'); assert.deepEqual(s.wrong, ['q-safety']);
  assert.equal(T.mark(flip(['q-report', 'q-note'])).passed, false);
});

test('CS-03 “I have read this” is the champion’s own word, once: refused to every other role with a ledger line, idempotent, and it changes nothing else', () => {
  for (const r of others) { const w = fresh(); const x = C.markRead(w, r, 'role'); assert.ok(x.why, r); assert.equal(lines(w, 'site.start_read').at(-1)?.outcome, 'DENIED', r); assert.deepEqual(C.championView(w).start.read, {}); }
  const w = fresh(); const before = JSON.stringify({ ...w, events: undefined, ch: undefined });
  assert.ok(C.markRead(w, SC, 'nope').why); assert.deepEqual(C.markRead(w, SC, 'role'), { ok: true }); assert.deepEqual(C.markRead(w, SC, 'role'), { ok: true });
  assert.equal(lines(w, 'site.start_read').length, 1); assert.match(lines(w, 'site.start_read')[0].detail, /“What a champion is for” as read \(their own word; it grants nothing\)/);
  assert.equal(JSON.stringify({ ...w, events: undefined, ch: undefined }), before, 'nothing but the champion’s own record and the ledger changed');
  for (const a of ['test.verify', 'customer.accept', 'service.triage', 'room.design']) assert.equal(B.holds(B.personaOf(SC), a), false);
});

test('CS-04 the check is marked in the store: refused until the six lessons are read, refused to other roles, recorded as a count with the try number', () => {
  const w = fresh(); const early = C.answerCheck(w, SC, right); assert.match(early.why[0], /Read the lessons first: 6 of 6 are not marked as read/); assert.equal(C.championView(w).start.check, null);
  readAll(w); assert.ok(C.answerCheck(w, SC, [0, 0]).why); assert.equal(lines(w, 'site.start_checked').length, 0);
  const wrongSafety = right.map((a, i) => (T.CHECK[i].id === 'q-safety' ? 0 : a)); const a = C.answerCheck(w, SC, wrongSafety); assert.equal(a.passed, false); assert.equal(a.score, 5);
  const b = C.answerCheck(w, SC, right); assert.equal(b.passed, true); assert.equal(b.score, 6);
  const v = C.championView(w).start; assert.equal(v.tries, 2); assert.equal(v.check.passed, true);
  const led = lines(w, 'site.start_checked'); assert.equal(led.length, 2); // was: the ledger line carried the score. A person's result is theirs: the ledger now says only that the check was taken (founder §15: no private performance information)
  assert.ok(led.every((e) => /check was taken \(try [12]\)\. The result is the champion’s own and is not written here/.test(e.detail))); assert.ok(!led.some((e) => /\d of 6|passed/.test(e.detail)), 'no result in the ledger');
  for (const r of others) { const x = fresh(); assert.ok(C.answerCheck(x, r, right).why, r); assert.equal(lines(x, 'site.start_checked').at(-1)?.outcome, 'DENIED', r); }
});

test('CS-05 the list is read from the record: each step is done only when the record, or the champion’s own word, says so', () => {
  const w = fresh(); const view = (waiting = 1) => T.startView(C.championView(w), rooms.length, waiting, LINKS); const done = () => view().steps.filter((s) => s.done).map((s) => s.id);
  assert.deepEqual(done(), []); assert.equal(view().total, 6); assert.equal(view().steps.find((s) => s.id === 'walk').evidence, `0 of ${rooms.length} rooms checked on site`);
  readAll(w); assert.deepEqual(done(), ['lessons']); C.answerCheck(w, SC, right); assert.deepEqual(done(), ['lessons', 'check']);
  C.verifyRoom(w, SC, rooms[0].id, ''); assert.deepEqual(done(), ['lessons', 'check', 'walk']);
  C.contribute(w, SC, rooms[0].id, 'The blinds must be down after three or the camera is washed out.'); assert.ok(done().includes('note'));
  C.markRead(w, SC, 'support'); assert.ok(done().includes('support')); assert.equal(view(1).complete, false, 'a document still waits');
  assert.equal(view(0).complete, true); assert.equal(view(0).done, 6);
  const hidden = view(null).steps.find((s) => s.id === 'read'); assert.equal(hidden.done, false); assert.equal(hidden.href, null);
  for (const s of view().steps) assert.ok(['record', 'you'].includes(s.by) && s.evidence.length > 3, s.id);
  assert.deepEqual(view().steps.filter((s) => s.by === 'you').map((s) => s.id), ['lessons', 'support']);
});

test('CS-06 stored state is untrusted: unknown ids, bad dates and a check whose numbers do not agree are dropped; a low score never reads as passed', () => {
  const w = fresh(); w.ch = { verified: {}, occupancy: {}, notes: [], start: { read: { role: '2026-11-10T09:00:00Z', admin: '2026-11-10T09:00:00Z', report: 'yesterday', safety: 7 }, check: { at: '2026-11-10T09:00:00Z', score: 3, of: 6, passed: true }, tries: -4 } };
  const s = C.championView(w).start; assert.deepEqual(Object.keys(s.read), ['role']); assert.equal(s.check.passed, false); assert.equal(s.tries, 1);
  for (const bad of [{ at: 1, score: 6, of: 6, passed: true }, { at: 'not a date', score: 6, of: 6, passed: true }, { at: '2026-11-10T09:00:00Z', score: 7, of: 6, passed: true }, { at: '2026-11-10T09:00:00Z', score: 6, of: 60, passed: true }, 'passed', []]) { w.ch.start = { read: {}, check: bad, tries: 0 }; assert.equal(C.championView(w).start.check, null, JSON.stringify(bad)); }
  w.ch = 'broken'; assert.deepEqual(C.championView(w).start, { read: {}, check: null, tries: 0 });
  delete w.ch; w.ch = { verified: {}, occupancy: {}, notes: [] }; assert.deepEqual(C.markRead(w, SC, 'role'), { ok: true }, 'a workspace saved before this slice still works');
});

test('CS-07 the page and both actions belong to the Site Champion alone, across the sixteen roles', () => {
  const page = R.resolve('#/site/start'); assert.ok(page, 'registered'); assert.equal(R.resolve('#/site').page.id, 'site');
  for (const r of P.ROLE_KEYS) assert.equal(P.canOpen(r, page), r === SC, r);
  assert.deepEqual(page.page.actions.map((a) => a.id), ['site.start.read', 'site.start.check']);
  for (const a of page.page.actions) for (const r of P.ROLE_KEYS) assert.equal(P.allows(a.authority, r), r === SC, `${a.id} ${r}`);
});

test('CS-08 recognition and handover are read from the record as counts and open things: no score, no rating, no check result, and nothing a role did not do', () => {
  const w = fresh(); const zero = G.contributions(w, 0); assert.deepEqual(zero.map((x) => x.id), ['checked', 'access', 'reports', 'notes', 'approved']); const base = Object.fromEntries(zero.map((x) => [x.id, x.n])); assert.deepEqual([base.checked, base.notes, base.approved, base.reports], [0, 0, 0, 0]); assert.equal(base.access, 1, 'the seeded estate has one finished visit whose access the site champion confirmed'); assert.ok(zero.every((x) => x.from.length > 8));
  C.verifyRoom(w, SC, rooms[0].id, ''); C.verifyRoom(w, SC, rooms[1].id, ''); C.contribute(w, SC, rooms[0].id, 'The blinds must be down after three or the camera is washed out.');
  const wo = w.workOrders.find((x) => x.buildingKey === SITE && !['DONE', 'CANCELLED'].includes(x.state) && !x.access); if (wo) C.confirmAccess(w, SC, wo.id);
  readAll(w); C.answerCheck(w, SC, T.CHECK.map(() => 0));
  const by = Object.fromEntries(G.contributions(w, 5).map((x) => [x.id, x.n])); assert.equal(by.checked, 2); assert.equal(by.notes, 1); assert.equal(by.access, base.access + (wo ? 1 : 0)); assert.equal(by.approved, 1, 'never more approved than written');
  assert.ok(!/score|rating|rank|passed|of 6/i.test(JSON.stringify(G.contributions(w, 1))), 'the check is not part of recognition');
  const h = G.handover(w, SITE, 0); assert.equal(h.notesWaiting, 1); assert.equal(h.nothing, false); assert.ok(h.open.every((x) => /^INC-|^[A-Z]+-\d+: /.test(x))); assert.ok(!h.toConfirm.some((x) => wo && x.startsWith(wo.id)), 'a visit whose access was confirmed is not waiting');
  const clear = fresh(); clear.workOrders = []; clear.incidents = []; assert.deepEqual(G.handover(clear, SITE, 0), { toConfirm: [], open: [], notesWaiting: 0, nothing: true });
  assert.deepEqual(G.handover(w, 'NOPE', 1).open, [], 'another site’s open things are not this one’s');
});
