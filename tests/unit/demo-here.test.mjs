// In this room (apps/demo/src/here; founder, 10 Nov: "Someone walks into an unfamiliar room, opens Empathia, discovers the equipment,
// sees the space in Lite, searches for its support history, identifies an issue, receives guided assistance, and documents the
// outcome"). Everything the page says is recomputed here from the room records and the shared workspace: what a symptom points at is
// equipment the room has, a step never names equipment the room lacks or asks for anything unsafe, and an outcome is written where
// ServiceHands and the room's history read it. Who may see history, codes and who may report are V2.5.3's rules, asked of the policy.
//   node --test tests/unit/demo-here.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-here-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as H from './here/model.ts'; export * as T from './here/store.ts'; export * as D from './campus/design.ts'; export * as K from './campus/canon.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as M from './campus/metrics.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { H, T, D, K, W, P, R, M } = await import(pathToFileURL(out).href);
const recs = D.allRecords(); const REF = 'R-ATL-4-218'; const ref = D.roomRecord(REF);
const hw = (r) => r.positions.filter((p) => !p.furniture); const fresh = () => { mem.clear(); return W.seed(); };

test('HR-01 the room in words is the room in its record: every kind counted, nothing invented, in all 140 rooms', () => {
  assert.equal(recs.length, 140);   // 13 Nov 2026: + V2.5.3's 50 rooms the estate lacked (founder: "use as many of v2.5.3's rooms as you can"): 90 → 140
  for (const r of recs) {
    const kinds = H.kindsOf(r); assert.equal(kinds.reduce((n, k) => n + k.count, 0), hw(r).length, r.outline.id);
    for (const k of kinds) { assert.deepEqual(k.codes, r.positions.filter((p) => p.cat === k.cat).map((p) => p.code)); assert.ok(H.WHAT_IT_DOES[k.cat], `a plain description for ${k.cat}`); }
    const said = H.plainEquipment(r); if (!hw(r).length) { assert.match(said, /No equipment is recorded/); continue; }
    for (const k of kinds.filter((x) => ['display', 'camera', 'speaker', 'touch'].includes(x.cat))) assert.ok(said.includes(k.count === 1 ? `a ${k.label.toLowerCase()}` : `${k.count} `), `${r.outline.id}: ${said}`);
    assert.doesNotMatch(said, /\ba [aeiou]|\ba LED/i, said);
  }
});

test('HR-02 a symptom points only at equipment the room has, in signal order, joined by the room’s own recorded connections', () => {
  for (const r of recs) for (const s of H.SYMPTOMS) {
    const su = H.suspectsOf(r, s, null); const codes = new Set(r.positions.map((p) => p.code));
    for (const p of su.positions) { assert.ok(codes.has(p.code)); assert.ok(!p.furniture); assert.ok(s.path.flat().includes(p.cat), `${s.id}: ${p.cat}`); }
    const order = su.stages.map((g) => s.path.findIndex((cats) => cats.includes(g.positions[0].cat))); assert.deepEqual(order, [...order].sort((a, b) => a - b), `${r.outline.id} ${s.id}: stages follow the path`);
    for (const l of su.links) { assert.ok(r.connections.some((c) => c.id === l.id), 'a link is one of the room’s connections'); assert.ok(su.codes.includes(l.from) && su.codes.includes(l.to)); }
  }
  const su = H.suspectsOf(ref, H.symptomOf('room-cant-hear'), null);
  assert.deepEqual(su.stages.map((g) => [g.label, g.positions.length]), [['UC room compute', 1], ['Audio processor (DSP)', 1], ['Loudspeaker', 2]]); assert.ok(su.links.length >= 2);
  assert.equal(H.suspectsOf(ref, H.symptomOf('other'), null).positions.length, 0, '“something else” points at nothing and says so');
});

