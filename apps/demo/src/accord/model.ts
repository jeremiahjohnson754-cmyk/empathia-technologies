/**
 * Empathia ACCORD — coordination and proof between organisations (Enterprise 3.0 directive 1, capability 6; journey J9).
 * One capsule: the customer shares scoped evidence about ONE issue with its service provider, for a stated purpose, until a stated
 * time. The capsule copies nothing: every item is read, when the capsule is opened, from the record that owns it (the ServiceHands
 * job, the calling evidence of VOICE, the room's record), and each item says what the provider receives and what is withheld.
 * What the provider can read is computed by `view(…, 'provider', …)` and by nothing else, so there is one place to check that nothing
 * outside the scope crosses: no session token, no signalling detail, no other room, no other job, no person's name, no price.
 * After expiry or withdrawal the provider's view is empty. Both organisations and the agreement are fictional. In the product each
 * organisation signs in to its own tenant; the perspective switch on the page only shows what each side would receive and is not an
 * authorisation. Withdrawal and the download audit are kept in this browser. No React: the unit suite runs it.
 */
import type { Workspace } from '../workspace/store.js';
import type { RoleKey } from '../registry.types.js';
import { roomRecord } from '../campus/design.js';
import { fullName } from '../campus/canon.js';
import { POLICY, SHARED_LINK, caseView, type EvidenceState } from '../voice/model.js';

export type Party = 'customer' | 'provider';
export const PARTIES: Record<Party, { id: string; name: string; role: string }> = {
  customer: { id: 'ORG-NORTHSTAR', name: 'Northstar Industries (synthetic)', role: 'Customer. Owns the rooms and every record about them.' },
  provider: { id: 'ORG-TIDEWATER', name: 'Tidewater Service Partners (fictional)', role: 'Managed service provider. Restores service under the agreement; owns nothing in the customer’s record.' },
};
export const CAPSULE = { id: 'CAP-0001', subject: { tenantId: 'TEN-NORTHSTAR', entityType: 'Incident', entityId: 'ISS-0417' }, roomId: 'R-ATL-4-218',
  purpose: 'Diagnose and restore far-end audio in one room', agreement: 'Service agreement MSA-NT-01 (fictional)', sharedBy: 'ops' as RoleKey, approvedBy: 'steward' as RoleKey,
  createdAt: '2026-11-23T15:30:00Z', approvedAt: '2026-11-23T15:41:00Z', expiresAt: '2026-11-30T15:30:00Z',
  delegation: 'The provider’s technician may run the retest in this room until the capsule ends. Declared in the capsule; ServiceHands still checks the technician’s own authority for every step.' };
/** The clock the capsule is read against: the fixture's "now", or a day after it ends (?at=expired). */
export const CLOCKS = { now: '2026-11-23T16:00:00Z', expired: '2026-12-01T09:00:00Z' } as const;
export type Clock = keyof typeof CLOCKS;
export const clockOf = (v: string | null): Clock => (v === 'expired' ? 'expired' : 'now');
export const partyOf = (v: string | null): Party => (v === 'provider' ? 'provider' : 'customer');

export interface Item { id: string; title: string; basis: EvidenceState; lines: string[]; withheld: string[]; source?: { label: string; href: string } }
/** Everything the capsule is made of, read live. The customer sees all of it; the provider sees `lines` only. */
export function items(w: Workspace): Item[] {
  const job = w.incidents.find((i) => i.id === CAPSULE.subject.entityId); const room = roomRecord(CAPSULE.roomId); const v = caseView('degraded', CAPSULE.roomId);
  const cur = room?.baselines.find((b) => b.state === 'CURRENT');
  return [
    { id: 'job', title: 'The job', basis: 'DECLARED', source: { label: 'The job in ServiceHands', href: '#/servicehands' },
      lines: job ? [`${job.id}: ${job.title}`, `State ${job.state.toLowerCase().replace(/_/g, ' ')}; severity ${job.severity.toLowerCase()}`, job.summary] : ['The job is no longer on record.'],
      withheld: ['Who reported it (given as “a room user”)', 'The room’s earlier jobs and their history'] },
    { id: 'calling', title: 'Calling measurements for the session', basis: 'SIMULATED', source: { label: 'The room’s CallPath in VOICE', href: `#/voice/callpath/${CAPSULE.roomId}` },
      lines: [...v.samples.map((s) => `${s.at.slice(11, 19)} UTC, ${s.windowS} s window: loss ${s.lossPct ?? 'not reported'} %, jitter ${s.jitterMs ?? 'not reported'} ms, one-way delay ${s.oneWayDelayMs ?? 'not reported'} ms`),
        `Declared targets: loss at most ${POLICY.lossPct} %, jitter at most ${POLICY.jitterMs} ms, one-way delay at most ${POLICY.oneWayDelayMs} ms`],
      withheld: ['The session token', 'Directory assignment and trunk', 'The experimental listening estimate, because it is not validated'] },
    { id: 'network', title: 'The shared uplink', basis: 'SIMULATED', source: { label: 'The uplink in FLOW', href: `#/flow/link/${SHARED_LINK.to}` },
      lines: [`The room’s access switch shares one uplink with ${SHARED_LINK.rooms.length - 1} other rooms`, 'Simulated interface counters show discards rising in the same minutes as the degraded windows', 'A hypothesis, not a root cause'],
      withheld: ['The names of the other rooms', 'Switch names, addresses and configuration'] },
    { id: 'room', title: 'The room', basis: 'DECLARED', source: { label: 'The room’s record', href: `#/commissioning/room/${CAPSULE.roomId}` },
      lines: room ? [fullName(room.outline), `Lifecycle ${room.lifecycle.toLowerCase().replace(/_/g, ' ')}; accepted baseline version ${cur ? cur.version : 'none'}`] : ['The room is not on record.'],
      withheld: ['Drawings, positions and asset identities not involved in the issue'] },
  ];
}
export const OUTSIDE = ['Every other room, job and work order of the estate', 'People’s names and contact details', 'Prices, contract values and license terms', 'Anything recorded after the capsule ends'];

