// The AV Engineering Standards & Design Manual (apps/demo/src/manual). Founder, 11 Nov 2026, §08 Product C: "a governed technical
// reference"; "Allow engineers to select tenant standards, site standards, room archetype, equipment models, approved alternatives,
// applicable testing requirements, network profiles, accessibility constraints, engineering assumptions. Generate reviewable design
// requirements and commissioning templates. Preserve standard revisions, exception approvals, and compliance evidence."; "Separate
// portable engineering principles from confidential or organization-specific details."; "Do not reproduce copyrighted standards".
// 02:25 the same day: no waiver bypasses critical security, authorization, evidence integrity or mandatory safety; nobody approves
// their own. Held here: the manual names nobody and carries no pass mark; every test it cites is the catalogue's; a room's set is the
// room's own record judged by the engine, with values only where the organisation set them; an edition comes into force only by an
// adopted revision and the earlier one is kept; exceptions and findings are written, separated by role, and never touch a rule that
// is never waived; stored state is untrusted.
//   node --test tests/unit/demo-manual.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }; globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-manual-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as M from './manual/content.ts'; export * as F from './manual/workflow.ts'; export * as O from './manual/store.ts'; export * as W from './workspace/store.ts'; export * as P from './access/policy.ts'; export * as D from './campus/design.ts'; export * as N from './campus/canon.ts'; export * as PG from './registry.pages.ts'; export * as E from '@empathia/commissioning-engine';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { M, F, O, W, P, D, N, PG, E } = await import(pathToFileURL(out).href);
const C = E.defaultCatalog; const fresh = () => { mem.clear(); return W.seed(); }; const lines = (w, type) => w.events.filter((e) => e.type === type);
const DAY = 864e5; const inDays = (n) => new Date(Date.now() + n * DAY).toISOString();
const REF = D.roomRecord(N.REFERENCE_ROOM_ID); const NONE = { values: {}, siteAdds: [], access: [], assumptions: [] };
const ASK = { room: N.REFERENCE_ROOM_ID, principle: 'C-02', kind: 'temporary', reason: 'The only structural wall is glazed below the display line.', risk: 'A steeper view of the near seats.', mitigation: 'The second camera covers the near seats.', wayBack: 'Move the camera when the wall is rebuilt in the refit.', until: inDays(90) };
const test_ = (id) => C.tests[id] || C.packTests[id];

test('MN-01 the manual is fourteen chapters of rules, each with its reason; every test and value it cites exists, and every value is used', () => {
  assert.deepEqual(M.CHAPTERS.map((c) => c.id), ['governance', 'rooms', 'display', 'camera', 'audio', 'reinforcement', 'control', 'network', 'security', 'accessibility', 'commissioning', 'suppliers', 'operations', 'exceptions']);
  assert.ok(M.ALL_PRINCIPLES.length >= 110, `${M.ALL_PRINCIPLES.length} rules`); assert.equal(new Set(M.ALL_PRINCIPLES.map((p) => p.id)).size, M.ALL_PRINCIPLES.length);
  const families = new Set(['camera', 'dsp', 'touch_panel', 'network_switch', 'display', 'lighting', 'uc', 'signage']); const used = new Set();
  for (const c of M.CHAPTERS) { assert.ok(c.aim.length > 30 && c.principles.length >= 7 && c.open.length >= 1 && c.see.length >= 2, c.id); const prefix = c.principles[0].id.slice(0, 2);
    for (const l of c.see) assert.ok(PG.resolve(l.href.split('?')[0]), `${c.id}: ${l.href} is a registered page`);
    for (const p of c.principles) { assert.match(p.id, /^[A-Z]-\d\d$/); assert.equal(p.id.slice(0, 2), prefix, `${p.id} sits in ${c.id}`); assert.ok(p.say.length >= 30 && p.why.length >= 25, p.id); assert.ok(['govern', 'design', 'commission', 'operate'].includes(p.stage), p.id);
      for (const t of p.tests || []) assert.ok(test_(t), `${p.id} cites ${t}, which the catalogue does not hold`);
      for (const v of p.values || []) { assert.ok(M.valueById(v), `${p.id} names value ${v}`); used.add(v); }
      for (const f of p.families || []) assert.ok(families.has(f), `${p.id}: ${f} is not a catalogue family`); } }
  for (const v of M.VALUES) { assert.ok(used.has(v.id), `value ${v.id} is used by no rule`); assert.ok(v.ask.length > 30 && v.from.length > 15, v.id); }
  for (const s of ['govern', 'design', 'commission', 'operate']) assert.ok(M.ALL_PRINCIPLES.filter((p) => p.stage === s).length >= 12, s);
  // the manual reaches most of the catalogue: a test nobody cites is a test the manual gives no reason for
  const cited = new Set(M.ALL_PRINCIPLES.flatMap((p) => p.tests || [])); const all = [...Object.keys(C.tests), ...Object.keys(C.packTests)];
  assert.ok(cited.size / all.length >= 0.8, `${cited.size} of ${all.length} catalogue tests are cited`);
});

