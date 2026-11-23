/**
 * Empathia VOICE — the CallPath Digital Twin's deterministic demonstration fixture (Enterprise 3.0 directive 1A, founder scope
 * confirmation 23 Nov 2026; journey J6B-VOICE). VOICE is telephony and unified-communications intelligence: how a call is meant to
 * travel, what was observed of it, and what is not known. It is not narration, a voice assistant or call recording.
 *
 * Everything here is invented, and says so. The fixture does not duplicate Core: the room, the room's UC compute, the access switch
 * and the core switch are the synthetic estate's own records (src/search/estate.ts), referenced by their ids; tests/unit/voice.test.mjs
 * fails if one of them is not in the estate. VOICE adds only what it owns: a call-flow revision, an SBC, a provider connection, one
 * pseudonymous session observation and its quality samples.
 *
 * Three things are kept apart on every hop, because they are different claims: what is CONFIGURED (a declared record), what was
 * OBSERVED (here always a labelled simulation, or UNKNOWN), and what nobody has measured. A hop without an observation is UNKNOWN; it
 * is never drawn as healthy. The fixture reads no clock: it has its own (FIXTURE_NOW), so every run shows the same. Only a visitor's
 * own report (saveReport, kept in this browser) carries the real time it was made.
 *
 * No React and no browser API in this file: the unit suite runs it under Node.
 */
import type { RoleKey } from '../registry.types.js';

export type EvidenceState = 'DECLARED' | 'MODELED' | 'SIMULATED' | 'OBSERVED' | 'MEASURED' | 'VERIFIED' | 'UNKNOWN' | 'NOT_CONFIGURED' | 'STALE';
/** Directive 3: one reference shape for deep links and events. The demonstration has one synthetic tenant. */
export interface EntityRef { tenantId: string; entityType: string; entityId: string }
export const TENANT = 'tenant-demo-synthetic';
const ref = (entityType: string, entityId: string): EntityRef => ({ tenantId: TENANT, entityType, entityId });

export const VOICE_ROOM = 'R-ATL-4-218';
/** The fixture's own clock (ISO, UTC). Sample ages and staleness are computed against it, never against the real time. */
export const FIXTURE_NOW = '2026-11-23T15:20:00Z';
/** A sample older than this is STALE: shown, greyed, and never used to say a call is fine. A tenant policy value, not a law of nature. */
export const FRESHNESS_WINDOW_S = 900;

export type Layer = 'endpoint' | 'access' | 'core' | 'wan' | 'sbc' | 'provider';
export const LAYER_LABEL: Record<Layer, string> = { endpoint: 'Room endpoint', access: 'Access switch (LAN / PoE)', core: 'Core uplink', wan: 'QoS and WAN edge', sbc: 'Session border controller', provider: 'UC provider connection' };
export interface Claim { state: EvidenceState; source: string; at?: string }
export interface Hop {
  id: string; layer: Layer; label: string; ref: EntityRef;
  /** the estate record this hop IS (a Search Party focus), when Core owns it; VOICE-owned records have none yet */
  estate?: { type: 'PlannedAsset' | 'NetworkNode'; id: string };
  configured: Claim; observed: Claim;
  /** operational detail only voice administration may read (signalling side); a technician sees the hop without it */
  admin?: string;
}