test('HR-03 guidance is written for the room: a step never names equipment the room lacks, and rings only the room’s own positions', () => {
  let steps = 0;
  for (const r of recs) { const cats = new Set(hw(r).map((p) => p.cat)); const codes = new Set(r.positions.map((p) => p.code));
    for (const s of H.SYMPTOMS) for (const tier of ['person', 'technician']) for (const st of H.stepsFor(r, s.id, tier)) { steps += 1;
      for (const c of st.uses) assert.ok(codes.has(c), `${r.outline.id} ${s.id} ${st.id}`);
      if (/touch panel/.test(st.do)) assert.ok(cats.has('touch'), `${r.outline.id} ${s.id} ${st.id}: names a touch panel the room does not have`);
      if (/LED wall/.test(`${st.do} ${st.look}`)) assert.ok(cats.has('ledwall'));
      if (/projector/i.test(st.look) && st.id === 'wake') assert.ok(cats.has('projector'));
      if (/hand-held|clip-on/.test(st.do)) assert.ok(cats.has('micwireless'));
      if (/switcher/.test(st.do)) assert.ok(cats.has('switcher'));
      assert.ok(st.do.length > 20 && st.look.length > 10); } }
  assert.ok(steps > 2000, String(steps));
  const bare = recs.find((r) => hw(r).length && !hw(r).some((p) => p.cat === 'touch')); assert.ok(bare, 'a room without a touch panel exists to test against');
  assert.ok(!H.stepsFor(bare, 'frozen', 'technician').some((s) => /touch panel/.test(s.do)));
});

