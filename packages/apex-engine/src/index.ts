/**
 * @empathia/apex-engine — APEX: seven layers of evidence, ranked hypotheses that say why they are not proven, action tiers A0–A5 with
 * their bounds, signed runbooks, and the bounded-action preflight that is blocked by the real adapter state. Ported from the Living
 * Campus V2.5.3 demonstrator (`APEX_LAYERS`, `V25_APEX_TIERS`, `V25_RUNBOOKS`, `V25_APEX_BRANCHES`, `v25ApexAct`). Pure: the caller
 * passes the adapter states, the clock and the case; the engine returns the outcome to log. Every outcome — including the blocked ones —
 * is an entry for the log; nothing here touches a device.
 */

export const APEX_LAYERS = Object.freeze([['physical', 'Physical'], ['network', 'Network'], ['compute', 'Compute'], ['media', 'Media'], ['control', 'Control'], ['uc_app', 'UC application'], ['experience', 'Actual user experience']] as const);
export type Layer = typeof APEX_LAYERS[number][0];
export type Tier = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
export const TIERS: Readonly<Record<Tier, { label: string; bound: string; autonomous: boolean }>> = Object.freeze({
  A0: { label: 'Explain', bound: 'cite an authorized source; abstain if absent', autonomous: true },
  A1: { label: 'Propose', bound: 'proposal state only; shows source and uncertainty', autonomous: true },
  A2: { label: 'Assist read-only', bound: 'tenant/site-scoped read; rate-limited; compares baseline', autonomous: true },
  A3: { label: 'Prepare write', bound: 'stages a draft; domain/policy approval required before anything is applied', autonomous: false },
  A4: { label: 'Execute bounded', bound: 'signed approved runbook, precise target allowlist, occupancy/safety checks, preauthorized window, dry run, rollback, rate limit, post-repair verification', autonomous: false },
  A5: { label: 'Critical action', bound: 'human-led; never executed autonomously', autonomous: false },
});
export interface Runbook { label: string; tier: Tier; targets: string[]; allowlist: string[]; blastRadius: string; rollback: string; rateLimit: string; occupancyCheck: boolean; safety: boolean; signedBy: string | null; version: string }
export const RUNBOOKS: Readonly<Record<string, Runbook>> = Object.freeze({
  'RB-AEC-RESET': { label: 'Re-apply the approved AEC reference routing', tier: 'A4', targets: ['dsp'], allowlist: ['processor'], blastRadius: 'one room, audio only', rollback: 'restore the signed configuration snapshot', rateLimit: '1 per room per day', occupancyCheck: true, safety: false, signedBy: 'dsp_eng', version: '1.2' },
  'RB-POE-CYCLE': { label: 'Bounce the PoE port feeding the camera', tier: 'A4', targets: ['network'], allowlist: ['access_switch_port'], blastRadius: 'one port; the port allowlist excludes uplinks', rollback: 'port returns to its prior state automatically', rateLimit: '2 per port per day', occupancyCheck: true, safety: false, signedBy: 'syseng', version: '1.0' },
  'RB-VLAN-ROUTE': { label: 'Re-route the AV segment', tier: 'A5', targets: ['network'], allowlist: [], blastRadius: 'site-wide', rollback: 'manual', rateLimit: 'n/a', occupancyCheck: true, safety: true, signedBy: null, version: '0.9 (unsigned)' },
  'RB-CAM-HOME': { label: 'Recall the camera home preset', tier: 'A4', targets: ['camera'], allowlist: ['camera'], blastRadius: 'one camera; motion in a possibly occupied room', rollback: 'none needed', rateLimit: '3 per day', occupancyCheck: true, safety: false, signedBy: 'video_eng', version: '1.1' },
});