test('MN-02 it carries no pass mark, names nobody, reproduces no standard and tells nobody to do anything unsafe; it says it is a draft', () => {
  const text = JSON.stringify([M.CHAPTERS.map((c) => [c.title, c.aim, c.open, c.principles.map((p) => [p.say, p.why, p.check, p.noWaiver])]), M.VALUES.map((v) => [v.name, v.ask, v.from]), M.NO_NUMBERS]);
  const noIds = text.replace(/\b[A-Z]-\d\d\b/g, '');
  assert.equal(/\d/.test(noIds), false, `a digit in the manual’s text: ${(noIds.match(/.{30}\d.{30}/) || [''])[0]}`);
  assert.equal(/\b(dBA?|dBFS|STI|ALcons|LAeq|RT60|millisecond|metres?|inch|percent|degrees?)\b/.test(text), false, 'a unit or a named metric, which belongs to the organisation’s own value');
  assert.equal(/\b(ISO|IEC|ANSI|AVIXA|InfoComm|ITU|EBU|SMPTE|IEEE|ADA|EN \d)/.test(text), false, 'a published standard is named or reproduced');
  assert.equal(/q-?sys|shure|crestron|biamp|extron|cisco|logitech|microsoft|webex|power ?bi|kraft|heinz|stefanini|khc/i.test(text), false, 'a maker, a product or an organisation is named');
  assert.equal(/\b(Dante|MXA|Poly|Teams|Zoom|AON|Aon)\b/.test(text), false, 'a product or an organisation is named (as a name: “digital zoom” and “the AV team” are ordinary words)');
  assert.equal(/stated in source|former employer|pain points/i.test(text), false);
  assert.equal(/\b(ladder|climb|scaffold|mains voltage|live wiring|remove the cover|open the (unit|device|amplifier|rack)|protective earth|rigging point)\b/i.test(text), false, 'an instruction that belongs to a qualified installer');
  assert.equal(/certified by|guarantee|compliant with the law|100%/i.test(text), false);
  assert.match(M.CONTENT_STATUS, /^Draft\./); assert.match(M.CONTENT_STATUS, /not yet reviewed by a practising professional/); assert.match(M.NO_NUMBERS, /carries no pass marks/);
  // the things the archive got wrong are resolved in the manual’s own words, not repeated
  assert.match(M.principleById('A-05').say, /room’s own microphones never appear in it/); assert.match(M.principleById('V-02').say, /Condition the microphone signal once, then split it/);
  assert.match(M.principleById('V-08').say, /never found by raising the gain of a live microphone until the room rings/); assert.match(M.principleById('V-04').say, /not sent to the loudspeakers nearest that talker/);
  assert.match(M.principleById('A-07').say, /at least as quiet as a small one/); assert.match(M.principleById('M-03').say, /No form arrives with boxes already ticked/); assert.match(M.principleById('C-08').say, /never as a single percentage/);
});

test('MN-03 a rule is never excepted when the manual says so or when the catalogue will not waive a test that checks it; safety, security, evidence and separation of duties are all among them', () => {
  const never = O.neverWaived();
  for (const id of ['A-12', 'V-08', 'C-12', 'M-10', 'S-01', 'S-02', 'S-03', 'S-05', 'S-09', 'X-01', 'X-04', 'M-03', 'M-07', 'M-09', 'K-06', 'E-04', 'E-05', 'D-03']) assert.ok(never.includes(id), `${id} must never be excepted`);
  for (const p of M.ALL_PRINCIPLES) { const nw = (p.tests || []).filter((t) => test_(t).nonwaivable); if (nw.length || p.noWaiver) { assert.ok(F.neverExcepted(p), p.id); assert.ok(never.includes(p.id), p.id); } else assert.equal(F.neverExcepted(p), null, p.id); }
  assert.match(F.neverExcepted(M.principleById('N-03')), /Network reachability.*never waived/); assert.equal(F.neverExcepted(M.principleById('C-02')), null);
  assert.ok(never.length >= 25 && never.length < M.ALL_PRINCIPLES.length / 2, `${never.length} never excepted: enough to protect, not so many that nothing can bend`);
  const w = fresh(); for (const id of never) { const r = O.requestException(w, 'designer', { ...ASK, principle: id }); assert.match(r.why[0], new RegExp(`^${id} is never excepted\\.`), id); }
  assert.equal(O.manualView(w).exceptions.length, 0); assert.equal(lines(w, 'manual.exception_requested').length, never.length); assert.ok(lines(w, 'manual.exception_requested').every((e) => e.outcome === 'DENIED'));
});

