// The five capabilities built after VOICE, FLOW and MissionProof (Enterprise 3.0 directive 1; founder's Day 2 order, item 5):
// PRISM (signage assurance), SENTINEL (secondary emergency communications, simulation only), ACCORD (scoped evidence between
// organisations), FORGE (Room-as-Code) and OMNIPRESENCE (a building's tag). What these tests hold each one to:
//   - it stands on the estate's own records and on the engines that already exist (no duplicate of Core, ServiceHands or control);
//   - what is not known is never reported as good: a stale or missing player report, an acknowledgement without proof, an expired
//     capsule, a unit with no verified capability pack, a presence that was not proven;
//   - the boundary of each is enforced in the model, not in the page: what crosses to another organisation, what FORGE refuses to
//     generate, what a tag may carry, who may approve, raise, withdraw or control.
//   node --test tests/unit/modules.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-')); const entry = path.join(tmp, 'e.ts'); const out = path.join(tmp, 'm.mjs');
const at = (p) => JSON.stringify(path.join(repo, p));
fs.writeFileSync(entry, [
  `export * as P from ${at('apps/demo/src/prism/model.ts')};`, `export * as SN from ${at('apps/demo/src/sentinel/model.ts')};`, `export * as A from ${at('apps/demo/src/accord/model.ts')};`,
  `export * as F from ${at('apps/demo/src/forge/model.ts')};`, `export * as O from ${at('apps/demo/src/omni/model.ts')};`, `export * as R from ${at('apps/demo/src/module-roles.ts')};`,
  `export { resolve } from ${at('apps/demo/src/registry.pages.ts')};`, `export { canOpen, allows, ROLE_KEYS } from ${at('apps/demo/src/access/policy.ts')};`,
  `export { buildEstate } from ${at('apps/demo/src/search/estate.ts')};`, `export * as S from ${at('apps/demo/src/workspace/store.ts')};`, `export * as C from ${at('apps/demo/src/control/store.ts')};`,
  `export { BUILDINGS } from ${at('apps/demo/src/campus/canon.ts')};`, `export { roomRecord } from ${at('apps/demo/src/campus/design.ts')};`, `export { qrMatrix } from ${at('apps/demo/src/lite/qr.ts')};`,
  `export { FAMILIES, CAPABILITIES } from ${at('packages/ui/src/families.ts')};`, `export { SESSION } from ${at('apps/demo/src/voice/model.ts')};`,
].join('\n'));
await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic', nodePaths: [path.join(repo, 'node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.png': 'empty', '.webp': 'empty', '.jpg': 'empty' } });
const { P, SN, A, F, O, R, resolve, canOpen, allows, ROLE_KEYS, buildEstate, S, C, BUILDINGS, roomRecord, qrMatrix, FAMILIES, CAPABILITIES, SESSION } = await import(pathToFileURL(out).href);
const est = buildEstate(); const has = (type, id) => est.nodes.some((n) => n.type === type && n.id === id);
const opens = (role, addr) => { const r = resolve(addr); return !!r && canOpen(role, r); };
const who = (addr) => ROLE_KEYS.filter((r) => opens(r, addr)).sort();
const acts = (addr, id) => { const a = resolve(addr).page.actions.find((x) => x.id === id); return ROLE_KEYS.filter((r) => allows(a.authority, r)).sort(); };
const sorted = (a) => [...a].sort();

