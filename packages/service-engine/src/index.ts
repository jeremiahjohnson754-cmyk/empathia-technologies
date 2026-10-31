/**
 * @empathia/service-engine — ServiceHands: the governed service machine, hard-gated eligibility, explained ranking, dispatch preflight.
 * Ported from the Living Campus V2.5.3 demonstrator (`V25_STATE_MACHINES.service`, `v25HardGates`, `v25Candidates`, `v25Preflight`,
 * `V25_CERT`, `V25_WORK_NEEDS`, `V25_SLA`): people are hard-gated (certifications valid, experience, licences, site access, availability,
 * capacity, vendor coverage, exclusion of whoever did the original work) BEFORE any ranking, and the ranking explains itself. Pure: no
 * clock but the one passed in, no storage.
 */

export const SERVICE_STATES = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'] as const;
export type ServiceState = typeof SERVICE_STATES[number];
export interface ServiceTransition { from: ServiceState; to: ServiceState; role: string; authority: string; guard: string }
/** Verbatim (from, to, authorized_role, guard) with the persona authority of the role. */
export const SERVICE_TRANSITIONS: readonly ServiceTransition[] = Object.freeze([
  { from: 'OPEN', to: 'TRIAGED', role: 'service_manager', authority: 'service.triage', guard: 'scope_and_risk' },
  { from: 'TRIAGED', to: 'ASSIGNED', role: 'service_manager', authority: 'service.assign', guard: 'eligible_assignee_and_site' },
  { from: 'ASSIGNED', to: 'ACCEPTED', role: 'field_technician', authority: 'work.accept', guard: 'active_assignment' },
  { from: 'ACCEPTED', to: 'IN_PROGRESS', role: 'field_technician', authority: 'work.start', guard: 'preflight_passed' },
  { from: 'IN_PROGRESS', to: 'VERIFYING', role: 'field_technician', authority: 'work.evidence', guard: 'record_work_and_evidence' },
  { from: 'VERIFYING', to: 'RESOLVED', role: 'commissioning_lead', authority: 'service.verify', guard: 'required_verification' },
  { from: 'RESOLVED', to: 'CLOSED', role: 'service_manager', authority: 'service.close', guard: 'customer_policy_satisfied' },
  { from: 'RESOLVED', to: 'REOPENED', role: 'service_manager', authority: 'service.reopen', guard: 'recurrence_or_failed_verification' },
  // REOPENED resumes as a new service activity: the demonstrator's "new service activity and scoped revalidation"
  { from: 'REOPENED', to: 'TRIAGED', role: 'service_manager', authority: 'service.triage', guard: 'scope_and_risk' },
]);

export const CERTS = Object.freeze({
  'cert.av_field': { label: 'Field service practitioner', skill: 'SK-SVC-1', min: 'Working' },
  'cert.video': { label: 'Camera and framing', skill: 'SK-VID-1', min: 'Working' },
  'cert.audio': { label: 'Audio processing and coverage', skill: 'SK-AUD-1', min: 'Working' },
  'cert.network': { label: 'Networked AV practitioner', skill: 'SK-NET-1', min: 'Advanced' },
  'cert.control': { label: 'Control programming', skill: 'SK-CTL-1', min: 'Working' },
  'cert.commissioning': { label: 'Commissioning practitioner', skill: 'SK-CX-1', min: 'Working' },
  'lic.working_at_height': { label: 'Working at height licence', skill: null, min: null },
  'lic.electrical': { label: 'Low-voltage electrical licence', skill: null, min: null },
  'spec.acoustics': { label: 'Acoustic measurement specialist', skill: 'SK-AUD-3', min: 'Advanced' },
} as const);
export type CertId = keyof typeof CERTS;
export const LEVEL_RANK: Record<string, number> = { Foundational: 1, Working: 2, Advanced: 3, Expert: 4 };
export const SKILL_NAMES: Record<string, string> = { 'SK-SVC-1': 'field service', 'SK-VID-1': 'camera and framing', 'SK-AUD-1': 'audio processing', 'SK-AUD-2': 'DSP configuration', 'SK-AUD-3': 'acoustic measurement', 'SK-NET-1': 'networked AV', 'SK-NET-3': 'switching and segmentation', 'SK-CTL-1': 'control programming', 'SK-CX-1': 'commissioning' };