/** Call-flow revision 3 for the room: the CONFIGURED path. The estate edges it stands on are named in each source. */
export const FLOW = {
  id: 'CFR-ATL-4-218-r3', revision: 3, room: ref('Room', VOICE_ROOM), state: 'DECLARED' as EvidenceState,
  source: 'Declared call-flow record (synthetic), revision 3. A configured route is not an observed call path.',
  hops: [
    { id: 'hop-endpoint', layer: 'endpoint', label: 'UC room compute (4.218)', ref: ref('TelephonyEndpoint', 'TEP-A-0102'), estate: { type: 'PlannedAsset', id: 'A-0102' },
      configured: { state: 'DECLARED', source: 'Room design: position A-0102 is the room’s calling endpoint' },
      observed: { state: 'SIMULATED', source: 'Simulated endpoint registration (fixture VQ-FX-01)', at: '2026-11-23T15:02:10Z' }, admin: 'Directory number assignment DNA-0218 · extension ••42 (redacted)' },
    { id: 'hop-access', layer: 'access', label: 'Access switch ATL-4A', ref: ref('NetworkNode', 'SW-ATL-4A'), estate: { type: 'NetworkNode', id: 'SW-ATL-4A' },
      configured: { state: 'DECLARED', source: 'Network design: voice VLAN on IDF 4' },
      observed: { state: 'OBSERVED', source: 'Estate edge SW-ATL-4A FEEDS A-0102: switch port table, synthetic collector export', at: '2026-10-28T00:00:00Z' } },
    { id: 'hop-core', layer: 'core', label: 'Core switch ATL-CORE (uplink of ATL-4A)', ref: ref('NetworkNode', 'SW-ATL-CORE'), estate: { type: 'NetworkNode', id: 'SW-ATL-CORE' },
      configured: { state: 'DECLARED', source: 'Estate edge SW-ATL-CORE FEEDS SW-ATL-4A: network design' },
      observed: { state: 'SIMULATED', source: 'Simulated uplink interface counters (fixture VQ-FX-01): discards rising on the ATL-4A uplink', at: '2026-11-23T15:04:30Z' } },
    { id: 'hop-wan', layer: 'wan', label: 'QoS policy and WAN edge', ref: ref('NetworkNode', 'WAN-NORTH-1'),
      configured: { state: 'DECLARED', source: 'Calling policy CP-NORTH-VOICE: voice class marked and prioritised at the edge' },
      observed: { state: 'UNKNOWN', source: 'No collector is configured at the WAN edge. Nothing is known about this hop.' } },
    { id: 'hop-sbc', layer: 'sbc', label: 'Session border controller NORTH-1', ref: ref('SBC', 'SBC-NORTH-1'),
      configured: { state: 'DECLARED', source: 'The north site’s trunk record terminates on this controller' },
      observed: { state: 'SIMULATED', source: 'Simulated SBC session record (fixture VQ-FX-01)', at: '2026-11-23T15:02:12Z' }, admin: 'Trunk TRK-NORTH-A · signalling peer address withheld in the demonstration' },
    { id: 'hop-provider', layer: 'provider', label: 'UC provider connection A (fictional)', ref: ref('UCProviderConnection', 'UCP-A'),
      configured: { state: 'DECLARED', source: 'Provider connection record UCP-A (a fictional provider; no real carrier or product is named)' },
      observed: { state: 'SIMULATED', source: 'Simulated provider call-quality record (fixture VQ-FX-01)', at: '2026-11-23T15:05:00Z' }, admin: 'Connector: MOCK (no real provider API is called)' },
  ] as Hop[],
};

/** The tenant's own declared targets for a voice call (synthetic calling policy). The page compares samples with these; it sets none. */
export const POLICY = { id: 'CP-NORTH-VOICE', lossPct: 1, jitterMs: 30, oneWayDelayMs: 150, source: 'Calling policy CP-NORTH-VOICE (declared by the tenant; synthetic). Targets are the tenant’s, not a standard Empathia asserts.' };

