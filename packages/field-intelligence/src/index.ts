/**
 * @empathia/field-intelligence — Field Intelligence v1.3 (what the collector declares; plan vs executed; declared, observed, verified,
 * modeled, unknown, unavailable) and the optional v1.4 Physical Validation session (licensed, gated, simulated here). Ported from the
 * Living Campus V2.5.3 demonstrator (`V25_FI13`, `v25Fi13Plan`, `V25_FIPV`, `v25FiEligibility/Preflight/DryRun/Authorize/Arm/Run/Estop`).
 * Pure: the caller passes the session, the actor's authorities and the clock; the engine returns the next session (or a refusal) and
 * never touches a device. A licence opens requests, never proofs. There is no "Scan Now".
 */

export const FI13 = Object.freeze({
  scriptVersion: '1.3.0-universal-preview', schema: 'empathia.universal-assurance.plan.v1', configSchema: 'empathia.collector.config.v1.1',
  sha256: 'a479a51f705252b0267f3d8ee36ea41b5c71f3d01168d25531da6da3b58a4df4', sourceSha256: '42e14fa97b47d9c9a11efbf0d869662436d6c1f48606d1a5a1eda10b6deb3405',
  redistribution: 'five lines changed from the source collector: three comments and one self-test sample name, to remove references to a real organisation; SelfTest and UniversalPlan outputs verified identical',
  modes: ['Init', 'Monitor', 'Plan', 'Readiness', 'SelfTest', 'Install', 'Uninstall', 'Export', 'ExecuteApproved', 'UniversalPlan'],
  exitCodes: { 0: 'plan written (PLAN_ONLY)', 3: 'invalid configuration', 5: 'plan INCOMPLETE (a declaration failed validation)' } as Record<number, string>,
  intervalMinutes: 15,
  capabilities: ['Enumerate', 'VideoCapture', 'Pan', 'Tilt', 'Zoom', 'AudioCapture', 'AudioPlayback', 'DSPTelemetry', 'BeamformingTelemetry', 'DeviceTelemetry', 'CalibratedSPL', 'CalibratedAcousticCapture', 'OccupancyVerified', 'PhysicalPositionKnown'],
  limitations: ['Config claims are declarations, not validated device capabilities', 'No universal PTZ/audio/DSP control is implemented', 'No calibrated physical measurements have been performed', 'No device, stream, network or credential access occurs in this mode'],
  verified: 'runtime observations in audit/fi13-run (UniversalPlan exit 0, OBSERVED→DECLARED downgrade, INCOMPLETE exit 5, invalid config exit 3, SelfTest); the package QA is static/adversarial only — no executable PowerShell QA is claimed',
  pairProcedure: ['Verify authorized capture path', 'Verify authorized playback path', 'Confirm occupancy and operator approvals', 'Validate gain/AGC/AEC/DSP routing', 'Perform supervised low-level functional test', 'Use calibrated reference equipment for engineering acoustic measurements'],
});
export type Kind = 'Camera' | 'Microphone' | 'Speaker' | 'DSP' | 'Display' | 'TouchPanel' | 'Network' | 'UCHost' | 'Other';
export const kindOf = (name: string, category = ''): Kind => { const n = `${name} ${category}`.toLowerCase(); return /camera|bar/.test(n) ? 'Camera' : /microphone|mic\b|micceil|mictable|micwireless/.test(n) ? 'Microphone' : /loudspeaker|speaker/.test(n) ? 'Speaker' : /processor|dsp|amp/.test(n) ? 'DSP' : /display|led|projector/.test(n) ? 'Display' : /touch|panel|control|scheduler/.test(n) ? 'TouchPanel' : /switch|network|router/.test(n) ? 'Network' : /codec|compute|uc/.test(n) ? 'UCHost' : 'Other'; };
export type CapState = 'UNKNOWN' | 'DECLARED' | 'OBSERVED' | 'VERIFIED';
export function capsOf(kind: Kind): Record<string, CapState> {
  const c: Record<string, CapState> = {}; for (const k of FI13.capabilities) c[k] = 'UNKNOWN';
  if (kind === 'Camera') c['VideoCapture'] = 'DECLARED'; if (kind === 'Microphone') c['AudioCapture'] = 'DECLARED'; if (kind === 'Speaker') c['AudioPlayback'] = 'DECLARED'; if (kind === 'DSP') c['DSPTelemetry'] = 'DECLARED';
  if (kind === 'TouchPanel' || kind === 'Network' || kind === 'UCHost') c['DeviceTelemetry'] = 'DECLARED';
  return c;
}
export interface PlanDevice { AssetId: string; Name: string; Kind: Kind; Valid: boolean; Capabilities: Record<string, CapState>; ClaimDowngraded: string | null; Procedures: Array<{ Capability: string; State: CapState; Action: string; EvidenceKind: string; Executed: false }>; HardwareTested: false }
export interface Plan { Schema: string; ScriptVersion: string; State: 'PLAN_ONLY'; Devices: PlanDevice[]; AudioPairs: Array<{ PairId: string; MicrophoneAssetId: string; SpeakerAssetId: string; Status: 'NOT_TESTED'; EvidenceKind: 'DECLARED'; Executed: false; Procedure: readonly string[]; MeasuredSPL: null; MeasuredRT60: null; MeasuredFrequencyResponse: null }>; Monitoring: { Schema: string; CollectionIntervalMinutes: number; Mode: string; AllowedTargets: Array<{ AssetId: string; Name: string; CheckIcmp: true; IcmpRequired: boolean; Severity: 'CRITICAL' | 'HIGH'; Mandatory: true }>; LastObservation: null; ObservationState: 'NOT_RUN'; Note: string }; Limitations: readonly string[] }
/** The v1.3 plan: every capability DECLARED or UNKNOWN until a run observes it; a config claiming OBSERVED is written as DECLARED; nothing is executed. */
export function composePlan(devices: Array<{ id: string; name: string; category?: string; claimsObserved?: boolean }>): Plan {
  const Devices: PlanDevice[] = devices.map((d) => { const Kind = kindOf(d.name, d.category); const Capabilities = capsOf(Kind); return { AssetId: d.id, Name: d.name, Kind, Valid: true, Capabilities, ClaimDowngraded: d.claimsObserved ? 'a config that says OBSERVED is written as DECLARED: the script never trusts a claim of observation' : null, Procedures: Object.entries(Capabilities).filter(([, s]) => s !== 'UNKNOWN').map(([Capability, State]) => ({ Capability, State, Action: State === 'DECLARED' ? 'VERIFY_INTERFACE_FIRST' : 'DISCOVER_CAPABILITY', EvidenceKind: 'DECLARED_OR_UNKNOWN', Executed: false as const })), HardwareTested: false as const }; });
  const mics = Devices.filter((d) => d.Kind === 'Microphone'); const spks = Devices.filter((d) => d.Kind === 'Speaker'); const AudioPairs: Plan['AudioPairs'] = [];
  for (let i = 0; i < Math.min(mics.length, spks.length, 4); i++) AudioPairs.push({ PairId: `PAIR-${String(i + 1).padStart(2, '0')}`, MicrophoneAssetId: mics[i]!.AssetId, SpeakerAssetId: spks[i]!.AssetId, Status: 'NOT_TESTED', EvidenceKind: 'DECLARED', Executed: false, Procedure: FI13.pairProcedure, MeasuredSPL: null, MeasuredRT60: null, MeasuredFrequencyResponse: null });
  return { Schema: FI13.schema, ScriptVersion: FI13.scriptVersion, State: 'PLAN_ONLY', Devices, AudioPairs,
    Monitoring: { Schema: FI13.configSchema, CollectionIntervalMinutes: FI13.intervalMinutes, Mode: 'passive reachability (ICMP/TCP) and cloud HTTPS checks from the room host, read-only', AllowedTargets: Devices.filter((d) => ['TouchPanel', 'DSP', 'Camera', 'Network', 'UCHost'].includes(d.Kind)).map((d) => ({ AssetId: d.AssetId, Name: d.Name, CheckIcmp: true as const, IcmpRequired: d.Kind === 'TouchPanel', Severity: d.Kind === 'TouchPanel' ? 'CRITICAL' as const : 'HIGH' as const, Mandatory: true as const })), LastObservation: null, ObservationState: 'NOT_RUN', Note: 'In a browser no check runs: there is no network access. In a deployment the script writes a reachability log every 15 minutes; reachability ≠ verified user experience.' },
    Limitations: FI13.limitations };
}

