/**
 * Assess one room against its accepted baseline across the seventeen dimensions.
 *
 * Ported from `assuranceOf` and `remedyOf` (2.5.4 src/57-derive-assure.js lines 29–136). The demonstrator reads its synthetic graph;
 * this port takes plain facts, so the same rules run on the starter's records, on a field survey, or on a monitoring feed later.
 * Rules kept from the demonstrator:
 *   - status precedence fail > drift > match (`worse`); a dimension with no devices of its kind is `na`;
 *   - a dimension with no evidence at all is `unknown` ("Assurance does not guess") — never `match`;
 *   - a GAP is a baseline that already missed the standard at handover: it is reported, but it is not drift;
 *   - what people report is `observed` (OBSERVED evidence), kept apart from what was measured, and names what would confirm it;
 *   - purpose drift when seats exceed the designed capacity by more than 15 %;
 *   - environment drift above 26 °C or 1,000 ppm CO₂;
 *   - remedy precedence: redesign (purpose drift) > replace (offline device past support) > minor (a failure, or a DEVICE / PERFORMANCE /
 *     NETWORK finding) > recommission (any other drift) > none.
 * Every proposed fix is a proposal: it requires an engineer's approval (authority `baseline.approve`) and is never executed here.
 */
import { DIMENSIONS, EXPERIENCE_KINDS, isOff, type Dimension, type DriftType, type EvidenceClass, type ExperienceKind, type Remedy, type Status } from './vocabulary.js';
import { layoutDiff, type Layout, type LayoutDiff } from './layout.js';

export const PURPOSE_OVER = 1.15;
export const ENV_MAX_C = 26;
export const ENV_MAX_CO2 = 1000;
export const ENV_MAX_NOISE_DBA = 40;
export const SIGNAL_WINDOW_DAYS = 30;
export const SIGNAL_MIN_REPORTS = 2;
export const APPROVER_AUTHORITY = 'baseline.approve';

export type DeviceState = 'Online' | 'Degraded' | 'Offline';
export interface DeviceFact {
  id: string; category: string; label?: string;
  /** Live state when a monitoring feed or a discovery reports it; null = not known. */
  state?: DeviceState | null;
  networked?: boolean;
  firmware?: string | null; fwBaseline?: string | null;
  /** 'Not validated' is drift; 'Behind baseline' is a gap (the room did not change; the campus baseline moved on). */
  fwState?: 'Validated' | 'Not validated' | 'Behind baseline' | null;
  supportEnded?: boolean;
}
/** A measured assurance check (e.g. a preset table read from a camera), as the demonstrator's AssuranceCheck records. */
export interface CheckFact { id: string; dimension: Dimension; driftType: DriftType; result: 'Match' | 'Drift' | 'Fail'; metric: string; baselineValue: string; currentValue: string }
export interface Baseline {
  id: string; version: number; signedAt: string; signedBy: string;
  devices: Array<{ id: string; category: string; label?: string }>;
  layout: Layout | null; capacity: number; configSignature: string | null;
  documents: string[];
  /** Standards the baseline itself missed at handover (gaps), by dimension. */
  gaps?: Partial<Record<Dimension, string>>;
  noiseDbA?: number | null;
}
export interface Current {
  now: string;
  devices: DeviceFact[];
  layout?: Layout | null;
  seats?: number | null;
  configSignature?: string | null;
  documentsMissing?: string[] | null;
  environment?: { tempC: number; co2: number; noiseDb?: number } | null;
  signals?: Array<{ kind: ExperienceKind; at: string }> | null;
  checks?: CheckFact[];
  power?: { panelOffline?: boolean; loadPct?: number } | null;
}
export interface Fix { label: string; kind: 'support' | 'recom' | 'restore' | 'run' | 'validate' | 'lite' | 'lite-opt'; requiresApproval: true; approverAuthority: string; checkId?: string }
export interface Row {
  k: Dimension; label: string; layer: string; status: Status; type: DriftType | null; ev: EvidenceClass;
  commissioned: string; current: string; ids: string[]; note: string; gap: string; fix: Fix | null;
}
export interface Assessment {
  baselineId: string; baselineVersion: number; rows: Row[];
  counts: Record<Status, number> & { gap: number };
  worst: 'fail' | 'drift' | 'observed' | 'match';
  findings: Row[]; types: DriftType[]; remedy: Remedy | null;
  /** How much of the room could be assessed: dimensions with evidence ÷ dimensions that apply. Never a probability. */
  coverage: { assessed: number; applicable: number; unknown: Dimension[] };
  diff: LayoutDiff | null;
}

