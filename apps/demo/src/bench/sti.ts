/**
 * The speech-intelligibility (STI) workflow of the instrument bench (40/10 directive: "an STI workflow with project-policy thresholds" and
 * "an intelligibility exception record").
 *
 * STI values come from an STI meter measuring at each listener position (the direct method with a STIPA test signal is the usual field
 * practice). This bench does not compute STI and does not reproduce the standard: it records what the meter reported, position by
 * position, with the meter and the conditions, and compares the result with the thresholds the PROJECT's policy sets (a policy is the
 * project's choice, named and versioned; nothing here presents a threshold as the standard's requirement).
 *
 * Rules:
 *   - every reading names its position, its value (0.00–1.00), its meter and whether the room was occupied;
 *   - a reading from a phone or an app is indicative only, never commissioning evidence;
 *   - the policy says the minimum at each position, the minimum mean, and how many positions are needed; too few positions refuse a verdict;
 *   - readings taken in mixed conditions (some occupied, some not) are flagged, never averaged silently;
 *   - a shortfall may be carried by an intelligibility exception record: a reason, the positions it covers, compensating measures, an
 *     expiry date, a requester and a DIFFERENT approver — and never where the policy marks the system as life-safety (voice alarm /
 *     emergency announcements), which no exception carries.
 */
export type Chain = 'meter-calibrated' | 'meter' | 'phone-app';
export interface Reading { position: string; sti: number; occupied: boolean; meter: string; chain: Chain; at: string }
export interface Policy { id: string; name: string; minEach: number; minMean: number; minPositions: number; lifeSafety: boolean }
export const POLICY_PRESETS: Policy[] = [
  { id: 'POL-STI-MEET-1', name: 'Meeting and conference rooms (project policy)', minEach: 0.55, minMean: 0.6, minPositions: 3, lifeSafety: false },
  { id: 'POL-STI-LECT-1', name: 'Lecture and training rooms (project policy)', minEach: 0.55, minMean: 0.62, minPositions: 4, lifeSafety: false },
  { id: 'POL-STI-VA-1', name: 'Voice alarm coverage (project policy, life-safety)', minEach: 0.45, minMean: 0.5, minPositions: 4, lifeSafety: true },
];
export interface Evaluation {
  readings: Array<Reading & { ok: boolean }>; mean: number | null; min: number | null; n: number;
  verdict: 'MEETS_POLICY' | 'BELOW_POLICY' | 'NO_VERDICT'; why: string[]; flags: string[]; indicative: boolean; short: string[];
}

export function parseReadings(text: string, defaults: { meter: string; chain: Chain; occupied: boolean; at: string }): { readings: Reading[]; errors: string[] } {
  const readings: Reading[] = []; const errors: string[] = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (!lines.length) return { readings, errors: ['the file has no readings'] };
  const head = lines[0]!.toLowerCase(); const hasHead = !lines[0]!.split(/[,;\t]/).slice(1).some((x) => x.trim() !== '' && Number.isFinite(Number(x)));; /* a first row with no number in it is a header */ const cols = hasHead ? head.split(/[,;\t]/).map((c) => c.trim()) : ['position', 'sti'];
  const ix = (n: string) => cols.findIndex((c) => c === n || c.startsWith(n));
  const ip = ix('position'), is = ix('sti'), io = ix('occupied'), im = ix('meter');
  if (ip < 0 || is < 0) return { readings, errors: ['the header names no position or no sti column'] };
  lines.slice(hasHead ? 1 : 0).forEach((l, k) => {
    const c = l.split(/[,;\t]/).map((x) => x.trim()); const line = k + (hasHead ? 2 : 1);
    if (/^[=+@]/.test(c[ip] || '')) { errors.push(`line ${line}: the position looks like a spreadsheet formula and is refused`); return; }
    const v = Number(c[is]); if (!c[ip]) { errors.push(`line ${line}: no position`); return; }
    if (!Number.isFinite(v) || v < 0 || v > 1) { errors.push(`line ${line}: STI “${c[is]}” is not a value from 0.00 to 1.00`); return; }
    readings.push({ position: c[ip]!.slice(0, 40), sti: Math.round(v * 100) / 100, occupied: io >= 0 ? /^(y|yes|true|1|occupied)$/i.test(c[io] || '') : defaults.occupied, meter: (im >= 0 && c[im]) || defaults.meter, chain: defaults.chain, at: defaults.at });
  });
  if (readings.length > 200) return { readings: [], errors: ['at most 200 readings in one file'] };
  return { readings, errors };
}