test('MN-04 a room’s set is the room’s own record judged by the engine: design rules for the equipment it has, the engine’s applicable tests with their methods, and no value the organisation did not set', () => {
  const g = F.generate(REF, NONE); const A = REF.analysis.applicability;
  assert.equal(g.room, N.REFERENCE_ROOM_ID); assert.deepEqual(g.families, [...A.ctx.families].sort()); assert.equal(g.tier, A.ctx.tier);
  assert.equal(g.template.length, A.rows.filter((r) => r.applicable).length); assert.equal(g.notApplicable, A.rows.length - g.template.length); assert.ok(g.template.length >= 20);
  for (const t of g.template) { const T = test_(t.id); assert.ok(T, t.id); assert.equal(t.method, T.method); assert.equal(t.nonwaivable, !!T.nonwaivable); assert.ok(['PENDING_INFORMATION', 'BLOCKED_BY_PREREQUISITE', 'REQUIRES_PHYSICAL_EXECUTION'].includes(t.status), `${t.id}: ${t.status} is the engine’s state, never a result`);
    assert.equal('result' in t, false); for (const p of t.principles) assert.ok(M.principleById(p).tests.includes(t.id)); for (const c of t.criteria) assert.equal(c.value, null); }
  assert.ok(g.requirements.length >= 30); assert.ok(g.requirements.every((r) => r.origin === 'manual' && M.principleById(r.id).stage === 'design'));
  for (const r of g.requirements) { const p = M.principleById(r.id); assert.ok(!p.families || p.families.some((f) => g.families.includes(f)), `${r.id} concerns equipment the room does not have`); assert.equal(r.text, p.say); assert.ok(r.tests.every((t) => g.template.some((x) => x.id === t))); assert.ok(r.values.every((v) => v.value === null && v.source === null)); assert.equal(r.noWaiver, F.neverExcepted(p)); }
  assert.match(g.gaps[0], /^\d+ values this room depends on are not set by the organisation: .*Until one is set, its test records a reading and has no pass mark\.$/);
  assert.ok(g.equipment.length >= 8 && g.equipment.every((e) => e.device && e.code)); assert.ok(g.equipment.some((e) => e.profile === 'media') && g.equipment.some((e) => e.profile === null));
  assert.ok(g.roles.length >= 4 && g.roles.every((r) => r.approved.length >= 1)); assert.deepEqual(F.generate(REF, NONE), g, 'the same record gives the same set');
  // a room with no camera gets no camera rule
  const plain = D.allRecords().find((r) => !r.analysis.applicability.ctx.families.includes('camera') && r.positions.some((p) => !p.furniture)); assert.ok(plain, 'the estate has a room without a camera');
  const gp = F.generate(plain, NONE); assert.equal(gp.requirements.some((r) => r.id.startsWith('C-')), false); assert.equal(gp.template.some((t) => t.id === 'camera_fov'), false);
  // the organisation’s values arrive with their sources, and only those
  const gv = F.generate(REF, { ...NONE, values: { 'camera-height': { value: '1.1 to 1.25 m', source: 'Furniture study, pilot rooms' } } });
  const c2 = gv.requirements.find((r) => r.id === 'C-02'); assert.deepEqual(c2.values, [{ id: 'camera-height', name: 'Camera height', value: '1.1 to 1.25 m', source: 'Furniture study, pilot rooms' }]);
  assert.ok(gv.requirements.filter((r) => r.id !== 'C-02').flatMap((r) => r.values).every((v) => v.id === 'camera-height' ? v.value : v.value === null)); assert.equal(/Camera height/.test(gv.gaps[0]), false);
});