export interface Audit { at: string; party: Party; by: RoleKey; sha256: string; bytes: number }
export interface Local { withdrawnAt: string | null; withdrawnBy: RoleKey | null; audit: Audit[] }
const KEY = 'empathia.demo.accord.v1';
export function loadLocal(): Local { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Local | null; if (v && Array.isArray(v.audit)) return { withdrawnAt: typeof v.withdrawnAt === 'string' ? v.withdrawnAt : null, withdrawnBy: v.withdrawnBy ?? null, audit: v.audit.filter((a) => /^[0-9a-f]{64}$/.test(String(a.sha256))) }; } catch { /* nothing kept */ } return { withdrawnAt: null, withdrawnBy: null, audit: [] }; }
export function saveLocal(l: Local): Local { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* lasts the page */ } return l; }

export type Status = 'ACTIVE' | 'EXPIRED' | 'WITHDRAWN';
export const STATUS_WORD: Record<Status, string> = { ACTIVE: 'Active', EXPIRED: 'Expired', WITHDRAWN: 'Withdrawn' };
export const statusOf = (clock: Clock, local: Pick<Local, 'withdrawnAt'>): Status => (Date.parse(CLOCKS[clock]) >= Date.parse(CAPSULE.expiresAt) ? 'EXPIRED' : local.withdrawnAt ? 'WITHDRAWN' : 'ACTIVE');
export interface View { party: Party; status: Status; readable: boolean; says: string; items: Array<{ id: string; title: string; basis: EvidenceState; lines: string[]; withheld?: string[]; source?: Item['source'] }>; redactions: number }
/** What one side can read. The only function that decides what crosses to the provider. */
export function view(w: Workspace, party: Party, clock: Clock, local: Pick<Local, 'withdrawnAt'>): View {
  const status = statusOf(clock, local); const all = items(w); const redactions = all.reduce((n, i) => n + i.withheld.length, 0);
  if (party === 'customer') return { party, status, readable: true, redactions, items: all, says: status === 'ACTIVE' ? `Shared with ${PARTIES.provider.name} until ${CAPSULE.expiresAt.slice(0, 10)}.` : status === 'EXPIRED' ? 'The capsule has ended. The provider can no longer read or download it; your own records are unchanged.' : 'You withdrew the capsule. The provider can no longer read or download it; your own records are unchanged.' };
  if (status !== 'ACTIVE') return { party, status, readable: false, redactions: 0, items: [], says: status === 'EXPIRED' ? 'This capsule has ended. Nothing in it can be read or downloaded.' : 'The customer has withdrawn this capsule. Nothing in it can be read or downloaded.' };
  return { party, status, readable: true, redactions, items: all.map((i) => ({ id: i.id, title: i.title, basis: i.basis, lines: i.lines })), says: `Shared by ${PARTIES.customer.name} for one purpose: ${CAPSULE.purpose.toLowerCase()}. ${redactions} details are withheld.` };
}
/** The file the provider may download: exactly its view, with the terms it was shared under. */
export function exportOf(v: View): string | null {
  if (v.party !== 'provider' || !v.readable) return null;
  return JSON.stringify({ capsule: CAPSULE.id, from: PARTIES.customer.name, to: PARTIES.provider.name, purpose: CAPSULE.purpose, agreement: CAPSULE.agreement, expiresAt: CAPSULE.expiresAt,
    notice: 'Synthetic demonstration data. Scoped evidence for one purpose; it ends at the time above and may be withdrawn earlier.', items: v.items.map((i) => ({ title: i.title, evidence: i.basis, lines: i.lines })), withheldDetails: v.redactions }, null, 2);
}