export interface Hypothesis { id: string; text: string; layer: Layer; confidence: 'none' | 'low' | 'medium' | 'high'; caveat: string; negative: string[]; next: string[]; action: { tier: Tier; runbook?: string }; evidence: string[]; staleEvidence?: boolean }
export interface Branch { layers: Record<Layer, string[]>; hyps: Array<Omit<Hypothesis, 'evidence'>> }
/** The symptom library: what each layer shows and the hypotheses it supports, with their confidence and caveats. */
export const BRANCHES: Readonly<Record<string, Branch>> = Object.freeze({
  echo: { layers: { physical: ['microphone placement unchanged since photos'], network: ['jitter on the AV segment within the baseline window'], compute: [], media: ['AEC reference routing differs from the signed configuration'], control: [], uc_app: ['far-end reports echo on calls with more than six active microphones'], experience: ['site champion: worse since Monday'] },
    hyps: [
      { id: 'H1', text: 'The AEC reference is routed from the wrong bus after a configuration change', layer: 'media', confidence: 'medium', caveat: 'configuration difference is read from the recorded signature, not from the live device', negative: ['no firmware change recorded'], next: ['supervised: compare the live DSP configuration with the signed snapshot (A2)', 'supervised: far-end call with the service desk after re-applying routing (retest)'], action: { tier: 'A4', runbook: 'RB-AEC-RESET' } },
      { id: 'H2', text: 'Microphone gain structure drifted after a room re-tune', layer: 'media', confidence: 'low', caveat: 'no measurement on record since commissioning', negative: ['no tuning event in the ledger'], next: ['instrument: gain structure check under the approved protocol'], action: { tier: 'A1' } },
      { id: 'H3', text: 'Network jitter starves the AEC of a stable reference', layer: 'network', confidence: 'low', caveat: 'passive counters only', negative: ['switch counters within baseline'], next: ['supervised: path trace during a call (A2)'], action: { tier: 'A2' } },
    ] },
  camera: { layers: { physical: ['camera power LED off; PoE port shows no link'], network: ['port down on the access switch'], compute: [], media: [], control: ['codec reports no video source'], uc_app: ['meeting joined without video'], experience: ['facilities: reported by the room user'] },
    hyps: [
      { id: 'H1', text: 'The PoE port stopped delivering power (port error-disabled)', layer: 'network', confidence: 'medium', caveat: 'port state read from the recorded dependency, not polled now', negative: ['camera firmware unchanged'], next: ['supervised: port state and PoE budget on the access switch (A2)', 'bounded: bounce the port under the signed runbook (A4)'], action: { tier: 'A4', runbook: 'RB-POE-CYCLE' } },
      { id: 'H2', text: 'The camera cable or injector failed', layer: 'physical', confidence: 'low', caveat: 'needs a field check', negative: [], next: ['technician: cable test at both ends'], action: { tier: 'A3' } },
      { id: 'H3', text: 'The camera needs a home preset recall after a brown-out', layer: 'control', confidence: 'low', caveat: 'would move the camera in a possibly occupied room', negative: ['power LED is off: a recall cannot help'], next: [], action: { tier: 'A4', runbook: 'RB-CAM-HOME' } },
    ] },
  display: { layers: { physical: ['display power confirmed'], network: [], compute: ['room compute reachable'], media: ['no signal on the input the codec drives'], control: ['touch panel shows the source as selected'], uc_app: [], experience: ['projector/display blank'] },
    hyps: [{ id: 'H1', text: 'The input mapping on the display differs from the commissioned configuration', layer: 'media', confidence: 'medium', caveat: 'read from the configuration signature', negative: [], next: ['supervised: compare input mapping with the baseline (A2)'], action: { tier: 'A3' } }] },
  network: { layers: { physical: [], network: ['access switch uplink flapping in the recorded counters'], compute: [], media: ['codec lost registration twice'], control: [], uc_app: ['calls dropped mid-meeting'], experience: ['several rooms on the same switch report drops'] },
    hyps: [
      { id: 'H1', text: 'The access switch uplink is unstable and every room on it suffers', layer: 'network', confidence: 'medium', caveat: 'counters are recorded, not live', negative: [], next: ['supervised: uplink counters and errors (A2)', 'change request: re-route the AV segment (A5, human-led)'], action: { tier: 'A5', runbook: 'RB-VLAN-ROUTE' } },
      { id: 'H2', text: 'A single room device floods the segment', layer: 'network', confidence: 'low', caveat: 'no port-level counters on record', negative: [], next: ['technician: port counters per room'], action: { tier: 'A3' } },
    ] },
  generic: { layers: { physical: [], network: [], compute: [], media: [], control: [], uc_app: [], experience: ['reported symptom'] },
    hyps: [{ id: 'H1', text: 'Insufficient evidence to form a hypothesis', layer: 'experience', confidence: 'none', caveat: 'abstaining: no cited evidence for this symptom', negative: [], next: ['technician: structured observation of the symptom'], action: { tier: 'A0' } }] },
});
export const symptomKey = (text: string): keyof typeof BRANCHES => { const t = text.toLowerCase(); return /echo|hear/.test(t) ? 'echo' : /camera|video source|no video/.test(t) ? 'camera' : /blank|display|projector/.test(t) ? 'display' : /network|drop|disconnect/.test(t) ? 'network' : 'generic'; };