test('HR-04 nothing a person is asked to do is unsafe or changes the commissioned room; a technician’s steps come after everyone’s and say what needs a work order', () => {
  const unsafe = /\b(unplug (the|it|a)|power.?cycle|reboot|factory reset|firmware|re-?patch (the|it)|open (the|a) (rack|cabinet)|climb|ladder|remove the (cover|panel)|bypass|re-?tune (it|the))\b/i;
  for (const r of recs) for (const s of H.SYMPTOMS) {
    const person = H.stepsFor(r, s.id, 'person'); const tech = H.stepsFor(r, s.id, 'technician');
    assert.ok(person.every((x) => x.tier === 'person')); assert.deepEqual(tech.filter((x) => x.tier === 'person').map((x) => x.id), person.map((x) => x.id), 'a technician sees everyone’s steps first, unchanged');
    const firstTech = tech.findIndex((x) => x.tier === 'technician'); if (firstTech >= 0) assert.ok(tech.slice(firstTech).every((x) => x.tier === 'technician'), 'technician steps come last');
    for (const st of tech) assert.doesNotMatch(st.do, unsafe, `${s.id}/${st.id}: ${st.do}`);
  }
  const dsp = H.stepsFor(ref, 'far-cant-hear', 'technician').find((x) => x.id === 'baseline'); assert.match(dsp.caution, /work order and a retest/); assert.match(dsp.link.href, /^#\/room\/R-ATL-4-218\?tab=tests$/);
  assert.match(H.stepsFor(ref, 'frozen', 'person').find((x) => x.id === 'leave').caution, /powered through its network cable/);
  for (const s of H.SYMPTOMS) for (const st of H.stepsFor(ref, s.id, 'technician')) if (st.link) assert.ok(R.resolve(st.link.href.split('?')[0]), st.link.href);
});

test('HR-05 the history is the workspace’s jobs, the record’s issues and what changed since acceptance: live first, counted from the records', () => {
  const w = fresh(); const h = H.historyOf(ref, w, []);
  const jobs = w.incidents.filter((i) => i.roomId === REF); assert.equal(h.rows.filter((x) => x.kind === 'job').length, jobs.length); assert.ok(jobs.length >= 2);
  assert.deepEqual(h.rows.filter((x) => x.kind === 'job').map((x) => x.id).sort(), jobs.map((j) => j.id).sort());
  const liveJobs = jobs.filter((j) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(j.state)); const recIssues = ref.issues.filter((i) => !jobs.some((j) => j.id === i.id));
  assert.equal(h.open, liveJobs.length + recIssues.filter((i) => i.state !== 'RESOLVED').length);
  assert.ok(h.rows.slice(0, h.open).every((x) => x.live), 'what is still open comes first');
  const swap = h.rows.find((x) => x.kind === 'unit'); assert.ok(swap && /Camera 1 unit replaced/.test(swap.title) && /AS-0102 → AS-0112/.test(swap.detail), 'the camera swap of the reference room is in its history');
  assert.equal(h.rows.filter((x) => x.kind === 'unit').length, M.moves(ref).filter((m) => m.kind === 'unit').length);
  const sound = [...jobs.map((j) => j.title), ...recIssues.map((i) => i.title)].filter((t) => H.groupOf(t) === 'audio').length; assert.ok(h.summary.some((s) => s.startsWith(`Sound: ${sound} on record`)), h.summary.join(' | '));
  const quiet = recs.find((r) => !r.issues.length && !M.moves(r).length && !w.incidents.some((i) => i.roomId === r.outline.id)); assert.match(H.historyOf(quiet, w, []).summary[0], /Nothing has been reported/);
  assert.equal(H.groupOf('Echo reported on a board call'), 'audio'); assert.equal(H.groupOf('Camera shows no video in meetings'), 'video'); assert.equal(H.groupOf('Projector blank at the start of class'), 'display'); assert.equal(H.groupOf('Something odd'), null);
});

test('HR-06 what is already reported is found: the open job that describes this very symptom, and other open reports of the same kind', () => {
  const w = fresh(); const open = w.incidents.find((i) => i.roomId === REF && i.state === 'OPEN'); assert.match(open.title, /Far-end audio drops out/);
  const a = H.suspectsOf(ref, H.symptomOf('room-cant-hear'), w); assert.deepEqual(a.same, [open.id]); assert.equal(a.known[0].id, open.id);
  const b = H.suspectsOf(ref, H.symptomOf('echo'), w); assert.deepEqual(b.same, []); assert.ok(b.known.some((k) => k.id === open.id), 'another open sound problem is shown, not claimed to be the same');
  const c = H.suspectsOf(ref, H.symptomOf('no-camera'), w); assert.equal(c.known.length, 0);
  assert.ok(!a.known.some((k) => k.id === 'ISS-0380'), 'a closed job is history, not something to add to');
});

test('HR-07 arriving: a room is found by its label code, its number or its name; nonsense finds nothing', () => {
  assert.deepEqual(H.findRooms('R-ATL-4-218').map((o) => o.id), [REF]); assert.deepEqual(H.findRooms('r-atl-4-218').map((o) => o.id), [REF]);
  assert.equal(H.findRooms('4.218')[0].id, REF); assert.equal(H.findRooms('atlas 4.218')[0].id, REF); assert.ok(H.findRooms('boardroom').some((o) => o.id === REF));
  assert.deepEqual(H.findRooms('zzqx'), []); assert.deepEqual(H.findRooms('   '), []);
  for (const o of K.CAMPUS_ROOMS) assert.equal(H.findRooms(o.id)[0].id, o.id);
  assert.equal(H.labelFor(REF, 'https://example.test/'), 'https://example.test/#/here/R-ATL-4-218');
  const worth = H.worthAVisit(recs); assert.equal(worth[0].id, REF); assert.ok(worth.length >= 3); assert.equal(new Set(worth.map((o) => o.archetype)).size, worth.length);
});

test('HR-08 still wrong → a ServiceHands job that carries the steps tried and what it points at; the shared store decides recurrence', () => {
  const w = fresh(); const before = w.incidents.length;
  const v = T.record(w, 'employee', { roomId: REF, symptom: 'frozen', note: 'Since this morning', tried: [{ id: 'hold', result: 'same' }, { id: 'name', result: 'skipped' }], outcome: 'reported' });
  assert.ok(!('why' in v), JSON.stringify(v)); assert.equal(v.outcome, 'reported'); assert.match(v.incidentId, /^ISS-\d{4}$/); assert.equal(w.incidents.length, before + 1);
  const inc = W.incidentOf(w, v.incidentId); assert.equal(inc.roomId, REF); assert.equal(inc.state, 'OPEN'); assert.equal(inc.title, 'The touch panel does not respond');
  assert.match(inc.summary, /Reported from the room by the Employee/); assert.match(inc.summary, /Tried in the room: 1\) Touch and hold the middle of the touch panel for two seconds\. No change\./); assert.match(inc.summary, /Points at: Touch panel 1 \(A-0105\) → Control processor 1 \(A-0110\) → Network switch 1 \(A-0111\)\./);
  const intake = w.sh.intake[inc.id]; assert.equal(intake.entry, 'Employee in the room'); assert.equal(intake.category, 'control'); assert.deepEqual(intake.answers.map((a) => a[1]), ['No change', 'Could not be done']);
  assert.equal(inc.history[0].by, 'requestor', 'an employee raises it as a requestor: asking grants nothing else'); assert.ok(w.events.some((e) => e.type === 'service.raise' && e.aggregate === inc.id && e.outcome === 'ALLOWED'));
  assert.ok(M.roomIssues(ref, w).some((i) => i.id === inc.id && i.live), 'the room page and Mission Control read the same job');
  assert.ok(H.historyOf(ref, w, T.loadVisits()).rows.some((x) => x.id === inc.id && x.live));
  // a technician's report is raised with the technician's own persona, and a step id the room does not offer is dropped, not trusted
  const t = T.record(w, 'service', { roomId: REF, symptom: 'echo', note: '', tried: [{ id: 'second', result: 'same' }, { id: 'made-up', result: 'fixed' }], outcome: 'reported' });
  assert.equal(W.incidentOf(w, t.incidentId).history[0].by, 'service'); assert.deepEqual(t.tried.map((x) => x.id), ['second']);
  assert.equal(W.incidentOf(w, t.incidentId).recurrenceOf, 'ISS-0380', 'an echo after the closed echo job is marked as coming back');
});

