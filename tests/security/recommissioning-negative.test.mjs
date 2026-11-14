/**
 * Negative paths of the position / physical asset / installation model (ADR-0012) and of recommissioning, over real HTTP and a real
 * PostgreSQL database (a private one, migrated and seeded through the real code). Synthetic data only.
 *
 * Every state is reached through the API by the persona that holds the authority. Direct SQL appears in two forms only, each said so
 * where it is used: superuser READS that count rows (to show what a request did or did not write), and CONSTRAINT PROOFS — an invalid
 * row attempted as the runtime role empathia_app, to show the database itself refuses it. No test writes a row to manufacture a result.
 *   node --test tests/security/recommissioning-negative.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client, DEV_PASSWORD, mail, repo, registerRoom } from '../integration/harness.mjs';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const CE = await import(pathToFileURL(path.join(repo, 'packages/commissioning-engine/dist/src/index.js')).href);   // the shared refusal wording

let h, c, T = {}, ids = {}, A, B, P, rows, v1Before, revsBefore, units = {};
const atInstall = {}; let buildingA = false;   // the installation as recorded, before the register (14 Nov 2026); whether room A is being built
const J = (x) => JSON.stringify(x);
const instrument = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';
const call = (persona, method, p, opts = {}) => c.call(method, p, { token: opts.token || T[persona], body: opts.body, headers: opts.headers, raw: opts.raw });
const move = (code, to, persona, token) => call(persona, 'POST', `/v1/rooms/${code}/lifecycle`, { body: { to }, token });
const room = (code) => call('syseng', 'GET', `/v1/rooms/${code}`);
const ready = async (code) => (await call('designer', 'GET', `/v1/rooms/${code}/readiness`)).body;
const posHistory = async (code, pos, persona = 'syseng') => call(persona, 'GET', `/v1/rooms/${code}/positions/${pos}/history`);
const current = async (code, pos) => (await posHistory(code, pos)).body.installations.find((i) => !i.removedAt);
const evidence = async (label) => (await call('cxeng', 'POST', '/v1/evidence', { raw: Buffer.from(`synthetic observation: ${label}`), headers: { 'content-type': 'text/plain', 'x-file-name': `${label}.txt` } })).body;
const fresh = async (role, tenant = 'empathia-demo', who) => (await c.call('POST', '/v1/auth/token', { body: { email: who ? `${who}@${tenant}.empathia.invalid` : mail(role, tenant), password: DEV_PASSWORD, tenant, role } })).body.accessToken;
const n = (sql) => Number(h.asSuper(sql));   // superuser READ (counting what was written)
const count = { installations: (pos) => n(`SELECT count(*) FROM app.asset_installation i JOIN app.planned_asset p ON p.id = i.position_id JOIN app.room r ON r.id = p.room_id WHERE r.code = '${A}' AND p.code = '${pos}'`),
  replacedEvents: () => n(`SELECT count(*) FROM app.outbox_event WHERE type = 'commission.asset_replaced' AND aggregate_id = '${A}'`),
  replacedAudits: () => n(`SELECT count(*) FROM app.audit_event WHERE action = 'commission.asset_replaced' AND outcome = 'ALLOWED' AND aggregate_id = '${A}'`),
  assets: () => n('SELECT count(*) FROM app.physical_asset') };
/** A CONSTRAINT PROOF: one statement as the runtime role empathia_app (RLS applies) in the given tenant; returns the error, if any. */
async function asApp(tenantId, sql, args = []) {
  const k = await h.appConn();
  try { await k.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]); const r = await k.query(sql, args); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, code: e.code, message: e.message, constraint: e.constraint }; }
  finally { await k.end(); }
}
/** Take a room through the governed lifecycle to `upto`, each step by its authority (the design saved by the designer, approved by the systems engineer). */
async function build(name, upto, buildingCode = 'NST') {
  const r = await call('designer', 'POST', '/v1/rooms', { body: { name, template: 'huddle', buildingCode, floor: 1 } });
  assert.equal(r.status, 201, J(r.body)); const code = r.body.code;
  assert.equal((await call('designer', 'POST', `/v1/rooms/${code}/devices`, { body: { category: 'table', x: 1, y: 1, mount: 'floor' } })).status, 201);
  assert.equal((await call('designer', 'POST', `/v1/rooms/${code}/revisions`, { body: { reason: 'synthetic: the huddle as designed' } })).status, 201);
  assert.equal((await call('syseng', 'POST', `/v1/rooms/${code}/classification/approve`, { body: {} })).status, 200);
  for (const [to, who] of [['DESIGN_APPROVED', 'syseng'], ['INSTALLATION_PENDING', 'opslead'], ['INSTALLED_UNVERIFIED', 'installer'], ['COMMISSIONING', 'syseng']]) {
    if (to === 'COMMISSIONING') {
      // the device register gates commissioning (founder, 14 Nov 2026): what the installation recorded is kept as it was before the installer
      // registers the units; in room A the video bar's unit carries serial SYN-SN-U1-0001 (the serial RN-11 proves final and unique)
      const devs = (await room(code)).body.devices.filter((d) => !d.furniture); const bar = devs.find((d) => d.cat === 'bar');
      atInstall[code] = { devs, bar: bar ? (await call('syseng', 'GET', `/v1/assets/${bar.asset}/history`)).body : null };
      await registerRoom(c, code, T.installer, { serialOf: (x) => (buildingA && x.category === 'bar' ? 'SYN-SN-U1-0001' : undefined) });
    }
    assert.equal((await move(code, to, who)).status, 200, `${code} → ${to}`);
    if (to === upto) break;
  }
  return code;
}

before(async () => {
  h = await setup({ db: 'empathia_test_recom_negative', port: 4171 }); c = client(h.base);
  for (const r of ['designer', 'syseng', 'opslead', 'installer', 'service', 'cxeng', 'qa_reviewer', 'secadmin', 'steward']) T[r] = await c.login(r);
  for (const r of ['designer', 'syseng', 'secadmin']) T[`x_${r}`] = await c.login(r, 'second-tenant');
  for (const r of ['opslead', 'installer', 'cxeng', 'qa_reviewer']) ids[r] = h.asSuper(`SELECT id FROM app.person WHERE email = '${mail(r)}'`);
  ids.tenant = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'empathia-demo'"); ids.other = h.asSuper("SELECT id FROM app.tenant WHERE slug = 'second-tenant'");
  // room A: commissioned through the API — every applicable test recorded by the commissioning engineer, verified by QA, accepted by the
  // operations lead through a delegation of customer.accept (QA verified the results and may not accept them, ADR-0005) → baseline v1
  buildingA = true; A = await build('Recommissioning negatives (synthetic)', 'COMMISSIONING'); buildingA = false;
  rows = (await room(A)).body.commissioning.rows.filter((x) => x.applicable);
  const e0 = await evidence('first commissioning');
  for (const r of rows) assert.equal((await call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: e0.id, evidenceKind: r.evidence[0], instrument } })).status, 201, r.test_id);
  for (const r of rows) assert.equal((await call('qa_reviewer', 'POST', `/v1/rooms/${A}/results/${r.test_id}/verify`)).status, 200, r.test_id);
  units.e0 = e0.id;
  assert.equal((await call('qa_reviewer', 'POST', '/v1/delegations', { body: { granteeId: ids.opslead, authority: 'customer.accept', reason: 'synthetic: QA verified and does not accept', days: 2 } })).status, 201);
  T.acceptor = await fresh('opslead');
  assert.equal((await move(A, 'ACCEPTED', 'opslead', T.acceptor)).status, 200);
  P = (await room(A)).body.devices.find((d) => d.cat === 'bar').id;   // the video bar's position: the subject of the replacements
  v1Before = J((await call('syseng', 'GET', `/v1/rooms/${A}/baselines`)).body.items.find((b) => b.version === 1));
  revsBefore = J((await room(A)).body.revisions);
});
after(async () => { delete process.env.EMPATHIA_FAILPOINTS; await h?.app.stop(); });

