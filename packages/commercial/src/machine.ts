/**
 * Pilot activation (handoff v1.8 §4.3, ADR-023, contract PILOT_ACTIVATION v1.8): five SEPARATE state machines — readiness, payment,
 * entitlement, connector authorization, deployment — advanced by one pure function. The enterprise API persists what it returns and
 * audits every change; the investor demonstration runs the same function in the browser, so the simulation cannot drift from the server.
 *
 * The rule the machines exist to keep: a verified payment grants the software entitlement for the purchased SKU and scope, and nothing
 * else. Connector authorization is a separate act of the customer's administrator; a deployment step that reads a source needs both.
 * A refund or dispute suspends the entitlement and blocks the deployment; it never deletes a record.
 */
import type { PilotScope, ReadinessState } from './readiness.js';
import type { PilotSku } from './types.js';

export const PAYMENT_STATES = ['NOT_STARTED', 'CHECKOUT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'REFUNDED', 'DISPUTED'] as const;
export const ENTITLEMENT_STATES = ['NONE', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'] as const;
export const CONNECTOR_STATES = ['NONE', 'REQUESTED', 'APPROVED', 'DENIED', 'REVOKED'] as const;
export const DEPLOYMENT_STATES = ['NOT_STARTED', 'TENANT_READY', 'IDENTITY_APPROVED', 'DISCOVERY_IN_PROGRESS', 'FIRST_SOURCE_VERIFIED', 'ASSETS_RECONCILED', 'PILOT_ACTIVE', 'FIRST_REPORT_DELIVERED', 'REVIEW_READY', 'CONVERSION_APPROVED', 'PILOT_ENDED', 'BLOCKED'] as const;
export type PaymentState = typeof PAYMENT_STATES[number];
export type EntitlementState = typeof ENTITLEMENT_STATES[number];
export type ConnectorState = typeof CONNECTOR_STATES[number];
export type DeploymentState = typeof DEPLOYMENT_STATES[number];
export type Machine = 'payment' | 'entitlement' | 'connector' | 'deployment';

export interface PilotState {
  sku: PilotSku;
  readiness: ReadinessState;
  payment: PaymentState;
  entitlement: EntitlementState;
  connector: ConnectorState;
  deployment: DeploymentState;
  /** where the deployment was when it was blocked, so lifting the block returns it there */
  resumeTo: DeploymentState | null;
  scope: Pick<PilotScope, 'roomLimit' | 'siteLimit' | 'connectorLimit'>;
  blocking: string[];
}
export type PilotEvent =
  | { type: 'CHECKOUT_CREATED' } | { type: 'CHECKOUT_RETURNED' }
  | { type: 'PAYMENT_VERIFIED' } | { type: 'PAYMENT_FAILED' } | { type: 'PAYMENT_REFUNDED' } | { type: 'PAYMENT_DISPUTED' } | { type: 'DISPUTE_WON' } | { type: 'DISPUTE_LOST' }
  /** `supported`: the named connector exists and is verified (or, in a sandbox, is a local mock) — decided by the caller from the catalogue */
  | { type: 'CONNECTOR_REQUESTED'; supported: boolean } | { type: 'CONNECTOR_APPROVED' } | { type: 'CONNECTOR_DENIED' } | { type: 'CONNECTOR_REVOKED' }
  /** `verifiedSource`: a stored observation from the authorized source that is NOT synthetic — required for FIRST_SOURCE_VERIFIED */
  | { type: 'DEPLOYMENT'; to: DeploymentState; verifiedSource?: boolean }
  | { type: 'EXPIRED' } | { type: 'CONVERTED' };
export interface Change { machine: Machine; from: string; to: string; reason: string }
export type Applied = { ok: true; state: PilotState; changes: Change[]; note?: string } | { ok: false; why: string[]; /** a late or repeated provider event: ignored, not an error */ stale?: boolean };

export function initialPilot(sku: PilotSku, readiness: ReadinessState, scope: PilotState['scope'], blocking: string[] = []): PilotState {
  return { sku, readiness, payment: 'NOT_STARTED', entitlement: 'NONE', connector: 'NONE', deployment: 'NOT_STARTED', resumeTo: null, scope: { ...scope }, blocking: [...blocking] };
}

/** The deployment path. A synthetic pilot (no connector in scope) goes from IDENTITY_APPROVED straight to PILOT_ACTIVE: it has no source to discover. */
const NEXT: Partial<Record<DeploymentState, DeploymentState[]>> = {
  TENANT_READY: ['IDENTITY_APPROVED'], IDENTITY_APPROVED: ['DISCOVERY_IN_PROGRESS', 'PILOT_ACTIVE'], DISCOVERY_IN_PROGRESS: ['FIRST_SOURCE_VERIFIED'], FIRST_SOURCE_VERIFIED: ['ASSETS_RECONCILED'],
  ASSETS_RECONCILED: ['PILOT_ACTIVE'], PILOT_ACTIVE: ['FIRST_REPORT_DELIVERED'], FIRST_REPORT_DELIVERED: ['REVIEW_READY'], REVIEW_READY: [],
};
const TERMINAL: DeploymentState[] = ['CONVERSION_APPROVED', 'PILOT_ENDED'];
const SOURCE_STEPS: DeploymentState[] = ['DISCOVERY_IN_PROGRESS', 'FIRST_SOURCE_VERIFIED', 'ASSETS_RECONCILED'];
export const BLOCK = { refund: 'the payment was refunded: the entitlement is suspended', dispute: 'the payment is disputed: the entitlement is suspended until the dispute closes', consent: 'the connector authorization was revoked: nothing is read from the source' } as const;

export function applyPilot(s: PilotState, e: PilotEvent): Applied {
  const n: PilotState = { ...s, scope: { ...s.scope }, blocking: [...s.blocking] }; const changes: Change[] = [];
  const set = <M extends Machine>(machine: M, to: PilotState[M], reason: string) => { if (n[machine] !== to) { changes.push({ machine, from: n[machine], to, reason }); (n as unknown as Record<string, string>)[machine] = to; } };
  const no = (...why: string[]): Applied => ({ ok: false, why });
  const stale = (why: string): Applied => ({ ok: false, why: [why], stale: true });
  const done = (note?: string): Applied => ({ ok: true, state: n, changes, ...(note ? { note } : {}) });
  const block = (reason: string) => { if (!TERMINAL.includes(n.deployment) && n.deployment !== 'BLOCKED' && n.deployment !== 'NOT_STARTED') { n.resumeTo = n.deployment; set('deployment', 'BLOCKED', reason); } if (!n.blocking.includes(reason)) n.blocking.push(reason); };
  const unblock = (reason: string) => { n.blocking = n.blocking.filter((b) => b !== reason); if (n.deployment === 'BLOCKED' && !n.blocking.some((b) => (Object.values(BLOCK) as string[]).includes(b))) { set('deployment', n.resumeTo || 'TENANT_READY', `unblocked: ${reason} no longer applies`); n.resumeTo = null; } };
  const entitled = () => (n.entitlement === 'ACTIVE' ? null : `the software entitlement is ${n.entitlement}, not ACTIVE`);

  switch (e.type) {
    case 'CHECKOUT_CREATED':
      if (n.readiness !== 'READY_TO_PURCHASE') return no(`readiness is ${n.readiness}: a checkout opens only when the scope is READY_TO_PURCHASE`);
      if (n.payment === 'CHECKOUT_STARTED') return done('a checkout is already open for this pilot');
      if (n.payment === 'PENDING') return no('a payment is awaiting confirmation from the provider; a second checkout could charge twice');
      if (n.payment !== 'NOT_STARTED' && n.payment !== 'FAILED') return no(`the payment is ${n.payment}: there is nothing to check out`);
      set('payment', 'CHECKOUT_STARTED', n.payment === 'FAILED' ? 'a new checkout after a failed payment' : 'hosted checkout session created'); return done();
    case 'CHECKOUT_RETURNED':
      if (n.payment === 'CHECKOUT_STARTED') { set('payment', 'PENDING', 'the buyer returned from the hosted checkout; the provider has not confirmed anything yet'); return done(); }
      return done('the return from the checkout page changes nothing: only a verified provider event does');
    case 'PAYMENT_VERIFIED':
      if (n.payment === 'VERIFIED') return stale('the payment is already verified');
      if (n.payment === 'REFUNDED' || n.payment === 'DISPUTED') return stale(`the payment is ${n.payment}: a late confirmation changes nothing`);
      if (n.payment === 'NOT_STARTED') return no('no checkout was started for this pilot');
      set('payment', 'VERIFIED', 'the provider confirmed the payment (signed, reconciled event)');
      set('entitlement', 'PROVISIONING', 'payment verified'); set('entitlement', 'ACTIVE', `software entitlement for ${n.sku} and its scope only`);
      if (n.deployment === 'NOT_STARTED') set('deployment', 'TENANT_READY', 'the tenant is entitled; no source is connected');
      return done();
    case 'PAYMENT_FAILED':
      if (n.payment !== 'CHECKOUT_STARTED' && n.payment !== 'PENDING') return stale(`the payment is ${n.payment}: a late failure notice changes nothing`);
      set('payment', 'FAILED', 'the provider reported the payment failed or was declined'); return done();
    case 'PAYMENT_REFUNDED': case 'DISPUTE_LOST':
      if (e.type === 'DISPUTE_LOST' && n.payment !== 'DISPUTED') return stale(`the payment is ${n.payment}: there is no open dispute`);
      if (n.payment !== 'VERIFIED' && n.payment !== 'DISPUTED') return stale(`the payment is ${n.payment}: there is nothing to refund`);
      set('payment', 'REFUNDED', e.type === 'DISPUTE_LOST' ? 'the dispute closed against the payment' : 'the provider reported a refund');
      if (n.entitlement === 'ACTIVE' || n.entitlement === 'PROVISIONING') set('entitlement', 'SUSPENDED', BLOCK.refund);
      n.blocking = n.blocking.filter((b) => b !== BLOCK.dispute); block(BLOCK.refund); return done();
    case 'PAYMENT_DISPUTED':
      if (n.payment !== 'VERIFIED') return stale(`the payment is ${n.payment}: a dispute notice changes nothing`);
      set('payment', 'DISPUTED', 'the provider reported a dispute (chargeback)');
      if (n.entitlement === 'ACTIVE' || n.entitlement === 'PROVISIONING') set('entitlement', 'SUSPENDED', BLOCK.dispute);
      block(BLOCK.dispute); return done();
    case 'DISPUTE_WON':
      if (n.payment !== 'DISPUTED') return stale(`the payment is ${n.payment}: there is no open dispute`);
      set('payment', 'VERIFIED', 'the dispute closed in favour of the payment');
      if (n.entitlement === 'SUSPENDED') set('entitlement', 'ACTIVE', 'the dispute closed: the entitlement resumes');
      unblock(BLOCK.dispute); return done();
    case 'CONNECTOR_REQUESTED': {
      const why = entitled(); if (why) return no(`a connector authorization can be requested only under an active entitlement: ${why}`);
      if (n.scope.connectorLimit < 1) return no(`${n.sku} is a synthetic pilot: it has no connector in its scope and connects to nothing`);
      if (!e.supported) return no('that connector is not supported: no verified connector exists for it, so no authorization is requested and nothing is connected');
      if (n.connector === 'REQUESTED' || n.connector === 'APPROVED') return no(`the connector authorization is already ${n.connector}; the pilot covers ${n.scope.connectorLimit} source`);
      set('connector', 'REQUESTED', 'read-only authorization requested from the customer’s administrator'); return done();
    }
    case 'CONNECTOR_APPROVED': {
      const why = entitled(); if (why) return no(why);
      if (n.connector !== 'REQUESTED') return no(`the connector authorization is ${n.connector}: there is no open request to approve`);
      set('connector', 'APPROVED', 'the customer’s administrator authorized read-only access'); unblock(BLOCK.consent); return done();
    }
    case 'CONNECTOR_DENIED':
      if (n.connector !== 'REQUESTED') return no(`the connector authorization is ${n.connector}: there is no open request to deny`);
      set('connector', 'DENIED', 'the customer’s administrator declined'); return done();
    case 'CONNECTOR_REVOKED':
      if (n.connector !== 'APPROVED') return no(`the connector authorization is ${n.connector}: there is nothing to revoke`);
      set('connector', 'REVOKED', 'the customer’s administrator revoked the authorization'); block(BLOCK.consent); return done();
    case 'DEPLOYMENT': {
      const why = entitled(); if (why) return no(`payment alone, or a lapsed entitlement, moves nothing: ${why}`);
      if (n.deployment === 'BLOCKED') return no(`the deployment is blocked: ${n.blocking.join('; ') || 'see the pilot record'}`);
      if (e.to === 'PILOT_ENDED') { if (TERMINAL.includes(n.deployment) || n.deployment === 'NOT_STARTED') return no(`the deployment is ${n.deployment}`); set('deployment', 'PILOT_ENDED', 'ended by the customer’s administrator'); return done(); }
      if (!(NEXT[n.deployment] || []).includes(e.to)) return no(`the deployment is ${n.deployment}: the next step is ${(NEXT[n.deployment] || []).join(' or ') || 'none'}, not ${e.to}`);
      const synthetic = n.scope.connectorLimit < 1;
      if (n.deployment === 'IDENTITY_APPROVED' && e.to === 'PILOT_ACTIVE' && !synthetic) return no('a pilot with a source in scope becomes active only after discovery, a verified first source and reconciled assets');
      if (SOURCE_STEPS.includes(e.to)) {
        if (synthetic) return no(`${n.sku} is a synthetic pilot: it has no source to discover`);
        if (n.connector !== 'APPROVED') return no(`the connector authorization is ${n.connector}: nothing is discovered or read until the customer’s administrator has approved it — the payment does not grant it`);
        if (e.to === 'FIRST_SOURCE_VERIFIED' && !e.verifiedSource) return no('no verified observation from the authorized source exists: a synthetic or mock reading never counts as a verified source');
      } else if (!synthetic && n.connector !== 'APPROVED' && n.deployment !== 'TENANT_READY') return no(`the connector authorization is ${n.connector}: the pilot cannot proceed on a source that is not authorized`);
      set('deployment', e.to, 'advanced by the customer’s administrator'); return done();
    }
    case 'EXPIRED':
      if (n.entitlement !== 'ACTIVE' && n.entitlement !== 'SUSPENDED') return stale(`the entitlement is ${n.entitlement}`);
      set('entitlement', 'EXPIRED', 'the pilot period ended: the tenant is read-only; records stay readable and exportable');
      if (!TERMINAL.includes(n.deployment) && n.deployment !== 'NOT_STARTED') { n.resumeTo = null; set('deployment', 'PILOT_ENDED', 'the pilot period ended'); }
      return done();
    case 'CONVERTED': {
      if (n.payment !== 'VERIFIED') return no(`the payment is ${n.payment}: only a paid pilot converts`);
      const why = entitled(); if (why) return no(why);
      if (n.deployment !== 'REVIEW_READY') return no(`the deployment is ${n.deployment}: a pilot converts after its review (REVIEW_READY)`);
      set('deployment', 'CONVERSION_APPROVED', 'conversion approved: the same tenant, records and audit history continue'); return done();
    }
  }
}

/** Whether this pilot may read from its source right now: an ACTIVE entitlement AND an APPROVED connector authorization. Payment is not enough. */
export function mayReadSource(s: PilotState): { ok: boolean; why: string[] } {
  const why: string[] = [];
  if (s.entitlement !== 'ACTIVE') why.push(`the software entitlement is ${s.entitlement}`);
  if (s.scope.connectorLimit < 1) why.push(`${s.sku} has no connector in its scope`);
  else if (s.connector !== 'APPROVED') why.push(`the connector authorization is ${s.connector}: the customer’s administrator has not approved it`);
  return { ok: !why.length, why };
}
/** Whether one more room fits the pilot's scope (V18-PILOT-13). `sitesAfter` is the number of distinct sites once the room is enrolled. */
export function mayEnroll(s: PilotState, roomsNow: number, sitesAfter: number): { ok: boolean; why: string[] } {
  const why: string[] = [];
  if (s.entitlement !== 'ACTIVE') why.push(`the software entitlement is ${s.entitlement}, not ACTIVE`);
  if (roomsNow + 1 > s.scope.roomLimit) why.push(`${s.sku} covers up to ${s.scope.roomLimit} room${s.scope.roomLimit === 1 ? '' : 's'}; this would be room ${roomsNow + 1}. More rooms need an approved expansion to a larger pilot — nothing was added and nothing is billed`);
  if (sitesAfter > s.scope.siteLimit) why.push(`${s.sku} covers ${s.scope.siteLimit} site${s.scope.siteLimit === 1 ? '' : 's'}; this room is at another site. More sites need an approved expansion — nothing was added and nothing is billed`);
  return { ok: !why.length, why };
}