test('MN-05 selections change the set and nothing else: an accessibility constraint brings its rules, a building’s addition reaches only that building, an assumption is kept as written', () => {
  const g0 = F.generate(REF, NONE);
  const g = F.generate(REF, { values: {}, access: ['hearing', 'captions', 'nonsense'], assumptions: ['  The ceiling is <b>2.9 m</b> throughout.  ', '', 'x'.repeat(400)], siteAdds: [{ id: 'SA-001', building: REF.outline.building, principle: 'C-09', text: 'No camera faces the east glazing.', at: inDays(0), by: 'architect' }, { id: 'SA-002', building: 'ZZZ', principle: 'C-09', text: 'Elsewhere only.', at: inDays(0), by: 'architect' }, { id: 'SA-003', building: REF.outline.building, principle: 'Q-99', text: 'Belongs to no rule.', at: inDays(0), by: 'architect' }] });
  assert.deepEqual(g.access, ['hearing', 'captions']); const acc = g.requirements.filter((r) => r.origin === 'access'); assert.deepEqual(acc.map((r) => r.id).sort(), ['X-02', 'X-03']); assert.match(acc[0].because, /^Selected for this room: /);
  assert.equal(g0.requirements.some((r) => r.id === 'X-03'), false, 'a commissioning-stage rule arrives only when selected');
  const site = g.requirements.filter((r) => r.origin === 'site'); assert.deepEqual(site.map((r) => r.id), ['SA-001']); assert.equal(site[0].text, 'No camera faces the east glazing.'); assert.match(site[0].why, /tightens the manual; it never loosens it/);
  assert.deepEqual(g.assumptions, ['The ceiling is b 2.9 m /b throughout.', 'x'.repeat(200)]); assert.equal(g.template.length, g0.template.length, 'a selection never changes which tests the engine applies');
  assert.equal(new Set(g.requirements.map((r) => r.id)).size, g.requirements.length, 'no rule twice');
  // a constraint the room cannot meet is said, not hidden
  const bare = D.allRecords().find((r) => !r.analysis.applicability.ctx.families.includes('touch_panel') && r.positions.some((p) => !p.furniture));
  if (bare) assert.ok(F.generate(bare, { ...NONE, access: ['low-vision'] }).gaps.some((x) => /was selected, and the room’s record has no a control panel to meet X-05 with/.test(x)));
  assert.equal(F.profileFor('speaker'), null, 'a device with no network port has no port profile'); assert.equal(F.profileFor('switch'), 'uplink'); assert.equal(F.profileFor('touch'), 'control'); assert.equal(F.profileFor('compute'), 'compute'); assert.equal(F.profileFor('display'), 'general');
});

test('MN-06 the edition: only the holder of the standard settles a value, and only with its source; nothing is in force until a revision is adopted; the earlier revision is kept as it stood', () => {
  const w = fresh(); let s = O.manualView(w);
  assert.equal(s.revisions.length, 1); assert.equal(O.inForce(s).rev, 1); assert.deepEqual(O.inForce(s).values, {}); assert.equal('manual' in w, false, 'reading creates nothing');
  for (const r of P.ROLE_KEYS.filter((k) => k !== 'architect')) { const no = O.setValue(w, r, 'noise', '35 dB', 'Acoustician’s criterion'); assert.match(no.why[0], /for the person who holds the standard/, r); }
  assert.equal(lines(w, 'manual.value_set').filter((e) => e.outcome === 'DENIED').length, P.ROLE_KEYS.length - 1);
  assert.match(O.setValue(w, 'architect', 'noise', '35 dB', 'ok').why[0], /A value without a source is not recorded/); assert.match(O.setValue(w, 'architect', 'noise', ' ', 'Acoustician’s criterion').why[0], /Write the value/); assert.match(O.setValue(w, 'architect', 'loudness', '1', 'Somewhere long').why[0], /names no such value/);
  assert.deepEqual(O.setValue(w, 'architect', 'noise', '  35 <dB>  ', 'Acoustician’s criterion, report 12'), { ok: true });
  s = O.manualView(w); assert.equal(s.values.noise.value, '35 dB'); assert.deepEqual(O.inForce(s).values, {}, 'the working copy is not in force'); assert.deepEqual(O.pending(s), { values: ['noise'], adds: [] });
  assert.match(lines(w, 'manual.value_set')[0].detail, /not in force until a revision is adopted/);
  assert.match(O.addForSite(w, 'syseng', 'ATL', 'C-09', 'No camera faces the east glazing.').why[0], /holds the standard/); assert.match(O.addForSite(w, 'architect', 'ATL', 'Q-99', 'No camera faces the east glazing.').why[0], /Name the rule/); assert.match(O.addForSite(w, 'architect', 'ATL', 'C-09', 'short').why[0], /at least 12/);
  assert.deepEqual(O.addForSite(w, 'architect', 'ATL', 'C-09', 'No camera faces the east glazing.'), { ok: true, id: 'SA-001' });
  assert.match(O.adopt(w, 'steward', 'Noise limit and the glazing rule.').why[0], /holds the standard/); assert.match(O.adopt(w, 'architect', 'short').why[0], /what changed and why/); assert.match(O.adopt(w, 'architect', 'Noise limit and the glazing rule.', 5).why[0], /between 30 days and two years/);
  assert.deepEqual(O.adopt(w, 'architect', 'Noise limit and the glazing rule.', 90), { ok: true, rev: 2 });
  s = O.manualView(w); assert.deepEqual(s.revisions.map((r) => [r.rev, r.state]), [[1, 'ARCHIVED'], [2, 'IN_FORCE']]); assert.deepEqual(s.revisions[0].values, {}, 'revision 1 is kept as it stood');
  assert.deepEqual(O.inForce(s).values, { noise: { value: '35 dB', source: 'Acoustician’s criterion, report 12' } }); assert.equal(O.inForce(s).siteAdds.length, 1); assert.deepEqual(O.pending(s), { values: [], adds: [] });
  assert.match(lines(w, 'manual.revision_adopted')[0].detail, /Revision 2 .* adopted \(1 values and 1 building additions brought into force; review in 90 days\)\. Revision 1 is archived as it stood\. The manual’s own text was not reviewed by this act/);
  assert.equal(O.freshnessOf(s, Date.now()).state, 'CURRENT'); assert.equal(O.freshnessOf(s, Date.now() + 70 * DAY).state, 'DUE'); assert.equal(O.freshnessOf(s, Date.now() + 100 * DAY).state, 'OVERDUE');
  // a later change waits for the next revision; a set made now cites revision 2
  O.setValue(w, 'architect', 'noise', '33 dB', 'Acoustician’s criterion, report 14'); s = O.manualView(w); assert.equal(O.inForce(s).values.noise.value, '35 dB'); assert.deepEqual(O.pending(s).values, ['noise']);
  const g = F.generate(REF, { values: O.inForce(s).values, siteAdds: O.inForce(s).siteAdds, access: [], assumptions: [] }); const saved = O.saveSet(w, 'designer', g); assert.equal(O.manualView(w).sets[0].rev, 2); assert.equal(saved.id, 'RS-0001');
});