test('RN-01 — recording the installation records one unit per position: the installer named, identity UNKNOWN, no serial, no maker invented', async () => {
  // as the installation recorded them, before the device register (which since 14 Nov 2026 gates commissioning) declared their serials
  const devs = atInstall[A].devs;
  assert.ok(devs.length >= 4 && devs.every((d) => /^AS-\d{4,}$/.test(d.asset) && d.identityState === 'UNKNOWN' && d.position === d.id), J(devs.map((d) => [d.id, d.asset, d.identityState])));
  const nowDevs = (await room(A)).body.devices.filter((d) => !d.furniture);
  assert.ok(nowDevs.length === devs.length && nowDevs.every((d, i) => d.asset === devs[i].asset && d.identityState === 'DECLARED'), 'the same units, each with the serial the installer declared in the register');
  assert.equal(new Set(devs.map((d) => d.asset)).size, devs.length, 'one unit per position, none shared');
  const hp = (await posHistory(A, P)).body;
  assert.equal(hp.installations.length, 1); assert.equal(hp.installations[0].installReason, 'INITIAL'); assert.equal(hp.installations[0].basis, 'RECORDED');
  assert.equal(hp.installations[0].installedBy, ids.installer); assert.equal(hp.installations[0].installedRole, 'installer');
  const ha0 = atInstall[A].bar; assert.equal(ha0.asset.code, hp.current.asset);
  assert.deepEqual([ha0.asset.serial, ha0.asset.manufacturer, ha0.asset.identityState, ha0.asset.origin, ha0.identity.length], [null, null, 'UNKNOWN', 'INSTALLATION_RECORD', 0]);
  const ha = (await call('syseng', 'GET', `/v1/assets/${hp.current.asset}/history`)).body;
  assert.deepEqual([ha.asset.serial, ha.asset.identityState, ha.identity.length], ['SYN-SN-U1-0001', 'DECLARED', 1], 'declared by the installer in the register');
  units.original = hp.current.asset; units.originalHistory = J(ha);
});

test('RN-02 — changed device models and replacements in an accepted room that is not recommissioned are refused (422) and write nothing', async () => {
  const cur = await current(A, P); const before0 = count.installations(P);
  const rep = await call('installer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: swap the bar while accepted' } });
  assert.equal(rep.status, 422, J(rep.body)); assert.match(J(rep.body), /recommissioned first/);
  const sub = await call('designer', 'PATCH', `/v1/rooms/${A}/devices/${P}`, { body: { model: 'SYN-BAR-2 (synthetic)' } });
  assert.equal(sub.status, 422, J(sub.body)); assert.match(J(sub.body), /recommission/i);
  assert.equal(count.installations(P), before0); assert.equal(count.replacedEvents(), 0);
  assert.equal((await call('designer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: 'synthetic: no work.evidence' } })).status, 403, 'a designer does not record field work');
  assert.equal((await move(A, 'COMMISSIONING', 'syseng')).status, 200, 'recommissioned (ACCEPTED → COMMISSIONING)');
  // one test covering the bar is recorded again now — on the unit still installed — and left unverified: it becomes stale at the replacement
  const r = rows.find((x) => x.devices.includes(P)); units.preResult = r.test_id;
  const e1 = await evidence('before the replacement'); units.e1 = e1.id;
  assert.equal((await call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: e1.id, evidenceKind: r.evidence[0], instrument } })).status, 201);
});

