// The price list as published (V18-PILOT-01/02), the readiness classifications (V18-PILOT-03/05/13) and the activation machines
// (V18-PILOT-07/08/09/10/14). The expected prices are written out here on purpose: the generated catalogue must equal them exactly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKUS, BUNDLES, PILOTS, SIGNAL_TERMS, FAMILIES, usd, unitLabel, quote, assessReadiness, PILOT_RULES, PILOT_SKUS, READINESS_STATES, smallestFit, choiceOf, initialPilot, applyPilot, mayReadSource, mayEnroll, BLOCK, type ConnectorChoice, type PilotState, type PilotEvent, type ReadinessInput } from '../src/index.js';
import { CONNECTORS } from '../src/generated/connectors.js';

const price = (sku: string) => SKUS.find((s) => s.sku === sku)!;

test('the price list: 34 SKUs, 7 bundles, 4 pilots, 8 SIGNAL terms, with the founder’s exact prices', () => {
  assert.equal(SKUS.length, 34); assert.equal(new Set(SKUS.map((s) => s.sku)).size, 34);
  assert.equal(BUNDLES.length, 7); assert.equal(PILOTS.length, 4); assert.equal(SIGNAL_TERMS.length, 8);
  assert.deepEqual(PILOTS.map((p) => [p.sku, p.price, p.cents, p.days]), [['PILOT-DISCOVERY', '49.99', 4999, 14], ['PILOT-READONLY', '199.99', 19999, 30], ['PILOT-HARDWARE', '499.99', 49999, 30], ['PILOT-CAMPUS', '1499.99', 149999, 45]]);
  assert.deepEqual([price('SEAT-ENTERPRISE').price, price('SEAT-ENTERPRISE').cents], ['9.99', 999]);
  assert.deepEqual(['SIGNAL-IND', 'SIGNAL-TEAM', 'SIGNAL-TRIAL', 'SIGNAL-FREE'].map((s) => price(s).cents), [2499, 4499, 199, 0]);
  assert.deepEqual(SIGNAL_TERMS.map((t) => `${t.sku}/${t.months}=${t.amount}`), ['SIGNAL-IND/1=24.99', 'SIGNAL-IND/3=69.99', 'SIGNAL-IND/6=129.99', 'SIGNAL-IND/12=239.99', 'SIGNAL-TEAM/1=44.99', 'SIGNAL-TEAM/3=129.99', 'SIGNAL-TEAM/6=249.99', 'SIGNAL-TEAM/12=479.99']);
  assert.deepEqual(BUNDLES.map((b) => [b.id, b.discountPct]), [['WORKPLACE-ESSENTIALS', 5], ['SERVICE-INTELLIGENCE', 6], ['ENGINEERING-LIFECYCLE', 7], ['SPATIAL-EXPERIENCES', 5], ['FOUR-WORLD-OPERATIONS', 8], ['CONVENTION-EVENT', 6], ['UNIVERSITY-CAMPUS', 6]]);
  // the sum of every list price is a checksum of the whole list: one changed digit anywhere changes it
  assert.equal(SKUS.reduce((a, s) => a + s.cents, 0), 394913);
  assert.deepEqual([price('CORE-ENTERPRISE').cents, price('CORE-STARTER').cents, price('PRO-ROOM').cents, price('SEARCH').cents, price('SEARCH-MIN').cents, price('LITE').cents], [109999, 14999, 1999, 45, 4999, 34999]);
});
test('every figure is the source’s own text: cents are derived from it digit by digit, and no price was rounded', () => {
  for (const x of [...SKUS, ...PILOTS]) { const [w, f = ''] = x.price.split('.'); assert.equal(x.cents, Number(w) * 100 + Number(f.padEnd(2, '0')), x.sku); }
  for (const t of SIGNAL_TERMS) { const [w, f = ''] = t.amount.split('.'); assert.equal(t.cents, Number(w) * 100 + Number(f.padEnd(2, '0'))); }
  for (const b of BUNDLES) { assert.equal(b.discount, `${b.discountPct}%`); for (const s of b.skus) assert.ok(price(s), `${b.id} names ${s}`); assert.match(b.rule, /never discount tax, payment fees, external licenses, services or pilot fees/); }
  for (const p of PILOTS) assert.equal(p.caveat, 'Subject to source authorization, supported connector maturity and security gates');
  assert.equal(usd(149999), '$1,499.99'); assert.equal(usd(45), '$0.45'); assert.equal(usd(0), '$0.00'); assert.equal(usd(109999), '$1,099.99');
  assert.equal(unitLabel('managed-room-month'), 'per managed room, per month'); assert.equal(unitLabel('trial-once'), 'once, for one 14-day trial');
  assert.ok(FAMILIES.length >= 20 && FAMILIES[0] === 'Tenant SaaS');
});
test('nothing internal is published: no basis, status or cost column, and no organisation the owner excluded', () => {
  const all = JSON.stringify([SKUS, BUNDLES, PILOTS, SIGNAL_TERMS]);
  for (const k of ['basis', 'status']) assert.ok(SKUS.every((s) => !(k in s)) && SIGNAL_TERMS.every((s) => !(k in s)), k);
  assert.doesNotMatch(all, /PROPOSED|Historical|margin|\bCAC\b|kraft|heinz|\bkhc\b|\baon\b|stefanini/i);
});
test('the pilot scope limits are the structured form of each pilot’s scope text', () => {
  const scope = (s: string) => PILOTS.find((p) => p.sku === s)!.scope;
  assert.match(scope('PILOT-DISCOVERY'), /Synthetic tenant \+ one sample room/); assert.match(scope('PILOT-READONLY'), /One supported customer-approved cloud source, <=5 rooms/);
  assert.match(scope('PILOT-HARDWARE'), /<=10 approved rooms, one named supported connector/); assert.match(scope('PILOT-CAMPUS'), /<=3 sites and <=25 rooms/);
  assert.deepEqual(PILOT_SKUS.map((s) => [PILOT_RULES[s].roomLimit, PILOT_RULES[s].siteLimit, PILOT_RULES[s].connectorLimit, PILOT_RULES[s].days]), [[1, 1, 0, 14], [5, 1, 1, 30], [10, 1, 1, 30], [25, 3, 1, 45]]);
  for (const p of PILOTS) assert.equal(PILOT_RULES[p.sku].days, p.days);
  assert.equal(smallestFit(1, 1), 'PILOT-DISCOVERY'); assert.equal(smallestFit(6, 1), 'PILOT-HARDWARE'); assert.equal(smallestFit(4, 2), 'PILOT-CAMPUS'); assert.equal(smallestFit(26, 1), null);
});
test('quote (V18-PILOT-02): a SIGNAL Teams seat is never charged the named-user rate as well; Search Party is per asset or the minimum, never both; a bundle never discounts a pilot fee', () => {
  const q = quote({ quantities: { 'SEAT-ENTERPRISE': 10, 'SIGNAL-TEAM': 4 }, enterpriseUsersWithSignalTeam: 4 });
  assert.deepEqual(q.monthly.map((l) => [l.sku, l.quantity, l.cents]), [['SEAT-ENTERPRISE', 6, 5994], ['SIGNAL-TEAM', 4, 17996]]); assert.equal(q.monthlyCents, 23990);
  assert.equal(quote({ quantities: { 'SEAT-ENTERPRISE': 10, 'SIGNAL-TEAM': 4 } }).monthlyCents, 9990 + 17996, 'different people: both charged');
  assert.throws(() => quote({ quantities: { 'SEAT-ENTERPRISE': 2, 'SIGNAL-TEAM': 1 }, enterpriseUsersWithSignalTeam: 2 }));
  assert.deepEqual(quote({ quantities: { SEARCH: 100 } }).monthly.map((l) => [l.sku, l.cents]), [['SEARCH-MIN', 4999]]);
  assert.deepEqual(quote({ quantities: { SEARCH: 200 } }).monthly.map((l) => [l.sku, l.cents]), [['SEARCH', 9000]]);
  assert.throws(() => quote({ quantities: { 'SEARCH-MIN': 1 } }));
  const b = quote({ quantities: { 'CORE-ENTERPRISE': 1, 'PRO-ROOM': 20, HARMONY: 1 }, bundle: 'WORKPLACE-ESSENTIALS', pilot: 'PILOT-READONLY' });
  assert.deepEqual(b.monthly.map((l) => [l.sku, l.listCents, l.discountPct, l.cents]), [['CORE-ENTERPRISE', 109999, 5, 104499], ['PRO-ROOM', 39980, 5, 37981], ['HARMONY', 12999, 0, 12999]]);
  assert.deepEqual(b.oneTime.map((l) => [l.sku, l.discountPct, l.cents]), [['PILOT-READONLY', 0, 19999]]);
  assert.throws(() => quote({ quantities: { NOPE: 1 } })); assert.throws(() => quote({ quantities: { LITE: 1.5 } }));
});

