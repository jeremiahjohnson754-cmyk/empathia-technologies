/**
 * Dispatch: resource matching on the service engine's hard gates and explained ranking (@empathia/service-engine `hardGates`,
 * `candidates`), with the owner's decisions of 2026-11-01 applied:
 *  - gates and preferences are shown separately; hard gates (competency, experience, licences/safety, site access, availability,
 *    capacity, vendor agreement / tenant, exclusion) can never be overridden; a ranking preference can be, with a written reason that
 *    is audited;
 *  - reassignment keeps its reason and goes only to eligible people;
 *  - credentials read "Internal competency" with a verification state (declared · lab-evidenced · verified by a reviewer); never
 *    "certified";
 *  - language and time zone are DECLARED requirements matched against DECLARED capabilities, as preferences only; never inferred;
 *  - no travel estimate (there is no authorized routing source).
 * Pure: the clock is passed in.
 */
import { candidates, hardGates, CERTS, SLA, WORK_NEEDS, type Staff, type WorkNeed, type WorkOrderFacts } from '@empathia/service-engine';

export const NO_TRAVEL = 'Travel time is not estimated: there is no authorized routing source.';
export const OVERRIDE_MIN = 12;

/** Deterministic synthetic technicians added to the seed pool (addendum §9): three more eligible-type profiles and one stress case. */
export const POOL_FIXTURE: Staff[] = [
  { id: 'tech-eli', name: 'Eli Brandt (synthetic)', internal: true, buildingKey: 'ATL', sites: ['ATL'], skills: { 'SK-SVC-1': { level: 'Advanced', n: 12 }, 'SK-AUD-2': { level: 'Advanced', n: 10 }, 'SK-AUD-1': { level: 'Working', n: 5 } }, certs: { 'cert.av_field': { expires: '2027-08-01' }, 'cert.audio': { expires: '2027-08-01' } }, leave: null, capacity: { remaining: 26 } },
  { id: 'tech-fay', name: 'Fay Moreno (synthetic)', internal: true, buildingKey: 'NST', sites: ['NST', 'ATL'], skills: { 'SK-SVC-1': { level: 'Working', n: 7 }, 'SK-VID-1': { level: 'Advanced', n: 9 } }, certs: { 'cert.av_field': { expires: '2027-05-01' }, 'cert.video': { expires: '2027-05-01' } }, leave: null, capacity: { remaining: 14 } },
  { id: 'tech-gus', name: 'Gus Haldane — Northwind AV (synthetic)', internal: false, orgName: 'Northwind AV Services', buildingKey: null, sites: ['ATL', 'NST'], skills: { 'SK-SVC-1': { level: 'Advanced', n: 16 }, 'SK-AUD-2': { level: 'Advanced', n: 8 } }, certs: { 'cert.av_field': { expires: '2027-03-01' }, 'cert.audio': { expires: '2027-03-01' } }, leave: null, capacity: { remaining: 20 }, agreement: { id: 'SA-NW-01', status: 'Expired', buildings: ['ATL', 'NST'], domains: ['audio', 'av'] } },
];
/** Declared capabilities (never inferred from a name or a place). */
export const DECLARED: Record<string, { languages: string[]; timeZone: string }> = {
  'tech-ana': { languages: ['English', 'Spanish'], timeZone: 'America/New_York' },
  'tech-ben': { languages: ['English'], timeZone: 'America/Chicago' },
  'tech-cara': { languages: ['English', 'Swedish'], timeZone: 'America/New_York' },
  'tech-dev': { languages: ['English', 'Gujarati'], timeZone: 'America/New_York' },
  'tech-eli': { languages: ['English', 'German'], timeZone: 'America/New_York' },
  'tech-fay': { languages: ['English', 'Spanish'], timeZone: 'America/Chicago' },
  'tech-gus': { languages: ['English'], timeZone: 'America/Chicago' },
};
export type CompetencyState = 'declared' | 'lab-evidenced' | 'verified by a reviewer';
/** Synthetic verification state of each internal competency record; anything not listed is declared. */
const VERIFIED: Record<string, CompetencyState> = { 'tech-ana:cert.av_field': 'verified by a reviewer', 'tech-ana:cert.video': 'lab-evidenced', 'tech-cara:cert.audio': 'verified by a reviewer', 'tech-eli:cert.audio': 'lab-evidenced', 'tech-ben:cert.network': 'verified by a reviewer' };
export function competencies(s: Staff, labEvidence: string[] = []): Array<{ id: string; label: string; state: CompetencyState; expires: string }> {
  return Object.entries(s.certs).map(([id, c]) => {
    const meta = (CERTS as Record<string, { label: string }>)[id];
    const st = VERIFIED[`${s.id}:${id}`] || (labEvidence.includes(id) ? 'lab-evidenced' : 'declared');
    return { id, label: `Internal competency · ${meta ? meta.label : id}`, state: st, expires: c.expires };
  });
}