test('RN-03 — duplicate actions: an Idempotency-Key replay of a replacement returns the same response and writes nothing twice; a reused key with another body is refused', async () => {
  const cur = await current(A, P); units.firstInstallation = cur.id;
  // outgoing SPARE: the scenario moves this unit to room B later (RN-1x); since migration 0030 a replaced unit is retired unless the
  // person replacing it says it goes back to the spares (founder, 14 Nov 2026) — the retiring default is proven in asset-retirement.test.mjs
  const body = { expectedInstallation: cur.id, reason: 'synthetic: like-for-like replacement of the video bar', outgoing: 'SPARE' };
  const r1 = await call('installer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body, headers: { 'idempotency-key': 'rn-replace-0001' } });
  assert.equal(r1.status, 200, J(r1.body)); assert.equal(r1.body.kind, 'REPLACEMENT'); units.replacement = r1.body;
  const r2 = await call('installer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body, headers: { 'idempotency-key': 'rn-replace-0001' } });
  assert.equal(r2.status, 200); assert.equal(r2.headers['idempotent-replay'], 'true'); assert.deepEqual(r2.body, r1.body, 'the same response (stored as JSONB: the same content)');
  assert.equal(count.installations(P), 2, 'one closed and one open installation: nothing written twice');
  assert.equal(count.replacedEvents(), 1); assert.equal(count.replacedAudits(), 1);
  const r3 = await call('installer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body: { ...body, reason: 'synthetic: another body under the same key' }, headers: { 'idempotency-key': 'rn-replace-0001' } });
  assert.equal(r3.status, 422); assert.equal(r3.body.code, 'idempotency_mismatch');
});

test('RN-04 — a like-for-like replacement keeps the position and its design; the old unit keeps its identity and history; the reopened tests say “replaced by another unit of the same model”; no re-approval is needed', async () => {
  const hp = (await posHistory(A, P)).body; const [old, now] = hp.installations;
  assert.equal(hp.position.code, P); assert.equal(hp.position.model, 'generic'); assert.deepEqual(hp.design.modelHistory, [], 'no design change');
  assert.deepEqual([old.asset, old.removalReason, old.removedRole, now.installReason, !!now.removedAt], [units.original, 'REPLACED', 'installer', 'REPLACEMENT', false]);
  assert.ok(Date.parse(old.removedAt) <= Date.parse(now.installedAt) && old.removalEventId && old.removalEventId === now.eventId, 'closed when the new one opened, by the same outbox event');
  const ha = (await call('syseng', 'GET', `/v1/assets/${units.original}/history`)).body;
  assert.equal(ha.current, null); assert.equal(ha.asset.identityState, 'DECLARED');   // as the register declared it (14 Nov 2026) assert.equal(ha.installations.length, 1); assert.equal(ha.installations[0].position, P);
  assert.equal(J(JSON.parse(units.originalHistory).asset), J(ha.asset), 'the replaced unit’s identity is not overwritten');
  assert.equal(ha.asset.disposition, 'IN_SERVICE', 'kept as a spare, as the replacement asked (outgoing SPARE)');
  const rd = await ready(A);
  assert.equal(rd.recommissioning.changes.length, 1); assert.deepEqual([rd.recommissioning.changes[0].kind, rd.recommissioning.changes[0].fromAsset, rd.recommissioning.changes[0].toAsset], ['REPLACED', units.original, now.asset]);
  assert.deepEqual(rd.recommissioning.substitutions, [], 'no model substitution');
  const rv = rd.recommissioning.reverification; units.reopened = rv.map((t) => t.testId);
  assert.deepEqual([...units.replacement.reverification].sort(), [...units.reopened].sort(), 'the replacement names the tests it reopens');
  assert.ok(rv.length > 0 && rv.every((t) => t.rerun && t.reasons.every((x) => new RegExp(`^.+ \\(${P}\\) was replaced by another unit of the same model \\(${units.original} → ${now.asset}, both generic\\): `).test(x))), J(rv.map((t) => t.reasons)));
  assert.match(rv.find((t) => t.testId === 'identity_asset').reasons[0], /checked again after every change of unit$/);
  assert.equal(rd.recommissioning.design.approvedDescribesDesign, true, 'a like-for-like replacement is not a design change: no re-approval');
  assert.ok(!rd.next.blockers.some((b) => /approved revision/.test(b)), J(rd.next.blockers));
  assert.ok(rd.outstanding.some((o) => /re-run on the new unit/.test(o.what)), J(rd.outstanding));
  assert.ok(rd.installations.devices.some((d) => d.position === P && d.asset === now.asset && d.identityState === 'UNKNOWN'));
  // the accepted design and evidence history are untouched
  assert.equal(J((await room(A)).body.revisions), revsBefore, 'no revision added or changed');
  assert.equal(J((await call('syseng', 'GET', `/v1/rooms/${A}/baselines`)).body.items.find((b) => b.version === 1)), v1Before, 'baseline v1 byte for byte');
  // Assurance: an installation change, labelled apart from a model drift
  const as = (await call('opslead', 'GET', `/v1/rooms/${A}/assurance`)).body; const pr = as.rows.find((x) => x.k === 'presence');
  assert.equal(pr.status, 'drift'); assert.deepEqual(pr.changes.map((x) => [x.id, x.kind, x.fromUnit, x.toUnit]), [[P, 'UNIT_REPLACED', units.original, now.asset]]);
  assert.match(pr.current, /another physical unit of the same model .*not a model drift/); assert.ok(!pr.changes.some((x) => x.kind === 'MODEL_SUBSTITUTED'));
  assert.equal(as.installation.devices.find((d) => d.position === P).assetAtBaseline, units.original);
});

test('RN-05 — stale evidence and old-unit reuse never satisfy a re-run; historical PASS_VERIFIED stays readable but counts 0; the re-acceptance is refused with the named reasons and the count', async () => {
  const t = rows.find((x) => units.reopened.includes(x.test_id) && x.test_id !== units.preResult);
  const reuse = await call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: t.test_id, state: 'PASS', evidenceId: units.e0, evidenceKind: t.evidence[0], instrument } });
  assert.equal(reuse.status, 422, J(reuse.body)); assert.match(J(reuse.body), /before the change of unit/);
  const early = await call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: t.test_id, state: 'PASS', evidenceId: units.e1, evidenceKind: t.evidence[0], instrument } });
  assert.equal(early.status, 422, 'evidence uploaded before the swap, even if never cited, is not evidence of the new unit');
  const stale = await call('qa_reviewer', 'POST', `/v1/rooms/${A}/results/${units.preResult}/verify`);
  assert.equal(stale.status, 422, J(stale.body)); assert.match(J(stale.body), /recorded on the previous unit/);
  const plan = (await room(A)).body.commissioning.rows.filter((x) => x.applicable);
  assert.ok(units.reopened.filter((id) => id !== units.preResult).every((id) => plan.find((x) => x.test_id === id).result === 'PASS_VERIFIED'), 'the historical labels stay readable');
  const rd = await ready(A);
  assert.equal(rd.completion.counts.verified, plan.length - units.reopened.length, 'and count 0'); assert.equal(rd.completion.counts.revalidation, units.reopened.length);
  const re = await move(A, 'ACCEPTED', 'opslead', T.acceptor);
  assert.equal(re.status, 422, J(re.body));
  const why = J(re.body.reasons);
  assert.match(why, new RegExp(`${units.reopened.length} test\\(s\\) were last recorded on the previous unit and must be re-run on the new unit and verified independently`));
  assert.ok(units.reopened.every((id) => why.includes(id)), 'every reopened test is named');
  assert.match(why, new RegExp(`acceptance counts ${plan.length - units.reopened.length} of ${plan.length} applicable tests as passed and independently verified; the ${units.reopened.length} earlier result\\(s\\) no longer count`), 'the accurate count: superseded PASS_VERIFIED results count 0');
});

test('RN-06 — reopened tests need new execution and independent verification: the re-runner cannot verify; a different person does; v2 publishes and v1 keeps its bytes', async () => {
  const e2 = await evidence('re-run on the new unit');
  for (const id of units.reopened) { const r = rows.find((x) => x.test_id === id); assert.equal((await call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: id, state: 'PASS', evidenceId: e2.id, evidenceKind: r.evidence[0], instrument } })).status, 201, id); }
  const self = await call('cxeng', 'POST', `/v1/rooms/${A}/results/${units.reopened[0]}/verify`);
  assert.equal(self.status, 422); assert.match(J(self.body), /independent/);
  const rd = await ready(A);
  assert.ok(rd.next.blockers.some((b) => new RegExp(`${units.reopened.length} reopened test\\(s\\) were re-run on the new unit and are not yet passed and verified by a different person`).test(b)), J(rd.next.blockers));
  for (const id of units.reopened) assert.equal((await call('qa_reviewer', 'POST', `/v1/rooms/${A}/results/${id}/verify`)).status, 200, id);
  assert.deepEqual((await ready(A)).next.blockers, []);
  assert.equal((await move(A, 'ACCEPTED', 'opslead', T.acceptor)).status, 200);
  const lin = (await call('syseng', 'GET', `/v1/rooms/${A}/baselines`)).body;
  assert.equal(lin.current.version, 2);
  const v1 = lin.items.find((b) => b.version === 1); const was = JSON.parse(v1Before);
  for (const k of ['id', 'version', 'design_revision', 'design_sha256', 'plan_id', 'results', 'evidence_ids', 'devices', 'reason', 'published_by', 'published_at']) assert.equal(J(v1[k]), J(was[k]), `v1.${k} unchanged`);
  assert.equal(v1.state, 'SUPERSEDED');
  assert.ok(lin.current.evidence_ids.includes(e2.id), 'v2 binds the evidence of the re-run');
  assert.ok(units.reopened.every((id) => lin.current.results[id] === 'PASS_VERIFIED'));
  const again = await move(A, 'ACCEPTED', 'opslead', T.acceptor);
  assert.equal(again.status, 422, 'a double acceptance is refused (rule_refused: one governed step at a time)'); assert.match(J(again.body), /no transition ACCEPTED → ACCEPTED/);
  assert.equal((await call('syseng', 'GET', `/v1/rooms/${A}/baselines`)).body.items.length, 2, 'and publishes nothing');
  assert.equal((await move(A, 'COMMISSIONING', 'syseng')).status, 200, 'recommissioned again for the next cases');
});