test('MN-07 an exception is asked for in writing by a design role, with every part of the case; it is decided by another engineering role; it lapses at its date and can be closed', () => {
  const w = fresh(); const now = Date.now();
  for (const r of P.ROLE_KEYS.filter((k) => !P.allows(O.MAY_BUILD, k))) assert.match(O.requestException(w, r, ASK).why[0], /asked for by the people who design the room/, r);
  const thin = O.requestException(w, 'designer', { ...ASK, reason: 'Deadline.', risk: '', mitigation: '', wayBack: '', until: inDays(-1) });
  assert.equal(thin.why.length, 5); assert.match(thin.why[0], /Convenience, a deadline or a supplier’s preference is not, alone, a reason/); assert.match(thin.why[3], /how the room returns to the standard/); assert.match(thin.why[4], /must be in the future/);
  assert.match(O.requestException(w, 'designer', { ...ASK, until: inDays(2000) }).why[0], /within three years/); assert.match(O.requestException(w, 'designer', { ...ASK, room: 'NOPE' }).why[0], /Choose the room/); assert.match(O.requestException(w, 'designer', { ...ASK, principle: 'Q-99' }).why[0], /Name the rule/);
  assert.match(O.requestException(w, 'designer', { ...ASK, kind: 'forever' }).why[0], /temporary or permanent/); assert.equal(O.manualView(w).exceptions.length, 0);
  assert.deepEqual(O.requestException(w, 'designer', { ...ASK, kind: 'permanent', wayBack: '' }, now).ok, true, 'a permanent exception needs a review date, not a way back');
  const perm = O.manualView(w).exceptions[0]; assert.equal(perm.id, 'EX-0001'); assert.equal(O.exceptionState(perm, now), 'REQUESTED'); assert.match(lines(w, 'manual.exception_requested')[0].detail, /EX-0001: a permanent exception to C-02 .* to be looked at again on \d{4}-\d\d-\d\d\. Nothing is approved/);
  assert.match(O.requestException(w, 'syseng', ASK).why[0], /already open/); assert.equal(O.covering(O.manualView(w), ASK.room, 'C-02', now), undefined, 'a request covers nothing');
  for (const r of P.ROLE_KEYS.filter((k) => !P.allows(O.MAY_DECIDE, k))) assert.match(O.decideException(w, r, 'EX-0001', true, 'Accepted for this room only.').why[0], /decided by an engineer/, r);
  assert.match(O.decideException(w, 'designer', 'EX-0001', true, 'Accepted for this room only.').why[0], /Nobody approves their own/); assert.match(O.decideException(w, 'syseng', 'EX-0001', true, 'ok').why[0], /at least 12/); assert.match(O.decideException(w, 'syseng', 'EX-0009', true, 'Accepted for this room only.').why[0], /no such exception/);
  assert.deepEqual(O.decideException(w, 'syseng', 'EX-0001', true, 'Accepted for this room only.'), { ok: true }); assert.match(O.decideException(w, 'architect', 'EX-0001', false, 'Changed my mind entirely.').why[0], /approved by the Systems Engineer/);
  let s = O.manualView(w); assert.equal(O.exceptionState(s.exceptions[0], now), 'APPROVED'); assert.equal(O.covering(s, ASK.room, 'C-02', now).id, 'EX-0001'); assert.equal(O.covering(s, ASK.room, 'C-03', now), undefined);
  assert.equal(O.exceptionState(s.exceptions[0], now + 91 * DAY), 'LAPSED'); assert.equal(O.covering(s, ASK.room, 'C-02', now + 91 * DAY), undefined, 'a lapsed exception covers nothing');
  // a refused one, and closing
  O.requestException(w, 'syseng', { ...ASK, principle: 'C-06' }); assert.deepEqual(O.decideException(w, 'architect', 'EX-0002', false, 'A second camera is available in stock.'), { ok: true }); s = O.manualView(w); assert.equal(O.exceptionState(s.exceptions.find((e) => e.id === 'EX-0002'), now), 'REFUSED');
  assert.match(O.closeException(w, 'designer', 'EX-0002', 'The room is back on the standard.').why[0], /Only an approved exception/); assert.match(O.closeException(w, 'employee', 'EX-0001', 'The room is back on the standard.').why[0], /engineering work/); assert.match(O.closeException(w, 'designer', 'EX-0001', 'done').why[0], /at least 12/);
  assert.deepEqual(O.closeException(w, 'designer', 'EX-0001', 'The camera was moved in the refit.'), { ok: true }); s = O.manualView(w); assert.equal(O.exceptionState(s.exceptions.find((e) => e.id === 'EX-0001'), now), 'CLOSED'); assert.equal(O.covering(s, ASK.room, 'C-02', now), undefined);
  assert.deepEqual(O.requestException(w, 'designer', ASK).ok, true, 'a closed exception leaves the rule free to be asked about again');
  // the same rule excepted three times is a signal
  const w2 = fresh(); const rooms = D.allRecords().slice(0, 3).map((r) => r.outline.id); rooms.forEach((room, i) => { O.requestException(w2, 'designer', { ...ASK, room }); O.decideException(w2, 'syseng', `EX-000${i + 1}`, true, 'Accepted for this room only.'); });
  assert.deepEqual(O.repeated(O.manualView(w2)), [{ principle: 'C-02', n: 3 }]); assert.deepEqual(O.repeated(O.manualView(w)), []);
});

