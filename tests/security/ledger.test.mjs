/**
 * Evidence Ledger integrity (ADR-0010) through the real API and database: the audit trail is a per-tenant SHA-256 chain sealed after
 * commit and re-verified in the API process. Append-only holds (only the one-time seal is allowed); a changed, deleted or re-pointed
 * event is reported at its sequence number; tenants have separate chains and cannot seal each other's. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, client } from '../integration/harness.mjs';

let h, c; const T = {};
const tid = (slug) => h.asSuper(`SELECT id FROM app.tenant WHERE slug = '${slug}'`);
const verify = async (tok) => { const r = await c.call('GET', '/v1/audit/integrity', { token: tok }); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); return r.body; };

before(async () => {
  h = await setup({ db: 'empathia_ledger', port: 4180 });
  c = client(h.base);
  for (const r of ['steward', 'secadmin', 'service', 'designer']) T[r] = await c.login(r);
  T.other = await c.login('secadmin', 'second-tenant');
  // some activity, including a refusal (audited DENIED in its own transaction)
  await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Ledger Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 2 } });
  await c.call('GET', '/v1/audit', { token: T.service });
  // the second tenant needs events of its own (a refused read is audited DENIED)
  await c.call('GET', '/v1/audit', { token: await c.login('designer', 'second-tenant') });
  assert.ok(Number(h.asSuper("SELECT count(*) FROM app.audit_event e JOIN app.tenant t ON t.id = e.tenant_id WHERE t.slug = 'second-tenant'")) > 0);
});
after(async () => { await h?.app.stop(); });

test('LED-1 only the data steward or the security admin may verify; the chain verifies end to end with a head hash and nothing left unsealed', async () => {
  assert.equal((await c.call('GET', '/v1/audit/integrity', {})).status, 401);
  assert.equal((await c.call('GET', '/v1/audit/integrity', { token: T.service })).status, 403);
  const r = await verify(T.steward);
  assert.equal(r.verified, true, JSON.stringify(r.firstBreak)); assert.ok(r.checked > 0); assert.equal(r.firstBreak, null);
  assert.match(r.head.hash, /^[0-9a-f]{64}$/); assert.equal(r.head.seq, r.checked); assert.equal(r.unsealed, 0);
  assert.ok(r.limits.length >= 3, 'the limits are stated with every answer');
  const trail = (await c.call('GET', '/v1/audit?limit=5', { token: T.secadmin })).body.items;
  assert.ok(trail.every((x) => x.seq && /^[0-9a-f]{64}$/.test(x.hash)), 'each audit row shows its place in the chain');
});

test('LED-2 append-only holds even for a database superuser: no change to a sealed event’s content or its seal, no deletion', async () => {
  const id = h.asSuper("SELECT id FROM app.audit_event WHERE seq IS NOT NULL ORDER BY seq LIMIT 1");
  assert.throws(() => h.asSuper(`UPDATE app.audit_event SET detail = '{"x":1}' WHERE id = ${id}`), /append-only/);
  assert.throws(() => h.asSuper(`UPDATE app.audit_event SET hash = sha256('x'::bytea) WHERE id = ${id}`), /append-only/);
  assert.throws(() => h.asSuper(`UPDATE app.audit_event SET seq = seq + 1000 WHERE id = ${id}`), /append-only/);
  assert.throws(() => h.asSuper(`DELETE FROM app.audit_event WHERE id = ${id}`), /append-only/);
});

test('LED-3 the background worker seals new events (worker role, no tenant context)', async () => {
  await c.call('GET', '/v1/audit', { token: T.service });   // a DENIED read → a new, unsealed event
  assert.ok(Number(h.asSuper('SELECT count(*) FROM app.audit_event WHERE seq IS NULL')) >= 1);
  const n = await new h.OutboxWorker(h.app.workerPool).seal();
  assert.ok(n >= 1); assert.equal(Number(h.asSuper('SELECT count(*) FROM app.audit_event WHERE seq IS NULL')), 0);
  assert.equal((await verify(T.steward)).verified, true);
});

test('LED-4 tenants have separate chains; one tenant cannot seal another’s; the second tenant verifies its own chain only', async () => {
  const a = await verify(T.secadmin); const b = await verify(T.other);
  assert.equal(b.verified, true); assert.notEqual(a.head.hash, b.head.hash);
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE tenant_id = '${tid('second-tenant')}'`)), b.checked, 'the second tenant’s check covers exactly its own events');
  const k = await h.appConn();
  try {
    await k.query('BEGIN'); await k.query(`SELECT set_config('app.tenant_id', '${tid('empathia-demo')}', true)`);
    await assert.rejects(k.query(`SELECT app.seal_audit('${tid('second-tenant')}')`), /seals only its own chain/);
    await k.query('ROLLBACK');
    await assert.rejects(k.query('SELECT app.seal_audit_all()'), /permission denied/, 'the runtime role cannot run the all-tenant sealer');
  } finally { await k.end(); }
});

test('LED-5 tampering is found at its sequence number: changed content, then a deleted event (the trigger is disabled by a superuser to simulate an attacker)', async () => {
  const seq = Number(h.asSuper("SELECT seq FROM app.audit_event WHERE tenant_id = (SELECT id FROM app.tenant WHERE slug = 'empathia-demo') AND seq > 3 ORDER BY seq LIMIT 1"));
  const where = `tenant_id = '${tid('empathia-demo')}' AND seq = ${seq}`;
  const original = h.asSuper(`SELECT detail::text FROM app.audit_event WHERE ${where}`);
  h.asSuper(`ALTER TABLE app.audit_event DISABLE TRIGGER audit_append_only; UPDATE app.audit_event SET detail = detail || '{"tampered":true}' WHERE ${where}; ALTER TABLE app.audit_event ENABLE TRIGGER audit_append_only;`);
  let r = await verify(T.steward);
  assert.equal(r.verified, false); assert.equal(r.firstBreak.seq, seq); assert.match(r.firstBreak.reason, /content no longer matches/);
  h.asSuper(`ALTER TABLE app.audit_event DISABLE TRIGGER audit_append_only; UPDATE app.audit_event SET detail = '${original.replace(/'/g, "''")}'::jsonb WHERE ${where}; ALTER TABLE app.audit_event ENABLE TRIGGER audit_append_only;`);
  assert.equal((await verify(T.steward)).verified, true, 'restoring the exact content restores the chain');
  h.asSuper(`ALTER TABLE app.audit_event DISABLE TRIGGER audit_append_only; DELETE FROM app.audit_event WHERE ${where}; ALTER TABLE app.audit_event ENABLE TRIGGER audit_append_only;`);
  r = await verify(T.steward);
  assert.equal(r.verified, false); assert.equal(r.firstBreak.seq, seq + 1); assert.match(r.firstBreak.reason, /sequence gap/);
  assert.equal((await verify(T.other)).verified, true, 'the other tenant’s chain is unaffected');
});