test('RN-07 — concurrent replacements of one position: exactly one wins, the other gets 409; one new unit on record', async () => {
  const cur = await current(A, P); const n0 = count.installations(P);
  const go = (persona, key) => call(persona, 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body: { expectedInstallation: cur.id, reason: `synthetic: concurrent ${key}`, outgoing: 'SPARE' }, headers: { 'idempotency-key': key } });   // the unit taken out stays a spare: RN-10's constraint proofs need a free unit (0030 retires by default)
  const rs = await Promise.all([go('installer', 'rn-race-000001'), go('service', 'rn-race-000002')]);
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409], J(rs.map((r) => [r.status, r.body.detail])));
  assert.match(rs.find((r) => r.status === 409).body.detail, /changed since it was read|already|closed by someone else/);
  assert.equal(count.installations(P), n0 + 1); assert.equal((await posHistory(A, P)).body.installations.filter((i) => !i.removedAt).length, 1);
});

test('RN-08 — an interrupted replacement rolls back everything: a server-side failure part-way, at two points, and a client that disconnects', async () => {
  const snap = async () => ({ open: (await current(A, P)).id, n: count.installations(P), ev: count.replacedEvents(), au: count.replacedAudits(), assets: count.assets(), rv: J((await ready(A)).recommissioning.reverification.map((t) => [t.testId, t.rerun])) });
  const s0 = await snap();
  for (const point of ['installation.replace:after-records', 'installation.replace:after-audit']) {
    process.env.EMPATHIA_FAILPOINTS = point;
    const r = await call('installer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body: { expectedInstallation: s0.open, reason: `synthetic: interrupted at ${point}` } });
    delete process.env.EMPATHIA_FAILPOINTS;
    assert.equal(r.status, 500, J(r.body));
    assert.deepEqual(await snap(), s0, `${point}: the old installation is still open, no new one, no new unit, no outbox event, no audit row, nothing reopened`);
  }
  // a client that disconnects: the request is all-or-nothing — never a closed installation without its successor, event and audit row
  const ac = new AbortController();
  const p = fetch(`${h.base}/v1/rooms/${A}/positions/${P}/replace`, { method: 'POST', signal: ac.signal, headers: { authorization: `Bearer ${T.installer}`, 'content-type': 'application/json' }, body: J({ expectedInstallation: s0.open, reason: 'synthetic: the client goes away' }) }).catch(() => null);
  setTimeout(() => ac.abort(), 2); await p; await new Promise((r) => setTimeout(r, 400));
  const s1 = await snap(); const committed = s1.open !== s0.open;
  if (committed) assert.deepEqual([s1.n, s1.ev, s1.au, s1.assets], [s0.n + 1, s0.ev + 1, s0.au + 1, s0.assets + 1], 'committed whole');
  else assert.deepEqual(s1, s0, 'or not at all');
  const integ = await call('steward', 'GET', '/v1/audit/integrity');
  assert.equal(integ.status, 200); assert.equal(integ.body.verified, true, J(integ.body));
});

test('RN-09 — a model change during recommissioning is a design change: the old unit is closed SUBSTITUTED, a unit of the new model installed, the position keeps its code; a stale precondition is 409; approvals: never the author, never without the authority, never a stale revision, never twice, never another tenant', async () => {
  const cur = await current(A, P);
  const staleSub = await call('syseng', 'PATCH', `/v1/rooms/${A}/devices/${P}`, { body: { model: 'SYN-BAR-2 (synthetic)', expectedInstallation: units.firstInstallation } });
  assert.equal(staleSub.status, 409, J(staleSub.body));
  const sub = await call('syseng', 'PATCH', `/v1/rooms/${A}/devices/${P}`, { body: { model: 'SYN-BAR-2 (synthetic)', expectedInstallation: cur.id } });
  assert.equal(sub.status, 200, J(sub.body)); assert.equal(sub.body.assetId, P);
  const hp = (await posHistory(A, P)).body; const last = hp.installations[hp.installations.length - 1]; const prev = hp.installations[hp.installations.length - 2];
  assert.deepEqual([prev.id, prev.removalReason, last.installReason, last.model, hp.position.code, hp.position.model], [cur.id, 'SUBSTITUTED', 'SUBSTITUTION', 'SYN-BAR-2 (synthetic)', P, 'SYN-BAR-2 (synthetic)']);
  assert.deepEqual(hp.design.modelHistory.map((m) => m.model), ['generic'], 'the design history belongs to the position');
  const old = (await call('syseng', 'GET', `/v1/assets/${prev.asset}/history`)).body.asset; assert.equal(old.model, 'generic', 'the substituted unit keeps its model');
  const rd = await ready(A);
  assert.ok(rd.next.blockers.some((b) => /approved revision \d+ no longer describes it/.test(b)), 'a model change needs re-approval');
  assert.ok(rd.recommissioning.changes.some((x) => x.kind === 'SUBSTITUTED' && x.toAsset === last.asset));
  const pr = (await call('opslead', 'GET', `/v1/rooms/${A}/assurance`)).body.rows.find((x) => x.k === 'presence');
  assert.ok(pr.changes.some((x) => x.id === P && x.kind === 'MODEL_SUBSTITUTED') && !pr.changes.some((x) => x.id === P && x.kind === 'UNIT_REPLACED'), J(pr.changes));
  // approvals
  const r1 = await call('syseng', 'POST', `/v1/rooms/${A}/revisions`, { body: { reason: 'synthetic: the substituted bar, saved by the systems engineer' } }); assert.equal(r1.status, 201);
  const own = await call('syseng', 'POST', `/v1/rooms/${A}/revisions/${r1.body.revision}/approve`);
  assert.equal(own.status, 422); assert.match(J(own.body), /separation of duties/);
  assert.equal(own.body.detail, CE.notByItsAuthor('the design', 'syseng'), 'in the wording Build a Room’s “Approve revision” uses (the engine’s)');
  assert.equal((await call('designer', 'POST', `/v1/rooms/${A}/revisions/${r1.body.revision}/approve`)).status, 403, 'no room.design.approve');
  assert.equal((await call('x_syseng', 'POST', `/v1/rooms/${A}/revisions/${r1.body.revision}/approve`)).status, 404, 'another tenant: not found');
  assert.equal((await call('designer', 'PATCH', `/v1/rooms/${A}/devices/${P}`, { body: { model: 'SYN-BAR-3 (synthetic)' } })).status, 200);
  const r2 = await call('designer', 'POST', `/v1/rooms/${A}/revisions`, { body: { reason: 'synthetic: the second substitution' } }); assert.equal(r2.status, 201);
  const staleRev = await call('syseng', 'POST', `/v1/rooms/${A}/revisions/${r1.body.revision}/approve`);
  assert.equal(staleRev.status, 422, 'a superseded revision is not approved (rule_refused: the existing contract, see C-65)'); assert.match(J(staleRev.body), /not the latest saved revision/);
  assert.equal((await call('syseng', 'POST', `/v1/rooms/${A}/revisions/${r2.body.revision}/approve`)).status, 200);
  const twice = await call('syseng', 'POST', `/v1/rooms/${A}/revisions/${r2.body.revision}/approve`);
  assert.equal(twice.status, 422, 'a revision is approved once'); assert.match(J(twice.body), /not newer than the approved revision/);
  // a non-reopened test re-recorded (unverified) is a gap of its own: the general count then names the superseded results apart
  const reopenedNow = new Set((await ready(A)).recommissioning.reverification.filter((t) => t.rerun).map((t) => t.testId));
  const other = rows.find((x) => !reopenedNow.has(x.test_id)); const eo = await evidence('a test the bar does not cover');
  assert.equal((await call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: other.test_id, state: 'PASS', evidenceId: eo.id, evidenceKind: other.evidence[0], instrument } })).status, 201);
  const accepted = await move(A, 'ACCEPTED', 'opslead', T.acceptor); assert.equal(accepted.status, 422, 'and the re-acceptance still waits for the re-run');
  const plan = (await room(A)).body.commissioning.rows.filter((x) => x.applicable);
  assert.match(J(accepted.body.reasons), new RegExp(`acceptance needs every applicable test executed, passed and independently verified with evidence: ${plan.length - reopenedNow.size - 1} of ${plan.length} passed and independently verified \\(.*1 passed awaiting verification.*; ${reopenedNow.size} recorded before a change of device and no longer counted\\)`), J(accepted.body.reasons));
});

