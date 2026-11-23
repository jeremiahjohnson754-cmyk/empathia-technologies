/**
 * Empathia PRISM — signage and experience assurance (Enterprise 3.0 directive 1, capability 4; journey J7, with SENTINEL).
 * PRISM publishes nothing and replaces no signage content system. For each screen it keeps three things apart:
 *   intended  what the schedule says the screen should show now (DECLARED, read from the content system through an adapter);
 *   actual    what the screen's player last reported (here SIMULATED); a report can be current, stale or absent;
 *   proof     proof of play, only where the player issues it. Where it does not, PRISM says "not supported", never "played".
 * A stale or missing report is never read as "showing the right thing". Every screen is the estate's own record: a display position
 * and its installed asset in a room of the campus (no duplicate of Core, no invented make or model). One mock adapter; nothing is
 * connected. No React: the unit suite runs it.
 */
import { roomRecord } from '../campus/design.js';
import { fullName } from '../campus/canon.js';
import type { Workspace, Incident } from '../workspace/store.js';
import { FIXTURE_NOW, type EvidenceState } from '../voice/model.js';

export type ScreenVerdict = 'MATCH' | 'MISMATCH' | 'OFFLINE' | 'UNKNOWN';
export const VERDICT_WORD: Record<ScreenVerdict, string> = { MATCH: 'As scheduled', MISMATCH: 'Not as scheduled', OFFLINE: 'Not reporting', UNKNOWN: 'Unknown' };
export interface Claim { state: EvidenceState; says: string; source: string; at?: string }
export interface Report { item: string | null; at: string; proof: 'RECORD' | 'NOT_SUPPORTED' }
export interface Screen { id: string; position: string; roomId: string; roomName: string; building: string; label: string; kind: 'display' | 'ledwall';
  intendedItem: string | null; intended: Claim; actual: Claim; proof: Claim; verdict: ScreenVerdict; why: string; /** the screen's player can be asked to show something and answers */ reachable: boolean; provesRender: boolean }

/** The tenant's declared rule (synthetic signage policy SP-NORTH-01): a player report older than this is stale. Not Empathia's number. */
export const FRESH_SECONDS = 300;
export const SCHEDULE = { id: 'SCH-NORTH-PUBLIC', revision: 7, source: 'Content schedule SCH-NORTH-PUBLIC r7, read through the mock content-system adapter (synthetic)' };
export const ITEMS: Record<string, string> = { 'CI-WELCOME': 'Welcome and wayfinding loop', 'CI-TOWNHALL': 'Town hall countdown', 'CI-HERITAGE': 'Heritage exhibition reel', 'CI-IDLE': 'Idle screen (nothing scheduled)' };
/** The declared signage group: which screens, what the schedule intends now, and what each player last reported (SIMULATED fixture). */
const GROUP: Array<{ room: string; cat: 'display' | 'ledwall'; intended: string | null; report: Report | null; telemetry: boolean }> = [
  { room: 'R-EGT-1-130', cat: 'display', intended: 'CI-HERITAGE', report: { item: 'CI-HERITAGE', at: '2026-11-23T15:19:40Z', proof: 'RECORD' }, telemetry: true },
  { room: 'R-EGT-1-150', cat: 'display', intended: 'CI-WELCOME', report: { item: 'CI-WELCOME', at: '2026-11-23T15:19:52Z', proof: 'NOT_SUPPORTED' }, telemetry: true },
  { room: 'R-ATL-1-150', cat: 'ledwall', intended: 'CI-TOWNHALL', report: { item: 'CI-WELCOME', at: '2026-11-23T15:19:30Z', proof: 'RECORD' }, telemetry: true },
  { room: 'R-HZN-1-400', cat: 'ledwall', intended: 'CI-TOWNHALL', report: { item: 'CI-TOWNHALL', at: '2026-11-23T13:02:10Z', proof: 'RECORD' }, telemetry: true },
  { room: 'R-BCN-3-236', cat: 'ledwall', intended: 'CI-WELCOME', report: null, telemetry: false },
  { room: 'R-EGT-1-110', cat: 'ledwall', intended: null, report: { item: 'CI-IDLE', at: '2026-11-23T15:19:58Z', proof: 'RECORD' }, telemetry: true },
];
const name = (item: string | null) => (item ? `${ITEMS[item] || item} (${item})` : 'nothing');
const hhmm = (iso: string) => `${iso.slice(11, 16)} UTC`;

