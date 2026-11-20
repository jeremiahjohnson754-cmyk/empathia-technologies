/**
 * Pilot readiness (handoff v1.8 §4.2, ADR-023; V18-PILOT-03/04/05/06/13): one pure, deterministic function used by the corporate site's
 * wizard, the investor demonstration and the enterprise API, so the three can never disagree.
 *
 * It takes only non-secret metadata — which pilot, which source platform, how many rooms and sites, who can approve — and returns one of
 * READY_TO_PURCHASE / READY_AFTER_CUSTOMER_ACTION / REQUIRES_SALES_REVIEW / NOT_CURRENTLY_SUPPORTED with the reasons, the prerequisites,
 * the limitations, the approvals needed, the scope limits and the plain terms. It never asks for a credential: source credentials are
 * granted only through the customer's own authorization flow after an entitlement exists.
 *
 * The scope limits below are the structured form of each pilot's scope text in the price list; test/commercial.test.ts checks them
 * against that text. Where the text is silent the conservative reading applies and is stated (one site unless the pilot is the
 * multi-site one; one connector at most).
 */
import { PILOTS } from './generated/catalog.js';
import { usd } from './money.js';
import type { ConnectionModel, Pilot, PilotSku } from './types.js';

export const READINESS_STATES = ['READY_TO_PURCHASE', 'READY_AFTER_CUSTOMER_ACTION', 'REQUIRES_SALES_REVIEW', 'NOT_CURRENTLY_SUPPORTED'] as const;
export type ReadinessState = typeof READINESS_STATES[number];
export const PILOT_SKUS: readonly PilotSku[] = ['PILOT-DISCOVERY', 'PILOT-READONLY', 'PILOT-HARDWARE', 'PILOT-CAMPUS'];

export interface PilotScope { roomLimit: number; siteLimit: number; connectorLimit: number; days: number }
export interface PilotRule extends PilotScope {
  /** SYNTHETIC: a synthetic tenant, connects to nothing. CLOUD: one cloud source. ANY: a cloud source or an on-site bridge. */
  source: 'SYNTHETIC' | 'CLOUD' | 'ANY';
  /** a contract, a security review and an approved scope come before any purchase */
  contract: boolean;
}
export const PILOT_RULES: Readonly<Record<PilotSku, PilotRule>> = {
  'PILOT-DISCOVERY': { roomLimit: 1, siteLimit: 1, connectorLimit: 0, days: 14, source: 'SYNTHETIC', contract: false },
  'PILOT-READONLY': { roomLimit: 5, siteLimit: 1, connectorLimit: 1, days: 30, source: 'CLOUD', contract: false },
  'PILOT-HARDWARE': { roomLimit: 10, siteLimit: 1, connectorLimit: 1, days: 30, source: 'ANY', contract: false },
  'PILOT-CAMPUS': { roomLimit: 25, siteLimit: 3, connectorLimit: 1, days: 45, source: 'ANY', contract: true },
};
export const pilotOf = (sku: PilotSku): Pilot => PILOTS.find((p) => p.sku === sku)!;
export const isPilotSku = (s: unknown): s is PilotSku => typeof s === 'string' && (PILOT_SKUS as readonly string[]).includes(s);

/** How far a connector has come. VERIFIED: tested against an authorized vendor environment, with recorded evidence. SANDBOX_MOCK: a local
 *  mock that answers with synthetic data (sandbox only). CATALOGUE_ONLY: a planning entry — no adapter exists. */