// ------------------------------------------------------------------------------------------------ PRISM
test('PRISM: every screen is the estate’s own asset at a display position of its room; nothing is duplicated or invented', () => {
  const all = P.screens(); assert.equal(all.length, 6);
  for (const s of all) { assert.ok(has('Asset', s.id), `${s.id} is an estate asset`); const p = roomRecord(s.roomId).positions.find((x) => x.code === s.position); assert.equal(p.asset, s.id); assert.equal(p.layer, 'display'); }
  assert.equal(new Set(all.map((s) => s.id)).size, 6);
});
test('PRISM: a stale, missing or unreadable report is never “as scheduled”; intended, reported and proof stay apart', () => {
  const now = '2026-11-23T15:20:00Z'; const fresh = { item: 'CI-WELCOME', at: '2026-11-23T15:19:00Z', proof: 'RECORD' };
  assert.equal(P.judge('CI-WELCOME', fresh, true, now).verdict, 'MATCH');
  assert.equal(P.judge('CI-TOWNHALL', fresh, true, now).verdict, 'MISMATCH');
  assert.equal(P.judge('CI-WELCOME', { ...fresh, at: '2026-11-23T15:14:59Z' }, true, now).verdict, 'OFFLINE', 'one second past the five-minute rule is stale');
  assert.equal(P.judge('CI-WELCOME', { ...fresh, at: '2026-11-23T15:15:00Z' }, true, now).verdict, 'MATCH', 'exactly at the rule is still fresh');
  assert.equal(P.judge('CI-WELCOME', null, true, now).verdict, 'OFFLINE');
  assert.equal(P.judge('CI-WELCOME', fresh, false, now).verdict, 'UNKNOWN', 'no player connection: nothing is known, whatever a report says');
  assert.equal(P.judge('CI-WELCOME', { ...fresh, at: '2026-11-23T16:00:00Z' }, true, now).verdict, 'UNKNOWN', 'a report from the future is not used');
  assert.equal(P.judge('CI-WELCOME', { ...fresh, at: 'yesterday' }, true, now).verdict, 'UNKNOWN');
  assert.equal(P.judge(null, { ...fresh, item: 'CI-IDLE' }, true, now).verdict, 'MATCH', 'nothing scheduled and an idle screen');
  assert.equal(P.judge(null, fresh, true, now).verdict, 'MISMATCH', 'content on a screen with nothing scheduled is an exception');
  const all = P.screens(); const by = Object.fromEntries(all.map((s) => [s.roomId, s]));
  assert.deepEqual(all.map((s) => s.verdict), ['MATCH', 'MATCH', 'MISMATCH', 'OFFLINE', 'UNKNOWN', 'MATCH']);
  for (const s of all) { assert.equal(s.intended.state, 'DECLARED'); if (s.verdict === 'MATCH') assert.equal(s.actual.state, 'SIMULATED'); else assert.notEqual(s.verdict, 'MATCH'); }
  assert.equal(by['R-HZN-1-400'].actual.state, 'STALE'); assert.equal(by['R-HZN-1-400'].proof.state, 'STALE'); assert.equal(by['R-BCN-3-236'].actual.state, 'NOT_CONFIGURED');
  const noProof = by['R-EGT-1-150']; assert.equal(noProof.verdict, 'MATCH'); assert.equal(noProof.proof.state, 'NOT_CONFIGURED'); assert.equal(noProof.provesRender, false); assert.match(noProof.proof.says, /Not supported/);
  const sum = P.summary(all); assert.deepEqual([sum.total, sum.match, sum.mismatch, sum.offline, sum.unknown, sum.exceptions], [6, 3, 1, 1, 1, 3]);
});
test('PRISM: one mock adapter, the rest contract only, no vendor named; a job raised for a screen is a real ServiceHands incident', () => {
  assert.deepEqual(P.ADAPTERS.map((a) => a.status), ['MOCK', 'CONTRACT_ONLY', 'CONTRACT_ONLY']);
  const w = S.seed(); const bad = P.screens().find((s) => s.verdict === 'MISMATCH'); const other = P.screens().find((s) => s.verdict === 'OFFLINE'); assert.equal(P.jobFor(w, bad), undefined);
  const r = S.raiseIncident(w, 'requestor', { roomId: bad.roomId, roomName: bad.roomName, buildingKey: bad.building, title: P.jobTitle(bad), summary: P.jobSummary(bad) }); assert.ok(r.id, JSON.stringify(r));
  assert.equal(P.jobFor(w, bad).id, r.id); assert.equal(P.jobFor(w, other), undefined, 'another screen does not inherit the job');
  assert.deepEqual(who('/prism'), sorted(R.PRISM_ROLES)); assert.deepEqual(acts('/prism', 'prism.raise'), sorted(R.PRISM_RAISE));
  for (const r2 of ['visitor', 'employee', 'ucadmin', 'designer']) assert.equal(opens(r2, '/prism'), false, r2);
});