test('RN-10 — overlapping or double installation is refused by the API (409) and by the database itself (constraint proofs as empathia_app)', async () => {
  B = await build('Installation negatives (synthetic)', 'INSTALLATION_PENDING');
  const devB = Object.fromEntries((await room(B)).body.devices.map((d) => [d.cat, d.id]));
  const ins = await call('installer', 'POST', `/v1/rooms/${B}/positions/${devB.display}/installation`, { body: { serial: 'SYN-SN-B-0001', note: 'synthetic: installed with its packing list' } });
  assert.equal(ins.status, 201, J(ins.body)); assert.equal(ins.body.identityState, 'DECLARED');
  assert.equal((await call('installer', 'POST', `/v1/rooms/${B}/positions/${devB.display}/installation`, { body: {} })).status, 409, 'one unit per position');
  const aCompute = (await room(A)).body.devices.find((d) => d.cat === 'compute');
  const elsewhere = await call('installer', 'POST', `/v1/rooms/${B}/positions/${devB.compute}/installation`, { body: { asset: aCompute.asset } });
  assert.equal(elsewhere.status, 409, J(elsewhere.body)); assert.match(elsewhere.body.detail, /installed at .* a unit occupies one position at a time/);
  assert.equal((await call('installer', 'POST', `/v1/rooms/${B}/positions/${devB.touch}/installation`, { body: { asset: units.original } })).status, 422, 'a bar is not installed at a touch-panel position');
  // the original unit of A's bar, taken out by the replacement, moves to room B: its history follows it
  const moved = await call('installer', 'POST', `/v1/rooms/${B}/positions/${devB.bar}/installation`, { body: { asset: units.original, note: 'synthetic: the spare from the recommissioned room' } });
  assert.equal(moved.status, 201, J(moved.body));
  const ha = (await call('syseng', 'GET', `/v1/assets/${units.original}/history`)).body;
  assert.deepEqual(ha.installations.map((i) => [i.room, i.position, i.removalReason]), [[A, P, 'REPLACED'], [B, devB.bar, null]]); assert.equal(ha.current.room, B);
  assert.equal((await move(B, 'INSTALLED_UNVERIFIED', 'installer')).status, 200);
  const devsB = (await room(B)).body.devices.filter((d) => !d.furniture);
  assert.ok(devsB.every((d) => d.asset), 'every position holds a unit after the installation is recorded');
  assert.equal(devsB.find((d) => d.id === devB.display).identityState, 'DECLARED'); assert.equal(devsB.find((d) => d.id === devB.bar).asset, units.original);
  units.B = devB; units.bCompute = devsB.find((d) => d.id === devB.compute).asset;
  // CONSTRAINT PROOFS (direct SQL as empathia_app, tenant set; each statement must be refused by the database)
  const pid = h.asSuper(`SELECT p.id FROM app.planned_asset p JOIN app.room r ON r.id = p.room_id WHERE r.code = '${B}' AND p.code = '${devB.bar}'`);
  const pidTouch = h.asSuper(`SELECT p.id FROM app.planned_asset p JOIN app.room r ON r.id = p.room_id WHERE r.code = '${B}' AND p.code = '${devB.touch}'`);
  const aid = h.asSuper(`SELECT id FROM app.physical_asset WHERE code = '${units.original}'`);
  const spare = h.asSuper(`SELECT a.id FROM app.physical_asset a WHERE NOT EXISTS (SELECT 1 FROM app.asset_installation i WHERE i.asset_id = a.id AND i.removed_at IS NULL) AND a.category = 'bar' AND a.disposition = 'IN_SERVICE' LIMIT 1`);   // a retired unit is refused earlier, by 0030's trigger
  const ins1 = await asApp(ids.tenant, "INSERT INTO app.asset_installation (tenant_id, position_id, asset_id, effective_basis, install_reason, installed_by, correlation_id) VALUES ($1,$2,$3,'RECORDED','INITIAL',$4,'constraint-proof')", [ids.tenant, pid, spare, ids.installer]);
  // a second unit at an occupied position violates both the per-position exclusion and the one-open-per-position index; the exclusion
  // constraint's index is checked first, so the database answers 23P01 — either refusal proves the invariant
  assert.equal(ins1.ok, false); assert.match(`${ins1.code} ${ins1.message}`, /^(23505 .*installation_one_open_per_position|23P01 .*installation_no_overlap_per_position)/, J(ins1));
  const ins2 = await asApp(ids.tenant, "INSERT INTO app.asset_installation (tenant_id, position_id, asset_id, effective_basis, install_reason, installed_by, correlation_id) VALUES ($1,$2,$3,'RECORDED','INITIAL',$4,'constraint-proof')", [ids.tenant, pidTouch, aid, ids.installer]);
  assert.equal(ins2.ok, false); assert.match(`${ins2.code} ${ins2.message}`, /23505|23P01/, 'a unit open at two positions is refused');
  const [aFrom, aTo] = h.asSuper(`SELECT installed_at || '|' || removed_at FROM app.asset_installation WHERE asset_id = '${aid}' AND removed_at IS NOT NULL`).split('|');
  const ovl = await asApp(ids.tenant, "INSERT INTO app.asset_installation (tenant_id, position_id, asset_id, installed_at, removed_at, removal_reason, removed_by, removal_correlation_id, effective_basis, install_reason, installed_by, correlation_id) VALUES ($1,$2,$3,$4::timestamptz,$5::timestamptz,'REMOVED',$6,'constraint-proof','RECORDED','INITIAL',$6,'constraint-proof')", [ids.tenant, pidTouch, aid, aFrom, aTo, ids.installer]);
  assert.equal(ovl.ok, false); assert.equal(ovl.code, '23P01', `a historical period overlapping the unit’s own is refused (exclusion constraint): ${ovl.message}`);
  const closed = h.asSuper(`SELECT id FROM app.asset_installation WHERE asset_id = '${aid}' AND removed_at IS NOT NULL`);
  const reopen = await asApp(ids.tenant, 'UPDATE app.asset_installation SET removed_at = now() WHERE id = $1', [closed]);
  assert.equal(reopen.ok, false); assert.equal(reopen.code, 'EM009', 'a closed installation is final');
  const rewrite = await asApp(ids.tenant, "UPDATE app.asset_installation SET installed_at = now() - interval '1 year' WHERE asset_id = $1 AND removed_at IS NULL", [aid]);
  assert.equal(rewrite.ok, false); assert.equal(rewrite.code, '42501', 'no column grant: the installation half is never rewritten');
  const del = await asApp(ids.tenant, 'DELETE FROM app.asset_installation WHERE id = $1', [closed]);
  assert.equal(del.ok, false); assert.equal(del.code, '42501', 'no DELETE grant');
  const model = await asApp(ids.tenant, "UPDATE app.physical_asset SET model = 'SYN-OTHER' WHERE id = $1", [aid]);
  assert.equal(model.ok, false); assert.equal(model.code, '42501', 'a unit’s model is immutable');
  const invent = await asApp(ids.tenant, "INSERT INTO app.physical_asset (tenant_id, code, category, model, serial, identity_state, origin, created_by) VALUES ($1, 'AS-9999001', 'bar', 'generic', 'SYN-SN-X', 'UNKNOWN', 'REGISTERED', $2)", [ids.tenant, ids.installer]);
  assert.equal(invent.ok, false); assert.equal(invent.code, '23514', 'UNKNOWN never carries a serial');
  const unproven = await asApp(ids.tenant, "INSERT INTO app.physical_asset (tenant_id, code, category, model, serial, identity_state, identity_by, identity_at, origin, created_by) VALUES ($1, 'AS-9999002', 'bar', 'generic', 'SYN-SN-Y', 'VERIFIED', $2, now(), 'REGISTERED', $2)", [ids.tenant, ids.installer]);
  assert.equal(unproven.ok, false); assert.equal(unproven.code, '23514', 'VERIFIED needs an evidence reference');
});

