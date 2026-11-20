/**
 * The Proof Registry (v1.8 workstream A, ADR-021) over real HTTP against a real database. What it proves:
 *   - the public, unauthenticated read returns exactly the registry's approved public claims, sanitized, identical to the projection the
 *     two public sites ship (V18-T-PROOF-01), and carries no private field;
 *   - a public claim can be published only by the founder organization, through request then approval; no enterprise role can;
 *   - a tenant's claims never appear publicly and are invisible to another tenant; staff-scope claims need policy.configure;
 *   - synthetic data cannot be recorded as lab verified, live or released; a live claim cannot be made public;
 *   - an evidence reference that is not an approved derivative blocks publication and never leaks;
 *   - expiry downgrades what the public sees; a revoked claim answers 404, the same as one that never existed;
 *   - the database itself refuses the forbidden states and a deletion, and its row policy hides unapproved rows from a public read;
 *   - the rollback script removes what migration 0029 created and the migration applies again.
 * Synthetic data only.   node --test tests/security/proof-registry.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { setup, client, repo } from '../integration/harness.mjs';

let h, c, founder, secadmin, syseng, other, SEED, projection;
const PRIVATE = ['tenant_id', 'verifier_identity', 'owner', 'public_approval', 'scope', 'approved_derivative_ids', 'revision', 'created_by', 'owner_tenant_id', 'id'];
const claim = (over = {}) => ({ claim_id: 'TEST-CLAIM-001', capability_id: 'test.capability', product: 'Test', world: null, scope: 'PUBLIC_SANITIZED', environment: 'synthetic_demo', data_kind: 'SYNTHETIC', verification_state: 'SYNTHETIC_DEMO',
  implementation_revision: 'test-1', verification_method: 'automated test', verifier_identity: null, verified_at: '2026-11-09T00:00:00Z', expires_at: null, source_type: 'synthetic fixture', source_freshness_at: null, evidence_ids: [], approved_derivative_ids: [],
  limitations: ['Synthetic; nothing real is connected'], claim_text_public: 'A synthetic claim written for the registry’s own tests.', owner: 'Test owner', ...over });
const post = (token, body, key) => c.call('POST', '/v1/proof/claims', { token, body, headers: key ? { 'idempotency-key': key } : {} });
const move = (token, id, action) => c.call('POST', `/v1/proof/claims/${id}/transitions`, { token, body: { action } });
const pub = async () => (await c.call('GET', '/v1/public/proof/claims')).body;

before(async () => {
  h = await setup({ db: 'empathia_test_proof', port: 4189 }); c = client(h.base);
  founder = await c.login('founder', 'empathia-founder'); secadmin = await c.login('secadmin'); syseng = await c.login('syseng'); other = await c.login('secadmin', 'second-tenant');
  ({ SEED_CLAIMS: SEED, publicProjection: projection } = await import(path.join(repo, 'packages/proof-registry/dist/src/index.js')));
});
after(async () => { await h?.app.stop(); });

test('anyone reads the published claims without signing in: the six seeded claims, each sanitized', async () => {
  const r = await c.call('GET', '/v1/public/proof/claims'); assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.claims.length, 6); assert.equal(r.body.schema_version, '1.8');
  for (const x of r.body.claims) for (const k of PRIVATE) assert.ok(!(k in x), `${x.claim_id} leaks ${k}`);
  assert.ok(r.body.claims.every((x) => !['LIVE_OBSERVING', 'LAB_VERIFIED', 'RELEASED_VERIFIED', 'CUSTOMER_AUTHORIZED'].includes(x.verification_state)));
});
test('the API’s public projection is the one the two public sites ship, claim for claim (V18-T-PROOF-01)', async () => {
  const api = (await pub()).claims.map(({ as_of, ...x }) => x);
  const lib = SEED.map((x) => projection(x, new Date())).filter(Boolean).map(({ as_of, ...x }) => x).sort((a, b) => a.claim_id.localeCompare(b.claim_id));
  assert.deepEqual(api, lib);
  for (const site of ['apps/website/dist/proof/claims.json', 'apps/demo/dist/proof/claims.json']) {
    const f = path.join(repo, site); if (!fs.existsSync(f)) continue;   // the sites are compared when they are built
    const shipped = JSON.parse(fs.readFileSync(f, 'utf8')).claims.map(({ as_of, ...x }) => x).sort((a, b) => a.claim_id.localeCompare(b.claim_id));
    assert.deepEqual(api, shipped, site);
  }
});
test('one claim by its identifier; unknown, malformed and hostile identifiers are one 404 with no detail', async () => {
  const ok = await c.call('GET', '/v1/public/proof/claims/DEMO-COMMISSION-001'); assert.equal(ok.status, 200); assert.match(ok.body.claim_text_public, /27 of 32/);
  for (const id of ['NO-SUCH-CLAIM', 'x', '..%2F..%2Fetc', "a'%20OR%201=1--", '%3Cscript%3E'])
    { const r = await c.call('GET', `/v1/public/proof/claims/${id}`); assert.equal(r.status, 404, id); assert.doesNotMatch(JSON.stringify(r.body), /tenant|sql|syntax/i); }
});
test('no enterprise role can publish a public claim, in either tenant; an anonymous caller cannot write at all', async () => {
  for (const t of [secadmin, syseng, other]) assert.equal((await post(t, claim())).status, 403);
  assert.equal((await post(undefined, claim())).status, 401);
  assert.equal((await move(secadmin, 'DEMO-COMMISSION-001', 'revoke')).status, 404, 'another organization’s claim is not found, not forbidden');
  assert.equal((await pub()).claims.length, 6);
});
test('the founder organization publishes in two recorded steps; an unapproved claim is never public', async () => {
  const made = await post(founder, claim(), 'proof-create-1'); assert.equal(made.status, 201, JSON.stringify(made.body)); assert.equal(made.body.public_approval, 'NOT_REQUESTED');
  assert.equal((await post(founder, claim(), 'proof-create-1')).status, 201, 'the same request replays');
  assert.equal((await post(founder, claim(), 'proof-create-2')).status, 422, 'a second claim with the same identifier is refused');
  assert.equal((await c.call('GET', '/v1/public/proof/claims/TEST-CLAIM-001')).status, 404);
  assert.equal((await move(founder, 'TEST-CLAIM-001', 'approve_publication')).status, 422, 'no approval without a request');
  assert.equal((await move(founder, 'TEST-CLAIM-001', 'request_publication')).status, 200);
  assert.equal((await c.call('GET', '/v1/public/proof/claims/TEST-CLAIM-001')).status, 404, 'pending is not published');
  assert.equal((await move(founder, 'TEST-CLAIM-001', 'approve_publication')).status, 200);
  const p = await c.call('GET', '/v1/public/proof/claims/TEST-CLAIM-001'); assert.equal(p.status, 200); assert.equal(p.body.verification_state, 'SYNTHETIC_DEMO');
  const hist = await c.call('GET', '/v1/proof/claims/TEST-CLAIM-001/history', { token: founder });
  assert.deepEqual(hist.body.events.map((e) => e.action), ['create', 'request_publication', 'approve_publication']);
});
test('synthetic data cannot be recorded as lab verified, live or released; a live claim cannot be public', async () => {
  for (const s of ['LAB_VERIFIED', 'LIVE_OBSERVING', 'RELEASED_VERIFIED', 'CUSTOMER_AUTHORIZED']) {
    const r = await post(founder, claim({ claim_id: `TEST-BAD-${s}`, verification_state: s, verifier_identity: 'someone', evidence_ids: ['EV-1'], approved_derivative_ids: ['EV-1'] })); assert.equal(r.status, 400, s);
  }
  const live = await post(founder, claim({ claim_id: 'TEST-LIVE-PUBLIC', environment: 'production', data_kind: 'CUSTOMER_OBSERVED', verification_state: 'LIVE_OBSERVING', verifier_identity: 'someone', evidence_ids: ['EV-1'], approved_derivative_ids: ['EV-1'], source_freshness_at: '2026-11-09T00:00:00Z', expires_at: '2026-12-09T00:00:00Z' }));
  assert.equal(live.status, 400); assert.match(JSON.stringify(live.body), /belongs to its tenant/);
});
test('an evidence reference that is not an approved derivative blocks publication and never appears publicly', async () => {
  const made = await post(founder, claim({ claim_id: 'TEST-EVIDENCE-001', evidence_ids: ['DRV-OK-1', 'EV-PRIVATE-9'], approved_derivative_ids: ['DRV-OK-1'] })); assert.equal(made.status, 201, JSON.stringify(made.body));
  assert.equal((await move(founder, 'TEST-EVIDENCE-001', 'request_publication')).status, 200);
  const r = await move(founder, 'TEST-EVIDENCE-001', 'approve_publication'); assert.equal(r.status, 422); assert.match(JSON.stringify(r.body), /approved derivative/);
  assert.doesNotMatch(JSON.stringify(await pub()), /EV-PRIVATE-9/);
});
test('a tenant’s claims are its own: never public, invisible to another tenant, staff scope behind policy.configure', async () => {
  const t = await post(secadmin, claim({ claim_id: 'TEN-CLAIM-001', scope: 'TENANT', environment: 'test', claim_text_public: null })); assert.equal(t.status, 201, JSON.stringify(t.body)); assert.equal(t.body.tenant_id, 'empathia-demo');
  const s = await post(secadmin, claim({ claim_id: 'TEN-STAFF-001', scope: 'STAFF', environment: 'test', claim_text_public: null })); assert.equal(s.status, 201);
  assert.equal((await move(secadmin, 'TEN-CLAIM-001', 'request_publication')).status, 422, 'a tenant claim cannot be put forward for publication');
  const mine = (await c.call('GET', '/v1/proof/claims', { token: secadmin })).body.items.map((x) => x.claim_id); assert.deepEqual(mine.sort(), ['TEN-CLAIM-001', 'TEN-STAFF-001']);
  const member = (await c.call('GET', '/v1/proof/claims', { token: syseng })).body.items.map((x) => x.claim_id); assert.deepEqual(member, ['TEN-CLAIM-001'], 'a member without policy.configure sees no staff-scope claim');
  assert.deepEqual((await c.call('GET', '/v1/proof/claims', { token: other })).body.items, [], 'the second tenant sees none of them');
  assert.equal((await c.call('GET', '/v1/proof/claims/TEN-CLAIM-001/history', { token: other })).status, 404);
  assert.equal((await c.call('GET', '/v1/proof/claims/TEN-STAFF-001/history', { token: syseng })).status, 404);
  assert.equal((await move(other, 'TEN-CLAIM-001', 'revoke')).status, 404);
  for (const id of ['TEN-CLAIM-001', 'TEN-STAFF-001']) assert.equal((await c.call('GET', `/v1/public/proof/claims/${id}`)).status, 404);
  assert.doesNotMatch(JSON.stringify(await pub()), /TEN-/);
  assert.equal((await c.call('GET', '/v1/proof/claims')).status, 401);
});
test('expiry downgrades what the public sees; a revoked claim disappears and answers like one that never existed', async () => {
  // the claim is recorded with an expiry in the future, then the clock is moved past it in the database (a claim cannot be created already expired by mistake)
  const made = await post(founder, claim({ claim_id: 'TEST-EXPIRY-001', verification_state: 'IMPLEMENTED_NOT_VERIFIED', environment: 'test', expires_at: '2027-01-01T00:00:00Z' })); assert.equal(made.status, 201, JSON.stringify(made.body));
  await move(founder, 'TEST-EXPIRY-001', 'request_publication'); await move(founder, 'TEST-EXPIRY-001', 'approve_publication');
  assert.equal((await c.call('GET', '/v1/public/proof/claims/TEST-EXPIRY-001')).body.verification_state, 'IMPLEMENTED_NOT_VERIFIED');
  h.asSuper("UPDATE app.proof_claim SET verified_at = '2026-01-01', expires_at = '2026-02-01' WHERE claim_id = 'TEST-EXPIRY-001'");
  const late = (await c.call('GET', '/v1/public/proof/claims/TEST-EXPIRY-001')).body;
  assert.equal(late.verification_state, 'DEGRADED'); assert.equal(late.recorded_state, 'IMPLEMENTED_NOT_VERIFIED'); assert.match(late.downgrade_reason, /expired/);
  assert.equal((await move(founder, 'TEST-CLAIM-001', 'revoke')).status, 200);
  assert.equal((await c.call('GET', '/v1/public/proof/claims/TEST-CLAIM-001')).status, 404);
  assert.ok(!(await pub()).claims.some((x) => x.claim_id === 'TEST-CLAIM-001'));
  assert.equal((await move(founder, 'TEST-CLAIM-001', 'approve_publication')).status, 422, 'a revoked claim is not republished');
});
test('the database refuses what the API refuses: forbidden states, a deletion, and a public read of unapproved rows', async () => {
  const bad = (sql) => { try { h.asSuper(sql); return false; } catch { return true; } };
  assert.ok(bad("UPDATE app.proof_claim SET verification_state = 'LIVE_OBSERVING' WHERE claim_id = 'DEMO-COMMISSION-001'"), 'synthetic cannot be made live even by SQL');
  assert.ok(bad("UPDATE app.proof_claim SET public_approval = 'APPROVED' WHERE claim_id = 'TEN-CLAIM-001'"), 'a tenant claim cannot be approved for publication even by SQL');
  assert.ok(bad("DELETE FROM app.proof_claim WHERE claim_id = 'DEMO-QR-001'"), 'a claim is never deleted');
  assert.ok(bad("UPDATE app.proof_claim_event SET note = 'edited' WHERE action = 'create'"), 'history is append-only');
  const k = await h.appConn();   // the runtime role, with no tenant and then with the public flag
  try {
    assert.equal((await k.query('SELECT count(*)::int AS n FROM app.proof_claim')).rows[0].n, 0, 'no tenant and no flag: nothing');
    await k.query('BEGIN'); await k.query("SELECT set_config('app.proof_public', 'on', true)");
    const seen = (await k.query('SELECT claim_id, scope, public_approval, verification_state FROM app.proof_claim')).rows; await k.query('ROLLBACK');
    assert.ok(seen.length >= 6 && seen.every((r) => r.scope === 'PUBLIC_SANITIZED' && r.public_approval === 'APPROVED' && !['REVOKED', 'BLOCKED'].includes(r.verification_state)), JSON.stringify(seen.map((r) => r.claim_id)));
    assert.ok(!seen.some((r) => /^TEN-|TEST-CLAIM-001|TEST-EVIDENCE-001/.test(r.claim_id)));
  } finally { await k.end?.(); }
});
test('every write is audited, and a refused publication is recorded as denied', async () => {
  const n = (w) => Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE ${w}`));
  assert.ok(n("action = 'proof.claim_created' AND outcome = 'ALLOWED'") >= 5);
  assert.ok(n("action = 'proof.approve_publication' AND outcome = 'DENIED'") >= 1);
  // both security administrators hold policy.configure, pass the route's own check and are refused by the public-claim rule: on record
  assert.ok(n("action = 'create a proof claim' AND outcome = 'DENIED'") >= 2, 'the enterprise administrators’ attempts to publish are on record');
});
test('rollback: the down script removes what 0029 created, and the migration applies again', async () => {
  const down = fs.readFileSync(path.join(repo, 'database/rollbacks/0029_proof_registry.down.sql'), 'utf8'); const up = fs.readFileSync(path.join(repo, 'database/migrations/0029_proof_registry.sql'), 'utf8');
  const tables = () => h.asSuper("SELECT string_agg(tablename, ',' ORDER BY tablename) FROM pg_tables WHERE schemaname = 'app' AND tablename LIKE 'proof_%'");
  assert.equal(tables(), 'proof_claim,proof_claim_event,proof_evidence');
  h.asSuper(`BEGIN; ${down}; COMMIT;`); assert.equal(tables(), '');
  assert.equal((await c.call('GET', '/v1/public/proof/claims')).status, 500, 'with the tables gone the route fails closed, with no data');
  h.asSuper(`BEGIN; ${up}; COMMIT;`); assert.equal(tables(), 'proof_claim,proof_claim_event,proof_evidence');
  const r = await c.call('GET', '/v1/public/proof/claims'); assert.equal(r.status, 200); assert.deepEqual(r.body.claims, [], 'an empty registry publishes nothing');
});