test('MN-08 a saved set is reviewed in writing by another engineering role; a requirement is open, met, not met or excepted; a rule that is never excepted is never read as excepted', () => {
  const w = fresh(); const now = Date.now(); const g = F.generate(REF, NONE);
  for (const r of P.ROLE_KEYS.filter((k) => !P.allows(O.MAY_BUILD, k))) assert.match(O.saveSet(w, r, g).why[0], /saved by the people who design the room/, r);
  assert.match(O.saveSet(w, 'designer', { ...g, requirements: [] }).why[0], /no requirement to save/); assert.match(O.saveSet(w, 'designer', { ...g, room: 'NOPE' }).why[0], /room of the estate/);
  assert.deepEqual(O.saveSet(w, 'designer', g), { ok: true, id: 'RS-0001' }); let s = O.manualView(w); let set = s.sets[0];
  assert.equal(set.requirements.length, g.requirements.length); assert.deepEqual(set.tests, g.template.map((t) => t.id)); assert.equal(set.rev, 1); assert.deepEqual(set.findings, {});
  assert.match(lines(w, 'manual.set_saved')[0].detail, /RS-0001: \d+ design requirements and a commissioning template of \d+ tests were saved for .*, from revision 1 \(\d+ gaps stated\)\. Nothing was approved and the room’s record is unchanged/);
  assert.deepEqual(O.setState(s, set, now), { state: 'IN_REVIEW', met: 0, excepted: 0, notMet: 0, open: g.requirements.length });
  assert.match(O.recordFinding(w, 'designer', 'RS-0001', 'C-02', true, 'Elevation E-2 shows the lens at the agreed height.').why[0], /Nobody reviews their own/); assert.match(O.recordFinding(w, 'cxeng', 'RS-0001', 'C-02', true, 'Elevation E-2 shows the lens at the agreed height.').why[0], /an engineer’s finding/);
  assert.match(O.recordFinding(w, 'syseng', 'RS-0001', 'C-02', true, 'seen').why[0], /Write what was seen/); assert.match(O.recordFinding(w, 'syseng', 'RS-0001', 'Z-00', true, 'Elevation E-2 shows the lens.').why[0], /no such requirement/); assert.match(O.recordFinding(w, 'syseng', 'RS-0404', 'C-02', true, 'Elevation E-2 shows the lens.').why[0], /no such set/);
  assert.deepEqual(O.recordFinding(w, 'syseng', 'RS-0001', 'C-02', true, 'Elevation E-2 shows the lens at the agreed height.'), { ok: true }); assert.deepEqual(O.recordFinding(w, 'architect', 'RS-0001', 'C-03', false, 'Seats 9 and 10 are cut at the frame edge in the model.'), { ok: true });
  s = O.manualView(w); set = s.sets[0]; assert.equal(O.rowState(s, set, 'C-02', now), 'MET'); assert.equal(O.rowState(s, set, 'C-03', now), 'NOT_MET'); assert.equal(O.rowState(s, set, 'C-04', now), 'OPEN'); assert.equal(O.setState(s, set, now).state, 'NOT_MET');
  // an approved exception covers a requirement that is not met, while it is in date
  O.requestException(w, 'designer', { ...ASK, principle: 'C-03' }); O.decideException(w, 'syseng', 'EX-0001', true, 'Accepted until the table is replaced.'); s = O.manualView(w); set = s.sets[0];
  assert.equal(O.rowState(s, set, 'C-03', now), 'EXCEPTED'); assert.equal(O.rowState(s, set, 'C-03', now + 91 * DAY), 'NOT_MET', 'when the exception lapses the finding stands again'); assert.equal(O.setState(s, set, now).state, 'IN_REVIEW');
  // a never-excepted requirement is not read as excepted even if a record claimed to cover it
  const nw = set.requirements.find((r) => r.noWaiver); assert.ok(nw, 'the set holds a never-excepted requirement'); w.manual.exceptions.push({ ...s.exceptions[0], id: 'EX-0002', principle: nw.id });
  s = O.manualView(w); assert.equal(s.exceptions.some((e) => e.principle === nw.id), false, 'the forged exception is not read'); assert.equal(O.rowState(s, s.sets[0], nw.id, now), 'OPEN');
  // and the guard holds by itself: a set that marks a row never-excepted is not excepted by any record, whatever the record says
  const marked = { ...s.sets[0], requirements: s.sets[0].requirements.map((r) => (r.id === 'C-03' ? { ...r, noWaiver: true } : r)) }; assert.equal(O.covering(s, marked.room, 'C-03', now).id, 'EX-0001'); assert.equal(O.rowState(s, marked, 'C-03', now), 'NOT_MET');
  for (const r of set.requirements) if (!s.sets[0].findings[r.id] && r.id !== 'C-03') O.recordFinding(w, 'syseng', 'RS-0001', r.id, true, 'Shown on the drawing set, revision B.');
  s = O.manualView(w); assert.deepEqual(O.setState(s, s.sets[0], now), { state: 'REVIEWED', met: g.requirements.length - 1, excepted: 1, notMet: 0, open: 0 });
  assert.equal(JSON.stringify(REF), JSON.stringify(D.roomRecord(N.REFERENCE_ROOM_ID)), 'no room’s record changed');
});