/** The one rule that decides a screen. Exported so the unit suite can try what the fixture does not hold. */
export function judge(intended: string | null, report: Report | null, telemetry: boolean, now: string = FIXTURE_NOW): { verdict: ScreenVerdict; why: string; stale: boolean } {
  if (!telemetry) return { verdict: 'UNKNOWN', stale: false, why: 'No player connection is configured for this screen, so nothing is known about what it shows.' };
  if (!report) return { verdict: 'OFFLINE', stale: false, why: 'The player has never reported.' };
  const age = (Date.parse(now) - Date.parse(report.at)) / 1000;
  if (!Number.isFinite(age) || age < 0) return { verdict: 'UNKNOWN', stale: false, why: 'The player’s report carries a time that cannot be read against the clock, so it is not used.' };
  if (age > FRESH_SECONDS) return { verdict: 'OFFLINE', stale: true, why: `The last report is from ${hhmm(report.at)}, older than the ${FRESH_SECONDS / 60}-minute rule. What the screen shows now is unknown.` };
  const want = intended || 'CI-IDLE';
  return report.item === want ? { verdict: 'MATCH', stale: false, why: intended ? `The player reports ${name(report.item)}, which is what the schedule intends.` : 'Nothing is scheduled, and the player reports its idle screen.' }
    : { verdict: 'MISMATCH', stale: false, why: `The schedule intends ${name(intended)}; the player reports ${name(report.item)}.` };
}
export function screens(now: string = FIXTURE_NOW): Screen[] {
  return GROUP.flatMap((g) => {
    const r = roomRecord(g.room); const p = r?.positions.find((x) => !x.furniture && x.cat === g.cat && x.asset); if (!r || !p || !p.asset) return [];
    const j = judge(g.intended, g.report, g.telemetry, now);
    const actual: Claim = !g.telemetry ? { state: 'NOT_CONFIGURED', says: 'No player connection', source: 'No adapter is configured for this screen’s player.' }
      : !g.report ? { state: 'UNKNOWN', says: 'No report', source: 'The player has never reported.' }
      : { state: j.stale ? 'STALE' : 'SIMULATED', says: `${name(g.report.item)}, reported ${hhmm(g.report.at)}`, source: 'Simulated player report (fixture PR-FX-01)', at: g.report.at };
    const proof: Claim = !g.report || !g.telemetry ? { state: 'UNKNOWN', says: 'No proof of play', source: 'There is no report to carry one.' }
      : g.report.proof === 'NOT_SUPPORTED' ? { state: 'NOT_CONFIGURED', says: 'Not supported by this player', source: 'The player reports its state; it does not issue proof of play. PRISM does not call a state report proof.' }
      : j.stale ? { state: 'STALE', says: `Last proof record ${hhmm(g.report.at)}`, source: 'Simulated proof-of-play record (fixture PR-FX-01); too old to count' }
      : { state: 'SIMULATED', says: `Proof record for ${name(g.report.item)} at ${hhmm(g.report.at)}`, source: 'Simulated proof-of-play record (fixture PR-FX-01)', at: g.report.at };
    return [{ id: p.asset, position: p.code, roomId: g.room, roomName: fullName(r.outline), building: r.outline.building, label: p.label, kind: g.cat, intendedItem: g.intended,
      intended: { state: 'DECLARED', says: g.intended ? name(g.intended) : 'Nothing is scheduled now', source: SCHEDULE.source }, actual, proof, verdict: j.verdict, why: j.why,
      reachable: g.telemetry && !!g.report && !j.stale, provesRender: g.telemetry && !!g.report && !j.stale && g.report.proof === 'RECORD' }];
  });
}
export const screenById = (id: string, now?: string) => screens(now).find((s) => s.id === id);
export function summary(all: Screen[]) { const n = (v: ScreenVerdict) => all.filter((s) => s.verdict === v).length; const ex = all.length - n('MATCH');
  return { total: all.length, match: n('MATCH'), mismatch: n('MISMATCH'), offline: n('OFFLINE'), unknown: n('UNKNOWN'), exceptions: ex,
    says: ex ? `${ex} of ${all.length} screens need attention: ${[n('MISMATCH') && `${n('MISMATCH')} not as scheduled`, n('OFFLINE') && `${n('OFFLINE')} not reporting`, n('UNKNOWN') && `${n('UNKNOWN')} unknown`].filter(Boolean).join(', ')}.` : `All ${all.length} screens report what the schedule intends.` }; }

/** A job raised from a screen is a real ServiceHands incident; this finds it again, so the screen never keeps a copy. */
export const JOB_TITLE = 'Signage';
export const jobTitle = (s: Screen) => `${JOB_TITLE}: ${s.label} in ${s.roomName} ${s.verdict === 'MISMATCH' ? 'is not showing the scheduled content' : s.verdict === 'OFFLINE' ? 'has stopped reporting' : 'has no player connection'}`;
export const jobSummary = (s: Screen) => `${s.why} Screen ${s.id} (position ${s.position}). Raised from PRISM; the evidence is simulated.`;
export const jobFor = (w: Workspace, s: Screen): Incident | undefined => w.incidents.find((i) => i.roomId === s.roomId && i.title.startsWith(`${JOB_TITLE}:`) && i.summary.includes(s.id));

export const ADAPTERS: Array<{ id: string; target: string; status: 'CONTRACT_ONLY' | 'MOCK'; note: string }> = [
  { id: 'mock-content', target: 'Mock content system (this demonstration)', status: 'MOCK', note: 'Supplies the schedule and the simulated player reports. Nothing leaves the browser.' },
  { id: 'content-system', target: 'A signage content system', status: 'CONTRACT_ONLY', note: 'Schedule and playlist read through the vendor’s published interface, with the customer’s consent. No vendor is named and none is connected.' },
  { id: 'player', target: 'A screen’s media player', status: 'CONTRACT_ONLY', note: 'State and, where the player issues it, proof of play. Capability depends on the player model; PRISM states which it has.' },
];