export interface WorkNeed { certs: CertId[]; experience: Record<string, string>; tools: string[]; parts: string[]; domain?: string }
export const WORK_NEEDS: Readonly<Record<string, WorkNeed>> = Object.freeze({
  camera_replacement: { certs: ['cert.av_field', 'cert.video'], experience: { 'SK-VID-1': 'Working' }, tools: ['PTZ service kit', 'laptop with the camera tool'], parts: ['camera unit', 'mounting plate'], domain: 'video' },
  dsp_upgrade: { certs: ['cert.av_field', 'cert.audio'], experience: { 'SK-AUD-2': 'Working' }, tools: ['audio analyser', 'laptop with the DSP tool'], parts: ['processor'], domain: 'audio' },
  new_install: { certs: ['cert.av_field', 'cert.audio', 'cert.video', 'lic.working_at_height'], experience: { 'SK-SVC-1': 'Advanced' }, tools: ['lift', 'cable tester', 'audio analyser'], parts: ['loudspeakers', 'microphone arrays', 'cameras', 'processor', 'control processor'], domain: 'av' },
  network_change: { certs: ['cert.network'], experience: { 'SK-NET-3': 'Working' }, tools: ['console cable', 'cable tester'], parts: [], domain: 'network' },
  break_fix: { certs: ['cert.av_field'], experience: { 'SK-SVC-1': 'Working' }, tools: ['service kit'], parts: [], domain: 'av' },
  room_verification: { certs: ['cert.commissioning'], experience: { 'SK-CX-1': 'Working' }, tools: ['audio analyser', 'test content'], parts: [], domain: 'av' },
});
export const SLA = Object.freeze({ 'Mission critical': { respond: 'on site in 2 hours', restore: '8 hours' }, High: { respond: 'next business day', restore: '2 business days' }, Standard: { respond: '2 business days', restore: '5 business days' } } as const);

export interface Window { from: string; to?: string }
export interface Staff {
  id: string; name: string; internal: boolean; orgName?: string; buildingKey: string | null; sites: string[];   // '*' = every site
  skills: Record<string, { level: string; n?: number }>;
  certs: Record<string, { expires: string }>;           // held certifications with expiry (ISO date)
  leave?: Window | null; capacity: { remaining: number };
  agreement?: { id: string; status: string; buildings: string[]; domains: string[] } | null;
  pastInRoom?: number;                                   // resolved jobs in the same room
}
export interface WorkOrderFacts { workType: string; needs?: WorkNeed; scope: { roomId?: string | null; buildingKey?: string | null }; window?: Window | null; domain?: string; excludeIds?: string[] }

export const overlaps = (a: Window, b: Window) => a.from <= (b.to || b.from) && b.from <= (a.to || a.from);

/** The hard gates. Any failure makes the person ineligible; the reasons are the demonstrator's. */
export function hardGates(staff: Staff, need: WorkNeed, wo: WorkOrderFacts, today: string): { ok: boolean; fails: string[]; missing: string[] } {
  const fails: string[] = []; const missing: string[] = [];
  for (const id of need.certs) {
    const c = staff.certs[id];
    if (!c) { fails.push(`${CERTS[id].label}: not held`); missing.push(id); }
    else if (c.expires < today) { fails.push(`${CERTS[id].label}: expired ${c.expires}`); missing.push(id); }
  }
  for (const [sk, lvl] of Object.entries(need.experience)) {
    const s = staff.skills[sk];
    const viaCert = (Object.entries(CERTS) as Array<[CertId, { skill: string | null; min: string | null }]>).find(([id, C]) => C.skill === sk && staff.certs[id] && staff.certs[id]!.expires >= today);
    const have = s ? s.level : viaCert ? (CERTS[viaCert[0]].min as string) : 'none';
    if (LEVEL_RANK[have] === undefined || LEVEL_RANK[have]! < LEVEL_RANK[lvl]!) fails.push(`experience ${SKILL_NAMES[sk] || sk}: ${have}, needs ${lvl}`);
  }
  const bk = wo.scope.buildingKey;
  if (bk && !(staff.sites.includes('*') || staff.sites.includes(bk))) fails.push(`site access: ${bk} not in approved sites (${staff.sites.join(', ') || 'none'})`);
  if (staff.leave && wo.window && overlaps(staff.leave, wo.window)) fails.push(`availability: on leave ${staff.leave.from} → ${staff.leave.to || staff.leave.from}`);
  if (staff.capacity.remaining < 4) fails.push(`capacity: ${staff.capacity.remaining} h left this week`);
  if (!staff.internal) {
    const a = staff.agreement;
    if (!a) fails.push('vendor: no support agreement on record');
    else if (a.status !== 'Active') fails.push(`vendor: agreement ${a.id} is ${a.status}`);
    else if (bk && !a.buildings.includes(bk)) fails.push(`vendor: agreement ${a.id} does not cover ${bk}`);
    else if ((wo.domain || need.domain) && !a.domains.includes(wo.domain || need.domain!)) fails.push(`vendor: agreement ${a.id} covers ${a.domains.join('/')}, not ${wo.domain || need.domain}`);
  }
  if (wo.excludeIds?.includes(staff.id)) fails.push('excluded from this work (did the original work)');
  return { ok: fails.length === 0, fails, missing };
}