export interface Sample { at: string; windowS: number; lossPct: number | null; jitterMs: number | null; oneWayDelayMs: number | null; codec: string; state: EvidenceState; source: string }
const S = (at: string, lossPct: number, jitterMs: number, oneWayDelayMs: number): Sample => ({ at, windowS: 10, lossPct, jitterMs, oneWayDelayMs, codec: 'G.711 with PLC', state: 'SIMULATED', source: 'Simulated receiver report (fixture VQ-FX-01). Not a packet capture, not provider data.' });
/** One pseudonymous session: the town hall broadcast joined from the room. No number, no name, no audio, no transcript. */
export const SESSION = {
  token: 'CS-7f3a…e21', label: 'Town hall broadcast, joined from Atlas 4.218', startedAt: '2026-11-23T15:02:00Z', state: 'SIMULATED' as EvidenceState,
  privacy: 'Session identity is a pseudonymous token. The demonstration holds no caller name, number, audio or transcript.',
  samples: [S('2026-11-23T15:04:00Z', 0.2, 6, 48), S('2026-11-23T15:04:10Z', 0.4, 9, 49), S('2026-11-23T15:04:20Z', 3.8, 34, 61), S('2026-11-23T15:04:30Z', 5.1, 41, 66), S('2026-11-23T15:04:40Z', 4.4, 38, 64), S('2026-11-23T15:04:50Z', 0.6, 11, 50)],
};

// ---------------------------------------------------------------------------------------------------------------- quality method
/**
 * QM-G107-S1: an estimated listening-quality score from loss and delay, by the ITU-T G.107 E-model in its reduced form
 * (R = 93.2 − Id − Ie,eff, every other impairment at the model's defaults), with the G.107 R-to-MOS mapping.
 *   Id      = 0.024·d + 0.11·(d − 177.3)·H(d − 177.3), d the one-way mouth-to-ear delay in ms (the reduced delay term of Cole and
 *             Rosenbluth, 2001, used in place of the full G.107 delay impairment);
 *   Ie,eff  = Ie + (95 − Ie)·Ppl / (Ppl/BurstR + Bpl), Ppl the packet loss in percent, BurstR = 1 (random loss assumed);
 *   MOS     = 1 for R ≤ 0; 4.5 for R ≥ 100; otherwise 1 + 0.035·R + R·(R − 60)·(100 − R)·7·10⁻⁶.
 * Codec constants (Ie, Bpl) are only those in CODECS. A codec that is not there has no estimate: the method refuses rather than guess.
 * STATUS: SPECIFIED for engineering review. The constants are to be checked against the current ITU-T G.107 and G.113 texts before
 * any use outside this demonstration. The estimate inherits the evidence state of its inputs: simulated samples give a simulated
 * estimate, never a measurement. This is not a proprietary Empathia score.
 */
