// Where each role starts (founder, 10 Nov: every role's start page is different and gets it working, with jump-to buttons and
// shortcuts). The model (apps/demo/src/campus/rolehome.ts) and the shortcut decisions (start/shortcuts.ts) as pure functions, against
// the real access policy and the real synthetic records.   node --test tests/unit/demo-rolehome.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const entry = `export * as H from './campus/rolehome.ts'; export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as W from './workspace/store.ts'; export * as M from './campus/metrics.ts'; export * as D from './campus/design.ts'; export * as PR from './campus/programme.ts'; export * as K from './start/shortcuts.ts';`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-rolehome-')), 'm.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false, nodePaths: [path.join(repo, 'node_modules')],
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined); } }] });
const { H, P, R, W, M, D, PR, K } = await import(pathToFileURL(out).href);

const ROLES = P.ROLE_KEYS; const w = W.seed(); const NOW = Date.now();
const opensFor = (role) => (href) => { const r = R.resolve(href.split('?')[0]); return !!r && P.canOpen(role, r); };
const start = (role, ws = w, extra = {}) => H.startFor({ role, w: ws, opens: opensFor(role), now: NOW, ...extra });
const hrefs = (s) => [s.primary?.href, ...s.jumps.map((j) => j.href), ...s.tiles.map((t) => t.href), ...s.zones.flatMap((z) => [z.more?.href, ...z.rows.map((r) => r.href)]), ...(s.strip ? [...s.strip.changed, ...s.strip.matters, ...s.strip.decide].map((r) => r.href) : [])].filter(Boolean);
const text = (s) => [s.headline, s.summary, s.primary?.label, s.primary?.why, ...s.tiles.flatMap((t) => [t.label, t.value, t.unit, t.hint]), ...s.zones.flatMap((z) => [z.title, z.hint, z.empty, ...z.rows.flatMap((r) => [r.title, r.sub, r.tag])])].filter(Boolean).join(' | ');