export type ConnectorMaturity = 'VERIFIED' | 'SANDBOX_MOCK' | 'CATALOGUE_ONLY';
export interface ConnectorChoice { key: string; label: string; model: ConnectionModel; maturity: ConnectorMaturity }
export type Approver = 'TENANT_ADMIN' | 'CAN_OBTAIN' | 'UNKNOWN';
export const APPROVERS: readonly Approver[] = ['TENANT_ADMIN', 'CAN_OBTAIN', 'UNKNOWN'];
export interface ReadinessInput {
  sku: PilotSku;
  /** the source platform: a catalogue entry, NONE (no live source), or NOT_LISTED (a platform the catalogue does not name) */
  connector: ConnectorChoice | 'NONE' | 'NOT_LISTED';
  rooms: number; sites: number;
  approver: Approver;
  /** true only in a sandbox (the demonstration, the API's local sandbox): a local mock source then counts as available, labelled synthetic */
  sandbox?: boolean;
}
export interface Readiness {
  state: ReadinessState;
  sku: PilotSku; pilot: string; price: string; priceCents: number;
  scope: PilotScope;
  /** why the state is what it is: the blockers, or the reason nothing blocks */
  reasons: string[];
  prerequisites: string[];
  limitations: string[];
  approvals: string[];
  terms: string[];
  /** a pilot that fits better, when one does */
  alternative: { sku: PilotSku; pilot: string; why: string } | null;
  nextStep: string;
  caveat: string;
}

const RANK: Record<ReadinessState, number> = { READY_TO_PURCHASE: 0, READY_AFTER_CUSTOMER_ACTION: 1, REQUIRES_SALES_REVIEW: 2, NOT_CURRENTLY_SUPPORTED: 3 };
const rooms = (n: number) => `${n} room${n === 1 ? '' : 's'}`; const sites = (n: number) => `${n} site${n === 1 ? '' : 's'}`;
/** The smallest pilot whose scope holds the counts, or null when none does. */
export function smallestFit(roomCount: number, siteCount: number): PilotSku | null {
  return PILOT_SKUS.find((s) => roomCount <= PILOT_RULES[s].roomLimit && siteCount <= PILOT_RULES[s].siteLimit) ?? null;
}
export const SELF_SERVE_OPEN = false;
export const NOT_OPEN = 'Self-serve purchase is not open yet: no payment is taken on this site.';