/** The pool: the workspace's people plus the fixture people not yet in it. */
export const poolOf = (staff: Staff[]) => [...staff, ...POOL_FIXTURE.filter((f) => !staff.some((s) => s.id === f.id))];

export type GateKey = 'competency' | 'experience' | 'licence' | 'site' | 'availability' | 'capacity' | 'vendor' | 'exclusion';
export const GATE_LABEL: Record<GateKey, string> = { competency: 'Internal competency', experience: 'Experience', licence: 'Licences and safety', site: 'Site access', availability: 'Availability', capacity: 'Capacity', vendor: 'Vendor agreement / tenant', exclusion: 'Exclusion' };
const gateOf = (fail: string): GateKey => {
  if (/licence/i.test(fail)) return 'licence';
  if (/^experience/.test(fail)) return 'experience';
  if (/^site access/.test(fail)) return 'site';
  if (/^availability/.test(fail)) return 'availability';
  if (/^capacity/.test(fail)) return 'capacity';
  if (/^vendor/.test(fail)) return 'vendor';
  if (/excluded/.test(fail)) return 'exclusion';
  return 'competency';
};
export interface Gate { key: GateKey; label: string; ok: boolean; why: string }
export interface Pref { label: string; points: number; why: string }
export interface Match { id: string; name: string; org: string; internal: boolean; eligible: boolean; gates: Gate[]; prefs: Pref[]; score: number; rank: number | null; competencies: ReturnType<typeof competencies>; declared: { languages: string[]; timeZone: string } | null }
export interface MatchInput { workType: string; roomId: string; buildingKey: string; window?: { from: string; to?: string } | null; excludeIds?: string[]; language?: string | null; timeZone?: string | null; needs?: WorkNeed }

