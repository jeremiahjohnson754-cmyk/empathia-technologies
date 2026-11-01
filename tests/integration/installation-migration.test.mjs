/**
 * Migration 0026 (positions, physical assets and installations, ADR-0012), tested on its own: a private database is migrated to 0025,
 * given the rows an earlier release wrote, then migrated to 0026 — and then the data step, and the whole file, run again.
 *
 * FIXTURE NOTE: the pre-0026 rows below are inserted with direct SQL as the schema owner, because the release that wrote them no longer
 * exists in this tree (today's API records installations itself). They are the migration's INPUT — rooms and positions in every
 * lifecycle, furniture, a removed position, a substituted model, a second tenant — never its output: every assertion is about what the
 * migration made of them.
 *   node --test tests/integration/installation-migration.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { repo } from './harness.mjs';

const DB = 'empathia_test_install_migration';
const dist = path.join(repo, 'services/enterprise-api/dist/src');
let c, owner, ownerUrl, startedAt;
const files = fs.readdirSync(path.join(repo, 'database/migrations')).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
const sql0026 = fs.readFileSync(path.join(repo, 'database/migrations', files.find((f) => f.startsWith('0026'))), 'utf8');
const psql = (s, d = 'postgres') => { const r = spawnSync(['/usr/lib/postgresql/16/bin/psql'].find((p) => fs.existsSync(p)) || 'psql', ['-h', '127.0.0.1', '-p', String(c.port), '-U', c.superuser, '-d', d, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', s], { env: { ...process.env, PGPASSWORD: c.superPassword }, encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim(); };
const one = (s) => psql(s, DB);   // superuser READ of the migrated state
const tenantTx = async (tenant, fn) => { await owner.query('BEGIN'); await owner.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]); try { await fn(); await owner.query('COMMIT'); } catch (e) { await owner.query('ROLLBACK'); throw e; } };
const legacy = {};

before(async () => {
  execFileSync(process.execPath, [path.join(repo, 'scripts/db.mjs'), 'up'], { stdio: 'ignore' });
  c = JSON.parse(fs.readFileSync(path.join(repo, '.local/pg/credentials.json'), 'utf8'));
  psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`); psql(`CREATE DATABASE ${DB} OWNER ${c.owner}`);
  psql(`REVOKE ALL ON DATABASE ${DB} FROM PUBLIC; GRANT CONNECT ON DATABASE ${DB} TO ${c.app}, ${c.worker};`);
  ownerUrl = `postgres://${c.owner}:${encodeURIComponent(c.ownerPassword)}@127.0.0.1:${c.port}/${DB}`;
  const { PgConnection, configFromUrl } = await import(path.join(dist, 'db/pg.js'));
  owner = new PgConnection(configFromUrl(ownerUrl)); await owner.connect();
  // the schema as it was before 0026, applied exactly as the runner applies it
  await owner.simple('CREATE SCHEMA IF NOT EXISTS app_meta; CREATE TABLE IF NOT EXISTS app_meta.schema_migration (version text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const f of files.filter((x) => x < '0026')) { const s = fs.readFileSync(path.join(repo, 'database/migrations', f), 'utf8'); await owner.simple(`BEGIN;\n${s}\n;INSERT INTO app_meta.schema_migration (version, sha256) VALUES ('${f.slice(0, 4)}', '${crypto.createHash('sha256').update(s).digest('hex')}');\nCOMMIT;`); }
  // FIXTURE: the rows an earlier release wrote (see the note at the top)
  const person = (await owner.query("INSERT INTO app.person (email, display_name) VALUES ('legacy-designer@legacy.empathia.invalid', 'Legacy Designer (synthetic)') RETURNING id")).rows[0].id;
  for (const slug of ['legacy-one', 'legacy-two']) legacy[slug] = (await owner.query('INSERT INTO app.tenant (slug, name) VALUES ($1, $2) RETURNING id', [slug, `Legacy tenant ${slug} (synthetic)`])).rows[0].id;
  const geometry = { shape: 'rect', points: [[0, 0], [4, 0], [4, 5], [0, 5]], ceiling: 2.7, lengthM: 5, widthM: 4, provenance: {}, confidence: 'declared' };
  const rooms = { 'legacy-one': [['R-LEG-0001', 'PLANNED', 'PLANNED'], ['R-LEG-0002', 'INSTALLED_UNVERIFIED', 'INSTALLED_UNVERIFIED'], ['R-LEG-0003', 'ACCEPTED', 'INSTALLED_UNVERIFIED'], ['R-LEG-0004', 'COMMISSIONING', 'INSTALLED_UNVERIFIED']], 'legacy-two': [['R-LEG-0101', 'OPERATIONAL', 'INSTALLED_UNVERIFIED']] };
  let k = 0;
  for (const [slug, list] of Object.entries(rooms)) await tenantTx(legacy[slug], async () => {
    const t = legacy[slug];
    const site = (await owner.query("INSERT INTO app.site (tenant_id, code, name) VALUES ($1, 'LEG-SITE', 'Legacy site (synthetic)') RETURNING id", [t])).rows[0].id;
    const b = (await owner.query("INSERT INTO app.building (tenant_id, site_id, code, name) VALUES ($1, $2, 'LEG', 'Legacy building (synthetic)') RETURNING id", [t, site])).rows[0].id;
    for (const [code, lifecycle, posLife] of list) {
      const r = (await owner.query("INSERT INTO app.room (tenant_id, building_id, code, name, template, intended_use, occupancy, unit, geometry, lifecycle, created_by) VALUES ($1,$2,$3,$4,'huddle','synthetic',4,'m',$5,$6,$7) RETURNING id", [t, b, code, `Legacy ${code} (synthetic)`, geometry, lifecycle, person])).rows[0].id;
      for (const [cat, furniture, removed, model, history] of [['display', false, false, 'generic', []], ['camera', false, false, 'SYN-CAM-7 (synthetic)', [{ model: 'generic', generic: true, until: '2026-09-01T10:00:00.000Z', by: person }]], ['table', true, false, 'generic', []], ['touch', false, true, 'generic', []]]) {
        k += 1;
        await owner.query('INSERT INTO app.planned_asset (tenant_id, room_id, code, category, label, role, model, generic, furniture, x, y, mount, lifecycle, model_history, removed_at) VALUES ($1,$2,$3,$4,$5,$4,$6,$7,$8,1,1,$9,$10,$11,$12)',
          [t, r, `PA-${String(k).padStart(4, '0')}`, cat, `${cat} ${k}`, model, model === 'generic', furniture, furniture ? 'floor' : 'wall', posLife, JSON.stringify(history), removed ? new Date('2026-09-15T00:00:00Z') : null]);
      }
    }
  });
  legacy.historyBefore = one("SELECT string_agg(code || '=' || model_history::text, ';' ORDER BY code) FROM app.planned_asset");
  startedAt = one('SELECT now()');
  const { migrate } = await import(path.join(dist, 'db/migrate.js'));
  legacy.run1 = await migrate(ownerUrl);
});
after(async () => { await owner?.end(); });

test('MIG-1 — 0026 applies on a database that already holds rooms, and the runner does not apply it twice', async () => {
  assert.deepEqual(legacy.run1.applied, [files.find((f) => f.startsWith('0026'))]);
  const { migrate } = await import(path.join(dist, 'db/migrate.js'));
  const run2 = await migrate(ownerUrl); assert.deepEqual(run2.applied, []);
  assert.equal(one("SELECT extname FROM pg_extension WHERE extname = 'btree_gist'"), 'btree_gist');
});

test('MIG-2 — one unit and one open installation per eligible position: installed lifecycle, live, not furniture — never a PLANNED room, a removed position or furniture', async () => {
  const eligible = Number(one("SELECT count(*) FROM app.planned_asset WHERE removed_at IS NULL AND NOT furniture AND lifecycle IN ('INSTALLED_UNVERIFIED','COMMISSIONING','ACCEPTED','OPERATIONAL')"));
  assert.equal(eligible, 8, '4 installed rooms × (display + camera)');
  assert.equal(Number(one('SELECT count(*) FROM app.physical_asset')), eligible);
  assert.equal(Number(one('SELECT count(*) FROM app.asset_installation WHERE removed_at IS NULL')), eligible);
  assert.equal(Number(one('SELECT count(*) FROM app.asset_installation')), eligible, 'nothing closed: no history is invented');
  assert.equal(one("SELECT count(*) FROM app.asset_installation i JOIN app.planned_asset p ON p.id = i.position_id WHERE p.furniture OR p.removed_at IS NOT NULL OR p.lifecycle = 'PLANNED'"), '0');
  assert.equal(one("SELECT count(*) FROM app.asset_installation i JOIN app.planned_asset p ON p.id = i.position_id JOIN app.room r ON r.id = p.room_id WHERE r.code = 'R-LEG-0001'"), '0', 'the PLANNED room has no hardware');
  assert.equal(one('SELECT count(*) FROM (SELECT position_id FROM app.asset_installation GROUP BY position_id HAVING count(*) > 1) x'), '0');
  assert.equal(one('SELECT count(*) FROM app.asset_installation i JOIN app.planned_asset p ON p.id = i.position_id JOIN app.physical_asset a ON a.id = i.asset_id WHERE a.tenant_id <> p.tenant_id OR i.tenant_id <> p.tenant_id'), '0', 'every record stays in its tenant');
});

test('MIG-3 — nothing is fabricated: no serial, no maker, no installer, no identity claim, no install date — the basis says “known as of migration”', async () => {
  assert.equal(one("SELECT count(*) FROM app.physical_asset WHERE serial IS NOT NULL OR manufacturer IS NOT NULL OR identity_state <> 'UNKNOWN' OR identity_evidence_id IS NOT NULL OR identity_by IS NOT NULL OR identity_at IS NOT NULL OR created_by IS NOT NULL OR origin <> 'MIGRATED'"), '0');
  assert.equal(one('SELECT count(*) FROM app.asset_identity_event'), '0');
  assert.equal(one("SELECT count(*) FROM app.asset_installation WHERE effective_basis <> 'KNOWN_AS_OF_MIGRATION' OR install_reason <> 'MIGRATED' OR installed_by IS NOT NULL OR installed_role IS NOT NULL OR install_evidence_id IS NOT NULL OR correlation_id <> 'migration-0026'"), '0');
  assert.equal(one(`SELECT count(*) FROM app.asset_installation WHERE installed_at < '${startedAt}'::timestamptz`), '0', 'the start is the migration time, never an earlier, claimed installation date');
  // the unit carries the position's designed model (the room says installed per design; identity UNKNOWN says it is not confirmed)
  assert.equal(one("SELECT count(*) FROM app.asset_installation i JOIN app.planned_asset p ON p.id = i.position_id JOIN app.physical_asset a ON a.id = i.asset_id WHERE a.model <> p.model OR a.category <> p.category"), '0');
  assert.equal(one("SELECT string_agg(DISTINCT a.model, ',') FROM app.physical_asset a WHERE a.category = 'camera'"), 'SYN-CAM-7 (synthetic)');
  // each tenant numbers its own units
  assert.equal(one("SELECT string_agg(a.code, ',' ORDER BY a.code) FROM app.physical_asset a JOIN app.tenant t ON t.id = a.tenant_id WHERE t.slug = 'legacy-two'"), 'AS-0001,AS-0002');
});

test('MIG-4 — the design history stays the position’s: model_history is untouched', async () => {
  assert.equal(one("SELECT string_agg(code || '=' || model_history::text, ';' ORDER BY code) FROM app.planned_asset"), legacy.historyBefore);
});

test('MIG-5 — repeatable and safe: the data step and the whole file run again create nothing and change nothing', async () => {
  const state = () => one("SELECT (SELECT count(*) FROM app.physical_asset) || '/' || (SELECT count(*) FROM app.asset_installation) || '/' || (SELECT string_agg(id::text || installed_at::text, ',' ORDER BY id) FROM app.asset_installation) || '/' || (SELECT string_agg(kind || value, ',' ORDER BY tenant_id, kind) FROM app.code_counter)");
  const s0 = state();
  assert.equal(one('SELECT app.migrate_installations()'), '0', 'the data step finds nothing left to migrate');
  assert.equal(state(), s0);
  await owner.simple(`BEGIN;\n${sql0026}\n;COMMIT;`);   // the whole file again, as the schema owner
  assert.equal(state(), s0, 'the whole migration, run a second time, changes nothing');
  assert.equal(one("SELECT count(*) FROM pg_trigger WHERE tgname IN ('installation_close_only', 'physical_asset_guard', 'asset_identity_event_append_only')"), '3', 'one trigger each, not duplicated');
});

test('MIG-6 — least privilege after the migration: the app role reads and inserts, closes only, never deletes; the worker gets nothing; RLS is forced', async () => {
  const has = (role, table, priv) => one(`SELECT has_table_privilege('${role}', 'app.${table}', '${priv}')`);
  for (const t of ['physical_asset', 'asset_installation', 'asset_identity_event']) {
    assert.equal(has(c.app, t, 'SELECT'), 't'); assert.equal(has(c.app, t, 'INSERT'), 't'); assert.equal(has(c.app, t, 'DELETE'), 'f', `${t}: no DELETE`);
    assert.equal(has(c.worker, t, 'SELECT'), 'f', `${t}: the outbox worker reads none of it`);
    assert.equal(one(`SELECT relforcerowsecurity FROM pg_class WHERE oid = 'app.${t}'::regclass`), 't', `${t}: RLS forced`);
  }
  assert.equal(has(c.app, 'asset_identity_event', 'UPDATE'), 'f');
  const col = (t, cname) => one(`SELECT has_column_privilege('${c.app}', 'app.${t}', '${cname}', 'UPDATE')`);
  assert.equal(col('asset_installation', 'removed_at'), 't'); assert.equal(col('asset_installation', 'installed_at'), 'f'); assert.equal(col('asset_installation', 'asset_id'), 'f');
  assert.equal(col('physical_asset', 'identity_state'), 't'); assert.equal(col('physical_asset', 'model'), 'f'); assert.equal(col('physical_asset', 'code'), 'f');
  assert.equal(one(`SELECT has_function_privilege('${c.app}', 'app.migrate_installations()', 'EXECUTE')`), 'f', 'only the owner runs the data step');
});