// ------------------------------------------------------------------------------------------------ SENTINEL
test('SENTINEL: requested, acknowledged and proven shown stay apart; a route with no answer in the window is failed and stays failed', () => {
  const end = SN.routes(); const state = Object.fromEntries(end.map((r) => [r.id, r.state])); const screens = P.screens();
  assert.equal(end.length, screens.length + 1);
  for (const s of screens) { const st = state[`RT-${s.id}`];
    if (!s.reachable) assert.equal(st, 'FAILED', `${s.roomId}: a screen PRISM cannot reach is a failed route`);
    else if (s.provesRender) assert.equal(st, 'RENDERED'); else assert.equal(st, 'ACKNOWLEDGED', `${s.roomId}: an acknowledgement without proof is never “shown”`); }
  assert.equal(state['RT-DESKTOP'], 'ACKNOWLEDGED');
  const t = SN.tally(end); assert.deepEqual([t.total, t.rendered, t.acknowledged, t.requested, t.failed], [7, 3, 2, 0, 2]);
  const before = SN.routes(-1); assert.ok(before.every((r) => r.state === 'NOT_STARTED')); assert.equal(SN.tally(before).started, false);
  const one = SN.routes(1); assert.ok(one.every((r) => r.state !== 'RENDERED' && r.state !== 'FAILED'), 'one second in, nothing is proven and nothing has failed yet');
  assert.equal(one.filter((r) => r.state === 'REQUESTED').length, 2);
  for (const r of end) { const i = r.steps.findIndex((x) => x.state === 'FAILED'); if (i >= 0) assert.equal(i, r.steps.length - 1, 'nothing follows a failure'); assert.ok(r.steps.every((x) => x.basis === 'SIMULATED')); }
  assert.equal(SN.momentOf(null), SN.PLAN.ackWindowSeconds + 1); assert.equal(SN.momentOf('-1'), -1); assert.equal(SN.momentOf('7'), SN.PLAN.ackWindowSeconds + 1);
});
test('SENTINEL: it is a simulation, it originates nothing, and it says what it never does', () => {
  assert.equal(SN.BANNER, 'SIMULATION — NOT A LIFE-SAFETY SYSTEM');
  assert.match(SN.ALERT.source, /fictional/); assert.match(SN.ALERT.origin, /cannot create/); assert.match(SN.PLAN.review, /has not been done/);
  assert.ok(SN.NEVER.some((n) => /fire alarm/.test(n)) && SN.NEVER.some((n) => /never creates an alert/.test(n)) && SN.NEVER.some((n) => /no certification/.test(n)));
  const text = JSON.stringify([SN.routes(), SN.PLAN, SN.ALERT]); assert.ok(!/certified|compliant|activate the alarm|silence/i.test(text));
  const w = S.seed(); const failed = SN.routes().filter((r) => r.state === 'FAILED'); const first = failed[0];
  const r = S.raiseIncident(w, 'requestor', { roomId: first.roomId, roomName: first.target, buildingKey: roomRecord(first.roomId).outline.building, title: SN.JOB_TITLE, summary: SN.jobSummary(failed) }); assert.ok(r.id);
  assert.equal(SN.jobFor(w).id, r.id); for (const f of failed) assert.ok(SN.jobFor(w).summary.includes(f.screen));
  assert.deepEqual(who('/sentinel'), sorted(R.SENTINEL_ROLES)); assert.deepEqual(acts('/sentinel', 'sentinel.follow'), sorted(R.SENTINEL_FOLLOW));
  for (const r2 of ['visitor', 'employee', 'ucadmin', 'service']) assert.equal(opens(r2, '/sentinel'), false, r2);
});