export const METHOD = {
  id: 'QM-G107-S1', name: 'E-model, reduced form (ITU-T G.107), loss and delay only', status: 'SPECIFIED: for engineering review',
  inputs: ['packet loss, percent, over the sample window', 'one-way network delay, ms', 'codec and its (Ie, Bpl) constants', 'jitter buffer and packetisation delay, ms (assumed)'],
  assumptions: { jitterBufferMs: 40, packetisationMs: 20, burstR: 1 },
  notCounted: ['echo', 'noise', 'loudness', 'bursty loss', 'transcoding', 'anything on a hop with no observation'],
};
export const CODECS: Record<string, { ie: number; bpl: number }> = { 'G.711 with PLC': { ie: 0, bpl: 25.1 }, 'G.711': { ie: 0, bpl: 4.3 } };
export type Estimate = { ok: true; r: number; mos: number; basis: EvidenceState; mouthToEarMs: number } | { ok: false; reason: 'MISSING_INPUT' | 'INVALID_INPUT' | 'NO_SOUNDNESS' | 'STALE' | 'UNTRUSTED_STATE'; why: string };
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
export function estimate(s: Pick<Sample, 'lossPct' | 'oneWayDelayMs' | 'codec' | 'state'>): Estimate {
  if (s.lossPct === null || s.oneWayDelayMs === null || s.lossPct === undefined || s.oneWayDelayMs === undefined) return { ok: false, reason: 'MISSING_INPUT', why: 'Loss or delay is missing for this window: no estimate.' };
  if (!finite(s.lossPct) || !finite(s.oneWayDelayMs) || s.lossPct < 0 || s.lossPct > 100 || s.oneWayDelayMs < 0 || s.oneWayDelayMs > 5000) return { ok: false, reason: 'INVALID_INPUT', why: 'Loss must be 0–100 percent and delay 0–5000 ms: the sample is refused.' };
  if (!['SIMULATED', 'OBSERVED', 'MEASURED', 'VERIFIED'].includes(s.state)) return { ok: false, reason: s.state === 'STALE' ? 'STALE' : 'UNTRUSTED_STATE', why: s.state === 'STALE' ? 'The sample is older than the freshness window: no estimate is made from it.' : `A ${s.state} sample is not an observation: no estimate.` };
  const c = CODECS[s.codec]; if (!c) return { ok: false, reason: 'NO_SOUNDNESS', why: `No (Ie, Bpl) constants are recorded for “${s.codec}”: the method does not apply.` };
  const d = s.oneWayDelayMs + METHOD.assumptions.jitterBufferMs + METHOD.assumptions.packetisationMs;
  const id = 0.024 * d + (d > 177.3 ? 0.11 * (d - 177.3) : 0);
  const ieEff = c.ie + (95 - c.ie) * s.lossPct / (s.lossPct / METHOD.assumptions.burstR + c.bpl);
  const r = 93.2 - id - ieEff;
  const mos = r <= 0 ? 1 : r >= 100 ? 4.5 : 1 + 0.035 * r + r * (r - 60) * (100 - r) * 7e-6;
  return { ok: true, r: Math.round(r * 10) / 10, mos: Math.round(Math.min(4.5, Math.max(1, mos)) * 100) / 100, basis: s.state, mouthToEarMs: d };
}
export const ageS = (at: string, now = FIXTURE_NOW) => Math.round((Date.parse(now) - Date.parse(at)) / 1000);
/** Which of the tenant's targets a window misses; a null value misses nothing and proves nothing. */
export function outsidePolicy(s: Sample): string[] {
  const o: string[] = [];
  if (finite(s.lossPct) && s.lossPct > POLICY.lossPct) o.push(`loss ${s.lossPct}% > ${POLICY.lossPct}%`);
  if (finite(s.jitterMs) && s.jitterMs > POLICY.jitterMs) o.push(`jitter ${s.jitterMs} ms > ${POLICY.jitterMs} ms`);
  if (finite(s.oneWayDelayMs) && s.oneWayDelayMs > POLICY.oneWayDelayMs) o.push(`delay ${s.oneWayDelayMs} ms > ${POLICY.oneWayDelayMs} ms`);
  return o;
}

// ---------------------------------------------------------------------------------------------------------------- the three cases
export type CaseId = 'degraded' | 'missing' | 'stale';
export const CASES: Array<{ id: CaseId; label: string; says: string }> = [
  { id: 'degraded', label: 'Degraded call', says: 'Simulated loss and jitter for forty seconds of the town hall call.' },
  { id: 'missing', label: 'Provider telemetry missing', says: 'The provider connector is not configured: there is no call-quality record at all.' },
  { id: 'stale', label: 'Stale samples', says: 'The last samples are older than the freshness window.' },
];
export const caseOf = (v: string | null): CaseId => (CASES.some((c) => c.id === v) ? (v as CaseId) : 'degraded');
export type Verdict = 'OUTSIDE_POLICY' | 'WITHIN_POLICY' | 'UNKNOWN';
export interface CaseView { id: CaseId; hops: Hop[]; samples: Sample[]; verdict: Verdict; verdictWhy: string; hypothesis: Hypothesis | null; downstream: string }
export interface Hypothesis { id: string; statement: string; kind: 'HYPOTHESIS'; cites: string[]; unknowns: string[]; wouldChange: string }
/** The rooms whose networked devices the access switch feeds (the estate's FEEDS and PLANS_DEVICE edges; the unit suite recomputes it). */
export const SHARED_LINK = { from: 'SW-ATL-CORE', to: 'SW-ATL-4A', rooms: ['R-ATL-4-218', 'R-ATL-4-220', 'R-ATL-4-231'], source: 'Estate edges: SW-ATL-CORE FEEDS SW-ATL-4A (DECLARED, network design); SW-ATL-4A FEEDS the networked devices of three rooms (OBSERVED, synthetic collector export 2026-10-28)' };