/** Every person with every gate (pass or fail, with the reason) and, for the eligible, the preferences that ranked them. */
export function match(pool: Staff[], m: MatchInput, today: string, labEvidence: Record<string, string[]> = {}): { need: WorkNeed; rows: Match[]; eligible: Match[]; ineligible: Match[]; noTravel: string } {
  const wo: WorkOrderFacts = { workType: m.workType, needs: m.needs, scope: { roomId: m.roomId, buildingKey: m.buildingKey }, window: m.window || null, excludeIds: m.excludeIds };
  const need = m.needs || WORK_NEEDS[m.workType] || WORK_NEEDS['break_fix']!;
  const c = candidates(pool, wo, today);
  const rows: Match[] = pool.map((s) => {
    const g = hardGates(s, need, wo, today);
    const byKey = new Map<GateKey, string[]>(); for (const f of g.fails) { const k = gateOf(f); byKey.set(k, [...(byKey.get(k) || []), f]); }
    const keys: GateKey[] = ['competency', 'experience', 'licence', 'site', 'availability', 'capacity', ...(s.internal ? [] : ['vendor' as GateKey]), ...(m.excludeIds?.length ? ['exclusion' as GateKey] : [])];
    const gates: Gate[] = keys.filter((k) => k !== 'licence' || need.certs.some((x) => x.startsWith('lic.'))).map((k) => ({ key: k, label: GATE_LABEL[k], ok: !byKey.has(k), why: byKey.get(k)?.join('; ') || okWhy(k, s, need, m) }));
    const cand = [...c.eligible, ...c.ineligible].find((x) => x.id === s.id)!;
    const prefs: Pref[] = cand.hardOk ? cand.reasons.map((r) => ({ label: prefLabel(r), points: prefPoints(r, s, need, m), why: r })) : [];
    const d = DECLARED[s.id] || null; let extra = 0;
    if (cand.hardOk && m.language) { const hit = !!d?.languages.includes(m.language); prefs.push({ label: 'Declared language', points: hit ? 5 : 0, why: hit ? `declares ${m.language} (declared, not verified)` : `does not declare ${m.language}` }); if (hit) extra += 5; }
    if (cand.hardOk && m.timeZone) { const hit = d?.timeZone === m.timeZone; prefs.push({ label: 'Declared time zone', points: hit ? 3 : 0, why: hit ? `declares ${m.timeZone}` : `declares ${d?.timeZone || 'none'}` }); if (hit) extra += 3; }
    return { id: s.id, name: s.name, org: s.internal ? 'Internal team' : s.orgName || 'Vendor', internal: s.internal, eligible: cand.hardOk, gates, prefs, score: cand.score + extra, rank: null, competencies: competencies(s, labEvidence[s.id] || []), declared: d };
  });
  const eligible = rows.filter((r) => r.eligible).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  eligible.forEach((r, i) => { r.rank = i + 1; });
  const ineligible = rows.filter((r) => !r.eligible).sort((a, b) => a.gates.filter((g) => !g.ok).length - b.gates.filter((g) => !g.ok).length || a.name.localeCompare(b.name));
  return { need, rows: [...eligible, ...ineligible], eligible, ineligible, noTravel: NO_TRAVEL };
}
function okWhy(k: GateKey, s: Staff, need: WorkNeed, m: MatchInput): string {
  switch (k) {
    case 'competency': return need.certs.filter((c) => !c.startsWith('lic.')).map((c) => `${(CERTS as Record<string, { label: string }>)[c]?.label || c} valid to ${s.certs[c]?.expires}`).join('; ') || 'none required';
    case 'experience': return Object.entries(need.experience).map(([sk, l]) => `${sk} ${s.skills[sk]?.level || 'via competency'} ≥ ${l}`).join('; ') || 'none required';
    case 'licence': return need.certs.filter((c) => c.startsWith('lic.')).map((c) => `${c} held`).join('; ');
    case 'site': return `${m.buildingKey} is an approved site`;
    case 'availability': return m.window ? 'no leave in the work window' : 'no work window yet: leave is checked when one is proposed';
    case 'capacity': return `${s.capacity.remaining} h left this week`;
    case 'vendor': return s.agreement ? `agreement ${s.agreement.id} is ${s.agreement.status} and covers the work` : '';
    case 'exclusion': return 'did not do the original work';
  }
}
const prefLabel = (r: string) => /^based in/.test(r) ? 'Home site' : /^works at/.test(r) ? 'Works at the site' : /^experience depth/.test(r) ? 'Experience depth' : /resolved job/.test(r) ? 'Knows this room' : /capacity/.test(r) ? 'Capacity' : /internal/.test(r) ? 'Internal team' : r;
function prefPoints(r: string, s: Staff, need: WorkNeed, m: MatchInput): number {
  if (/^based in/.test(r)) return 25; if (/^works at/.test(r)) return 12;
  const d = /experience depth (\d+)/.exec(r); if (d) return Number(d[1]);
  if (/resolved job/.test(r)) return Math.min(15, (s.pastInRoom || 0) * 5);
  if (/capacity/.test(r)) return s.capacity.remaining >= 16 ? 10 : 0;
  if (/internal/.test(r)) return 5;
  void need; void m; return 0;
}

/** Whether an assignment may go ahead: a hard gate never; a lower-ranked eligible person only with a written reason (a preference override). */
export function assignmentBlockers(rows: Match[], techId: string, reason: string | null): { why: string[]; override: boolean; rankWas: number | null } {
  const r = rows.find((x) => x.id === techId);
  if (!r) return { why: ['that person is not in the pool for this work'], override: false, rankWas: null };
  if (!r.eligible) return { why: [`hard gates can never be overridden: ${r.gates.filter((g) => !g.ok).map((g) => `${g.label} — ${g.why}`).join('; ')}`], override: false, rankWas: null };
  if (r.rank === 1) return { why: [], override: false, rankWas: 1 };
  const ok = !!reason && reason.trim().length >= OVERRIDE_MIN;
  return { why: ok ? [] : [`${r.name} is ranked ${r.rank}: choosing them over the first-ranked person overrides a preference and needs a written reason (at least ${OVERRIDE_MIN} characters)`], override: true, rankWas: r.rank };
}
/** Reassignment: a reason always, only to an eligible person, never to the same person, never once the work has started. */
export function reassignBlockers(rows: Match[], fromId: string | null, toId: string, reason: string, state: string): string[] {
  const out: string[] = [];
  if (!['ASSIGNED', 'ACCEPTED'].includes(state)) out.push(`a job is reassigned while ASSIGNED or ACCEPTED (now ${state})${state === 'IN_PROGRESS' ? ': the work has started, so it is handed over by the technician through ServiceHands' : ''}`);
  if (fromId === toId) out.push('that person already has the job');
  const r = rows.find((x) => x.id === toId);
  if (!r) out.push('that person is not in the pool'); else if (!r.eligible) out.push(`reassignment goes only to an eligible person: ${r.name} fails ${r.gates.filter((g) => !g.ok).map((g) => g.label).join(', ')}`);
  if (!reason || reason.trim().length < OVERRIDE_MIN) out.push(`a reassignment records its reason (at least ${OVERRIDE_MIN} characters)`);
  return out;
}