test('RN-11 — an identity only moves forward and needs evidence beyond a declaration; verification is independent; a recorded serial is final; a duplicate serial is another unit’s (409); the identity follows the unit', async () => {
  const id = (persona, body, asset = units.original) => call(persona, 'POST', `/v1/assets/${asset}/identity`, { body });
  assert.equal((await id('installer', { state: 'VERIFIED' })).status, 403, 'an installer holds no verification authority');
  // 14 Nov 2026: the original unit's serial SYN-SN-U1-0001 was declared in room A's device register (the gate before commissioning), so
  // a declaration without a serial is proved on B's touch panel (still UNKNOWN), and declaring the original unit again is no step forward
  const touch0 = (await room(B)).body.devices.find((d) => d.id === units.B.touch).asset;
  const noSerial = await id('installer', { state: 'DECLARED' }, touch0); assert.equal(noSerial.status, 422); assert.match(J(noSerial.body), /serial/);
  const twice = await id('installer', { state: 'DECLARED', serial: 'SYN-SN-U1-0001' }); assert.equal(twice.status, 422); assert.match(J(twice.body), /recorded twice/);
  const noEv = await id('installer', { state: 'OBSERVED' }); assert.equal(noEv.status, 422); assert.match(J(noEv.body), /evidence/);
  const ev = (await call('installer', 'POST', '/v1/evidence', { raw: Buffer.from('synthetic label photograph (text stand-in)'), headers: { 'content-type': 'text/plain', 'x-file-name': 'label.txt' } })).body;
  assert.equal((await id('installer', { state: 'OBSERVED', evidenceId: ev.id })).status, 200);
  assert.equal((await id('cxeng', { state: 'VERIFIED', evidenceId: ev.id, serial: 'SYN-SN-OTHER' })).status, 422, 'a different serial is a different unit');
  assert.equal((await id('cxeng', { state: 'VERIFIED', evidenceId: ev.id })).status, 200);
  const down = await id('installer', { state: 'DECLARED', serial: 'SYN-SN-U1-0001' }); assert.equal(down.status, 422); assert.match(J(down.body), /never downgraded/);
  // the serial is unique per maker and model: the same serial on another generic unit of no recorded maker is another unit's identity
  const touch = (await room(B)).body.devices.find((d) => d.id === units.B.touch).asset;
  const dup = await id('installer', { state: 'DECLARED', serial: 'SYN-SN-U1-0001' }, touch); assert.equal(dup.status, 409, J(dup.body));
  // independence: a person who declared a unit's identity does not verify it (the installer lends work.evidence to the commissioning engineer)
  assert.equal((await call('installer', 'POST', '/v1/delegations', { body: { granteeId: ids.cxeng, authority: 'work.evidence', reason: 'synthetic: the engineer records an identity on site', days: 1 } })).status, 201);
  const cx = await fresh('cxeng');
  assert.equal((await c.call('POST', `/v1/assets/${units.bCompute}/identity`, { token: cx, body: { state: 'DECLARED', serial: 'SYN-SN-C-0001' } })).status, 200);
  const sod = await c.call('POST', `/v1/assets/${units.bCompute}/identity`, { token: cx, body: { state: 'VERIFIED', evidenceId: ev.id } });
  assert.equal(sod.status, 422, J(sod.body)); assert.match(J(sod.body), /separation of duties/);
  assert.equal((await id('qa_reviewer', { state: 'VERIFIED', evidenceId: ev.id }, units.bCompute)).status, 200, 'a different verifier');
  const ha = (await call('syseng', 'GET', `/v1/assets/${units.original}/history`)).body;
  assert.deepEqual(ha.identity.map((e) => [e.from, e.to, e.byRole]), [['UNKNOWN', 'DECLARED', 'installer'], ['DECLARED', 'OBSERVED', 'installer'], ['OBSERVED', 'VERIFIED', 'cxeng']]);
  assert.equal(ha.asset.identityState, 'VERIFIED'); assert.equal(ha.installations.length, 2, 'across two rooms');
  const roomB = (await room(B)).body.devices.find((d) => d.id === units.B.bar); assert.equal(roomB.identityState, 'VERIFIED', 'the registry reads the same identity');
});