export interface Candidate { id: string; name: string; internal: boolean; hardOk: boolean; hardFails: string[]; score: number; reasons: string[]; coversSite: boolean }
/** Eligibility first, then a ranking that explains every point. */
export function candidates(pool: Staff[], wo: WorkOrderFacts, today: string): { need: WorkNeed; eligible: Candidate[]; ineligible: Candidate[]; none: boolean; whyNone: string | null } {
  const need = wo.needs || WORK_NEEDS[wo.workType] || WORK_NEEDS['break_fix']!;
  const rows: Candidate[] = pool.map((s) => {
    const g = hardGates(s, need, wo, today); const reasons: string[] = []; let score = 0;
    if (g.ok) {
      const bk = wo.scope.buildingKey;
      if (bk && s.buildingKey === bk) { score += 25; reasons.push(`based in ${bk}`); } else if (bk && s.sites.includes(bk)) { score += 12; reasons.push(`works at ${bk}`); }
      let depth = 0; for (const sk of Object.keys(need.experience)) { const x = s.skills[sk]; if (x) depth += (LEVEL_RANK[x.level] || 0) * 5 + Math.min(10, x.n || 0); }
      if (depth) { score += Math.min(30, depth); reasons.push(`experience depth ${Math.min(30, depth)}/30`); }
      if (s.pastInRoom) { score += Math.min(15, s.pastInRoom * 5); reasons.push(`${s.pastInRoom} resolved job(s) in this room`); }
      if (s.capacity.remaining >= 16) { score += 10; reasons.push(`${s.capacity.remaining} h capacity this week`); } else reasons.push(`${s.capacity.remaining} h capacity this week`);
      if (s.internal) { score += 5; reasons.push('internal team'); }
    }
    return { id: s.id, name: s.name, internal: s.internal, hardOk: g.ok, hardFails: g.fails, score, reasons, coversSite: !!wo.scope.buildingKey && (s.sites.includes('*') || s.sites.includes(wo.scope.buildingKey!)) };
  });
  const eligible = rows.filter((r) => r.hardOk).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const ineligible = rows.filter((r) => !r.hardOk).sort((a, b) => a.hardFails.length - b.hardFails.length);
  return { need, eligible, ineligible, none: eligible.length === 0, whyNone: eligible.length ? null : `no eligible person: ${[...new Set(ineligible.flatMap((r) => r.hardFails.map((f) => f.split(':')[0])))].join(', ')} gates fail for everyone in the pool` };
}