/** SLA restore deadline from the severity (business days counted as calendar days in this demonstration, and it says so). */
export const RESTORE_HOURS: Record<string, number> = { 'Mission critical': 8, High: 48, Standard: 120 };
export function slaOf(severity: string, openedAt: string, restoredAt: string | null, nowMs: number): { due: string; hoursLeft: number; state: 'met' | 'ok' | 'at risk' | 'breached'; promise: string } {
  const h = RESTORE_HOURS[severity] ?? 120; const due = Date.parse(openedAt) + h * 36e5;
  const promise = (SLA as Record<string, { respond: string; restore: string }>)[severity]?.restore || `${h} h`;
  if (restoredAt) return { due: new Date(due).toISOString(), hoursLeft: 0, state: Date.parse(restoredAt) <= due ? 'met' : 'breached', promise };
  const left = (due - nowMs) / 36e5;
  return { due: new Date(due).toISOString(), hoursLeft: Math.round(left * 10) / 10, state: left < 0 ? 'breached' : left < h * 0.25 ? 'at risk' : 'ok', promise };
}

export const COLUMNS: Array<{ key: string; label: string; states: string[] }> = [
  { key: 'triage', label: 'To triage', states: ['OPEN', 'REOPENED'] },
  { key: 'assign', label: 'Ready to assign', states: ['TRIAGED'] },
  { key: 'assigned', label: 'Assigned', states: ['ASSIGNED', 'ACCEPTED'] },
  { key: 'work', label: 'In progress', states: ['IN_PROGRESS'] },
  { key: 'verify', label: 'Verifying', states: ['VERIFYING'] },
  { key: 'done', label: 'Resolved', states: ['RESOLVED'] },
];

interface IncLike { id: string; state: string; severity: string; openedAt: string; restoredAt: string | null; history: Array<{ to: string; at: string }>; reopened: boolean; closedAt: string | null }
/** Board metrics, each from the records with its numerator and denominator. */
export function metrics(incs: IncLike[], nowMs: number) {
  const open = incs.filter((i) => !['CLOSED', 'CANCELLED', 'RESOLVED'].includes(i.state));
  const waiting = open.filter((i) => ['OPEN', 'REOPENED', 'TRIAGED'].includes(i.state));
  const risk = open.filter((i) => ['at risk', 'breached'].includes(slaOf(i.severity, i.openedAt, i.restoredAt, nowMs).state));
  const assignTimes = incs.map((i) => { const o = i.history.find((h) => h.to === 'OPEN'); const a = i.history.find((h) => h.to === 'ASSIGNED'); return o && a ? (Date.parse(a.at) - Date.parse(o.at)) / 36e5 : null; }).filter((x): x is number => x !== null && x >= 0);
  const closed = incs.filter((i) => ['CLOSED', 'RESOLVED'].includes(i.state));
  return {
    open: { value: open.length, def: `incidents not resolved, closed or cancelled, of ${incs.length}` },
    waiting: { value: waiting.length, def: `open incidents with no technician yet, of ${open.length} open` },
    risk: { value: risk.length, def: `open incidents past 75% of their restore time or past it, of ${open.length} open` },
    assign: { value: assignTimes.length ? Math.round((assignTimes.reduce((a, b) => a + b, 0) / assignTimes.length) * 10) / 10 : null, def: `mean hours from opened to assigned, over ${assignTimes.length} assigned incident(s)` },
    reopened: { value: incs.filter((i) => i.reopened).length, def: `incidents reopened after verification, of ${closed.length + incs.filter((i) => i.reopened).length} verified` },
  };
}