test('RN-12 — tenant boundary: another tenant cannot read or replace positions, assets or installations (404); the database hides them too', async () => {
  assert.equal((await call('x_designer', 'GET', `/v1/rooms/${A}/positions/${P}/history`)).status, 404);
  assert.equal((await call('x_designer', 'GET', `/v1/assets/${units.original}/history`)).status, 404);
  assert.equal((await call('x_designer', 'PATCH', `/v1/rooms/${A}/devices/${P}`, { body: { model: 'SYN-BAR-9 (synthetic)' } })).status, 404);
  // the second tenant's administrator lends its designer the installer role (real API); as installer they still find nothing of ours
  const xid = h.asSuper("SELECT id FROM app.person WHERE email = 'designer@second-tenant.empathia.invalid'");
  assert.equal((await call('x_secadmin', 'POST', '/v1/admin/memberships', { body: { personId: xid, roleKey: 'installer' } })).status, 200);
  const xi = await fresh('installer', 'second-tenant', 'designer');
  const cur = await current(A, P);
  assert.equal((await c.call('POST', `/v1/rooms/${A}/positions/${P}/replace`, { token: xi, body: { expectedInstallation: cur.id, reason: 'synthetic: cross-tenant attempt' } })).status, 404);
  assert.equal((await c.call('POST', `/v1/rooms/${B}/positions/${units.B.touch}/installation`, { token: xi, body: {} })).status, 404);
  assert.equal((await c.call('POST', `/v1/assets/${units.original}/identity`, { token: xi, body: { state: 'DECLARED', serial: 'SYN-SN-X-0001' } })).status, 404);
  assert.equal((await current(A, P)).id, cur.id, 'nothing changed');
  // CONSTRAINT PROOF (direct SQL as empathia_app in the other tenant): row-level security shows none of our units or installations
  const seen = await asApp(ids.other, 'SELECT (SELECT count(*) FROM app.physical_asset)::int AS a, (SELECT count(*) FROM app.asset_installation)::int AS i');
  assert.deepEqual(seen.rows[0], { a: 0, i: 0 });
});

test('RN-13 — an accepted baseline cannot be changed: the database refuses (constraint proof) and its bytes are unchanged', async () => {
  const v1id = JSON.parse(v1Before).id;
  const upd = await asApp(ids.tenant, "UPDATE app.assurance_baseline SET results = '{}'::jsonb WHERE id = $1", [v1id]);
  assert.equal(upd.ok, false); assert.match(upd.message, /EM005|immutable|only move/);
  const del = await asApp(ids.tenant, 'DELETE FROM app.assurance_baseline WHERE id = $1', [v1id]);
  assert.equal(del.ok, false);
  const rev = await asApp(ids.tenant, "UPDATE app.room_revision SET reason = 'rewritten' WHERE room_id = (SELECT id FROM app.room WHERE code = $1)", [A]);
  assert.equal(rev.ok, false); assert.equal(rev.code, 'EM001', 'the accepted revision is immutable');
  const v1 = (await call('syseng', 'GET', `/v1/rooms/${A}/baselines`)).body.items.find((b) => b.version === 1); const was = JSON.parse(v1Before);
  for (const k of ['id', 'design_revision', 'design_sha256', 'plan_id', 'results', 'evidence_ids', 'devices', 'published_by', 'published_at']) assert.equal(J(v1[k]), J(was[k]), `v1.${k}`);
  const integ = await call('steward', 'GET', '/v1/audit/integrity'); assert.equal(integ.body.verified, true, 'the Evidence Ledger still verifies');
});

test('RN-14 — site scope: a technician scoped to another site sees none of these units or positions, and naming one never reveals where it is installed (404, not 409)', async () => {
  const south = await c.login('service', 'empathia-demo', 'service-south');
  const S = await build('Site-scope negatives (synthetic)', 'INSTALLATION_PENDING', 'HZN');
  const touch = (await room(S)).body.devices.find((d) => d.cat === 'touch').id;
  assert.equal((await c.call('GET', `/v1/assets/${units.original}/history`, { token: south })).status, 404);
  assert.equal((await c.call('GET', `/v1/rooms/${A}/positions/${P}/history`, { token: south })).status, 404);
  const cur = await current(A, P);
  assert.equal((await c.call('POST', `/v1/rooms/${A}/positions/${P}/replace`, { token: south, body: { expectedInstallation: cur.id, reason: 'synthetic: outside my sites' } })).status, 404);
  // a unit installed in a North room, named at a South position: not found — the refusal does not name the North position
  const aTouch = (await room(A)).body.devices.find((d) => d.cat === 'touch').asset;
  const leak = await c.call('POST', `/v1/rooms/${S}/positions/${touch}/installation`, { token: south, body: { asset: aTouch } });
  assert.equal(leak.status, 404, J(leak.body)); assert.ok(!J(leak.body).includes(A) && !/installed at PA-/.test(J(leak.body)));
  assert.equal((await c.call('POST', `/v1/rooms/${S}/positions/${touch}/installation`, { token: south, body: {} })).status, 201, 'a new unit at a position of their own site');
});