test('MN-09 stored state is untrusted: wrong shapes read as absent, and so does anything recorded by a role that could not have recorded it', () => {
  const w = fresh(); for (const junk of [null, 7, 'x', [], { revisions: 'x', values: 3, exceptions: {}, sets: 'y', siteAdds: 1 }]) { w.manual = junk; const s = O.manualView(w); assert.equal(s.revisions.length, 1); assert.equal(s.exceptions.length + s.sets.length + s.siteAdds.length + Object.keys(s.values).length, 0); }
  const at = new Date().toISOString(); const g = F.generate(REF, NONE);
  w.manual = { revisions: [{ at, by: 'designer', note: 'Adopted by someone who does not hold the standard.', reviewBy: inDays(90), values: { noise: { value: '99', source: 'nobody at all' } } }],
    values: { noise: { value: '35 dB', source: 'x', at, by: 'architect' }, speed: { value: '1', source: 'A long enough source', at, by: 'architect' }, 'max-level': { value: '80', source: 'Occupational health policy', at, by: 'service' } },
    siteAdds: [{ id: 'SA-001', building: 'ATL', principle: 'C-09', text: 'No camera faces the east glazing.', at, by: 'designer' }, { id: 'bad', building: 'ATL', principle: 'C-09', text: 'No camera faces the east glazing.', at, by: 'architect' }],
    exceptions: [{ ...ASK, id: 'EX-0001', at, by: 'designer', decision: { at, by: 'designer', approved: true, note: 'I approve my own request.' }, closed: null }, { ...ASK, id: 'EX-0002', at, by: 'employee', decision: null, closed: null }, { ...ASK, id: 'EX-0003', principle: 'S-01', at, by: 'designer', decision: null, closed: null }, { ...ASK, id: 'EX-0004', at, by: 'syseng', decision: { at, by: 'cxeng', approved: true, note: 'Approved by a role that cannot decide.' }, closed: { at, by: 'syseng', note: 'Closed without an approval behind it.' } }],
    sets: [{ id: 'RS-0001', room: ASK.room, roomName: 'X', rev: 1, at, by: 'designer', archetypeName: 'Y', requirements: g.requirements.slice(0, 3).map((r) => ({ id: r.id, origin: r.origin, text: r.text, noWaiver: false })), tests: ['a', 3], gaps: -4,
      findings: { [g.requirements[0].id]: { met: true, note: 'Found met by the role that saved it.', at, by: 'designer' }, [g.requirements[1].id]: { met: true, note: 'short', at, by: 'syseng' }, 'Z-00': { met: true, note: 'For a requirement the set does not hold.', at, by: 'syseng' }, [g.requirements[2].id]: { met: false, note: 'Not shown on any drawing.', at, by: 'syseng' } } },
    { id: 'RS-0002', room: ASK.room, rev: 1, at, by: 'employee', requirements: [] }] };
  const s = O.manualView(w);
  assert.equal(s.revisions.length, 1); assert.equal(s.revisions[0].by, 'architect', 'a revision adopted by a non-owner is not read; the seeded edition stands'); assert.deepEqual(s.revisions[0].values, {});
  assert.deepEqual(Object.keys(s.values), []); assert.equal(s.siteAdds.length, 0);
  assert.deepEqual(s.exceptions.map((e) => e.id), ['EX-0001', 'EX-0004']); assert.equal(s.exceptions[0].decision, null, 'a self-approval is dropped'); assert.equal(s.exceptions[1].decision, null); assert.equal(s.exceptions[1].closed, null, 'a closure with no approval behind it is dropped');
  assert.deepEqual(s.sets.map((x) => x.id), ['RS-0001']); assert.deepEqual(Object.keys(s.sets[0].findings), [g.requirements[2].id]); assert.deepEqual(s.sets[0].tests, ['a']); assert.equal(s.sets[0].gaps, 0);
});