test('HR-09 already reported → nothing new is raised: “seen again” is added to that job, with what was tried', () => {
  const w = fresh(); const before = w.incidents.length; const open = w.incidents.find((i) => i.roomId === REF && i.state === 'OPEN');
  const v = T.record(w, 'exec', { roomId: REF, symptom: 'room-cant-hear', note: 'Board call at nine', tried: [{ id: 'volume', result: 'same' }], outcome: 'joined', joinId: open.id });
  assert.ok(!('why' in v), JSON.stringify(v)); assert.equal(v.incidentId, open.id); assert.equal(w.incidents.length, before, 'no second job');
  const seen = w.hr.seen[open.id]; assert.equal(seen.length, 1); assert.equal(seen[0].who, 'Executive in the room'); assert.equal(seen[0].note, 'Board call at nine'); assert.deepEqual(seen[0].tried, [['Raise the room volume on the touch panel to about the middle.', 'No change']]);
  assert.ok(w.events.some((e) => e.type === 'service.seen_again' && e.aggregate === open.id));
  const closed = w.incidents.find((i) => i.roomId === REF && i.state === 'CLOSED');
  assert.match(T.record(w, 'exec', { roomId: REF, symptom: 'echo', note: '', tried: [], outcome: 'joined', joinId: closed.id }).why[0], /is closed\. Report it as a new problem/);
  const other = w.incidents.find((i) => i.roomId !== REF); assert.match(T.record(w, 'exec', { roomId: REF, symptom: 'echo', note: '', tried: [], outcome: 'joined', joinId: other.id }).why[0], /not for this room/);
  assert.match(T.record(w, 'exec', { roomId: REF, symptom: 'echo', note: '', tried: [], outcome: 'joined', joinId: null }).why[0], /Choose the report/);
});