test('RN-15 — D-35: two concurrent requests with one Idempotency-Key run the handler once; the duplicate waits and replays the stored response (or is refused 409 as a key in use), never runs the handler: one result record, one replacement (one installation, one unit, one outbox event, one audit row)', async () => {
  // a result record: a mutating route without a natural precondition — a second execution would add a second result record to the history
  const r = rows.find((x) => x.devices.includes(P)); const ev = await evidence('before the concurrent requests (D-35)');
  const results = () => n(`SELECT count(*) FROM app.test_result t JOIN app.room r ON r.id = t.room_id WHERE r.code = '${A}' AND t.test_id = '${r.test_id}'`);
  const keyRow = (k) => n(`SELECT count(*) FROM app.idempotency_key WHERE key = '${k}'`);
  const r0 = results();
  const rec = () => call('cxeng', 'POST', `/v1/rooms/${A}/results`, { body: { testId: r.test_id, state: 'PASS', evidenceId: ev.id, evidenceKind: r.evidence[0], instrument }, headers: { 'idempotency-key': 'rn-concurrent-result-0001' } });
  const rr = await Promise.all([rec(), rec()]);
  assert.ok(rr.some((x) => x.status === 201) && rr.every((x) => x.status === 201 || x.status === 409), J(rr.map((x) => [x.status, x.body?.detail])));
  assert.equal(results(), r0 + 1, 'exactly one result recorded');
  const created = rr.filter((x) => x.status === 201);
  if (created.length === 2) { assert.deepEqual(created[0].body, created[1].body, 'the duplicate replays the stored response'); assert.equal(rr.filter((x) => x.headers['idempotent-replay'] === 'true').length, 1, 'one of the two is the replay'); }
  else assert.match(rr.find((x) => x.status === 409).body.detail, /Idempotency-Key/, 'a 409 names the key in use, not the handler');
  const again = await rec(); assert.equal(again.status, 201); assert.equal(again.headers['idempotent-replay'], 'true'); assert.deepEqual(again.body, created[0].body); assert.equal(results(), r0 + 1, 'a later retry replays and writes nothing');
  assert.equal(keyRow('rn-concurrent-result-0001'), 1, 'one stored response for the key');
  // a replacement: its precondition (expectedInstallation) would refuse a second execution with 409 — the duplicate must not get that far
  const cur = await current(A, P); const s0 = { n: count.installations(P), ev: count.replacedEvents(), au: count.replacedAudits(), assets: count.assets() };
  const body = { expectedInstallation: cur.id, reason: 'synthetic: one like-for-like replacement, sent twice at once under one key (D-35)' };
  const go = () => call('installer', 'POST', `/v1/rooms/${A}/positions/${P}/replace`, { body, headers: { 'idempotency-key': 'rn-concurrent-replace-0001' } });
  const rs = await Promise.all([go(), go()]);
  assert.deepEqual([count.installations(P), count.replacedEvents(), count.replacedAudits(), count.assets()], [s0.n + 1, s0.ev + 1, s0.au + 1, s0.assets + 1], 'exactly one execution: one new installation, one new unit, one outbox event, one audit row');
  const won = rs.filter((x) => x.status === 200);
  assert.ok(won.length >= 1, J(rs.map((x) => [x.status, x.body?.detail])));
  assert.ok(rs.every((x) => x.status === 200 || (x.status === 409 && /Idempotency-Key/.test(x.body.detail))), `the duplicate is a replay or a key-in-use 409 — never the handler's stale-precondition refusal: ${J(rs.map((x) => [x.status, x.body?.detail]))}`);
  if (won.length === 2) assert.deepEqual(won[0].body, won[1].body, 'the duplicate replays the stored response');
  const again2 = await go(); assert.equal(again2.status, 200); assert.equal(again2.headers['idempotent-replay'], 'true'); assert.equal(count.installations(P), s0.n + 1);
});

test('RN-16 — D-39: a recommissioned room takes a model substitution and nothing else — adding, moving or removing a device is refused (422) in the shared rule’s words and writes nothing; first commissioning takes no design edit at all; the authority refusal of a revision approval reads as Build a Room’s', async () => {
  const live = (code) => n(`SELECT count(*) FROM app.planned_asset p JOIN app.room r ON r.id = p.room_id WHERE r.code = '${code}' AND p.removed_at IS NULL`);
  const events = (code) => n(`SELECT count(*) FROM app.outbox_event WHERE aggregate_id = '${code}' AND type IN ('room.device_added', 'room.device_removed', 'room.device_moved')`);
  const rule = (code, lifecycle, recommissioning, edit) => CE.designEditRefusal({ room: code, lifecycle, recommissioning, edit });
  // room A: an accepted room under recommissioning (baseline v2 CURRENT)
  assert.equal((await room(A)).body.room.lifecycle, 'COMMISSIONING'); assert.equal((await call('syseng', 'GET', `/v1/rooms/${A}/baselines`)).body.current.version, 2);
  const disp = (await room(A)).body.devices.find((d) => d.cat === 'display').id; const d0 = live(A); const e0 = events(A);
  const add = await call('designer', 'POST', `/v1/rooms/${A}/devices`, { body: { category: 'lighting', x: 1, y: 1, mount: 'ceiling' } });
  assert.equal(add.status, 422, J(add.body)); assert.equal(add.body.detail, rule(A, 'COMMISSIONING', true, 'add-device')); assert.equal(add.body.detail, 'the design is COMMISSIONING: changes need a change order');
  const rem = await call('designer', 'DELETE', `/v1/rooms/${A}/devices/${disp}`);
  assert.equal(rem.status, 422, J(rem.body)); assert.equal(rem.body.detail, rule(A, 'COMMISSIONING', true, 'remove-device'));
  const mv = await call('designer', 'PATCH', `/v1/rooms/${A}/devices/${disp}`, { body: { x: 1.5 } });
  assert.equal(mv.status, 422, J(mv.body)); assert.equal(mv.body.detail, rule(A, 'COMMISSIONING', true, 'move-device')); assert.match(mv.body.detail, new RegExp(`^${A} is being recommissioned: only a model substitution is accepted`));
  assert.deepEqual([live(A), events(A)], [d0, e0], 'nothing written');
  // first commissioning: installed and commissioning, never accepted — no design edit, not even a model change
  const F = await build('First-commissioning negatives (synthetic)', 'COMMISSIONING');
  const fdev = (await room(F)).body.devices.find((d) => d.cat === 'display').id; const f0 = live(F);
  const fadd = await call('designer', 'POST', `/v1/rooms/${F}/devices`, { body: { category: 'micceil', x: 1, y: 1, mount: 'ceiling' } });
  assert.equal(fadd.status, 422, J(fadd.body)); assert.equal(fadd.body.detail, rule(F, 'COMMISSIONING', false, 'add-device')); assert.equal(fadd.body.detail, 'the design is COMMISSIONING: changes need a change order');
  const frem = await call('designer', 'DELETE', `/v1/rooms/${F}/devices/${fdev}`);
  assert.equal(frem.status, 422); assert.equal(frem.body.detail, rule(F, 'COMMISSIONING', false, 'remove-device'));
  const fsub = await call('designer', 'PATCH', `/v1/rooms/${F}/devices/${fdev}`, { body: { model: 'SYN-DISP-2 (synthetic)' } });
  assert.equal(fsub.status, 422); assert.equal(fsub.body.detail, rule(F, 'COMMISSIONING', false, 'substitute-model'));
  assert.equal(live(F), f0, 'nothing written');
  // the 403 of a revision approval: the engine's sentence, the one Build a Room shows (not the route summary)
  const noAuth = await call('designer', 'POST', `/v1/rooms/${A}/revisions/1/approve`);
  assert.equal(noAuth.status, 403); assert.equal(noAuth.body.detail, CE.needsAuthority('designer', CE.REVISION_APPROVAL.action, CE.REVISION_APPROVAL.authority)); assert.equal(noAuth.body.detail, 'designer may not approve a design revision (needs room.design.approve)');
});