// ------------------------------------------------------------------------------------------------ ACCORD
test('ACCORD: the provider receives the scoped lines and nothing else: no token, signalling detail, other room, other job, name or price', () => {
  const w = S.seed(); const v = A.view(w, 'provider', 'now', { withdrawnAt: null }); const text = JSON.stringify(v) + A.exportOf(v);
  assert.equal(v.status, 'ACTIVE'); assert.equal(v.items.length, 4); assert.ok(v.items.every((i) => i.lines.length && !('withheld' in i) && !('source' in i)));
  const forbidden = [SESSION.token, 'CS-7f3a', 'TRK-', 'SBC-', 'R-ATL-4-220', 'R-ATL-4-231', 'SW-ATL', 'ISS-0380', 'WO-00', 'MOS', '#/', ...w.staff.map((s) => s.name), ...w.incidents.filter((i) => i.id !== A.CAPSULE.subject.entityId).map((i) => i.title)];
  for (const f of forbidden) assert.ok(!text.includes(f), `the provider’s view contains ${f}`);
  assert.ok(text.includes('ISS-0417') && /loss .* %, jitter .* ms/.test(text));
  const file = JSON.parse(A.exportOf(v)); assert.equal(file.capsule, 'CAP-0001'); assert.equal(file.items.length, 4); assert.equal(file.expiresAt, A.CAPSULE.expiresAt); assert.equal(file.withheldDetails, v.redactions); assert.ok(v.redactions >= 8);
  const c = A.view(w, 'customer', 'now', { withdrawnAt: null }); assert.ok(c.items.every((i) => i.withheld.length && i.source)); assert.equal(A.exportOf(c), null, 'only the provider’s scoped view is a file');
});
test('ACCORD: after it ends or is withdrawn the provider can read and download nothing; the customer’s records are unchanged; it copies nothing', () => {
  const w = S.seed();
  for (const [clock, local, status] of [['expired', { withdrawnAt: null }, 'EXPIRED'], ['now', { withdrawnAt: '2026-11-24T09:00:00Z' }, 'WITHDRAWN'], ['expired', { withdrawnAt: '2026-11-24T09:00:00Z' }, 'EXPIRED']]) {
    const v = A.view(w, 'provider', clock, local); assert.equal(v.status, status); assert.equal(v.readable, false); assert.deepEqual(v.items, []); assert.equal(A.exportOf(v), null);
    assert.equal(A.view(w, 'customer', clock, local).items.length, 4); }
  const before = A.view(w, 'provider', 'now', { withdrawnAt: null }).items[0].lines.join(' '); const job = w.incidents.find((i) => i.id === 'ISS-0417'); job.state = 'RESOLVED';
  const after = A.view(w, 'provider', 'now', { withdrawnAt: null }).items[0].lines.join(' '); assert.notEqual(before, after); assert.match(after, /resolved/);
  assert.notEqual(A.CAPSULE.sharedBy, A.CAPSULE.approvedBy, 'the one who shares does not approve');
  assert.ok(Date.parse(A.CAPSULE.expiresAt) > Date.parse(A.CLOCKS.now) && Date.parse(A.CLOCKS.expired) > Date.parse(A.CAPSULE.expiresAt));
  assert.match(A.PARTIES.customer.name, /synthetic/); assert.match(A.PARTIES.provider.name, /fictional/); assert.match(A.CAPSULE.agreement, /fictional/);
  assert.deepEqual(who('/accord'), sorted(R.ACCORD_ROLES)); assert.deepEqual(acts('/accord', 'accord.withdraw'), sorted(R.ACCORD_WITHDRAW));
  for (const r2 of ['visitor', 'employee', 'ucadmin']) assert.equal(opens(r2, '/accord'), false, r2);
});