const CATS: Partial<Record<Dimension, string[]>> = {
  signal: ['compute', 'switcher', 'display', 'ledwall', 'dsp', 'amp', 'encoder'], application: ['compute'], camera: ['camera', 'bar', 'board'],
  audio: ['micceil', 'micwireless', 'mictable', 'dsp', 'amp', 'speaker', 'bar', 'board'], display: ['display', 'ledwall', 'board'], control: ['touch', 'control'], scheduling: ['scheduler'], power: ['pdu'],
};

/** fail > drift > match (`worse` in the demonstrator). */
export function worse(...s: Array<'fail' | 'drift' | 'match'>): 'fail' | 'drift' | 'match' { return s.includes('fail') ? 'fail' : s.includes('drift') ? 'drift' : 'match'; }
const fix = (label: string, kind: Fix['kind'], checkId?: string): Fix => ({ label, kind, requiresApproval: true, approverAuthority: APPROVER_AUTHORITY, ...(checkId ? { checkId } : {}) });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function assess(base: Baseline, cur: Current): Assessment {
  const rows: Row[] = [];
  const checks = cur.checks || [];
  const acFor = (k: Dimension) => checks.filter((c) => c.dimension === k);
  const acState = (l: CheckFact[]): 'fail' | 'drift' | 'match' => (l.some((a) => a.result === 'Fail') ? 'fail' : l.some((a) => a.result === 'Drift') ? 'drift' : 'match');
  const known = (l: DeviceFact[]) => l.filter((d) => d.state != null);
  const stateOfDevs = (l: DeviceFact[]): 'fail' | 'drift' | 'match' => (l.some((d) => d.state === 'Offline') ? 'fail' : l.some((d) => d.state === 'Degraded') ? 'drift' : 'match');
  const devType = (l: DeviceFact[]): DriftType => (l.some((d) => d.state === 'Offline') ? 'DEVICE' : 'PERFORMANCE');
  const row = (k: Dimension, status: Status, o: Partial<Row>): Row => {
    const D = DIMENSIONS.find((d) => d[0] === k)!;
    const r: Row = { k, label: D[1], layer: D[2], status, type: null, ev: 'MEASURED', commissioned: '', current: '', ids: [], note: '', gap: base.gaps?.[k] || '', fix: null, ...o };
    if (!isOff(r.status)) { r.type = null; r.fix = null; }
    rows.push(r); return r;
  };
  const byId = new Map(cur.devices.map((d) => [d.id, d]));
  const baseIds = new Set(base.devices.map((d) => d.id));

  // 1 presence: the register against the baseline, then live state where known
  {
    const added = cur.devices.filter((d) => !baseIds.has(d.id)); const removed = base.devices.filter((d) => !byId.has(d.id));
    const off = cur.devices.filter((d) => d.state === 'Offline'); const ac = acFor('presence');
    const anyLive = known(cur.devices).length > 0 || ac.length > 0;
    const st: Status = off.length ? 'fail' : added.length || removed.length ? 'drift' : anyLive ? acState(ac) : 'unknown';
    row('presence', st, {
      type: off.length || removed.length || added.length ? 'DEVICE' : acState(ac) !== 'match' ? 'DEVICE' : null, ev: anyLive ? 'MEASURED' : added.length || removed.length ? 'INFERRED' : 'UNKNOWN',
      commissioned: `${plural(base.devices.length, 'device')} on the register at handover`,
      current: off.length ? `${plural(off.length, 'device')} offline` : removed.length ? `${plural(removed.length, 'device')} on the baseline no longer on the register` : added.length ? `${plural(added.length, 'device')} on the register that the baseline does not hold` : anyLive ? 'Every device on the register answering' : 'The register matches the baseline; whether the devices answer is not known without monitoring',
      ids: off.concat(added).map((d) => d.id).concat(removed.map((d) => d.id), ac.filter((a) => a.result !== 'Match').map((a) => a.id)),
      note: off.length ? 'An offline device is a failure of presence: Assurance cannot see it.' : added.length ? 'Installed under an approved design? Recommission to bring it into the baseline.' : '',
      fix: off.length ? fix('Send someone to the room', 'support') : added.length || removed.length ? fix('Recommission the room', 'recom') : null,
    });
  }
  // 2 network
  {
    const net = cur.devices.filter((d) => d.networked); const ac = acFor('network'); const dep = ac.find((a) => a.driftType === 'DEPENDENCY' && a.result !== 'Match');
    const st: Status = !net.length ? 'na' : ac.length ? acState(ac) : 'unknown';
    row('network', st, { type: dep ? 'DEPENDENCY' : 'NETWORK', ev: !net.length ? 'MEASURED' : dep ? 'INFERRED' : ac.length ? 'MEASURED' : 'UNKNOWN', commissioned: `${plural(net.length, 'networked device')}`, current: ac.find((a) => a.result !== 'Match')?.currentValue || (ac.length ? 'As commissioned' : 'Not assessed: no network check or discovery'), ids: ac.filter((a) => a.result !== 'Match').map((a) => a.id),
      note: dep ? 'The room depends on something that changed. It has not been checked since.' : '', fix: dep ? fix('Run the checks the change affects', 'run') : fix('Raise it with the network team', 'support') });
  }
  // 3 power
  {
    const pdu = cur.devices.filter((d) => CATS.power!.includes(d.category)); const p = cur.power;
    const st: Status = p == null && !known(pdu).length ? 'unknown' : (p?.panelOffline || pdu.some((d) => d.state === 'Offline')) ? 'fail' : ((p?.loadPct ?? 0) >= 85 || pdu.some((d) => d.state === 'Degraded')) ? 'drift' : 'match';
    row('power', st, { type: devType(pdu), ev: st === 'unknown' ? 'UNKNOWN' : 'MEASURED', commissioned: pdu.length ? 'A metered power unit' : 'The floor panel', current: p ? `Panel load ${p.loadPct ?? '—'}%` : 'No power record', ids: pdu.filter((d) => d.state && d.state !== 'Online').map((d) => d.id), fix: fix('Raise it with facilities', 'support') });
  }
  // 4 firmware: not validated = drift; behind the baseline = gap (the room has not drifted)
  {
    const withFw = cur.devices.filter((d) => d.fwState != null); const off = withFw.filter((d) => d.fwState === 'Not validated'); const behind = withFw.filter((d) => d.fwState === 'Behind baseline'); const ac = acFor('firmware');
    const st: Status = !withFw.length && !ac.length ? 'unknown' : worse(acState(ac), off.length ? 'drift' : 'match');
    row('firmware', st, { type: 'FIRMWARE', ev: st === 'unknown' ? 'UNKNOWN' : 'MEASURED', commissioned: 'Every device on the versions validated at handover',
      current: st === 'unknown' ? 'Not assessed: no firmware inventory' : off.length ? `${off.length} of ${withFw.length} on a version nobody validated in this room: ${off.slice(0, 3).map((d) => `${d.category} ${d.firmware} (baseline ${d.fwBaseline})`).join('; ')}` : 'Every device on the baseline',
      ids: off.map((d) => d.id).concat(ac.filter((a) => a.result !== 'Match').map((a) => a.id)),
      gap: behind.length ? `${plural(behind.length, 'device')} still run${behind.length === 1 ? 's' : ''} the version that was commissioned, and the baseline has moved on: an update is due. The room has not drifted.` : base.gaps?.firmware || '',
      fix: fix('Validate the version and recommission', 'recom') });
  }
  // 5 configuration signature
  {
    const ac = acFor('configuration'); const c0 = base.configSignature; const c1 = cur.configSignature;
    const st: Status = c0 == null || c1 == null ? (ac.length ? acState(ac) : 'unknown') : worse(acState(ac), c0 === c1 ? 'match' : 'drift');
    row('configuration', st, { type: 'CONFIGURATION', ev: st === 'unknown' ? 'UNKNOWN' : 'MEASURED', commissioned: c0 ? `Signature ${c0}` : 'No signature taken at handover', current: c1 ? `Signature ${c1}${c0 && c0 !== c1 ? ': differs' : ': unchanged'}` : 'Not read', ids: ac.filter((a) => a.result !== 'Match').map((a) => a.id),
      note: st === 'drift' ? 'The signature says that settings differ. The functional rows say which, and what it does to the room.' : '', fix: fix('Restore the commissioned value, or recommission with the new one', 'recom') });
  }
  // 6–12 functional and operational dimensions from device state and measured checks
  for (const k of ['signal', 'application', 'camera', 'audio', 'display', 'control', 'scheduling'] as Dimension[]) {
    const inBase = base.devices.filter((d) => CATS[k]!.includes(d.category)); const devs = cur.devices.filter((d) => CATS[k]!.includes(d.category)); const ac = acFor(k);
    const evidence = known(devs).length > 0 || ac.length > 0;
    const st: Status = !inBase.length && !devs.length ? 'na' : !evidence ? 'unknown' : worse(stateOfDevs(known(devs)), acState(ac));
    const bad = devs.filter((d) => d.state && d.state !== 'Online'); const drift = ac.find((a) => a.result !== 'Match');
    row(k, st, { type: drift ? drift.driftType : devType(bad), ev: st === 'na' ? 'MEASURED' : evidence ? 'MEASURED' : 'UNKNOWN', commissioned: drift?.baselineValue || 'As commissioned',
      current: st === 'unknown' ? 'Not assessed: no device state or measured check' : drift ? drift.currentValue : bad.length ? `${bad.map((d) => d.label || d.category).join(', ')} ${bad.some((d) => d.state === 'Offline') ? 'offline' : 'degraded'}` : 'As commissioned',
      ids: bad.map((d) => d.id).concat(ac.filter((a) => a.result !== 'Match').map((a) => a.id)),
      fix: drift && drift.result === 'Drift' ? fix('Restore the commissioned setting', 'restore', drift.id) : bad.length ? fix('Send someone to the room', 'support') : fix('Recommission the room', 'recom') });
  }
  // 13 documentation: newly missing documents are drift; documents missing since handover are a gap
  {
    const ac = acFor('documentation'); const miss = cur.documentsMissing;
    const newMiss = (miss || []).filter((d) => base.documents.includes(d)); const neverHad = (miss || []).filter((d) => !base.documents.includes(d));
    const st: Status = miss == null && !ac.length ? 'unknown' : worse(acState(ac), newMiss.length ? 'drift' : 'match');
    row('documentation', st, { type: 'DOCUMENTATION', ev: st === 'unknown' ? 'UNKNOWN' : 'OBSERVED', commissioned: `${plural(base.documents.length, 'document')} on record`, current: st === 'unknown' ? 'Not assessed' : newMiss.length ? `Missing since handover: ${newMiss.join(', ')}` : 'Every document present',
      gap: neverHad.length ? `${plural(neverHad.length, 'document')} missing since handover: a gap in the record, not drift.` : base.gaps?.documentation || '', fix: fix('Ask for the record to be corrected', 'validate') });
  }
  // 14 spatial: needs a survey of the current layout; without one, not discoverable over the network
  let diff: LayoutDiff | null = null;
  {
    const ac = acFor('spatial');
    if (base.layout && cur.layout) diff = layoutDiff(base.layout, cur.layout);
    const changed = !!diff && (diff.moved.length > 0 || diff.added.length > 0 || diff.removed.length > 0 || diff.seatsWas !== diff.seatsNow || diff.seatsMoved > 0);
    const st: Status = !diff && !ac.length ? 'unknown' : worse(acState(ac), changed ? 'drift' : 'match');
    const far = diff?.moved.slice().sort((a, b) => b.d - a.d)[0];
    row('spatial', st, { type: 'SPATIAL', ev: diff ? 'MEASURED' : ac.length ? 'MEASURED' : 'UNKNOWN', commissioned: base.layout ? `Seat map: ${plural(diff?.seatsWas ?? base.layout.seats ?? 0, 'seat')}` : 'No seat map at handover',
      current: !diff ? 'Not discoverable over the network, and no survey since commissioning' : changed ? [diff.moved.length ? `${plural(diff.moved.length, 'object')} moved${far ? ` (up to ${far.d.toFixed(1)} m)` : ''}` : '', diff.added.length ? `${diff.added.length} added` : '', diff.removed.length ? `${diff.removed.length} removed` : '', diff.seatsWas !== diff.seatsNow ? `${diff.seatsNow} seats where the seat map shows ${diff.seatsWas}` : '', diff.seatsMoved ? `${plural(diff.seatsMoved, 'seat')} moved` : ''].filter(Boolean).join('; ') : 'Everything where the seat map shows it',
      ids: diff ? diff.moved.map((m) => m.o.id).concat(diff.added.map((o) => o.id), diff.removed.map((o) => o.id)) : [], fix: fix('Recommission the room', 'recom') });
  }
  // 15 purpose: seats beyond the designed capacity by more than 15 %
  {
    const seats = cur.seats ?? diff?.seatsNow ?? null; const ac = acFor('purpose');
    const over = seats != null && seats > base.capacity * PURPOSE_OVER;
    const st: Status = seats == null && !ac.length ? 'unknown' : worse(acState(ac), over ? 'drift' : 'match');
    row('purpose', st, { type: 'PURPOSE', ev: seats == null ? (ac.length ? 'MEASURED' : 'UNKNOWN') : 'MEASURED', commissioned: `Designed for ${base.capacity}`, current: seats == null ? 'Seat count not known' : `${seats} seats${over ? '; the technology is unchanged' : ', used as designed'}`,
      note: over ? 'Room purpose and capacity drift: the physical use has moved beyond what the commissioned technology was designed to support.' : '', fix: fix('Model the use in Lite', 'lite-opt') });
  }
  // 16 environment
  {
    const e = cur.environment; const hot = !!e && (e.tempC > ENV_MAX_C || e.co2 > ENV_MAX_CO2);
    const noiseGap = base.noiseDbA != null && base.noiseDbA > ENV_MAX_NOISE_DBA ? `Background noise was ${base.noiseDbA} dBA at handover, above the ${ENV_MAX_NOISE_DBA} dBA standard: a deficiency of the baseline, not drift.` : '';
    const st: Status = !e ? 'unknown' : hot ? 'drift' : 'match';
    row('environment', st, { type: 'PERFORMANCE', ev: e ? 'MEASURED' : 'UNKNOWN', commissioned: base.noiseDbA != null ? `Background noise ${base.noiseDbA} dBA at handover` : 'Not measured at handover', current: e ? `${e.tempC} °C, ${e.co2} ppm CO₂${e.noiseDb != null ? `, ${e.noiseDb} dBA` : ''}` : 'No sensor in this room',
      gap: noiseGap || base.gaps?.environment || '', note: !e ? 'No sensor and no measurement: Assurance does not guess.' : hot ? 'Outside the comfort band.' : '', fix: fix('Raise it with facilities', 'support') });
  }
  // 17 experience: what people report, kept apart from what was measured
  {
    const sig = cur.signals;
    if (sig == null) row('experience', 'unknown', { ev: 'UNKNOWN', commissioned: 'Passed the operational walk-through', current: 'No reporting channel connected' });
    else {
      const since = Date.parse(cur.now) - SIGNAL_WINDOW_DAYS * 86400000; const recent = sig.filter((s) => Date.parse(s.at) > since);
      const by = EXPERIENCE_KINDS.map((K) => ({ K, n: recent.filter((s) => s.kind === K[0]).length })).filter((x) => x.n);
      const st: Status = by.some((x) => x.n >= SIGNAL_MIN_REPORTS) ? 'observed' : 'match';
      const top = by.slice().sort((a, b) => b.n - a.n)[0];
      const confirmed = top ? rows.find((r) => r.k === top.K[2]) : undefined;
      row('experience', st, { ev: 'OBSERVED', commissioned: 'Passed the operational walk-through', current: recent.length ? by.map((x) => `${x.K[1].toLowerCase()} ×${x.n}`).join(', ') : `Nothing reported in the last ${SIGNAL_WINDOW_DAYS} days`,
        note: top && st === 'observed' ? (confirmed && (isOff(confirmed.status) || confirmed.gap) ? `“${top.K[1]}” agrees with what Assurance finds in ${confirmed.label.toLowerCase()}.` : `“${top.K[1]}” is observed, not measured: ${top.K[3].charAt(0).toLowerCase()}${top.K[3].slice(1)} would confirm it.`) : '' });
    }
  }

  const counts = { match: 0, drift: 0, fail: 0, na: 0, unknown: 0, observed: 0, gap: rows.filter((r) => r.gap).length } as Assessment['counts'];
  for (const r of rows) counts[r.status] += 1;
  const findings = rows.filter((r) => isOff(r.status));
  const types = [...new Set(findings.map((r) => r.type).filter((t): t is DriftType => !!t))];
  const worst: Assessment['worst'] = counts.fail ? 'fail' : counts.drift ? 'drift' : counts.observed ? 'observed' : 'match';
  const applicable = rows.filter((r) => r.status !== 'na');
  const unknown = applicable.filter((r) => r.status === 'unknown').map((r) => r.k);
  const deadPastSupport = cur.devices.some((d) => d.state === 'Offline' && d.supportEnded);
  const remedy: Remedy | null = rows.find((r) => r.k === 'purpose')!.status === 'drift' ? 'redesign'
    : deadPastSupport ? 'replace'
      : counts.fail || findings.some((f) => f.type && ['DEVICE', 'PERFORMANCE', 'NETWORK'].includes(f.type)) ? 'minor'
        : counts.drift ? 'recommission' : null;
  return { baselineId: base.id, baselineVersion: base.version, rows, counts, worst, findings, types, remedy, coverage: { assessed: applicable.length - unknown.length, applicable: applicable.length, unknown }, diff };
}

/** Every baseline a room has had, newest first: a new baseline archives the old one, it never overwrites it (`baselinesOf`). */
export function baselinesNewestFirst<B extends { version: number }>(list: B[]): B[] { return [...list].sort((a, b) => b.version - a.version); }