// ------------------------------------------------------------------------------------------------ readiness
const verifiedCloud: ConnectorChoice = { key: 'fixture-cloud', label: 'Fixture Cloud (test)', model: 'CLOUD_API', maturity: 'VERIFIED' };
const mock: ConnectorChoice = { key: 'mock-device-inventory', label: 'Local mock source', model: 'CLOUD_API', maturity: 'SANDBOX_MOCK' };
const cat = (key: string) => choiceOf(CONNECTORS.find((c) => c.key === key)!);
const R = (o: Partial<ReadinessInput>) => assessReadiness({ sku: 'PILOT-DISCOVERY', connector: 'NONE', rooms: 1, sites: 1, approver: 'TENANT_ADMIN', ...o });

test('the connector catalogue: 83 planning entries, none live, none verified — so no catalogue entry is ever offered as a live source', () => {
  assert.equal(CONNECTORS.length, 83); assert.ok(CONNECTORS.every((c) => !c.live && !c.sandbox && c.proof === 'NOT_ASSESSED' && c.implementation === 'MOCKED_UI_ONLY'));
  assert.ok(CONNECTORS.every((c) => choiceOf(c).maturity === 'CATALOGUE_ONLY'));
  assert.deepEqual([...new Set(CONNECTORS.map((c) => c.model))].sort(), ['BOTH', 'CLOUD_API', 'EDGE_BRIDGE']);
});
test('readiness (V18-PILOT-05): four fixture profiles land on the four classifications, each with reasons and a next step that is the enquiry form', () => {
  const cloud = CONNECTORS.find((c) => c.model === 'CLOUD_API')!;
  const cases: Array<[Partial<ReadinessInput>, string]> = [
    [{}, 'READY_TO_PURCHASE'],
    [{ approver: 'CAN_OBTAIN' }, 'READY_AFTER_CUSTOMER_ACTION'],
    [{ sku: 'PILOT-CAMPUS', rooms: 20, sites: 3, connector: 'NONE' }, 'REQUIRES_SALES_REVIEW'],
    [{ sku: 'PILOT-READONLY', rooms: 5, connector: choiceOf(cloud) }, 'NOT_CURRENTLY_SUPPORTED'],
  ];
  for (const [input, want] of cases) {
    const r = R(input); assert.equal(r.state, want, JSON.stringify(input));
    assert.ok(r.reasons.length && r.terms.length === 6 && r.approvals.length && r.prerequisites.length && r.limitations.length);
    assert.match(r.nextStep, /enquiry form/); assert.match(r.nextStep, /Self-serve purchase is not open yet/);
    assert.deepEqual(R(input), r, 'deterministic');
  }
  assert.deepEqual([...READINESS_STATES], ['READY_TO_PURCHASE', 'READY_AFTER_CUSTOMER_ACTION', 'REQUIRES_SALES_REVIEW', 'NOT_CURRENTLY_SUPPORTED']);
});
test('readiness (V18-PILOT-03): an unsupported connector blocks the live claim and names the approved alternative', () => {
  const r = R({ sku: 'PILOT-READONLY', rooms: 3, connector: cat(CONNECTORS.find((c) => c.model === 'CLOUD_API')!.key) });
  assert.equal(r.state, 'NOT_CURRENTLY_SUPPORTED'); assert.match(r.reasons.join(' '), /planning entry.*not offered today/); assert.equal(r.alternative?.sku, 'PILOT-DISCOVERY');
  const unlisted = R({ sku: 'PILOT-HARDWARE', rooms: 8, connector: 'NOT_LISTED' }); assert.equal(unlisted.state, 'NOT_CURRENTLY_SUPPORTED'); assert.equal(unlisted.alternative?.sku, 'PILOT-DISCOVERY');
  const edge = R({ sku: 'PILOT-READONLY', rooms: 3, connector: { ...verifiedCloud, model: 'EDGE_BRIDGE' } }); assert.equal(edge.state, 'NOT_CURRENTLY_SUPPORTED'); assert.equal(edge.alternative?.sku, 'PILOT-HARDWARE');
  // a verified connector (none exists in the catalogue today; a fixture stands in) makes the same scope purchasable
  assert.equal(R({ sku: 'PILOT-READONLY', rooms: 5, connector: verifiedCloud }).state, 'READY_TO_PURCHASE');
  assert.equal(R({ sku: 'PILOT-HARDWARE', rooms: 10, connector: verifiedCloud }).state, 'READY_TO_PURCHASE');
  assert.equal(R({ sku: 'PILOT-READONLY', rooms: 5, connector: verifiedCloud, approver: 'UNKNOWN' }).state, 'READY_AFTER_CUSTOMER_ACTION');
  assert.equal(R({ sku: 'PILOT-READONLY', rooms: 5, connector: 'NONE' }).state, 'READY_AFTER_CUSTOMER_ACTION');
  // a local mock is a sandbox fixture: available in a sandbox (labelled synthetic), never offered live
  assert.equal(R({ sku: 'PILOT-READONLY', rooms: 5, connector: mock }).state, 'NOT_CURRENTLY_SUPPORTED');
  const sb = R({ sku: 'PILOT-READONLY', rooms: 5, connector: mock, sandbox: true }); assert.equal(sb.state, 'READY_TO_PURCHASE'); assert.match(sb.limitations.join(' '), /local mock: everything it returns is synthetic/);
  // the campus pilot is never bought in one step, whatever the connector
  assert.equal(R({ sku: 'PILOT-CAMPUS', rooms: 25, sites: 3, connector: verifiedCloud }).state, 'REQUIRES_SALES_REVIEW');
  assert.equal(R({ sku: 'PILOT-CAMPUS', rooms: 25, sites: 3, connector: 'NOT_LISTED' }).state, 'REQUIRES_SALES_REVIEW');
});
test('readiness (V18-PILOT-13): counts beyond the pilot name the larger pilot; beyond every pilot is a review; no text asks for a secret', () => {
  const six = R({ sku: 'PILOT-READONLY', rooms: 6, connector: verifiedCloud }); assert.equal(six.state, 'READY_AFTER_CUSTOMER_ACTION'); assert.equal(six.alternative?.sku, 'PILOT-HARDWARE'); assert.match(six.reasons[0]!, /covers up to 5 rooms at 1 site; you named 6 rooms/);
  assert.equal(R({ sku: 'PILOT-HARDWARE', rooms: 10, sites: 2, connector: verifiedCloud }).alternative?.sku, 'PILOT-CAMPUS');
  assert.equal(R({ sku: 'PILOT-DISCOVERY', rooms: 40 }).state, 'REQUIRES_SALES_REVIEW');
  assert.equal(R({ rooms: Number.NaN, sites: -3 }).state, 'READY_TO_PURCHASE', 'a count that is not a whole number ≥ 1 is read as 1');
  for (const sku of PILOT_SKUS) { const r = R({ sku, connector: verifiedCloud, rooms: 1 }); assert.match(r.terms[0]!, new RegExp(`^\\${r.price.replace(/[.$,]/g, '\\$&').slice(1)} once, before any applicable tax`)); assert.match(r.terms.join(' '), /never grants a connection to your systems or access to equipment/); assert.doesNotMatch(JSON.stringify(r), /enter (your|the) (password|api key|token)/i); }
});