// ------------------------------------------------------------------------------------------------------------ v1.4 Physical Validation
export const FIPV = Object.freeze({
  states: ['DRAFT', 'ELIGIBILITY_CHECK', 'SAFETY_PREFLIGHT', 'DRY_RUN', 'APPROVAL_PENDING', 'ARMED', 'RUNNING', 'ACQUIRED', 'QA_PENDING', 'REVIEW_PENDING', 'APPROVED', 'RETEST_REQUIRED', 'REJECTED'],
  exits: ['NOT_LICENSED', 'NOT_SUPPORTED', 'AWAITING_CONSENT', 'OCCUPIED', 'OUT_OF_CALIBRATION', 'PRECONDITION_FAILED', 'ABORTED', 'TIMED_OUT', 'DEVICE_FAULT', 'NOT_CONFIGURED', 'INCONCLUSIVE'],
  tiers: ['SUPPORTED_VERIFIED', 'READ_ONLY', 'PLAN_ONLY', 'NOT_SUPPORTED', 'NOT_CONFIGURED'],
  adapters: [
    { id: 'ADP-SLM', family: 'IAcousticInstrument', label: 'Sound level meter export (class 1/2)', tier: 'READ_ONLY', note: 'file import of a signed meter export; no capture' },
    { id: 'ADP-STI', family: 'IAcousticInstrument', label: 'STIPA / RT60 analyzer export', tier: 'READ_ONLY', note: 'file import; protocol must be declared' },
    { id: 'ADP-CAM', family: 'ICameraValidation', label: 'Camera PTZ bounded scan', tier: 'NOT_CONFIGURED', note: 'no vendor-validated driver in this build; PTZ angle readback ≠ optical FOV' },
    { id: 'ADP-DSP', family: 'IDspValidation', label: 'DSP supervised test route', tier: 'NOT_CONFIGURED', note: 'read-only routing/backup fingerprint only when configured; no test signal' },
    { id: 'ADP-SPK', family: 'IActiveValidationAdapter', label: 'Bounded loudspeaker test signal', tier: 'NOT_CONFIGURED', note: 'requires site-approved level limits and independent level observation' },
  ],
  licensePolicy: [
    { archetype: 'TWN', seatsFrom: 100, recommendation: 'professional acoustic survey recommended (STIPA, RT60, coverage); license optional — an independent qualified upload is always allowed', tier: 'premium' },
    { archetype: 'BRD', seatsFrom: 0, recommendation: 'camera FOV/preset scan and LAeq at seats useful; not required', tier: 'standard' },
    { archetype: 'EXE', seatsFrom: 0, recommendation: 'camera FOV/preset scan and LAeq at seats useful; not required', tier: 'standard' },
    { archetype: 'HUD', seatsFrom: 0, recommendation: 'not required; v1.3 monitoring and a Tier-1 field check suffice', tier: 'none' },
  ],
  stepLabel: { DRAFT: 'Proposal', ELIGIBILITY_CHECK: 'Eligibility', SAFETY_PREFLIGHT: 'Safety preflight', DRY_RUN: 'Dry run', APPROVAL_PENDING: 'Authorization', ARMED: 'Armed', RUNNING: 'Running', ACQUIRED: 'Acquired', QA_PENDING: 'QA', REVIEW_PENDING: 'Independent review', APPROVED: 'Approved', RETEST_REQUIRED: 'Retest required', REJECTED: 'Rejected' } as Record<string, string>,
});
export type PvState = typeof FIPV.states[number] | typeof FIPV.exits[number];
export interface PvTest { id: string; label: string; adapter: string; state?: 'ELIGIBLE' | 'NOT_CONFIGURED' }
export interface Session {
  id: string; roomId: string; archetype: string; state: PvState; terminal: boolean;
  points: Array<{ id: string; label: string }>; tests: PvTest[];
  protocol: { name: string; maxDurationMin: number; cooldownMin: number };
  safety: { occupancy: 'UNKNOWN' | 'UNOCCUPIED_CONFIRMED'; privacyNotice: boolean; localOperator: string | null; emergencyStop: 'NOT_VERIFIED' | 'VERIFIED_LOCAL'; levelLimit: number | null; rollback: string; watchdog: 'required'; rollbackBackup?: string };
  instrument: { model: string; serial: string; calibrationId: string; calibrationDue: string } | null;
  approvals: { protocol?: { by: string; at: string; levelLimit: number }; window?: { by: string; at: string; from: string; privacyNotice: boolean }; operator?: { by: string; at: string; present: true; qualified: true; mfa: boolean }; session?: { by: string; at: string } };
  eligibility: { license: string; at: string; eligibleTests: string[]; notConfigured: string[] } | null;
  dryRun: { at: string; preview: Array<{ point: string; tests: string[]; level: string; durationS: number }>; output: string } | null;
  results: Array<{ point: string; test: string; outcome: string; value: number | null; unit: string; simulated: true; note?: string }>;
  log: Array<{ at: string; state: string; text: string; by: string }>; exits: Array<{ at: string; from: string; exit: string; why: string }>; restore: string | null; simulated: boolean;
}
export type Refusal = { why: string[] };
export interface Actor { persona: string; can: (a: string | string[]) => boolean; now: string }
const go = (s: Session, a: Actor, to: PvState, why: string, extra: Partial<Session> = {}): Session => { const from = s.state; const exit = (FIPV.exits as readonly string[]).includes(to); return { ...s, ...extra, state: to, terminal: exit, exits: exit ? [...s.exits, { at: a.now, from, exit: to, why }] : s.exits, log: [...s.log, { at: a.now, state: to, text: why || `${from} → ${to}`, by: a.persona }] }; };
const note = (s: Session, a: Actor, text: string, extra: Partial<Session> = {}): Session => ({ ...s, ...extra, log: [...s.log, { at: a.now, state: s.state, text, by: a.persona }] });