test('HR-10 fixed in the room → kept in the room’s history and the ledger, nothing sent; the third time in a month is counted', () => {
  const w = fresh(); const before = w.incidents.length;
  assert.match(T.record(w, 'employee', { roomId: REF, symptom: 'blank', note: '', tried: [{ id: 'wake', result: 'same' }], outcome: 'fixed' }).why[0], /Mark the step that fixed it/);
  const v = T.record(w, 'employee', { roomId: REF, symptom: 'blank', note: '', tried: [{ id: 'wake', result: 'same' }, { id: 'light', result: 'fixed' }], outcome: 'fixed' });
  assert.equal(v.outcome, 'fixed'); assert.equal(v.incidentId, null); assert.match(v.fixedBy, /small light on the edge/); assert.equal(w.incidents.length, before);
  assert.ok(w.events.some((e) => e.type === 'room.fixed_in_room' && e.aggregate === REF && /fixed by/.test(e.detail)));
  assert.equal(T.loadVisits().length, 1); assert.equal(H.repeats(T.loadVisits(), REF, 'display'), 1); assert.equal(H.repeats(T.loadVisits(), REF, 'audio'), 0);
  T.record(w, 'employee', { roomId: REF, symptom: 'laptop', note: '', tried: [{ id: 'cable', result: 'fixed' }], outcome: 'fixed' });
  assert.equal(H.repeats(T.loadVisits(), REF, 'display'), 2, 'two screen problems fixed in the room this month');
  assert.equal(H.repeats(T.loadVisits(), REF, 'display', Date.now() + 31 * 864e5), 0, 'thirty days later they no longer count');
  const h = H.historyOf(ref, w, T.loadVisits()); assert.equal(h.rows.filter((x) => x.kind === 'visit').length, 2); assert.ok(h.rows.find((x) => x.kind === 'visit').detail.startsWith('Fixed in the room by the person who noticed it'));
  assert.equal(new Set(T.loadVisits().map((x) => x.id)).size, 2);
});

test('HR-11 who may do what is V2.5.3’s: a visitor is refused a report and nothing is written; “something else” needs words; an unknown room is refused', () => {
  const w = fresh(); const before = JSON.stringify(w.incidents);
  const r = T.record(w, 'visitor', { roomId: REF, symptom: 'blank', note: '', tried: [{ id: 'wake', result: 'same' }], outcome: 'reported' });
  assert.match(r.why[0], /Visitor does not report problems here/); assert.equal(JSON.stringify(w.incidents), before); assert.equal(T.loadVisits().length, 0);
  assert.match(T.record(w, 'employee', { roomId: REF, symptom: 'other', note: 'odd', tried: [], outcome: 'reported' }).why[0], /at least 8 characters/);
  const o = T.record(w, 'employee', { roomId: REF, symptom: 'other', note: 'A ceiling tile is loose above the table', tried: [], outcome: 'reported' }); assert.equal(W.incidentOf(w, o.incidentId).title, 'A ceiling tile is loose above the table');
  assert.match(T.record(w, 'employee', { roomId: 'R-NOPE', symptom: 'blank', note: '', tried: [], outcome: 'reported' }).why[0], /Choose the room/);
  assert.match(T.record(w, 'employee', { roomId: REF, symptom: 'blank', note: 'x'.repeat(401), tried: [], outcome: 'reported' }).why[0], /under 400/);
  const roles = P.ROLE_KEYS; const page = R.resolve('#/here'); assert.ok(page); assert.ok(R.resolve(`#/here/${REF}`));
  assert.deepEqual(roles.filter((k) => P.canOpen(k, page)), roles.filter((k) => P.allows({ area: 'lite' }, k)), 'opens for the roles V2.5.3 gives Lite');
  assert.ok(!P.canOpen('qa', page)); assert.ok(P.canOpen('visitor', page));
  assert.deepEqual(roles.filter((k) => P.canSee(k, page, 'here.history')), roles.filter((k) => P.allows({ area: 'lite' }, k) && P.allows({ field: 'history' }, k)));
  assert.ok(!P.canSee('employee', page, 'here.history') && !P.canSee('employee', page, 'here.devices') && P.canSee('employee', page, 'here.known'));
  assert.ok(!P.canSee('visitor', page, 'here.known') && !T.mayReport('visitor') && T.mayReport('employee') && T.isTechnical('service') && !T.isTechnical('exec'));
});

test('HR-12 a room that is not built yet says so: its stage in plain words, and nothing to walk into', () => {
  const planned = recs.find((r) => r.lifecycle === 'PLANNED'); assert.ok(planned); assert.equal(H.stageWord('PLANNED').built, false); assert.equal(H.stageWord('OPERATIONAL').built, true);
  for (const r of recs) { const s = H.stageWord(r.lifecycle); assert.ok(s.words.length > 5 && !/_/.test(s.words), r.lifecycle); }
});