export interface Stock { known: boolean; onHand: number; checkedAt?: string; stale?: boolean; ageDays?: number }
export interface PreflightInput { window?: Window | null; bookings?: Window[]; parts: Array<{ part: string; qty?: number; stock: Stock }>; access?: { confirmedBy: string } | null; safety?: { briefed: boolean; heightPermit?: boolean } | null; tools: string[]; toolsConfirmed?: string[]; needs: WorkNeed; approval: { ok: boolean; why: string } }
export interface Check { id: string; label: string; ok: boolean; why: string }
/** Dispatch preflight: every check is recorded, and a failed one blocks IN_PROGRESS. */
export function preflight(i: PreflightInput): { ok: boolean; checks: Check[] } {
  const checks: Check[] = [];
  const clash = i.window ? (i.bookings || []).find((b) => overlaps(i.window!, b)) : undefined;
  checks.push({ id: 'booking', label: 'Room booking window', ok: !!i.window && !clash, why: i.window ? clash ? `the room is booked: ${clash.from} → ${clash.to || clash.from}` : `free ${i.window.from} → ${i.window.to || i.window.from}` : 'no work window proposed' });
  const partFails = i.parts.filter((x) => !x.stock.known || x.stock.stale || x.stock.onHand < (x.qty || 1)).map((x) => !x.stock.known ? `${x.part}: not in the stock table` : x.stock.stale ? `${x.part}: stock check is ${x.stock.ageDays} days old — recheck` : `${x.part}: ${x.stock.onHand} on hand, ${x.qty || 1} needed`);
  checks.push({ id: 'parts', label: 'Parts on hand and stock fresh', ok: partFails.length === 0, why: partFails.join('; ') || `${i.parts.length} part line(s) confirmed` });
  checks.push({ id: 'access', label: 'Site access confirmed', ok: !!i.access?.confirmedBy, why: i.access?.confirmedBy ? `confirmed by ${i.access.confirmedBy}` : 'not confirmed by facilities or the site champion' });
  const heights = i.needs.certs.includes('lic.working_at_height');
  checks.push({ id: 'safety', label: 'Safety brief and permits', ok: !!(i.safety?.briefed && (!heights || i.safety.heightPermit)), why: !i.safety?.briefed ? 'safety brief not acknowledged' : heights && !i.safety.heightPermit ? 'working-at-height permit missing' : 'acknowledged' });
  const toolFails = i.tools.filter((t) => !(i.toolsConfirmed || []).includes(t));
  checks.push({ id: 'tools', label: 'Tools confirmed', ok: toolFails.length === 0, why: toolFails.length ? `missing: ${toolFails.join(', ')}` : 'all listed tools confirmed' });
  checks.push({ id: 'approval', label: 'Authorization to work', ok: i.approval.ok, why: i.approval.why });
  return { ok: checks.every((c) => c.ok), checks };
}

export interface ServiceFacts { state: ServiceState; actorId: string; technicianId: string | null; recorderIds: string[]; severity?: string; roomId?: string | null; eligible?: boolean; preflightOk?: boolean; evidence?: number; verifiedBy?: string | null; customerPolicy?: { needsCustomerConfirmation: boolean; confirmed: boolean }; reopenReason?: string | null }
/** The service guards (the demonstrator's names) with every reason. */
export function serviceBlockers(to: ServiceState, f: ServiceFacts): string[] {
  const t = SERVICE_TRANSITIONS.find((x) => x.from === f.state && x.to === to);
  if (!t) return [`no transition ${f.state} → ${to}: a job moves one governed step at a time`];
  const out: string[] = [];
  switch (t.guard) {
    case 'scope_and_risk': if (!f.roomId) out.push('the job names no room'); if (!f.severity) out.push('severity is not set'); break;
    case 'eligible_assignee_and_site': if (!f.technicianId) out.push('no technician chosen'); else if (!f.eligible) out.push('the chosen technician fails a hard gate'); break;
    case 'active_assignment': if (f.technicianId !== f.actorId) out.push('the job is accepted by the technician it was assigned to'); break;
    case 'preflight_passed': if (f.technicianId !== f.actorId) out.push('the assigned technician starts the work'); if (!f.preflightOk) out.push('dispatch preflight has a failed check'); break;
    case 'record_work_and_evidence': if (f.technicianId !== f.actorId) out.push('the assigned technician records the work'); if (!f.evidence) out.push('no field evidence recorded'); break;
    case 'required_verification': if (f.recorderIds.includes(f.actorId) || f.technicianId === f.actorId) out.push('the verifier is never the technician (separation of duties)'); break;
    case 'customer_policy_satisfied': if (f.customerPolicy?.needsCustomerConfirmation && !f.customerPolicy.confirmed) out.push('the customer policy requires the requester’s confirmation before closure'); break;
    case 'recurrence_or_failed_verification': if (!f.reopenReason) out.push('a reopening names its reason (recurrence or failed verification)'); break;
  }
  return out;
}