export function caseView(id: CaseId): CaseView {
  if (id === 'missing') {
    const hops = FLOW.hops.map((h) => (h.layer === 'provider' ? { ...h, observed: { state: 'NOT_CONFIGURED' as EvidenceState, source: 'No licensed provider connector is configured for this tenant. There is no call-quality record.' }, admin: 'Connector: NOT CONFIGURED' } : h.layer === 'core' || h.layer === 'sbc' ? { ...h, observed: { state: 'UNKNOWN' as EvidenceState, source: 'No observation for this session.' } } : h));
    return { id, hops, samples: [], verdict: 'UNKNOWN', verdictWhy: 'There is no call-quality record for this session, so its quality is UNKNOWN. That is not a healthy result: nothing was observed.', hypothesis: null,
      downstream: 'Pro and APEX receive “no evidence” and make no hypothesis; Assurance and MissionProof keep the room’s calling readiness at UNKNOWN until a source is connected.' };
  }
  if (id === 'stale') {
    const samples = SESSION.samples.map((s) => ({ ...s, at: s.at.replace('T15:', 'T13:'), state: 'STALE' as EvidenceState, source: `${s.source} Older than the ${FRESHNESS_WINDOW_S / 60}-minute freshness window.` }));
    return { id, hops: FLOW.hops.map((h) => (h.observed.state === 'SIMULATED' ? { ...h, observed: { ...h.observed, state: 'STALE' as EvidenceState, at: h.observed.at?.replace('T15:', 'T13:') } } : h)), samples, verdict: 'UNKNOWN',
      verdictWhy: 'The last samples are about two hours old. They are shown for the record and say nothing about the call now.', hypothesis: null,
      downstream: 'Pro and APEX mark the evidence stale and make no new hypothesis; Assurance and MissionProof show calling readiness as UNKNOWN (stale), not as passing.' };
  }
  const bad = SESSION.samples.filter((s) => outsidePolicy(s).length);
  return { id, hops: FLOW.hops, samples: SESSION.samples, verdict: bad.length ? 'OUTSIDE_POLICY' : 'WITHIN_POLICY',
    verdictWhy: `${bad.length} of ${SESSION.samples.length} simulated windows miss the tenant’s declared targets (${POLICY.id}).`,
    hypothesis: { id: 'VH-0001', kind: 'HYPOTHESIS', statement: 'The loss on this call may come from the uplink between the core switch and access switch ATL-4A, which the three rooms on that switch share.',
      cites: ['Simulated receiver report, windows 15:04:20 to 15:04:40 (loss and jitter above the declared targets)', 'Simulated uplink interface counters on ATL-CORE (discards rising in the same minute)', SHARED_LINK.source],
      unknowns: ['The WAN edge has no collector: loss beyond the building is not ruled out', 'Coincidence in time is not cause: nothing here measures the uplink carrying this call’s packets', 'No report from the other two rooms yet'],
      wouldChange: 'A report from Atlas 4.220 or 4.231 in the same minutes, or an observation at the WAN edge, would strengthen or rule this out.' },
    downstream: 'Pro and APEX may record this as a hypothesis with its citations; it is not a root cause. Assurance and MissionProof change only on verified evidence, never on this page.' };
}

// ---------------------------------------------------------------------------------------------------------------- who sees what
/**
 * The demonstration's perspectives for VOICE (a surface V2.5.3 never had, so the rule is written here and named in the registry):
 *   administration  the AV Operations Lead and the Systems Engineer stand in for the voice administrator and the IT/UC manager;
 *                   the Product Architect sees every surface. They read routing and quality, with signalling-side detail.
 *   technician      the Service Technician and the Service Manager read the path and the samples for their site's rooms, without
 *                   signalling-side detail, session tokens or directory assignments.
 *   summary         the Executive reads a non-identifying summary: no session, no endpoint detail.
 *   none            everyone else (a caller, a visitor) may report a problem and follow their own report; the CallPath is not theirs.
 * Switching perspective changes what the page shows. It grants nothing on any real system.
 */