// ------------------------------------------------------------------------------------------------ FORGE
test('FORGE: the package is derived from the room’s design record, deterministically; a bill of materials of class templates says so', () => {
  const p = F.compile('R-ATL-4-218'); const again = F.compile('R-ATL-4-218'); const r = roomRecord('R-ATL-4-218'); const units = r.positions.filter((x) => !x.furniture);
  assert.deepEqual(p, again); assert.match(p.fingerprint, /^[0-9a-f]{8}$/); assert.equal(p.revision, 2); assert.equal(p.previous, 1);
  assert.deepEqual(p.artifacts.map((a) => a.id), ['schema', 'bom', 'paths', 'install', 'acceptance', 'asbuilt']);
  const bom = p.artifacts.find((a) => a.id === 'bom'); assert.equal(bom.status, 'COMPILED_WITH_GAPS'); assert.equal(bom.lines.reduce((n, l) => n + Number(l.split(' × ')[0]), 0), units.length);
  assert.ok(p.artifacts.find((a) => a.id === 'acceptance').says.includes(`${r.counts.applicable} tests`));
  assert.equal(p.findings.length, r.findings.length); assert.ok(p.changes.length >= 1 && /AS-0112/.test(p.changes.join(' ')), 'the camera replacement is the change since the accepted revision'); assert.match(p.rollback, /Revision 1 is the accepted baseline/);
  assert.notEqual(F.compile('R-NST-2-101').fingerprint, p.fingerprint); assert.equal(F.compile('R-NOPE-0-000'), null);
  assert.equal(F.fingerprint('a'), 'e40c292c', 'FNV-1a reference value');
});
test('FORGE: no configuration without a verified capability pack: every target is rejected by name, and no command exists anywhere', () => {
  assert.equal(F.CAPABILITY_PACKS.length, 0);
  for (const id of F.FORGE_ROOMS) { const p = F.compile(id); assert.equal(p.configs.length > 0, p.designed, id); assert.ok(p.configs.every((c) => c.status === 'REJECTED' && /no vendor-verified capability pack/.test(c.why)));
    assert.ok(!p.artifacts.some((a) => /config/i.test(a.id)), 'configuration is not an artefact'); assert.ok(!/"(command|payload|script)"/i.test(JSON.stringify(p))); }
  const bare = F.compile('R-NST-2-101'); assert.equal(bare.designed, false, 'a room with no equipment designed');
  assert.deepEqual(bare.artifacts.map((a) => a.status), ['COMPILED_WITH_GAPS', 'NOT_AVAILABLE', 'NOT_AVAILABLE', 'NOT_AVAILABLE', 'NOT_AVAILABLE', 'NOT_AVAILABLE'], 'nothing is compiled from nothing');
  assert.equal(F.mayApprove('cxeng', bare, R.FORGE_APPROVE).ok, false); assert.match(F.mayApprove('cxeng', bare, R.FORGE_APPROVE).why, /nothing to approve/);
});
test('FORGE: approval needs a second person, has no high-severity finding open, and counts only for the exact content', () => {
  const p = F.compile('R-ATL-4-218'); const AP = R.FORGE_APPROVE;
  assert.equal(F.mayApprove('designer', p, [...AP, 'designer']).ok, false, 'the author cannot approve, even if listed');
  assert.equal(F.mayApprove('installer', p, AP).ok, false); assert.equal(F.mayApprove('cxeng', p, AP).ok, true); assert.equal(F.mayApprove('architect', p, AP).ok, true);
  assert.equal(F.mayApprove('cxeng', { ...p, blockers: 1 }, AP).ok, false);
  const a = { roomId: p.roomId, revision: p.revision, fingerprint: p.fingerprint, by: 'cxeng', at: '2026-11-24T10:00:00Z' };
  assert.equal(F.approvalOf([a], p), a); assert.equal(F.approvalOf([{ ...a, fingerprint: '00000000' }], p), undefined, 'a changed design is unapproved again'); assert.equal(F.approvalOf([{ ...a, revision: 1 }], p), undefined);
  assert.deepEqual(who('/forge'), sorted(R.FORGE_ROLES)); assert.deepEqual(who('/forge/room/R-ATL-4-218'), sorted(R.FORGE_ROLES)); assert.deepEqual(acts('/forge', 'forge.approve'), sorted(R.FORGE_APPROVE));
  assert.ok(!R.FORGE_APPROVE.includes(F.AUTHOR));
});