// ------------------------------------------------------------------------------------------------ the activation machines
const run = (s: PilotState, ...es: PilotEvent[]) => es.reduce((st, e) => { const r = applyPilot(st, e); assert.ok(r.ok, `${e.type}: ${!r.ok ? r.why.join('; ') : ''}`); return r.state; }, s);
const start = (sku: 'PILOT-DISCOVERY' | 'PILOT-READONLY' = 'PILOT-READONLY') => initialPilot(sku, 'READY_TO_PURCHASE', PILOT_RULES[sku]);
const refusal = (s: PilotState, e: PilotEvent) => { const r = applyPilot(s, e); assert.ok(!r.ok); return r.ok ? '' : r.why.join(' '); };

test('payment (V18-PILOT-07): the return from the checkout page verifies nothing; only the provider’s event grants the entitlement, and only that', () => {
  let s = run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'CHECKOUT_RETURNED' });
  assert.deepEqual([s.payment, s.entitlement, s.connector, s.deployment], ['PENDING', 'NONE', 'NONE', 'NOT_STARTED']);
  const v = applyPilot(s, { type: 'PAYMENT_VERIFIED' }); assert.ok(v.ok); if (!v.ok) return; s = v.state;
  assert.deepEqual(v.changes.map((c) => `${c.machine}:${c.from}>${c.to}`), ['payment:PENDING>VERIFIED', 'entitlement:NONE>PROVISIONING', 'entitlement:PROVISIONING>ACTIVE', 'deployment:NOT_STARTED>TENANT_READY']);
  assert.equal(s.connector, 'NONE', 'payment never authorizes a connector'); assert.deepEqual(mayReadSource(s), { ok: false, why: ['the connector authorization is NONE: the customer’s administrator has not approved it'] });
  assert.match(refusal(run(s, { type: 'DEPLOYMENT', to: 'IDENTITY_APPROVED' }), { type: 'DEPLOYMENT', to: 'DISCOVERY_IN_PROGRESS' }), /the payment does not grant it/);
  assert.match(refusal(initialPilot('PILOT-READONLY', 'NOT_CURRENTLY_SUPPORTED', PILOT_RULES['PILOT-READONLY']), { type: 'CHECKOUT_CREATED' }), /only when the scope is READY_TO_PURCHASE/);
  assert.match(refusal(start(), { type: 'PAYMENT_VERIFIED' }), /no checkout was started/);
});
test('payment (V18-PILOT-08): a repeated or late provider event is stale — it changes nothing', () => {
  const s = run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' });
  for (const e of [{ type: 'PAYMENT_VERIFIED' }, { type: 'PAYMENT_FAILED' }, { type: 'DISPUTE_WON' }, { type: 'DISPUTE_LOST' }] as PilotEvent[]) { const r = applyPilot(s, e); assert.ok(!r.ok && r.stale, e.type); }
  const refunded = run(s, { type: 'PAYMENT_REFUNDED' }); const late = applyPilot(refunded, { type: 'PAYMENT_VERIFIED' }); assert.ok(!late.ok && late.stale); assert.equal(refunded.entitlement, 'SUSPENDED');
});
test('a declined payment leaves nothing granted; a new checkout recovers (failure path)', () => {
  let s = run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'CHECKOUT_RETURNED' }, { type: 'PAYMENT_FAILED' });
  assert.deepEqual([s.payment, s.entitlement, s.deployment], ['FAILED', 'NONE', 'NOT_STARTED']);
  assert.match(refusal(s, { type: 'DEPLOYMENT', to: 'IDENTITY_APPROVED' }), /entitlement is NONE/);
  s = run(s, { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' }); assert.deepEqual([s.payment, s.entitlement], ['VERIFIED', 'ACTIVE']);
  assert.match(refusal(run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'CHECKOUT_RETURNED' }), { type: 'CHECKOUT_CREATED' }), /could charge twice/);
});
test('connector authorization (V18-PILOT-10): separate from payment, refused when unsupported, and a revoked consent blocks the deployment until re-approved', () => {
  const paid = run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' }, { type: 'DEPLOYMENT', to: 'IDENTITY_APPROVED' });
  assert.match(refusal(paid, { type: 'CONNECTOR_REQUESTED', supported: false }), /not supported.*nothing is connected/);
  assert.match(refusal(start(), { type: 'CONNECTOR_REQUESTED', supported: true }), /only under an active entitlement/);
  assert.match(refusal(run(start('PILOT-DISCOVERY'), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' }), { type: 'CONNECTOR_REQUESTED', supported: true }), /synthetic pilot.*connects to nothing/);
  assert.match(refusal(paid, { type: 'CONNECTOR_APPROVED' }), /no open request/);
  let s = run(paid, { type: 'CONNECTOR_REQUESTED', supported: true }); assert.match(refusal(s, { type: 'DEPLOYMENT', to: 'DISCOVERY_IN_PROGRESS' }), /REQUESTED/);
  s = run(s, { type: 'CONNECTOR_APPROVED' }, { type: 'DEPLOYMENT', to: 'DISCOVERY_IN_PROGRESS' }); assert.ok(mayReadSource(s).ok);
  assert.match(refusal(s, { type: 'DEPLOYMENT', to: 'FIRST_SOURCE_VERIFIED' }), /synthetic or mock reading never counts/);
  s = run(s, { type: 'CONNECTOR_REVOKED' }); assert.deepEqual([s.connector, s.deployment, s.resumeTo], ['REVOKED', 'BLOCKED', 'DISCOVERY_IN_PROGRESS']); assert.ok(s.blocking.includes(BLOCK.consent)); assert.ok(!mayReadSource(s).ok);
  assert.match(refusal(s, { type: 'DEPLOYMENT', to: 'FIRST_SOURCE_VERIFIED', verifiedSource: true }), /blocked.*revoked/);
  s = run(s, { type: 'CONNECTOR_REQUESTED', supported: true }, { type: 'CONNECTOR_APPROVED' }); assert.deepEqual([s.deployment, s.blocking], ['DISCOVERY_IN_PROGRESS', []]);
  s = run(s, { type: 'DEPLOYMENT', to: 'FIRST_SOURCE_VERIFIED', verifiedSource: true }, { type: 'DEPLOYMENT', to: 'ASSETS_RECONCILED' }, { type: 'DEPLOYMENT', to: 'PILOT_ACTIVE' }); assert.equal(s.deployment, 'PILOT_ACTIVE');
  const denied = run(paid, { type: 'CONNECTOR_REQUESTED', supported: true }, { type: 'CONNECTOR_DENIED' }); assert.equal(denied.connector, 'DENIED'); assert.equal(denied.entitlement, 'ACTIVE');
});
test('refund and dispute (V18-PILOT-09): the entitlement is suspended and the deployment blocked; a dispute won restores both; nothing is deleted', () => {
  const active = run(start('PILOT-DISCOVERY'), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' }, { type: 'DEPLOYMENT', to: 'IDENTITY_APPROVED' }, { type: 'DEPLOYMENT', to: 'PILOT_ACTIVE' });
  const d = run(active, { type: 'PAYMENT_DISPUTED' }); assert.deepEqual([d.payment, d.entitlement, d.deployment, d.resumeTo], ['DISPUTED', 'SUSPENDED', 'BLOCKED', 'PILOT_ACTIVE']);
  assert.match(refusal(d, { type: 'DEPLOYMENT', to: 'FIRST_REPORT_DELIVERED' }), /SUSPENDED/); assert.ok(!mayEnroll(d, 0, 1).ok);
  const won = run(d, { type: 'DISPUTE_WON' }); assert.deepEqual([won.payment, won.entitlement, won.deployment, won.blocking], ['VERIFIED', 'ACTIVE', 'PILOT_ACTIVE', []]);
  const lost = run(d, { type: 'DISPUTE_LOST' }); assert.deepEqual([lost.payment, lost.entitlement, lost.deployment, lost.blocking], ['REFUNDED', 'SUSPENDED', 'BLOCKED', [BLOCK.refund]]);
  const r = run(active, { type: 'PAYMENT_REFUNDED' }); assert.deepEqual([r.payment, r.entitlement, r.deployment], ['REFUNDED', 'SUSPENDED', 'BLOCKED']); assert.match(refusal(r, { type: 'CONVERTED' }), /REFUNDED/);
});
test('scope, expiry and conversion (V18-PILOT-13/14/15): a sixth room is refused; an expired pilot ends read-only; a reviewed pilot converts in place', () => {
  const s = run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' });
  assert.ok(mayEnroll(s, 4, 1).ok); assert.match(mayEnroll(s, 5, 1).why.join(' '), /covers up to 5 rooms; this would be room 6.*nothing is billed/); assert.match(mayEnroll(s, 1, 2).why.join(' '), /covers 1 site/);
  const ex = run(s, { type: 'EXPIRED' }); assert.deepEqual([ex.entitlement, ex.deployment, ex.payment], ['EXPIRED', 'PILOT_ENDED', 'VERIFIED']);
  let p = run(start('PILOT-DISCOVERY'), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' }, { type: 'DEPLOYMENT', to: 'IDENTITY_APPROVED' });
  assert.match(refusal(p, { type: 'DEPLOYMENT', to: 'DISCOVERY_IN_PROGRESS' }), /synthetic pilot: it has no source to discover/); assert.match(refusal(p, { type: 'CONVERTED' }), /after its review/);
  p = run(p, { type: 'DEPLOYMENT', to: 'PILOT_ACTIVE' }, { type: 'DEPLOYMENT', to: 'FIRST_REPORT_DELIVERED' }, { type: 'DEPLOYMENT', to: 'REVIEW_READY' }, { type: 'CONVERTED' });
  assert.deepEqual([p.deployment, p.entitlement, p.payment], ['CONVERSION_APPROVED', 'ACTIVE', 'VERIFIED']);
  assert.match(refusal(run(start(), { type: 'CHECKOUT_CREATED' }, { type: 'PAYMENT_VERIFIED' }, { type: 'DEPLOYMENT', to: 'IDENTITY_APPROVED' }), { type: 'DEPLOYMENT', to: 'PILOT_ACTIVE' }), /only after discovery/);
  assert.match(refusal(s, { type: 'DEPLOYMENT', to: 'REVIEW_READY' }), /next step is IDENTITY_APPROVED/);
});