export type VoiceView = 'administration' | 'technician' | 'summary' | 'none';
export const VOICE_ADMIN: readonly RoleKey[] = ['architect', 'ops', 'syseng'];
export const VOICE_TECH: readonly RoleKey[] = ['service', 'svcmgr'];
export const VOICE_SUMMARY: readonly RoleKey[] = ['exec'];
export const viewOf = (role: RoleKey): VoiceView => (VOICE_ADMIN.includes(role) ? 'administration' : VOICE_TECH.includes(role) ? 'technician' : VOICE_SUMMARY.includes(role) ? 'summary' : 'none');
export const WHY = 'Enterprise 3.0 directive 1A (founder, 23 Nov 2026), VOICE permissions: voice administration reads routing and quality; a site technician reads its rooms without signalling detail; an executive reads aggregates; a caller reports and follows only their own issue';

/** Adapter contracts and where each stands. Nothing here is connected: CONTRACT_ONLY means a specification exists and no code calls the vendor. */
export const ADAPTERS: Array<{ id: string; target: string; status: 'CONTRACT_ONLY' | 'MOCK'; note: string }> = [
  { id: 'voice.mock', target: 'Demonstration fixture VQ-FX-01', status: 'MOCK', note: 'The only source this page reads.' },
  { id: 'voice.teams-phone', target: 'Microsoft Teams Phone', status: 'CONTRACT_ONLY', note: 'Depends on the product’s API, licensing and tenant consent. Not connected.' },
  { id: 'voice.zoom-phone', target: 'Zoom Phone', status: 'CONTRACT_ONLY', note: 'Depends on the product’s API, licensing and tenant consent. Not connected.' },
  { id: 'voice.cisco', target: 'Cisco collaboration and voice platforms', status: 'CONTRACT_ONLY', note: 'Depends on the product’s API, licensing and tenant consent. Not connected.' },
  { id: 'voice.ringcentral', target: 'RingCentral', status: 'CONTRACT_ONLY', note: 'Depends on the product’s API, licensing and tenant consent. Not connected.' },
  { id: 'voice.sbc', target: 'Supported session border controllers', status: 'CONTRACT_ONLY', note: 'Per model and firmware, read-only first. Not connected.' },
  { id: 'voice.qos', target: 'Network QoS sources', status: 'CONTRACT_ONLY', note: 'Shared with FLOW. Not connected.' },
];
/** What VOICE never does, on any tenant (directive 1A). Shown on the page and checked by the unit suite against the fixture. */
export const NEVER = ['No call recording, transcription or listening by default', 'No test call to an emergency number, ever', 'Emergency-location records are a configuration audit aid, not a compliance certificate', 'No provider or device command without a verified capability and an approval'];

// ---------------------------------------------------------------------------------------------------------------- reports (isolated demo storage)
export interface VoiceReport { id: string; roomId: string; by: RoleKey; at: string; symptom: string; note: string; incidentId: string | null }
export const SYMPTOMS = ['Audio breaking up', 'Other side cannot hear me', 'Call dropped', 'Could not place or join the call', 'Echo or delay'] as const;
const KEY = 'empathia.demo.voice.v1';
export function loadReports(): VoiceReport[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]') as VoiceReport[]; return Array.isArray(v) ? v.filter((r) => r && typeof r.id === 'string') : []; } catch { return []; } }
export function saveReport(r: Omit<VoiceReport, 'id' | 'at'>): VoiceReport {
  const all = loadReports(); const rec: VoiceReport = { ...r, id: `VR-${String(all.length + 1).padStart(4, '0')}`, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify([rec, ...all])); } catch { /* the report lasts the page */ }
  return rec;
}