/** Open a case: the branch for the symptom, with the evidence each layer cites from the room's recorded relationships. */
export function openCase(symptom: string, cite: (layer: Layer) => string[]): { key: string; layers: Array<{ layer: Layer; label: string; observations: string[]; cites: string[] }>; hypotheses: Hypothesis[] } {
  const key = symptomKey(symptom); const B = BRANCHES[key]!;
  const layers = APEX_LAYERS.map(([layer, label]) => ({ layer, label, observations: B.layers[layer], cites: B.layers[layer].length ? cite(layer) : [] }));
  const hypotheses: Hypothesis[] = B.hyps.map((h) => ({ ...h, evidence: [...B.layers[h.layer], ...cite(h.layer)] }));
  // ranked: confidence first, then the fewest negatives
  const rank = { high: 3, medium: 2, low: 1, none: 0 };
  hypotheses.sort((a, b) => rank[b.confidence] - rank[a.confidence] || a.negative.length - b.negative.length);
  return { key, layers, hypotheses };
}

export interface ActInput { tier?: Tier; runbook?: string; ownerApproved?: boolean; window?: string | null; occupied?: boolean; targets?: string[] | null; dryRunDone?: boolean; branch?: 'nominal' | 'lost_signal' | 'estop' | 'incomplete'; acceptStale?: boolean; simulate?: boolean }
export interface ActContext { adapters: Record<string, 'NOT_CONFIGURED' | 'DECLARED' | 'SUPPORTED_VERIFIED'>; baseline: { version: number; evidence: number } | null; priorA4: number; stageWorkOrder?: () => { ok: boolean; id?: string; why?: string[] } }
export interface Outcome { outcome: string; detail: string; tier: Tier; runbook?: string; simulated?: boolean; branch?: string; verification?: 'REQUIRED' | 'NOT_RUN' | 'FAIL'; compensation?: boolean; workOrderId?: string }