export function evaluate(rs: Reading[], p: Policy): Evaluation {
  const why: string[] = []; const flags: string[] = [];
  const n = rs.length; const mean = n ? Math.round((rs.reduce((s, r) => s + r.sti, 0) / n) * 100) / 100 : null; const min = n ? Math.min(...rs.map((r) => r.sti)) : null;
  const readings = rs.map((r) => ({ ...r, ok: r.sti >= p.minEach }));
  const occ = new Set(rs.map((r) => r.occupied)); if (occ.size > 1) flags.push('the readings mix occupied and unoccupied conditions: compare like with like');
  const dupes = rs.map((r) => r.position).filter((x, i, a) => a.indexOf(x) !== i); if (dupes.length) flags.push(`positions measured more than once: ${[...new Set(dupes)].join(', ')}`);
  const indicative = rs.some((r) => r.chain === 'phone-app');
  if (indicative) flags.push('a reading from a phone or an app is indicative only, not commissioning evidence');
  if (rs.some((r) => r.chain === 'meter')) flags.push('a meter without a calibration on file: attach the calibration before these readings stand as evidence');
  if (n < p.minPositions) return { readings, mean, min, n, verdict: 'NO_VERDICT', why: [`the policy needs at least ${p.minPositions} positions; ${n} measured`], flags, indicative, short: [] };
  const short = readings.filter((r) => !r.ok).map((r) => r.position);
  if (short.length) why.push(`${short.length} position${short.length === 1 ? '' : 's'} below ${p.minEach.toFixed(2)}: ${short.join(', ')}`);
  if (mean !== null && mean < p.minMean) why.push(`the mean ${mean.toFixed(2)} is below ${p.minMean.toFixed(2)}`);
  return { readings, mean, min, n, verdict: why.length ? 'BELOW_POLICY' : 'MEETS_POLICY', why, flags, indicative, short };
}

export interface ExceptionRecord { id: string; policy: string; positions: string[]; reason: string; measures: string; expires: string; requestedBy: string; approvedBy: string | null; at: string; approvedAt: string | null }
/** check an intelligibility exception before it is requested; then before it is approved */
export function exceptionRefusal(e: Omit<ExceptionRecord, 'id' | 'approvedBy' | 'approvedAt'>, p: Policy, ev: Evaluation, today: string): string[] {
  const why: string[] = [];
  if (p.lifeSafety) why.push('the policy marks this system as life-safety: no exception carries an intelligibility shortfall in voice alarm or emergency announcements');
  if (ev.verdict !== 'BELOW_POLICY') why.push('an exception is for a measured shortfall; there is none to carry');
  if (ev.indicative) why.push('indicative readings (phone or app) cannot found an exception: measure with a meter first');
  if (e.reason.trim().length < 20) why.push('the reason says why the shortfall is acceptable (at least a sentence)');
  if (e.measures.trim().length < 10) why.push('the compensating measures are stated');
  if (!e.positions.length || e.positions.some((x) => !ev.short.includes(x))) why.push('the exception covers the positions below the policy, and only those');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.expires) || e.expires <= today.slice(0, 10)) why.push('an exception expires on a date in the future');
  else if ((Date.parse(e.expires) - Date.parse(today.slice(0, 10))) / 864e5 > 366) why.push('an exception runs at most a year, then is reviewed');
  return why;
}
export function approvalRefusal(e: ExceptionRecord, approver: string): string[] {
  const why: string[] = [];
  if (e.approvedBy) why.push(`already approved by ${e.approvedBy}`);
  if (approver === e.requestedBy) why.push('the requester does not approve their own exception (separation of duties)');
  return why;
}