test('MN-10 the page is registered for the technical staff and the project manager; the acts are V2.5.3’s; the manual can be searched', () => {
  const page = PG.PAGES.find((p) => p.id === 'manual'); assert.ok(page); assert.equal(page.path, '/manual');
  assert.deepEqual([...O.MAN_ROLES.read].sort(), [...new Set([...P.rolesFor({ area: 'learn' }), 'ipm'])].sort()); assert.deepEqual([...O.MAN_ROLES.owner], ['architect']);
  for (const r of ['employee', 'visitor', 'sitechamp', 'exec', 'qa', 'bpm']) assert.equal(O.MAN_ROLES.read.includes(r), false, r);
  for (const h of ['#/manual', '#/manual/ch/audio', '#/manual/build', '#/manual/exceptions', '#/manual/edition', '#/manual/set/RS-0001']) assert.equal(PG.resolve(h)?.page.id, 'manual', h);
  assert.deepEqual(page.actions.map((a) => a.id), ['manual.set', 'manual.exception', 'manual.decide', 'manual.edition']);
  assert.deepEqual(page.actions[0].authority, { action: 'build.design' }); assert.deepEqual(page.actions[2].authority, { action: 'design.decide' }); assert.deepEqual(page.actions[3].authority.roles, ['architect']);
  const hit = M.searchManual('echo reference'); assert.ok(hit.some((h) => h.principle.id === 'A-05')); assert.ok(hit.every((h) => /echo/i.test(`${h.principle.say} ${h.principle.why} ${h.principle.check || ''}`)));
  assert.deepEqual(M.searchManual(''), []); assert.deepEqual(M.searchManual('zzzz'), []); assert.ok(M.searchManual('C-07').some((h) => h.principle.id === 'C-07')); assert.ok(M.searchManual('camera height').some((h) => h.principle.id === 'C-02'));
  assert.equal(M.chapterOf('N-06').id, 'network'); assert.equal(M.chapterById('nope'), undefined);
});