test('RH-01 all fifteen roles have a start page, named as V2.5.3 named each role’s home', () => {
  assert.equal(ROLES.length, 15);
  for (const r of ROLES) { const s = start(r); assert.equal(s.role, r); assert.equal(s.name, P.ROLES[r].home, r); assert.ok(s.headline.length > 3 && s.summary.length > 20 && s.basis.length > 20, r); }
  assert.deepEqual([...H.MISSION_ROLES], ['ops', 'architect']);
  assert.equal(new Set(ROLES.map((r) => start(r).headline)).size >= 13, true, 'the start pages do not all say the same thing');
});
test('RH-02 every role is offered at least three places to jump to, each one action away, with a letter of its own', () => {
  for (const r of ROLES) {
    const j = start(r).jumps; assert.ok(j.length >= 3, `${r}: ${j.length} jumps (${j.map((x) => x.label).join(', ')})`); assert.ok(j.length <= 6, r);
    const keys = j.map((x) => x.key); assert.equal(new Set(keys).size, keys.length, `${r}: a letter is used twice`);
    for (const x of j) { assert.match(x.key, /^[a-z]$/, r); assert.ok(!['g', 'h'].includes(x.key), `${r}: ${x.key} is reserved`); assert.ok(x.label && x.sub, r); }
  }
});
test('RH-03 a start page never names a place its role cannot open: every link on every role’s page opens for that role', () => {
  let n = 0;
  for (const r of ROLES) for (const h of hrefs(start(r))) { n += 1; const at = R.resolve(h.split('?')[0]); assert.ok(at, `${r}: ${h} is not an address of the demonstration`); assert.ok(P.canOpen(r, at), `${r} is offered ${h} and may not open it`); }
  assert.ok(n > 120, `${n} links checked`);
});
test('RH-04 every entry of every jump table is a real address (so a role that loses one loses it because of the policy, not a typo)', () => {
  for (const r of ROLES) for (const j of H.jumpsFor(r, () => true)) assert.ok(R.resolve(j.href.split('?')[0]), `${r}: ${j.href}`);
});
test('RH-05 a visitor and an employee are shown no score, no issue count and no money', () => {
  for (const r of ['visitor', 'employee']) { const s = start(r); assert.deepEqual(s.tiles, [], r); assert.equal(s.strip, null, r); assert.doesNotMatch(text(s), /\$|\/100|health|funded|authoris|verified|work order/i, r); }
  assert.equal(start('visitor').zones.length, 0); assert.equal(start('visitor').primary.href, '#/lite/way');
});
test('RH-06 the Executive’s figures are the campus’s own: health, healthy rooms, verified tests and the funding on record', () => {
  const s = start('exec'); const c = M.campusStats(w); const funded = PR.programme().funding.reduce((a, f) => a + f.amount, 0);
  const tile = (l) => s.tiles.find((t) => t.label === l);
  assert.equal(tile('Campus health').value, String(c.score)); assert.equal(tile('Rooms healthy').value, String(c.healthy)); assert.equal(tile('Rooms healthy').unit, ` of ${c.rooms}`);
  assert.equal(tile('Tests verified').value, String(c.verifiedPct)); assert.equal(tile('Funding authorised').value, `$${Math.round(funded / 1000)}k`);
  assert.match(s.summary, new RegExp(`stands at ${c.score} of 100`)); assert.match(s.summary, /PRJ-NST-TH is approved and not yet funded/);
  const decide = s.zones.find((z) => z.id === 'decide'); assert.equal(decide.rows.length, 1); assert.match(decide.rows[0].title, /Fund PRJ-NST-TH/); assert.match(s.headline, /^1 decision waits for a sponsor/);
  assert.match(s.basis, /not live monitoring/);
});
test('RH-07 the Service Engineer and the Installation Engineer start on their own next job, earliest window first', () => {
  for (const [role, tech] of [['service', 'tech-ana'], ['installer', 'tech-ben']]) {
    const s = start(role); const mine = w.workOrders.filter((x) => x.techId === tech && !['DONE', 'CANCELLED'].includes(x.state)).sort((a, b) => (a.window?.from || '9').localeCompare(b.window?.from || '9'));
    const jobs = s.zones.find((z) => z.id === 'jobs'); assert.deepEqual(jobs.rows.map((r) => r.id), mine.map((x) => x.id), role);
    if (mine.length) { assert.match(s.primary.label, new RegExp(`^(Accept|Continue) ${mine[0].id}$`), role); assert.equal(s.primary.href, `#/servicehands/wo/${mine[0].id}`); } else assert.match(jobs.empty, /No work order is assigned to you/);
    assert.ok(!jobs.rows.some((r) => w.workOrders.find((x) => x.id === r.id).techId !== tech), `${role} is shown only their own work orders`);
  }
});
test('RH-08 the Service Manager’s numbers are the workspace’s: live requests, to triage, open and unassigned work orders, load per person', () => {
  const s = start('svcmgr'); const LIVE = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESTORED', 'PENDING_VERIFICATION'];
  const live = w.incidents.filter((i) => LIVE.includes(i.state)); const tri = w.incidents.filter((i) => i.state === 'OPEN'); const wos = w.workOrders.filter((x) => !['DONE', 'CANCELLED'].includes(x.state));
  const tile = (l) => s.tiles.find((t) => t.label === l).value;
  assert.equal(tile('Live requests'), String(live.length)); assert.equal(tile('To triage'), String(tri.length)); assert.equal(tile('Open work orders'), String(wos.length)); assert.equal(tile('Technicians'), String(w.staff.length));
  const load = s.zones.find((z) => z.id === 'load').rows; assert.equal(load.length, w.staff.length); assert.equal(load.reduce((a, r) => a + Number(r.tag), 0), wos.filter((x) => x.techId).length);
  assert.deepEqual(s.zones.find((z) => z.id === 'triage').rows.map((r) => r.id), tri.map((i) => i.id));
});
test('RH-09 the Commissioning Engineer’s board is every room waiting for proof, blocked first, with verified counted from the records', () => {
  const s = start('cxeng'); const recs = D.allRecords();
  const board = recs.filter((r) => r.lifecycle === 'COMMISSIONING' || r.lifecycle === 'INSTALLED_UNVERIFIED' || r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE'));
  const rows = s.zones.find((z) => z.id === 'board').rows; assert.deepEqual(rows.map((r) => r.id).sort(), board.map((r) => r.outline.id).sort());
  const firstClear = rows.findIndex((r) => r.tag !== 'Blocked'); assert.ok(firstClear === -1 || rows.slice(firstClear).every((r) => r.tag !== 'Blocked'), 'blocked rooms come first');
  const app = board.reduce((a, r) => a + r.counts.applicable, 0); const ver = board.reduce((a, r) => a + r.counts.verified, 0);
  assert.equal(s.tiles.find((t) => t.label === 'Tests verified').hint, `${ver} of ${app} on this board`); assert.equal(s.tiles.find((t) => t.label === 'Rooms waiting for proof').value, String(board.length));
  assert.match(s.basis, /only when a second person verified it/);
});
test('RH-10 the Data Steward’s four identity counts add up to every device position on record', () => {
  const s = start('steward'); const pos = D.allRecords().flatMap((r) => r.positions.filter((p) => !p.furniture));
  const v = (l) => Number(s.tiles.find((t) => t.label === l).value);
  assert.equal(v('Verified') + v('Observed') + v('Declared') + v('Unknown'), pos.length); assert.equal(v('Verified'), pos.filter((p) => p.identity === 'VERIFIED').length);
  assert.match(s.headline, new RegExp(`^${v('Verified')} of ${pos.length} device positions are verified`));
});
test('RH-11 the engineer and the designer see the build pipeline from the same stations as Mission Control, and a draft is the first thing offered', () => {
  for (const r of ['syseng', 'designer']) { const s = start(r); assert.deepEqual(s.tiles.map((t) => t.label), ['Intake', 'Design', 'Procurement', 'Installation', 'Commissioning', 'Acceptance'], r); assert.equal(s.tiles.reduce((a, t) => a + Number(t.value), 0) > 0, true); }
  const withDraft = start('designer', w, { draft: { code: 'DRAFT-0007', name: 'Harbor huddle' } }); assert.equal(withDraft.primary.label, 'Resume DRAFT-0007'); assert.match(withDraft.summary, /Your draft DRAFT-0007 is part-way/);
  assert.notEqual(start('designer').zones[1].id, start('syseng').zones[1].id, 'the designer’s desk and the engineer’s findings are different zones');
});
test('RH-12 the two project managers see the same projects from their own side: the business need and money, or delivery and movement', () => {
  const b = start('bpm'); const i = start('ipm'); const P0 = PR.programme();
  assert.equal(b.zones[0].rows.length, P0.projects.length); assert.equal(i.zones[0].rows.length, P0.projects.length);
  assert.ok(b.zones[0].rows.some((r) => /Refresh the Atlas executive boardroom/.test(r.title) && /\$184k authorised/.test(r.sub))); assert.ok(i.zones[0].rows.some((r) => /PRJ-ATLAS-AV · field active/.test(r.title)));
  assert.deepEqual(b.tiles, []); assert.deepEqual(i.tiles.map((t) => t.label), ['Installation', 'Commissioning', 'Acceptance']);
});
test('RH-13 "What needs my decision" holds only reviews that are this role’s; "What changed" holds only the last day', () => {
  for (const r of ROLES) { const s = start(r); if (!s.strip) continue;
    for (const d of s.strip.decide) assert.equal(d.tag, 'Review', r); for (const m of s.strip.matters) assert.notEqual(m.tag, 'Review', r);
    assert.ok(s.strip.cols.length >= 2 && s.strip.cols.every((c) => ['changed', 'matters', 'decide'].includes(c)), r); assert.ok(s.strip.changed.length <= 3 && s.strip.matters.length <= 3 && s.strip.decide.length <= 3, r); }
  const old = structuredClone(w); old.events = [{ at: new Date(NOW - 3 * 864e5).toISOString(), by: 'svcmgr', type: 'service.triage', aggregate: 'ISS-0001', detail: 'old', outcome: 'ALLOWED' }, { at: new Date(NOW - 3600e3).toISOString(), by: 'svcmgr', type: 'service.assign', aggregate: 'ISS-0002', detail: 'new', outcome: 'DENIED' }];
  const c = start('svcmgr', old).strip.changed; assert.equal(c.length, 1); assert.match(c[0].title, /assign · ISS-0002/); assert.match(c[0].sub, /refused/);
});
test('RH-14 with nothing on record every role still gets a page that says so in words, and nothing throws', () => {
  for (const r of ROLES) { const s = start(r, null); assert.ok(s.headline && s.summary, r); for (const z of s.zones) assert.ok(z.rows.length || z.empty.length > 10, `${r}/${z.id}`); }
  assert.match(start('service', null).zones[0].empty, /No work order is assigned to you/); assert.match(start('svcmgr', null).headline, /^0 requests live, 0 to triage/);
});
test('RH-15 a role that may open nothing is offered nothing: the model has no link the policy did not grant', () => {
  for (const r of ROLES) { const s = H.startFor({ role: r, w, opens: () => false, now: NOW }); assert.deepEqual(hrefs(s), [], r); assert.equal(s.primary, null, r); assert.deepEqual(s.jumps, [], r); }
});

// ------------------------------------------------------------------------------------------------------------ shortcuts
const ev = (key, at, extra = {}) => ({ key, at, ctrl: false, meta: false, alt: false, typing: false, dialog: false, ...extra });
const J = { c: '#/campus', s: '#/search' };
test('SK-01 g then a letter goes to that place; g then h is always the start page; the wait is a second and a half', () => {
  let r = K.onKey({ armed: 0 }, ev('g', 1000), J, true); assert.deepEqual(r.act, { kind: 'armed' });
  assert.deepEqual(K.onKey(r.m, ev('c', 1400), J, true).act, { kind: 'go', href: '#/campus' }); assert.deepEqual(K.onKey(r.m, ev('C', 1400), J, true).act, { kind: 'go', href: '#/campus' });
  assert.deepEqual(K.onKey(r.m, ev('h', 2500), J, true).act, { kind: 'go', href: '#/home' });
  assert.equal(K.onKey(r.m, ev('c', 1000 + K.G_WAIT_MS + 1), J, true).act, null, 'too late');
  const miss = K.onKey(r.m, ev('z', 1200), J, true); assert.equal(miss.act, null); assert.equal(miss.m.armed, 0, 'an unknown letter disarms');
  assert.equal(K.onKey({ armed: 0 }, ev('c', 1000), J, true).act, null, 'a letter alone does nothing');
});
test('SK-02 nothing fires while typing, in a dialog or with a modifier held, and a half-typed shortcut is dropped', () => {
  const armed = { armed: 1000 };
  for (const x of [{ typing: true }, { dialog: true }, { ctrl: true }, { meta: true }, { alt: true }]) { const r = K.onKey(armed, ev('c', 1100, x), J, true); assert.equal(r.act, null, JSON.stringify(x)); assert.equal(r.m.armed, 0); assert.equal(K.onKey({ armed: 0 }, ev('g', 1100, x), J, true).act, null); assert.equal(K.onKey({ armed: 0 }, ev('?', 1100, x), J, true).act, null); }
});
test('SK-03 turned off, single keys do nothing; the list of shortcuts still opens, because that is where they are turned back on', () => {
  assert.equal(K.onKey({ armed: 0 }, ev('g', 1000), J, false).act, null); assert.equal(K.onKey({ armed: 1000 }, ev('c', 1100), J, false).act, null);
  assert.deepEqual(K.onKey({ armed: 0 }, ev('?', 1000), J, false).act, { kind: 'help' }); assert.deepEqual(K.onKey({ armed: 0 }, ev('?', 1000), J, true).act, { kind: 'help' });
});
test('SK-04 the letters a role is shown are exactly the letters that work for it', () => {
  for (const r of ROLES) { const j = start(r).jumps; const map = Object.fromEntries(j.map((x) => [x.key, x.href]));
    for (const x of j) assert.deepEqual(K.onKey({ armed: 1 }, ev(x.key, 2), map, true).act, { kind: 'go', href: x.href }, `${r} g ${x.key}`); }
});