export function createSession(id: string, roomId: string, archetype: string, points: Session['points'], tests: PvTest[], a: Actor): Session {
  const s: Session = { id, roomId, archetype, state: 'DRAFT', terminal: false, points, tests, protocol: { name: 'LAeq at seats + STIPA (declared)', maxDurationMin: 45, cooldownMin: 5 }, safety: { occupancy: 'UNKNOWN', privacyNotice: false, localOperator: null, emergencyStop: 'NOT_VERIFIED', levelLimit: null, rollback: 'presets + DSP backup before arming; restore verified after', watchdog: 'required' }, instrument: null, approvals: {}, eligibility: null, dryRun: null, results: [], log: [], exits: [], restore: null, simulated: true };
  return note(s, a, 'proposal created: points from the Lite model, protocol, adapters and safety plan');
}
/** A licence opens requests, never proofs: with none the v1.3 plan and an independent qualified upload remain available. */
export function eligibility(s: Session, a: Actor, licensed: boolean): Session | Refusal {
  if (!a.can(['protocol.approve', 'tests.verify.all', 'fipv.review', 'plan.compile'])) return { why: [`${a.persona} cannot check eligibility`] };
  if (s.state !== 'DRAFT') return { why: [`session is ${s.state}`] };
  let cur = go(s, a, 'ELIGIBILITY_CHECK', 'checking license, adapters, capability and site role');
  if (!licensed) return go(cur, a, 'NOT_LICENSED', `no Physical Validation license for ${s.archetype} rooms at this site — the v1.3 plan and an independent qualified upload remain available`);
  const tier = (id: string) => FIPV.adapters.find((x) => x.id === id)?.tier;
  const unsupported = cur.tests.filter((t) => !['SUPPORTED_VERIFIED', 'READ_ONLY'].includes(tier(t.adapter) || ''));
  if (unsupported.length === cur.tests.length) return go(cur, a, 'NOT_SUPPORTED', `no requested test has a supported adapter: ${unsupported.map((t) => `${t.id} needs ${t.adapter} (${tier(t.adapter) || 'unknown'})`).join('; ')}`);
  const tests = cur.tests.map((t) => ({ ...t, state: unsupported.some((u) => u.id === t.id) ? 'NOT_CONFIGURED' as const : 'ELIGIBLE' as const }));
  cur = { ...cur, tests, eligibility: { license: 'site licence (synthetic)', at: a.now, eligibleTests: tests.filter((t) => t.state === 'ELIGIBLE').map((t) => t.id), notConfigured: unsupported.map((t) => t.id) } };
  return go(cur, a, 'SAFETY_PREFLIGHT', `eligible: ${tests.filter((t) => t.state === 'ELIGIBLE').map((t) => t.id).join(', ')}${unsupported.length ? ` · not configured: ${unsupported.map((t) => t.id).join(', ')}` : ''}`);
}
export type PreflightInput = { step: 'protocol'; levelLimit: number } | { step: 'window'; occupied: boolean; from?: string; privacyNotice: boolean } | { step: 'operator'; present: boolean; qualified: boolean; mfa?: boolean } | { step: 'instrument'; instrument: { model: string; serial: string; calibrationId: string; calibrationDue: string } } | { step: 'estop'; verified: boolean };
/** The safety preflight: five independent approvals; some failures end the session (OCCUPIED, OUT_OF_CALIBRATION, AWAITING_CONSENT, PRECONDITION_FAILED). */
export function preflight(s: Session, a: Actor, i: PreflightInput): Session | Refusal | { missing: string[]; session: Session } {
  if (s.state !== 'SAFETY_PREFLIGHT') return { why: [`session is ${s.state}`] };
  let cur = s; const today = a.now.slice(0, 10);
  if (i.step === 'protocol') { if (!a.can('protocol.approve')) return { why: [`${a.persona} cannot approve the protocol (Systems Engineer)`] }; if (!(i.levelLimit > 0)) return { why: ['a site-approved level limit for this protocol is required (no universal safe volume)'] }; cur = note(cur, a, 'protocol approved with a level limit', { approvals: { ...cur.approvals, protocol: { by: a.persona, at: a.now, levelLimit: i.levelLimit } }, safety: { ...cur.safety, levelLimit: i.levelLimit } }); }
  else if (i.step === 'window') { if (!a.can(['window.approve', 'access.approve', 'occupancy.confirm'])) return { why: [`${a.persona} cannot reserve the window (Operations / Facilities)`] }; if (i.occupied) return go(cur, a, 'OCCUPIED', 'the room is booked/occupied in the proposed window: no active work; propose another window'); cur = note(cur, a, 'maintenance window reserved, occupancy confirmed', { approvals: { ...cur.approvals, window: { by: a.persona, at: a.now, from: i.from || 'next maintenance window', privacyNotice: i.privacyNotice } }, safety: { ...cur.safety, occupancy: 'UNOCCUPIED_CONFIRMED', privacyNotice: i.privacyNotice } }); }
  else if (i.step === 'operator') { if (!a.can(['work.accept', 'test.verify', 'work.evidence'])) return { why: [`${a.persona} cannot consent as operator (on-site technician / commissioning engineer)`] }; if (!i.present) return go(cur, a, 'AWAITING_CONSENT', 'no qualified operator physically present and consenting; the session waits'); if (!i.qualified) return go(cur, a, 'PRECONDITION_FAILED', 'the operator is not qualified for this protocol'); cur = note(cur, a, 'operator present and consenting', { approvals: { ...cur.approvals, operator: { by: a.persona, at: a.now, present: true, qualified: true, mfa: !!i.mfa } }, safety: { ...cur.safety, localOperator: a.persona } }); }
  else if (i.step === 'instrument') { if (!a.can(['work.evidence', 'test.verify', 'protocol.approve'])) return { why: [`${a.persona} cannot register the instrument`] }; const I = i.instrument; if (!I.model || !I.serial || !I.calibrationId || !I.calibrationDue) return { why: ['instrument model, serial, calibration id and due date are required'] }; if (I.calibrationDue < today) return go(cur, a, 'OUT_OF_CALIBRATION', `instrument ${I.serial}: calibration ${I.calibrationId} due ${I.calibrationDue} has passed`); cur = note(cur, a, 'instrument registered with current calibration', { instrument: I }); }
  else if (i.step === 'estop') { if (!a.can(['work.accept', 'test.verify', 'work.evidence'])) return { why: [`${a.persona} cannot verify the emergency stop`] }; if (!i.verified) return go(cur, a, 'PRECONDITION_FAILED', 'emergency stop not verified: active work cannot start'); cur = note(cur, a, 'emergency stop verified, backups taken', { safety: { ...cur.safety, emergencyStop: 'VERIFIED_LOCAL', rollbackBackup: 'presets and routing backed up (declared)' } }); }
  const missing: string[] = [];
  if (!cur.approvals.protocol) missing.push('protocol approval'); if (!cur.approvals.window) missing.push('maintenance window'); if (!cur.approvals.operator) missing.push('operator consent'); if (!cur.instrument) missing.push('instrument calibration'); if (cur.safety.emergencyStop !== 'VERIFIED_LOCAL') missing.push('emergency stop verification');
  return missing.length ? { missing, session: cur } : go(cur, a, 'DRY_RUN', 'preflight complete: dry run available');
}
export function dryRun(s: Session, a: Actor): Session | Refusal {
  if (s.state !== 'DRY_RUN') return { why: ['session is not at DRY_RUN'] }; if (!a.can(['work.accept', 'test.verify'])) return { why: [`${a.persona} cannot run the dry run`] };
  const preview = s.points.map((p) => ({ point: p.id, tests: s.tests.filter((t) => t.state === 'ELIGIBLE').map((t) => t.id), level: `≤ ${s.safety.levelLimit} dB(A) at the point`, durationS: 30 }));
  return go({ ...s, dryRun: { at: a.now, preview, output: 'none (dry run emits nothing)' } }, a, 'APPROVAL_PENDING', `dry run walked ${preview.length} points; awaiting the commissioning lead's authorization`);
}
export function authorize(s: Session, a: Actor, yes: boolean): Session | Refusal {
  if (s.state !== 'APPROVAL_PENDING') return { why: ['session is not awaiting approval'] }; if (!a.can(['tests.verify.all', 'fipv.review'])) return { why: [`${a.persona} cannot authorize sessions (Commissioning Lead)`] };
  return yes ? note(s, a, 'session authorized', { approvals: { ...s.approvals, session: { by: a.persona, at: a.now } } }) : go(s, a, 'PRECONDITION_FAILED', 'authorization refused');
}
/** Arming needs the consenting local operator and two explicit confirmations; without a configured adapter the build arms a labelled SIMULATION only. */
export function arm(s: Session, a: Actor, confirm1: boolean, confirm2: boolean, demoMode = true): Session | Refusal {
  if (s.state !== 'APPROVAL_PENDING' || !s.approvals.session) return { why: ['session is not authorized for arming'] };
  if (!a.can(['work.accept', 'test.verify'])) return { why: [`${a.persona} cannot arm`] };
  if (a.persona !== s.safety.localOperator && a.persona !== 'architect') return { why: ['only the consenting local operator can arm'] };
  if (!confirm1 || !confirm2) return { why: ['arming needs two explicit confirmations'] };
  if (!demoMode) return go(s, a, 'NOT_CONFIGURED', 'no adapter is configured in this build: a real session cannot be armed here');
  return go(s, a, 'ARMED', 'armed (SIMULATION — no adapter, no hardware; the run is a scripted demonstration)', { simulated: true });
}
export const BRANCHES = ['occupied', 'stale_calibration', 'no_operator', 'unsupported_adapter', 'disconnected', 'excessive_level', 'failing_test', 'timed_out', 'lost_heartbeat', 'estop'] as const;
export function run(s: Session, a: Actor, branch: typeof BRANCHES[number] | null = null): Session | Refusal {
  if (!['ARMED', 'RUNNING'].includes(s.state)) return { why: [`session is ${s.state}`] }; if (!a.can(['work.accept', 'test.verify', 'tests.verify.all'])) return { why: [`${a.persona} cannot step the session`] };
  let cur = s.state === 'ARMED' ? go(s, a, 'RUNNING', 'running (simulated): point 1') : s;
  const B: Record<string, [PvState, string]> = { occupied: ['OCCUPIED', 'occupancy sensor reports people in the room: output muted, session ended'], stale_calibration: ['OUT_OF_CALIBRATION', 'instrument calibration check failed at point of use'], no_operator: ['ABORTED', 'local operator presence lost: safe stop, restore requested'], unsupported_adapter: ['NOT_SUPPORTED', 'the adapter refused the requested capability'], disconnected: ['DEVICE_FAULT', 'instrument/adapter disconnected: safe stop'], excessive_level: ['ABORTED', `predicted level exceeds the approved limit (${s.safety.levelLimit} dB(A)): refused before emission`], failing_test: ['ACQUIRED', 'a test failed its acceptance: recorded as FAIL, session continues to acquisition'], timed_out: ['TIMED_OUT', `maximum session duration (${s.protocol.maxDurationMin} min) reached: safe stop`], lost_heartbeat: ['ABORTED', 'watchdog: heartbeat lost; safe stop, restore requested'], estop: ['ABORTED', 'EMERGENCY STOP pressed by the local operator: output terminated and verified'] };
  if (branch && B[branch]) { const [exit, why] = B[branch]!; if (branch === 'failing_test') { const p = cur.points[cur.results.length]; return go({ ...cur, results: [...cur.results, { point: p?.id || 'TP?', test: 'STIPA', outcome: 'FAIL', value: 0.42, unit: 'STI', simulated: true }] }, a, 'ACQUIRED', why, { restore: 'verified (simulated)' }); } return go(cur, a, exit, why, { restore: ['ABORTED', 'DEVICE_FAULT', 'TIMED_OUT', 'OCCUPIED'].includes(exit) ? 'safe-state restore requested; verify before leaving' : null }); }
  const p = cur.points[cur.results.length];
  if (!p) return go(cur, a, 'ACQUIRED', 'all points acquired (simulated); submit the instrument export for review', { restore: 'verified (simulated)' });
  const results = [...cur.results, { point: p.id, test: 'LAeq', outcome: 'ACQUIRED', value: null, unit: 'dB(A)', simulated: true as const, note: 'the simulator records no level: a value only exists in the instrument export' }];
  cur = note({ ...cur, results }, a, `point ${p.id} acquired (simulated)`);
  return results.length >= cur.points.length ? go(cur, a, 'ACQUIRED', 'all points acquired (simulated); submit the instrument export for review', { restore: 'verified (simulated)' }) : cur;
}
export function estop(s: Session, a: Actor): Session | Refusal {
  if (!['ARMED', 'RUNNING'].includes(s.state)) return { why: [`nothing to stop: session is ${s.state}`] };
  return go(s, a, 'ABORTED', 'EMERGENCY STOP: output terminated, termination verified, restore requested', { restore: 'safe-state restore requested; verify before leaving' });
}
export const isRefusal = (r: unknown): r is Refusal => !!r && typeof r === 'object' && Array.isArray((r as { why?: unknown }).why);
