import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_CLAIMS, DOSSIER_4218, validateClaim, publicProjection, effectiveState, transition, type ProofClaim } from '../src/index.js';

const seed = (id: string) => structuredClone(SEED_CLAIMS.find((c) => c.claim_id === id)!) as ProofClaim;
const live = (): ProofClaim => ({ ...seed('DEMO-COMMISSION-001'), claim_id: 'TEN-LIVE-001', scope: 'TENANT', tenant_id: 'tenant-a', environment: 'production', data_kind: 'CUSTOMER_OBSERVED',
  verification_state: 'LIVE_OBSERVING', verifier_identity: 'person-1', verification_method: 'connector heartbeat', evidence_ids: ['EV-1'], approved_derivative_ids: [],
  source_freshness_at: '2026-11-09T10:00:00Z', expires_at: '2026-12-09T00:00:00Z', public_approval: 'NOT_REQUESTED' });

test('every seed claim is valid and has a distinct id', () => {
  for (const c of SEED_CLAIMS) assert.deepEqual(validateClaim(c), [], c.claim_id);
  assert.equal(new Set(SEED_CLAIMS.map((c) => c.claim_id)).size, SEED_CLAIMS.length);
});
test('the dossier totals are the v1.8 reference and are computed from its rows', () => {
  assert.deepEqual(DOSSIER_4218.totals, { tests: 32, pass: 27, pending: 3, fail: 2, evidence: 29 });
  assert.equal(DOSSIER_4218.acceptance, 'HELD');
  assert.equal(DOSSIER_4218.asset.id, 'SIM-AV-0042');
  assert.equal(DOSSIER_4218.id, 'SIM-REPORT-2026-11-08-001');
  assert.deepEqual(DOSSIER_4218.tests.filter((t) => t.result === 'FAIL').map((t) => t.id), ['T-SIM-008', 'T-SIM-032']);
  assert.deepEqual(DOSSIER_4218.tests.filter((t) => t.result === 'PENDING').map((t) => t.id), ['T-SIM-016', 'T-SIM-028', 'T-SIM-031']);
  assert.deepEqual(DOSSIER_4218.tests.filter((t) => !t.evidence).map((t) => t.id), ['T-SIM-030', 'T-SIM-031', 'T-SIM-032']);
  assert.ok(DOSSIER_4218.deficiencies.every((d) => DOSSIER_4218.tests.some((t) => t.id === d.test)), 'every deficiency names a test in the dossier');
  assert.equal(DOSSIER_4218.gaps.length, 2, 'the failure without a deficiency and the pass without evidence are both stated');
});
test('the commissioning claim states the dossier’s numbers', () => {
  const t = seed('DEMO-COMMISSION-001').claim_text_public!;
  assert.match(t, /27 of 32/); assert.match(t, /3 are pending and 2 fail/); assert.match(t, /29 have an evidence record/); assert.match(t, /held/);
});
test('synthetic data can never be shown as lab verified, live or released', () => {
  for (const s of ['LAB_VERIFIED', 'LIVE_OBSERVING', 'CUSTOMER_AUTHORIZED', 'RELEASED_VERIFIED'] as const) {
    const c = { ...seed('DEMO-COMMISSION-001'), verification_state: s };
    assert.ok(validateClaim(c).length > 0, s); assert.equal(publicProjection(c), null, s);
  }
});
test('a public claim names no tenant; a tenant claim is never projected publicly', () => {
  assert.ok(validateClaim({ ...seed('DEMO-QR-001'), tenant_id: 'tenant-a' }).includes('a public claim names no tenant'));
  assert.deepEqual(validateClaim(live()), []);
  assert.equal(publicProjection(live(), '2026-11-09T11:00:00Z'), null);
  assert.ok(validateClaim({ ...live(), scope: 'PUBLIC_SANITIZED', tenant_id: null }).length > 0, 'a live observation cannot be re-scoped to public');
});
test('only an approved claim is published, and the projection carries no private field', () => {
  for (const a of ['NOT_REQUESTED', 'PENDING', 'REJECTED', 'REVOKED'] as const) assert.equal(publicProjection({ ...seed('DEMO-QR-001'), public_approval: a }), null, a);
  const p = publicProjection(seed('DEMO-COMMISSION-001'), '2026-11-09T12:00:00Z')!;
  assert.equal(p.verification_state, 'SYNTHETIC_DEMO'); assert.equal(p.recorded_state, null);
  for (const k of ['tenant_id', 'verifier_identity', 'owner', 'scope', 'public_approval', 'approved_derivative_ids']) assert.ok(!(k in p), k);
});
test('an evidence reference that is not an approved derivative blocks approval and never leaks', () => {
  const c = { ...seed('DEMO-COMMISSION-001'), evidence_ids: ['DOS-4218-R1', 'EV-PRIVATE-9'] };
  assert.ok(validateClaim(c).includes('every evidence reference on an approved public claim is an approved derivative'));
  assert.equal(publicProjection(c), null);
});
test('expiry and a stale source downgrade the shown state', () => {
  const c = { ...seed('IMPL-TENANT-ISOLATION-001'), expires_at: '2026-11-20T00:00:00Z' };
  assert.equal(publicProjection(c, '2026-11-19T00:00:00Z')!.verification_state, 'IMPLEMENTED_NOT_VERIFIED');
  const late = publicProjection(c, '2026-11-21T00:00:00Z')!;
  assert.equal(late.verification_state, 'DEGRADED'); assert.equal(late.recorded_state, 'IMPLEMENTED_NOT_VERIFIED'); assert.match(late.downgrade_reason!, /expired/);
  assert.equal(effectiveState(live(), '2026-11-09T11:00:00Z').state, 'LIVE_OBSERVING');
  assert.equal(effectiveState(live(), '2026-11-11T11:00:00Z').state, 'DEGRADED', 'no reading for two days is not live');
});
test('revoked and blocked claims disappear from the public projection', () => {
  const r = transition(seed('DEMO-SEARCH-001'), 'revoke'); assert.ok('claim' in r);
  if ('claim' in r) { assert.equal(r.claim.public_approval, 'REVOKED'); assert.equal(publicProjection(r.claim), null); }
  const b = transition(seed('DEMO-SEARCH-001'), 'block'); assert.ok('claim' in b && publicProjection(b.claim) === null);
});
test('publication moves only through request, then approval', () => {
  const c = { ...seed('DEMO-QR-001'), public_approval: 'NOT_REQUESTED' as const };
  assert.ok('refused' in transition(c, 'approve_publication'), 'no approval without a request');
  const req = transition(c, 'request_publication'); assert.ok('claim' in req);
  if ('claim' in req) { const ok = transition(req.claim, 'approve_publication'); assert.ok('claim' in ok && ok.claim.public_approval === 'APPROVED'); }
  assert.ok('refused' in transition(live(), 'request_publication'), 'a tenant claim cannot be put forward');
  const noText = { ...c, claim_text_public: null, public_approval: 'PENDING' as const };
  assert.ok('refused' in transition(noText, 'approve_publication'), 'no approval without public wording');
});
test('unknown fields and malformed values are refused', () => {
  assert.ok(validateClaim({ ...seed('DEMO-QR-001'), badge: 'green' }).includes('unknown field badge'));
  assert.ok(validateClaim({ ...seed('DEMO-QR-001'), verified_at: 'yesterday' }).length > 0);
  assert.ok(validateClaim({ ...seed('DEMO-QR-001'), claim_id: '../x' }).length > 0);
  assert.ok(validateClaim(null).length > 0);
});
