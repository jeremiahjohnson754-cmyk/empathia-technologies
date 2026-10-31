import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOVERNANCE_STATES, GOVERNANCE_TRANSITIONS, DELIVERY_STATES, DELIVERY_TRANSITIONS, REQUEST_TYPE_KEYS, governanceBlockers, deliveryBlockers, stageOf, type GovernanceFacts, type DeliveryFacts } from '../src/index.js';

const base = (over: Partial<GovernanceFacts> = {}): GovernanceFacts => ({
  state: 'DRAFT', scopeRev: 1, request: { siteCode: 'NST', type: 'new_room', intent: 'a huddle room for four', photoPolicy: 'DOCUMENTATION_REQUIRED', photos: 0 },
  routedVendorId: null, brief: null, approverId: null, approverEligible: false, actorId: 'P1', delegated: false, delegationExpired: false, ...over,
});

test('the two machines are the demonstrator’s: 11 + 12 states, 11 + 11 transitions, nine request types', () => {
  assert.equal(GOVERNANCE_STATES.length, 11); assert.equal(GOVERNANCE_TRANSITIONS.length, 11);
  assert.equal(DELIVERY_STATES.length, 12); assert.equal(DELIVERY_TRANSITIONS.length, 11);
  assert.equal(REQUEST_TYPE_KEYS.length, 9);
  for (const t of [...GOVERNANCE_TRANSITIONS, ...DELIVERY_TRANSITIONS]) assert.match(t.authority, /^[a-z_]+\.[a-z_.]+$/);
});

test('a request is submitted only when it is valid; the owner photo policy is a hard requirement', () => {
  assert.deepEqual(governanceBlockers('SUBMITTED', base()), []);
  assert.deepEqual(governanceBlockers('SUBMITTED', base({ request: { siteCode: null, type: null, intent: '', photoPolicy: 'LOCATION_VERIFICATION_REQUIRED', photos: 0 } })), ['site missing', 'work type missing', 'usage intent missing', 'photos required by the owner policy']);
  assert.equal(governanceBlockers('APPROVED', base()).length, 1);   // not a step from DRAFT
});

test('routing: the acknowledging vendor must be the routed one; an internal route needs a documented exception', () => {
  const s = base({ state: 'SUBMITTED', routedVendorId: 'V1' });
  assert.deepEqual(governanceBlockers('VENDOR_ACKNOWLEDGED', { ...s, acknowledgingVendorId: 'V2' }), ['the acknowledging vendor is not the vendor this request was sent to']);
  assert.deepEqual(governanceBlockers('VENDOR_ACKNOWLEDGED', { ...s, acknowledgingVendorId: 'V1' }), []);
  assert.deepEqual(governanceBlockers('INTERNAL_ROUTE_RECORDED', { ...s, exceptionReason: 'short' }), ['an internal-only route needs a documented exception reason']);
  assert.deepEqual(governanceBlockers('INTERNAL_ROUTE_RECORDED', { ...s, exceptionReason: 'no supplier covers this site this quarter' }), []);
});

test('the brief is versioned against the scope revision; the approver is eligible, distinct from the author and from the selector', () => {
  const s = base({ state: 'INTERNAL_ROUTE_RECORDED', scopeRev: 2 });
  assert.deepEqual(governanceBlockers('PITCH_READY', s), ['no versioned engineering brief is linked']);
  assert.deepEqual(governanceBlockers('PITCH_READY', { ...s, brief: { rev: 1, scopeRev: 1, authorId: 'OPS' } }), ['the brief is for scope revision 1, the project is at 2']);
  const p = base({ state: 'PITCH_READY', scopeRev: 2, brief: { rev: 2, scopeRev: 2, authorId: 'OPS' }, actorId: 'OPS' });
  assert.deepEqual(governanceBlockers('DECISION_PENDING', p), ['no approver selected']);
  assert.deepEqual(governanceBlockers('DECISION_PENDING', { ...p, approverId: 'OPS', approverEligible: true }), ['the author of the brief cannot be selected as approver', 'the person selecting the approver cannot select themself']);
  assert.deepEqual(governanceBlockers('DECISION_PENDING', { ...p, approverId: 'EXEC', approverEligible: false }), ['the selected approver is not an eligible approver for this scope (project.decide)']);
  assert.deepEqual(governanceBlockers('DECISION_PENDING', { ...p, approverId: 'EXEC', approverEligible: true }), []);
});

test('the decision: the selected approver (or a valid delegate) decides the current scope revision; holds carry a reason and a review date', () => {
  const d = base({ state: 'DECISION_PENDING', scopeRev: 2, brief: { rev: 2, scopeRev: 2, authorId: 'OPS' }, approverId: 'EXEC', approverEligible: true, actorId: 'EXEC', decision: { decision: 'APPROVED', scopeRev: 2 } });
  assert.deepEqual(governanceBlockers('APPROVED', d), []);
  assert.deepEqual(governanceBlockers('APPROVED', { ...d, actorId: 'OPS' }), ['the approver authored the brief (segregation of duties)', 'the decision was requested from the selected approver, not from OPS; a delegation is required']);
  assert.deepEqual(governanceBlockers('APPROVED', { ...d, actorId: 'DEP', delegated: true }), []);
  assert.deepEqual(governanceBlockers('APPROVED', { ...d, actorId: 'DEP', delegated: true, delegationExpired: true }), ['the delegation has expired']);
  assert.deepEqual(governanceBlockers('APPROVED', { ...d, decision: { decision: 'APPROVED', scopeRev: 1 } }), ['the decision names a different scope revision than the current one']);
  assert.deepEqual(governanceBlockers('HELD', { ...d, decision: { decision: 'HELD', reason: 'short' } }), ['a hold needs a reason', 'a hold needs a review date']);
  assert.deepEqual(governanceBlockers('REJECTED', { ...d, decision: { decision: 'REJECTED', reason: 'the business case does not hold' } }), []);
});