// ------------------------------------------------------------------------------------------------ OMNIPRESENCE
test('OMNIPRESENCE: a tag carries a building’s key and nothing else, and fits a tag', () => {
  const base = 'https://empathia-demo-next.onrender.com/';
  for (const b of BUILDINGS) { const t = O.tagPayload(base, b.key); assert.deepEqual(O.tagProblems(t), [], t); assert.ok(qrMatrix(t), `${t} fits a QR code`); }
  assert.deepEqual(O.tagProblems(O.tagPayload('http://127.0.0.1:4173/', 'ATL')), [], 'the site’s own address is not the tag’s content');
  const bad = (t) => O.tagProblems(t).length > 0;
  assert.ok(bad(`${base}?token=abc#/omnipresence/b/ATL`)); assert.ok(bad('https://user:pw@example.test/#/omnipresence/b/ATL')); assert.ok(bad(`${base}#/omnipresence/b/ATL?gw=10.0.4.12`));
  assert.ok(bad(`${base}#/omnipresence/b/ATL?room=R-ATL-4-218`), 'a tag names a building, not a room or a state'); assert.ok(bad(`${base}#/control/R-ATL-4-218`)); assert.ok(bad('not an address'));
});
test('OMNIPRESENCE: place, identity, authority and presence are separate claims; a tag proves none of the last three', () => {
  const c = Object.fromEntries(O.claims('ops', 'ATL', 'none').map((x) => [x.id, x])); assert.deepEqual(Object.keys(c), ['place', 'identity', 'authority', 'presence']);
  assert.equal(c.presence.state, 'UNKNOWN'); assert.equal(c.place.state, 'DECLARED'); assert.match(c.place.says, /proves nothing/);
  assert.equal(O.claims('ops', 'ATL', 'anchor')[3].state, 'SIMULATED'); assert.equal(O.presenceOf('qr'), 'none'); assert.equal(O.presenceOf(null), 'none');
  assert.ok(O.rooms('ATL').length > 5 && O.rooms('ATL').every((r) => r.building === 'ATL')); assert.deepEqual(O.rooms('ATL', '4.218').map((r) => r.id), ['R-ATL-4-218']); assert.deepEqual(O.rooms('ATL', 'zzzz'), []);
});
test('OMNIPRESENCE: control from a tag needs authority, scope, capability and a presence proof, all at once; the answer comes in stages', () => {
  const room = 'R-ATL-4-218'; const ev = (role, b, p) => O.evaluate(role, b, room, p);
  assert.equal(ev('ops', 'ATL', 'anchor').allowed, true); assert.ok(ev('ops', 'ATL', 'anchor').checks.every((c) => c.ok));
  const noProof = ev('ops', 'ATL', 'none'); assert.equal(noProof.allowed, false); assert.deepEqual(noProof.checks.filter((c) => !c.ok).map((c) => c.id), ['presence', 'permission']);
  for (const role of ROLE_KEYS.filter((r) => !O.mayControl(r))) assert.equal(ev(role, 'ATL', 'anchor').allowed, false, `${role}: a presence proof gives no authority`);
  assert.equal(ev('visitor', 'ATL', 'anchor').checks[0].ok, false); assert.equal(ev('ops', 'NST', 'anchor').allowed, false, 'a tag of another building does not reach this room');
  assert.equal(O.evaluate('ops', 'ATL', 'R-NOPE', 'anchor').allowed, false);
  const w = S.seed(); const done = C.act(w, 'ops', room, { type: 'power', on: true }); assert.ok(!('why' in done), JSON.stringify(done));
  const lines = O.receipt(done, 'ops'); assert.deepEqual(lines.slice(0, 2).map((l) => l.stage), ['REQUESTED', 'ACCEPTED']); assert.ok(lines.length > 2 && lines.slice(2).every((l) => l.stage === 'OBSERVED' && l.basis === 'SIMULATED'));
  const failed = O.receipt({ ...done, feedback: [{ ...done.feedback[0], ok: false }] }, 'ops'); assert.equal(failed[2].stage, 'FAILED');
  assert.ok('why' in C.act(S.seed(), 'visitor', room, { type: 'power', on: true }), 'the room’s own rule still refuses a role that does not operate rooms');
  assert.deepEqual(who('/omnipresence'), sorted(ROLE_KEYS)); assert.deepEqual(who('/omnipresence/b/ATL'), sorted(ROLE_KEYS));
});

// ------------------------------------------------------------------------------------------------ the platform
test('all seventeen capabilities are built and each address resolves to a page; no model stores a copy of another module’s record', () => {
  assert.equal(CAPABILITIES.length, 17); assert.ok(CAPABILITIES.every((c) => c.built && c.demo && resolve(c.demo)), CAPABILITIES.filter((c) => !c.built || !resolve(c.demo || '/nope')).map((c) => c.id).join(','));
  assert.equal(FAMILIES.length, 6);
  for (const f of ['prism', 'sentinel', 'accord', 'forge', 'omni']) { const src = fs.readFileSync(path.join(repo, `apps/demo/src/${f}/model.ts`), 'utf8'); assert.ok(!/from 'react'/.test(src), `${f}/model.ts runs without React`); }
  assert.match(fs.readFileSync(path.join(repo, 'apps/demo/src/sentinel/model.ts'), 'utf8'), /from '\.\.\/prism\/model\.js'/, 'SENTINEL’s screens are PRISM’s');
  assert.match(fs.readFileSync(path.join(repo, 'apps/demo/src/omni/model.ts'), 'utf8'), /from '\.\.\/control\/model\.js'/, 'OMNIPRESENCE’s control is the room panel’s');
});