/** Act on a hypothesis at a tier. The outcome is what gets logged; a BLOCKED outcome is a result, not an error. */
export function act(h: Hypothesis, input: ActInput, ctx: ActContext): Outcome {
  const tier = input.tier || h.action.tier; const T = TIERS[tier];
  if (tier === 'A0') return h.confidence === 'none' || !h.evidence.length ? { tier, outcome: 'ABSTAINED', detail: `ABSTAINED: no authorized source explains this symptom; a supervised observation is the next step` } : { tier, outcome: 'EXPLAINED', detail: `Cited: ${h.evidence.join(', ')}. ${h.text}` };
  if (tier === 'A1') return { tier, outcome: 'PROPOSED', detail: `${h.text} — proposal only; ${h.caveat}` };
  if (tier === 'A2') {
    if (h.staleEvidence && !input.acceptStale) return { tier, outcome: 'BLOCKED', detail: 'stale evidence: a recorded check is older than the assurance window; the comparison would mislead' };
    return ctx.baseline ? { tier, outcome: 'COMPARED', detail: `read-only comparison against baseline v${ctx.baseline.version} (${ctx.baseline.evidence} evidence items)` } : { tier, outcome: 'COMPARED', detail: 'read-only: no accepted baseline for this room — nothing to compare, NOT_VERIFIED' };
  }
  if (tier === 'A3') { const r = ctx.stageWorkOrder ? ctx.stageWorkOrder() : { ok: false, why: ['no work-order staging available'] }; return r.ok ? { tier, outcome: 'DRAFT_STAGED', detail: `work order ${r.id} drafted; it stays OPEN until the service manager triages it`, workOrderId: r.id } : { tier, outcome: 'REFUSED', detail: (r.why || []).join('; ') }; }
  if (tier === 'A5') return { tier, outcome: 'HUMAN_LED', detail: `${T.label}: no autonomous execution; a human-led change request is the only path (${h.action.runbook ? `runbook ${h.action.runbook} is ${RUNBOOKS[h.action.runbook]?.signedBy ? 'signed' : 'unsigned'}` : 'no runbook'})` };
  // A4 — execute bounded, in this build always a labelled simulation
  const rbKey = input.runbook || h.action.runbook; const rb = rbKey ? RUNBOOKS[rbKey] : undefined;
  if (!rb) return { tier, outcome: 'BLOCKED', detail: 'no runbook for this action' };
  if (rb.tier === 'A5' || rb.safety) return { tier, outcome: 'HUMAN_LED', runbook: rb.label, detail: `${rb.label} touches a non-waivable safety item / critical scope: human-led only` };
  if (!rb.signedBy) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: `runbook ${rb.label} is unsigned` };
  if (!input.ownerApproved) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: 'owner approval missing (room owner / operations)' };
  if (!input.window) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: 'no preauthorized window' };
  if (input.occupied) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: 'occupancy check: the room is occupied; bounded execution waits' };
  const adapterIds: Record<string, string> = { dsp: 'ADP-DSP', camera: 'ADP-CAM', network: 'ADP-NET' };
  if (!rb.targets.every((t) => ctx.adapters[adapterIds[t] || t] === 'SUPPORTED_VERIFIED') && !input.simulate) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: `unsupported vendor adapter: no SUPPORTED_VERIFIED adapter for ${rb.targets.join('/')} (${rb.targets.map((t) => ctx.adapters[adapterIds[t] || t] || 'NOT_CONFIGURED').join('/')} in this build)` };
  if (input.targets && input.targets.some((t) => !rb.allowlist.includes(t))) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: `side effects: target(s) ${input.targets.filter((t) => !rb.allowlist.includes(t)).join(', ')} are outside the runbook allowlist (${rb.blastRadius})` };
  const limit = parseInt(rb.rateLimit, 10) || 1;
  if (ctx.priorA4 >= limit) return { tier, outcome: 'BLOCKED', runbook: rb.label, detail: `rate limit: ${rb.rateLimit} reached` };
  if (!input.dryRunDone) return { tier, outcome: 'DRY_RUN', runbook: rb.label, simulated: true, detail: `dry run (simulated): ${rb.label} on ${rb.allowlist.join(', ')}; blast radius ${rb.blastRadius}; rollback: ${rb.rollback}. Run again with the dry run acknowledged to execute the bounded simulation.` };
  const branch = input.branch || 'nominal';
  const outcomes: Record<string, Outcome> = {
    nominal: { tier, outcome: 'EXECUTED_SIMULATED', detail: `${rb.label} applied in the simulation; post-repair verification is required before the incident can close`, verification: 'REQUIRED' },
    lost_signal: { tier, outcome: 'ROLLED_BACK', detail: 'lost signal from the target mid-run (heartbeat timeout): rollback applied in the simulation; incident stays open', verification: 'NOT_RUN', compensation: true },
    estop: { tier, outcome: 'ABORTED', detail: 'operator emergency stop: run aborted, rollback applied in the simulation', verification: 'NOT_RUN', compensation: true },
    incomplete: { tier, outcome: 'EXECUTED_SIMULATED', detail: `${rb.label} applied in the simulation; the post-repair verification FAILED — the repair is incomplete and the incident stays open`, verification: 'FAIL', compensation: true },
  };
  return { ...(outcomes[branch] || outcomes['nominal']!), runbook: rb.label, simulated: true, branch };
}
