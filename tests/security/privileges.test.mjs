/**
 * Database privileges: verified at startup; unhealthy and refusing when they differ; repaired only by the owner.
 * Founder, 17 Nov 2026: "The service should verify required privileges on startup. If privileges are missing, it should report an
 * unhealthy state and refuse sensitive operations. Repair should happen through a separate, tightly permissioned migration or
 * recovery process—not by giving the normal application account unrestricted authority to grant its own privileges."
 * Synthetic data only. The whole path after a restore without privileges is rehearsed in deploy/render/rehearse-demo.mjs (R-09).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setup, client, repo } from '../integration/harness.mjs';

let h, c, P, token;
const cli = (args, env = {}) => spawnSync(process.execPath, [path.join(repo, 'services/enterprise-api/dist/src/db/privileges.js'), ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
before(async () => { h = await setup({ db: 'empathia_privileges', port: 4188 }); c = client(h.base); P = await import(path.join(repo, 'services/enterprise-api/dist/src/db/privileges.js')); token = await c.login('cxeng'); });
after(async () => { await h?.app.stop(); });

test('PRV-01 a database the migrations made: the list is current, the service is healthy and serves', async () => {
  const chk = cli(['expected', '--check']); assert.equal(chk.status, 0, chk.stdout + chk.stderr);
  assert.equal(JSON.parse(chk.stdout).list, 'current');
  assert.equal(h.app.gate.state, 'ok');
  const health = await c.call('GET', '/health'); assert.equal(health.status, 200); assert.equal(health.body.status, 'ok'); assert.equal(health.body.privileges.state, 'ok');
  assert.equal((await c.call('GET', '/v1/rooms', { token })).status, 200);
  const v = cli(['verify']); assert.equal(v.status, 0, v.stdout); assert.equal(JSON.parse(v.stdout).privileges, 'equal to the list');
});

test('PRV-02 a privilege missing: unhealthy (503), every request refused (503 unavailable), health and the API description still answer', async () => {
  h.asSuper('REVOKE SELECT ON app.room FROM empathia_app');
  await h.app.gate.check();
  assert.equal(h.app.gate.state, 'mismatch');
  const health = await c.call('GET', '/health');
  assert.equal(health.status, 503); assert.equal(health.body.status, 'unhealthy'); assert.equal(health.body.privileges.state, 'mismatch'); assert.equal(health.body.privileges.missing, 1); assert.equal(health.body.privileges.unexpected, 1);
  assert.ok(!JSON.stringify(health.body).includes('app.room'), 'the public health answer gives counts, never the names');
  for (const [m, p, o] of [['GET', '/v1/rooms', { token }], ['POST', '/v1/auth/token', { body: { email: 'x@y.invalid', password: 'x', tenant: 'empathia-demo', role: 'cxeng' } }], ['GET', '/v1/me', { token }]]) {
    const r = await c.call(m, p, o); assert.equal(r.status, 503, `${m} ${p}`); assert.equal(r.body.code, 'unavailable'); assert.match(r.body.detail, /privileges do not match this release/);
  }
  assert.equal((await c.call('GET', '/v1/openapi.json')).status, 200);
  const v = cli(['verify']); assert.equal(v.status, 1); assert.equal(JSON.parse(v.stdout).privileges, 'DIFFER');
});

test('PRV-03 the runtime role cannot repair: refused by name, and nothing changes', async () => {
  const before = h.asSuper("SELECT coalesce(relacl::text, '') FROM pg_class WHERE oid = 'app.room'::regclass");
  await assert.rejects(P.repairPrivileges(h.urls.APP_DATABASE_URL), /repaired by the owner of the schema \(.+\) and by no one else; connected as empathia_app/);
  await assert.rejects(P.repairPrivileges(h.urls.WORKER_DATABASE_URL), /connected as empathia_worker/);
  assert.equal(h.asSuper("SELECT coalesce(relacl::text, '') FROM pg_class WHERE oid = 'app.room'::regclass"), before);
  // and it has no way round the command: the runtime role cannot grant on a table it does not own
  // (PostgreSQL answers such a GRANT with an error or with a warning that nothing was granted; either way nothing is)
  const k = await h.appConn(); try { await k.simple('GRANT SELECT ON app.room TO empathia_app').catch(() => null); } finally { await k.end(); }
  assert.equal(h.asSuper("SELECT coalesce(relacl::text, '') FROM pg_class WHERE oid = 'app.room'::regclass"), before);
  assert.equal(h.asSuper("SELECT has_table_privilege('empathia_app', 'app.room', 'SELECT')"), 'f');
  await h.app.gate.check(); assert.equal(h.app.gate.state, 'mismatch');
});

test('PRV-04 the owner’s repair makes the privileges exactly the list; the running service recovers without a restart; a second repair does nothing', async () => {
  const r = await P.repairPrivileges(h.urls.DATABASE_URL);
  assert.equal(r.after, 'equal to the list'); assert.deepEqual(r.before, { missing: 1, unexpected: 1 }); assert.equal(r.pairs, 1); assert.ok(r.statements >= 2);
  await h.app.gate.check(); assert.equal(h.app.gate.state, 'ok');
  assert.equal((await c.call('GET', '/health')).status, 200); assert.equal((await c.call('GET', '/v1/rooms', { token })).status, 200);
  const again = await P.repairPrivileges(h.urls.DATABASE_URL); assert.equal(again.statements, 0);
});

test('PRV-05 a privilege too many is as unhealthy as one too few: a restricted function opened to every role, a table opened to the worker', async () => {
  const fn = h.asSuper("SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'app' AND p.prosecdef AND NOT has_function_privilege('public', p.oid, 'EXECUTE') ORDER BY 1 LIMIT 1");
  assert.ok(fn, 'there is a security-definer function that not every role may run');
  h.asSuper(`GRANT EXECUTE ON FUNCTION ${fn} TO PUBLIC; GRANT DELETE ON app.audit_event TO empathia_worker`);
  await h.app.gate.check();
  assert.equal(h.app.gate.state, 'mismatch'); assert.ok(h.app.gate.unexpected >= 2);
  assert.equal((await c.call('GET', '/v1/rooms', { token })).status, 503);
  const r = await P.repairPrivileges(h.urls.DATABASE_URL); assert.equal(r.after, 'equal to the list');
  assert.equal(h.asSuper(`SELECT has_function_privilege('public', '${fn}'::regprocedure, 'EXECUTE')`), 'f');
  assert.equal(h.asSuper("SELECT has_table_privilege('empathia_worker', 'app.audit_event', 'DELETE')"), 'f');
  await h.app.gate.check(); assert.equal(h.app.gate.state, 'ok');
});

test('PRV-06 everything gone at once, as after a restore from an export that carries no privileges: unhealthy, repaired by the owner, exactly the list', async () => {
  // what such a restore leaves: every object with the privileges it has by default (tables closed to the runtime roles, functions open to all)
  h.asSuper(`DO $$ DECLARE r record; BEGIN
    FOR r IN SELECT c.oid::regclass AS o, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('app','app_meta','founder') AND c.relkind IN ('r','v','S') LOOP
      EXECUTE format('REVOKE ALL ON %s %s FROM PUBLIC, empathia_app, empathia_worker', CASE WHEN r.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, r.o); END LOOP;
    FOR r IN SELECT p.oid::regprocedure AS o FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('app','app_meta','founder') LOOP
      EXECUTE format('REVOKE ALL ON ROUTINE %s FROM empathia_app, empathia_worker', r.o); EXECUTE format('GRANT EXECUTE ON ROUTINE %s TO PUBLIC', r.o); END LOOP;
    REVOKE ALL ON SCHEMA app, app_meta, founder FROM PUBLIC, empathia_app, empathia_worker; END $$`);
  await h.app.gate.check(); assert.equal(h.app.gate.state, 'mismatch'); assert.ok(h.app.gate.missing > 150, `missing ${h.app.gate.missing}`);
  const health = await c.call('GET', '/health'); assert.equal(health.status, 503); assert.equal(health.body.status, 'unhealthy');
  const r = await P.repairPrivileges(h.urls.DATABASE_URL); assert.equal(r.after, 'equal to the list'); assert.ok(r.statements > 150);
  const k = await h.appConn(); try { assert.equal((await P.verifyPrivileges(k)).ok, true); } finally { await k.end(); }
  await h.app.gate.check(); assert.equal((await c.call('GET', '/v1/rooms', { token })).status, 200);
});

test('PRV-07 the repair is all or nothing, and refuses a database at another migration level', async () => {
  h.asSuper("UPDATE app_meta.schema_migration SET version = '9999' WHERE version = (SELECT max(version) FROM app_meta.schema_migration)");
  try { await assert.rejects(P.repairPrivileges(h.urls.DATABASE_URL), /the database is at migration 9999; the privilege list is for \d{4}/); }
  finally { h.asSuper("UPDATE app_meta.schema_migration SET version = (SELECT migration FROM (VALUES ('" + P.loadExpected().migration + "')) v(migration)) WHERE version = '9999'"); }
  // a privilege on something the list does not know (a table no migration made) cannot be reconciled by granting: the repair reports it and changes nothing
  h.asSuper('CREATE TABLE app.not_from_a_migration (id int); GRANT SELECT ON app.not_from_a_migration TO empathia_app; REVOKE UPDATE ON app.room FROM empathia_app');
  try {
    const r = await P.repairPrivileges(h.urls.DATABASE_URL).then((x) => x, (e) => e);
    // the stray table is owned by the superuser here, so the owner can neither revoke on it nor make the list true: all of it is rolled back
    assert.ok(r instanceof Error, 'the repair did not claim success');
    assert.equal(h.asSuper("SELECT has_table_privilege('empathia_app', 'app.room', 'UPDATE')"), 'f', 'the part it could have fixed was rolled back with the rest');
  } finally { h.asSuper('DROP TABLE app.not_from_a_migration'); }
  const ok = await P.repairPrivileges(h.urls.DATABASE_URL); assert.equal(ok.after, 'equal to the list');
});