test('funding is a signed budget against the approved scope revision; a finance outage never auto-approves', () => {
  const a = base({ state: 'APPROVED', scopeRev: 2 });
  assert.deepEqual(governanceBlockers('FUNDED', a), ['no funding record']);
  assert.deepEqual(governanceBlockers('FUNDED', { ...a, funding: { amount: 0, currency: null, costCenter: null, scopeRev: 1, financeOutage: true } }), ['an amount above zero is required', 'a currency is required', 'funding names scope revision 1, the approved scope is 2', 'a cost center is required', 'the finance system is unavailable: funding stays pending, it is never auto-approved']);
  assert.deepEqual(governanceBlockers('FUNDED', { ...a, funding: { amount: 42000, currency: 'USD', costCenter: 'CC-AV-01', scopeRev: 2 } }), []);
  assert.deepEqual(governanceBlockers('SUSPENDED', { ...a, state: 'FUNDED' }), ['a withdrawal or expiry reason is required']);
});

const dbase = (over: Partial<DeliveryFacts> = {}): DeliveryFacts => ({ state: 'ENGINEERING_REVIEW', governance: 'FUNDED', revision: null, rooms: [], rulePackVersion: null, fieldAuthorization: null, workOrders: null, supportOwnerId: null, qaSignoff: false, actorId: 'SE', ...over });
const room = (over: Partial<DeliveryFacts['rooms'][number]> = {}) => ({ code: 'R-1', lifecycle: 'DESIGN_APPROVED', hasPlan: false, applicable: 10, verified: 0, openIssues: 0, drawingsApproved: false, photosApproved: false, hasBaseline: false, ...over });

test('delivery: design needs money; a revision needs files/model, a DIVR and a reason; release needs every domain review, no open RFI, a different person, and approved geometry', () => {
  assert.deepEqual(deliveryBlockers('DESIGN_DRAFT', dbase({ governance: 'APPROVED' })), ['the project is APPROVED, not FUNDED: an approved project without money is not field-authorized']);
  assert.deepEqual(deliveryBlockers('DESIGN_DRAFT', dbase()), []);
  const rev = { rev: 1, files: 0, liteModel: false, divr: false, reason: null, domainsNeeded: ['dsp', 'camera'], domainApprovals: {}, openRfis: 1, authorId: 'DES' };
  assert.deepEqual(deliveryBlockers('DESIGN_REVIEW', dbase({ state: 'DESIGN_DRAFT', revision: rev })), ['no design files or Lite model in this revision', 'no Design Intent & Verification Record linked', 'a revision needs its reason']);
  assert.deepEqual(deliveryBlockers('DESIGN_RELEASED', dbase({ state: 'DESIGN_REVIEW', revision: rev, rooms: [room({ lifecycle: 'PLANNED' })], actorId: 'DES' })), ['dsp review missing', 'camera review missing', '1 open RFI(s) on this revision', 'the author of the revision does not release it (segregation of duties)', 'geometry of R-1 is PLANNED, not approved for construction']);
  assert.deepEqual(deliveryBlockers('DESIGN_RELEASED', dbase({ state: 'DESIGN_REVIEW', revision: { ...rev, domainApprovals: { dsp: 'APPROVED', camera: 'APPROVED' }, openRfis: 0 }, rooms: [room()] })), []);
});

test('execution and handoff are read from the rooms: tests verified, documents, acceptance, support owner, baselines', () => {
  assert.deepEqual(deliveryBlockers('TESTS_VERIFIED', dbase({ state: 'FIELD_ACTIVE', rooms: [room({ verified: 9, openIssues: 1 })] })), ['R-1: 9 of 10 applicable tests passed and independently verified', 'R-1: 1 open deficiency(ies)']);
  assert.deepEqual(deliveryBlockers('DOCUMENTS_APPROVED', dbase({ state: 'TESTS_VERIFIED', rooms: [room()] })), ['R-1: as-built drawings not approved', 'R-1: final photos not approved']);
  assert.deepEqual(deliveryBlockers('CUSTOMER_ACCEPTED', dbase({ state: 'DOCUMENTS_APPROVED', rooms: [room({ lifecycle: 'COMMISSIONING' })] })), ['R-1 is COMMISSIONING, not ACCEPTED by the customer']);
  assert.deepEqual(deliveryBlockers('HANDED_OFF', dbase({ state: 'CUSTOMER_ACCEPTED' })), ['no support owner assigned', 'no QA sign-off recorded']);
  assert.deepEqual(deliveryBlockers('BASELINED', dbase({ state: 'HANDED_OFF', rooms: [room({ lifecycle: 'ACCEPTED' })] })), ['R-1 has no current accepted baseline']);
  assert.deepEqual(deliveryBlockers('BASELINED', dbase({ state: 'HANDED_OFF', rooms: [room({ lifecycle: 'ACCEPTED', hasBaseline: true })] })), []);
});

test('stages follow the engine order: approval before collaborative design', () => {
  assert.deepEqual(stageOf('DRAFT', null), { n: 1, stage: 'intake' });
  assert.deepEqual(stageOf('PITCH_READY', null), { n: 3, stage: 'brief' });
  assert.deepEqual(stageOf('FUNDED', 'DESIGN_REVIEW'), { n: 5, stage: 'collaborative design' });
  assert.deepEqual(stageOf('FUNDED', 'FIELD_ACTIVE'), { n: 6, stage: 'execution and handoff' });
  assert.deepEqual(stageOf('FUNDED', 'BASELINED'), { n: 7, stage: 'operational transition' });
});