export function assessReadiness(input: ReadinessInput): Readiness {
  const rule = PILOT_RULES[input.sku]; const pilot = pilotOf(input.sku);
  const count = (n: number) => (Number.isInteger(n) && n >= 1 ? n : 1);
  const roomCount = count(input.rooms); const siteCount = count(input.sites);
  let state: ReadinessState = 'READY_TO_PURCHASE';
  const worse = (s: ReadinessState) => { if (RANK[s] > RANK[state]) state = s; };
  const reasons: string[] = []; const prerequisites: string[] = []; const limitations: string[] = []; const approvals: string[] = [];
  let alternative: Readiness['alternative'] = null;
  const offer = (sku: PilotSku, why: string) => { if (!alternative && sku !== input.sku) alternative = { sku, pilot: pilotOf(sku).name, why }; };

  // ---- scope (V18-PILOT-13): the counts must fit the pilot, or a larger pilot is named; beyond every pilot is a scoped engagement
  if (roomCount > rule.roomLimit || siteCount > rule.siteLimit) {
    const fit = smallestFit(roomCount, siteCount);
    const over = `${pilot.name} covers up to ${rooms(rule.roomLimit)} at ${sites(rule.siteLimit)}; you named ${rooms(roomCount)} at ${sites(siteCount)}.`;
    if (fit) { worse('READY_AFTER_CUSTOMER_ACTION'); reasons.push(`${over} Reduce the scope, or choose ${pilotOf(fit).name}.`); offer(fit, `It covers up to ${rooms(PILOT_RULES[fit].roomLimit)} at ${sites(PILOT_RULES[fit].siteLimit)}.`); }
    else { worse('REQUIRES_SALES_REVIEW'); reasons.push(`${over} No pilot package covers that many; a larger evaluation is scoped and agreed in writing.`); }
  }

  // ---- source platform (V18-PILOT-03): a live pilot needs a connector that exists and has been verified; nothing else is promised
  const c = input.connector;
  if (rule.source === 'SYNTHETIC') {
    limitations.push('Runs on a synthetic tenant with one sample room. It connects to no system of yours and reads no data of yours.');
    if (c !== 'NONE') limitations.push('The source platform you named is noted as an interest only; this pilot does not connect to it.');
  } else if (c === 'NONE') {
    worse(rule.contract ? 'REQUIRES_SALES_REVIEW' : 'READY_AFTER_CUSTOMER_ACTION');
    reasons.push(rule.contract ? 'No source platform is named yet; the sources in scope are agreed during the security and technical review.' : 'Name the source platform the pilot should read; without one there is nothing to check.');
  } else if (c === 'NOT_LISTED') {
    worse(rule.contract ? 'REQUIRES_SALES_REVIEW' : 'NOT_CURRENTLY_SUPPORTED');
    reasons.push('That platform is not in the connector catalogue, so no connector for it exists. A live pilot on it is not offered today.');
    offer('PILOT-DISCOVERY', 'It needs no connector: a synthetic tenant shows the product and the readiness checklist.');
  } else {
    const available = c.maturity === 'VERIFIED' || (c.maturity === 'SANDBOX_MOCK' && input.sandbox === true);
    if (rule.source === 'CLOUD' && c.model === 'EDGE_BRIDGE') {
      worse('NOT_CURRENTLY_SUPPORTED');
      reasons.push(`${c.label} is reached through an on-site bridge, not a cloud interface; ${pilot.name} covers one cloud source only.`);
      offer('PILOT-HARDWARE', 'It is the package for an on-site source, on approved rooms.');
    }
    if (!available) {
      worse(rule.contract ? 'REQUIRES_SALES_REVIEW' : 'NOT_CURRENTLY_SUPPORTED');
      reasons.push(c.maturity === 'SANDBOX_MOCK'
        ? `${c.label} is a local mock that answers with synthetic data. It exists for the sandbox only and is never offered as a live source.`
        : `${c.label} is a planning entry in the connector catalogue: no connector for it has been built or verified against an authorized vendor environment.${rule.contract ? ' Whether it can be in scope is decided in the technical review; no live connection is promised.' : ' A live pilot on it is not offered today.'}`);
      offer('PILOT-DISCOVERY', 'It needs no connector: a synthetic tenant shows the product and the readiness checklist.');
    } else if (c.maturity === 'SANDBOX_MOCK') {
      limitations.push(`${c.label} is a local mock: everything it returns is synthetic and is labelled so. It can never count as a verified source.`);
    }
    prerequisites.push('An administrator of the source platform who can authorize read-only access through the platform’s own sign-in. No password, key or token is ever entered on this site.');
    prerequisites.push(c.model === 'EDGE_BRIDGE' || (c.model === 'BOTH' && rule.source === 'ANY') ? 'Network: an outbound-only path from an approved on-site bridge. No inbound opening is asked for and no network is scanned.' : 'Network: none on your side for a cloud source; the platform’s interface is called from Empathia’s service.');
    limitations.push('Read-only: inventory and telemetry only. No device is commanded, moved or reconfigured in a pilot.');
    limitations.push('Freshness follows the source platform’s own sync interval and limits; a value that is late or missing is shown as stale or unknown, never filled in.');
    approvals.push('Connector authorization by your administrator, after purchase and separately from it. Payment alone never opens a connection.');
  }

  // ---- who can approve (V18-PILOT-03): an administrator who can accept the terms and, for a live pilot, authorize the source
  const needs = rule.source === 'SYNTHETIC' ? 'accept the pilot terms and hold the tenant’s administrator account' : 'accept the pilot terms and authorize the source platform';
  if (input.approver === 'TENANT_ADMIN') approvals.push(`You, as the administrator who can ${needs}.`);
  else {
    worse('READY_AFTER_CUSTOMER_ACTION');
    reasons.push(input.approver === 'CAN_OBTAIN' ? `Ask the administrator who can ${needs}; the pilot starts once they agree.` : `Find out who in your organization can ${needs}; nothing can start without that person.`);
    approvals.push(`An administrator who can ${needs}.`);
  }

  // ---- what every pilot of this kind needs
  prerequisites.push('Identity: a named administrator account for the pilot tenant; further people are invited by role.');
  if (input.sku === 'PILOT-HARDWARE') { prerequisites.push('The list of rooms in scope, each approved by its owner before anything is deployed.'); limitations.push('No invasive or disruptive test runs without written authorization for that room and time. The guided onboarding session is bounded by the agreement.'); approvals.push('Room owners, for each room in scope.'); }
  if (input.sku === 'PILOT-READONLY') limitations.push('Self-serve: no staffed setup is included.');
  if (rule.contract) { worse('REQUIRES_SALES_REVIEW'); reasons.push('A multi-site evaluation starts with a security review, a bounded discovery and a signed scope; it is never bought in one step.'); approvals.push('Your security reviewer, and a signed contract with the approved scope.'); prerequisites.push('The sites and rooms in scope, named in the contract.'); }
  limitations.push('Data protection: only the rooms, sites and source you approve are in scope; records stay in your tenant, and every reading carries its source and time.');

  if (state === 'READY_TO_PURCHASE') reasons.push('Nothing blocks this scope: the pilot, the counts and the approver fit.');
  const terms = [
    `${usd(pilot.cents)} once, before any applicable tax. It does not renew and it is not a subscription.`,
    `${pilot.duration} from activation, for up to ${rooms(rule.roomLimit)} at ${sites(rule.siteLimit)}${rule.connectorLimit ? ` and ${rule.connectorLimit} source` : ''}. More than that needs an approved expansion; nothing is billed silently.`,
    'Paying grants the software entitlement for this pilot and this scope only. It never grants a connection to your systems or access to equipment.',
    'When the pilot ends, the tenant becomes read-only: records and the audit history stay readable and exportable, and nothing is deleted without notice.',
    'Cancellation and refund terms are confirmed in writing before any payment. Bundle discounts never apply to pilot fees.',
    pilot.caveat + '.',
  ];
  const nextStep = state === 'READY_TO_PURCHASE' ? `${NOT_OPEN} Send this scope through the enquiry form; we confirm the terms in writing and how to pay.`
    : state === 'READY_AFTER_CUSTOMER_ACTION' ? `Complete what is listed above, then send the scope through the enquiry form. ${NOT_OPEN}`
    : state === 'REQUIRES_SALES_REVIEW' ? `Start the review: send this scope through the enquiry form and a person replies. ${NOT_OPEN}`
    : `This scope is not offered today. Tell us which platform matters to you through the enquiry form${alternative ? ', or look at the alternative below' : ''}. ${NOT_OPEN}`;
  return { state, sku: input.sku, pilot: pilot.name, price: usd(pilot.cents), priceCents: pilot.cents, scope: { roomLimit: rule.roomLimit, siteLimit: rule.siteLimit, connectorLimit: rule.connectorLimit, days: rule.days }, reasons, prerequisites, limitations, approvals, terms, alternative, nextStep, caveat: pilot.caveat };
}

/** What each state means, in plain words (the wizard and the API both show it). */
export const READINESS_MEANING: Readonly<Record<ReadinessState, { label: string; meaning: string }>> = {
  READY_TO_PURCHASE: { label: 'Ready to purchase', meaning: 'The scope fits the pilot and nothing blocks it.' },
  READY_AFTER_CUSTOMER_ACTION: { label: 'Ready after an action on your side', meaning: 'The pilot fits once you complete what is listed.' },
  REQUIRES_SALES_REVIEW: { label: 'Needs a review with us', meaning: 'A person reviews this scope with you before anything is bought.' },
  NOT_CURRENTLY_SUPPORTED: { label: 'Not offered today', meaning: 'This scope cannot be delivered today, and we say so rather than sell it.' },
};
