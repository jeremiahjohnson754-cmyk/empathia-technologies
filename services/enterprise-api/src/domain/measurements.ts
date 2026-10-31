/**
 * Measurements with provenance (ADR-0004). A value is recorded with its unit, method, instrument and calibration state, time, location,
 * source, uncertainty and provenance; provenance never changes. Rules enforced here and by the database:
 *   - a FIELD_MEASURED value needs an instrument; only a FIELD_MEASURED value from a CALIBRATED instrument can be VERIFIED;
 *   - SIMULATED, INFERRED, OBSERVED and DESIGN_SPECIFIED values are never promoted: verifying one is refused and audited;
 *   - a level derived from a digital file (dBFS) is never recorded as a sound pressure level (dB SPL / dB(A)): refused;
 *   - the verifier is not the recorder (database CHECK as well);
 *   - the room must be within the caller's site scope.
 */
import type { RequestContext } from '../auth/context.js';
import { ApiError, invalid, notFound } from '../http/errors.js';
import { findRoom } from './rooms.js';
import { evidenceContent } from './commissioning.js';
import type { ObjectStore } from '../storage/objectStore.js';

export const PROVENANCE = ['DESIGN_SPECIFIED', 'SIMULATED', 'INFERRED', 'OBSERVED', 'FIELD_MEASURED'] as const;
export const RECORD_AUTHORITIES = ['work.evidence', 'field.scan', 'test.verify', 'tests.verify.all', 'fi.plan', 'fi.monitor', 'fipv.operate', 'lite.edit'];
export const VERIFY_AUTHORITIES = ['tests.verify.all', 'test.verify', 'customer.accept', 'test.verify.audio', 'test.verify.video', 'test.verify.control'];   // the result verifiers (commissioning.ts) plus the discipline verifiers
const SPL_UNITS = /^db ?\(?[acz]?\)?$|^db ?spl$/i;

export interface MeasurementInput { metric: string; value: number; unit: string; method: string; instrumentId?: string; calibrationStatus?: string; calibrationDue?: string; measuredAt: string; location: string; source: string; provenance: string; uncertainty?: number; uncertaintyUnit?: string; testResultId?: string }

export async function record(ctx: RequestContext, ref: string, m: MeasurementInput) {
  await ctx.require(RECORD_AUTHORITIES, 'record a measurement', { type: 'Room', id: ref });
  if (!PROVENANCE.includes(m.provenance as never)) throw invalid(`provenance is one of ${PROVENANCE.join(', ')}`);
  if (Number.isNaN(Date.parse(m.measuredAt))) throw invalid('measuredAt must be a date-time');
  if (m.provenance === 'FIELD_MEASURED' && !m.instrumentId) throw invalid('a field measurement names its instrument');
  if (/dbfs/i.test(m.method) || /dbfs/i.test(m.source) || /dbfs/i.test(m.unit)) { if (SPL_UNITS.test(m.unit.replace(/\s/g, '')) || /spl|laeq|lcpeak/i.test(m.metric)) throw new ApiError('rule_refused', 'a dBFS level from a digital file is not a sound pressure level: record it in dBFS, or measure with a calibrated meter'); }
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const r = await q.query<{ id: string }>(`INSERT INTO app.measurement (tenant_id, room_id, test_result_id, metric, value, unit, method, instrument_id, calibration_status, calibration_due, measured_at, location, source, provenance, uncertainty, uncertainty_unit, recorded_by, recorded_role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [ctx.p.tenantId, room.id, m.testResultId || null, m.metric, m.value, m.unit, m.method, m.instrumentId || null, m.calibrationStatus || (m.provenance === 'FIELD_MEASURED' ? 'UNKNOWN' : 'NOT_APPLICABLE'), m.calibrationDue || null, m.measuredAt, m.location, m.source, m.provenance, m.uncertainty ?? null, m.uncertaintyUnit || null, ctx.p.personId, ctx.p.role]);
    await ctx.audit(q, 'measurement.record', 'ALLOWED', { type: 'Measurement', id: r.rows[0]!.id }, { room: room.code, metric: m.metric, provenance: m.provenance });
    return { id: r.rows[0]!.id, provenance: m.provenance, approvalState: 'UNREVIEWED' };
  });
}

export async function list(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => { const room = await findRoom(ctx, q, ref); return { room: room.code, items: (await q.query('SELECT id, metric, value, unit, method, instrument_id, import_id, import_row, calibration_status, calibration_due, measured_at, location, source, provenance, uncertainty, uncertainty_unit, approval_state, approved_by, approved_at, approval_note, recorded_by, recorded_role, test_result_id FROM app.measurement WHERE room_id = $1 ORDER BY measured_at DESC', [room.id])).rows }; });
}

export async function verify(ctx: RequestContext, id: string, body: { decision: 'VERIFIED' | 'REJECTED'; note?: string }) {
  await ctx.require(VERIFY_AUTHORITIES, 'verify a measurement', { type: 'Measurement', id });
  return ctx.tx(async (q) => {
    const m = (await q.query<{ room_id: string; provenance: string; calibration_status: string; recorded_by: string; approval_state: string }>('SELECT room_id, provenance, calibration_status, recorded_by, approval_state FROM app.measurement WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!m) throw notFound(`measurement ${id}`);
    await findRoom(ctx, q, m.room_id);   // site scope
    if (m.approval_state !== 'UNREVIEWED') throw new ApiError('rule_refused', `the measurement is already ${m.approval_state}; record a new one`);
    await ctx.separate('measurement.verify', { type: 'Measurement', id }, [m.recorded_by], 'a measurement');
    if (body.decision === 'VERIFIED') {
      if (m.provenance !== 'FIELD_MEASURED') await ctx.refuse('measurement.verify', { type: 'Measurement', id }, [`a ${m.provenance} value is never verified as a field measurement`]);
      if (m.calibration_status !== 'CALIBRATED') await ctx.refuse('measurement.verify', { type: 'Measurement', id }, [`the instrument's calibration is ${m.calibration_status}; only a CALIBRATED instrument's value is verified`]);
    }
    await q.query('UPDATE app.measurement SET approval_state = $2, approved_by = $3, approved_at = now(), approval_note = $4 WHERE id = $1', [id, body.decision, ctx.p.personId, body.note || null]);
    if (body.decision === 'VERIFIED') await ctx.emit(q, 'field.measurement_verified', { type: 'Measurement', id, rev: 2 }, { measurementId: id, reviewerId: ctx.p.personId });
    await ctx.audit(q, 'measurement.verify', 'ALLOWED', { type: 'Measurement', id }, { decision: body.decision });
    return { id, approvalState: body.decision };
  });
}

// ------------------------------------------------------------------------------------------------ instrument-data import (ADR-0011)
export interface ImportInput { evidenceId: string; instrumentId: string; instrumentModel?: string; calibrationRef: string; calibrationDue: string; method: string; uncertainty?: number; uncertaintyUnit?: string; dryRun?: boolean }
const REQUIRED_COLUMNS = ['metric', 'value', 'unit', 'measured_at', 'location'];
const MAX_ROWS = 2000; const MAX_BYTES = 1_000_000;

/** RFC 4180-style CSV: quoted fields, doubled quotes, CRLF or LF. Returns rows of fields; no type guessing. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i += 1; } else q = false; } else f += ch; continue; }
    if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i += 1; row.push(f); f = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = []; } else f += ch;
  }
  row.push(f); if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** Validate every row; nothing is written unless every row is valid. Each accepted value is FIELD_MEASURED, traceable to the file's
 *  SHA-256 and its row, the instrument, the calibration certificate and due date (CALIBRATED only when measured on or before the due
 *  date — a declared certificate, not a checked one), the method and the uncertainty. Verification stays a separate, independent step. */
export async function importFile(ctx: RequestContext, store: ObjectStore, ref: string, b: ImportInput) {
  await ctx.require(RECORD_AUTHORITIES, 'import instrument measurements', { type: 'Room', id: ref });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.calibrationDue) || Number.isNaN(Date.parse(b.calibrationDue))) throw invalid('calibrationDue is a date (YYYY-MM-DD)');
  const file = await evidenceContent(ctx, store, b.evidenceId);   // site scope, hash re-verified against the stored object, read audited
  if (!/^text\/(csv|plain)\b/.test(file.mediaType)) throw invalid(`the file is ${file.mediaType}; an instrument export is imported as CSV (text/csv)`);
  if (file.data.length > MAX_BYTES) throw invalid(`the file is larger than ${MAX_BYTES} bytes`);
  const rows = parseCsv(file.data.toString('utf8').replace(/^﻿/, ''));
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !head.includes(c));
  if (missing.length) throw invalid(`the header row lacks ${missing.join(', ')} (required: ${REQUIRED_COLUMNS.join(', ')}; optional: uncertainty)`);
  if (!rows.length) throw invalid('the file has a header but no rows');
  if (rows.length > MAX_ROWS) throw invalid(`at most ${MAX_ROWS} rows per import`);
  const col = (r: string[], k: string) => (r[head.indexOf(k)] ?? '').trim();
  const now = Date.now(); const due = Date.parse(`${b.calibrationDue}T23:59:59Z`);
  const errors: Array<{ row: number; reasons: string[] }> = []; const ok: Array<{ row: number; metric: string; value: number; unit: string; measuredAt: string; location: string; uncertainty: number | null; calibrated: boolean }> = [];
  rows.forEach((r, i) => {
    const n = i + 2; const why: string[] = [];   // row numbers as a spreadsheet shows them (the header is row 1)
    const metric = col(r, 'metric'); const unit = col(r, 'unit'); const location = col(r, 'location'); const at = col(r, 'measured_at'); const vRaw = col(r, 'value'); const uRaw = head.includes('uncertainty') ? col(r, 'uncertainty') : '';
    if (r.length !== head.length) why.push(`${r.length} fields where the header has ${head.length}`);
    if (!/^[a-z][a-z0-9_]{1,60}$/.test(metric)) why.push('metric is a lower-case identifier (e.g. spl_laeq)');
    const value = Number(vRaw); if (vRaw === '' || !Number.isFinite(value)) why.push(`value "${vRaw}" is not a number`);
    if (!unit || unit.length > 20) why.push('unit is 1–20 characters');
    if (!location || location.length > 120) why.push('location is 1–120 characters');
    const t = Date.parse(at); if (!at || Number.isNaN(t) || !/T|\s\d{1,2}:\d{2}/.test(at)) why.push(`measured_at "${at}" is not a date-time`); else if (t > now + 5 * 60_000) why.push('measured_at is in the future');
    if (/dbfs/i.test(unit) && /spl|laeq|lcpeak|la_?max/i.test(metric)) why.push('a dBFS level is not a sound pressure level');
    const unc = uRaw === '' ? null : Number(uRaw); if (uRaw !== '' && (!Number.isFinite(unc) || unc! < 0)) why.push(`uncertainty "${uRaw}" is not a non-negative number`);
    if (why.length) errors.push({ row: n, reasons: why });
    else ok.push({ row: n, metric, value, unit, measuredAt: new Date(t).toISOString(), location, uncertainty: unc ?? (b.uncertainty ?? null), calibrated: t <= due });
  });
  const calibrated = ok.filter((x) => x.calibrated).length;
  const report = { file: { name: file.fileName, rows: rows.length }, accepted: errors.length ? 0 : ok.length, rejected: errors.length, errors: errors.slice(0, 100), calibrated, expiredCalibration: ok.length - calibrated,
    note: errors.length ? 'Nothing was imported: every row must be valid.' : `${ok.length} FIELD_MEASURED value(s), ${calibrated} measured within the declared calibration; each awaits independent verification.` };
  if (b.dryRun) {   // a check: nothing is written, nothing is refused — but a file already imported for this room says so
    const prior = await ctx.tx(async (q) => { const room = await findRoom(ctx, q, ref); return (await q.query<{ id: string }>('SELECT id FROM app.measurement_import WHERE room_id = $1 AND evidence_id = $2', [room.id, b.evidenceId])).rows[0]?.id || null; });
    return { dryRun: true, ...report, alreadyImported: prior, ...(prior ? { note: `This file was already imported for this room (import ${prior}); importing it again is refused.` } : {}) };
  }
  if (errors.length) await ctx.refuse('measurement.import', { type: 'Room', id: ref }, [`${errors.length} of ${rows.length} rows are invalid; nothing was imported`, ...errors.slice(0, 50).map((e) => `row ${e.row}: ${e.reasons.join('; ')}`)], { file: file.fileName });
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref);
    const sha = (await q.query<{ sha256: string }>('SELECT sha256 FROM app.evidence_object WHERE id = $1', [b.evidenceId])).rows[0]!.sha256;
    const dup = (await q.query<{ id: string }>('SELECT id FROM app.measurement_import WHERE room_id = $1 AND evidence_id = $2', [room.id, b.evidenceId])).rows[0];
    if (dup) await ctx.refuse('measurement.import', { type: 'Room', id: ref }, [`this file was already imported for this room (import ${dup.id})`]);
    const imp = (await q.query<{ id: string }>(`INSERT INTO app.measurement_import (tenant_id, room_id, evidence_id, file_sha256, file_name, instrument_id, instrument_model, calibration_ref, calibration_due, method, uncertainty, uncertainty_unit, rows_total, rows_calibrated, imported_by, imported_role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`, [ctx.p.tenantId, room.id, b.evidenceId, sha, file.fileName, b.instrumentId, b.instrumentModel || null, b.calibrationRef, b.calibrationDue, b.method, b.uncertainty ?? null, b.uncertaintyUnit || null, ok.length, calibrated, ctx.p.personId, ctx.p.role])).rows[0]!.id;
    const method = `${b.method} · cal. ${b.calibrationRef}`.slice(0, 120);
    for (const x of ok) {
      await q.query(`INSERT INTO app.measurement (tenant_id, room_id, metric, value, unit, method, instrument_id, calibration_status, calibration_due, measured_at, location, source, provenance, uncertainty, uncertainty_unit, recorded_by, recorded_role, import_id, import_row)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'FIELD_MEASURED',$13,$14,$15,$16,$17,$18)`,
        [ctx.p.tenantId, room.id, x.metric, x.value, x.unit, method, b.instrumentId, x.calibrated ? 'CALIBRATED' : 'EXPIRED', b.calibrationDue, x.measuredAt, x.location, `instrument export ${file.fileName} sha256:${sha.slice(0, 12)} row ${x.row}`.slice(0, 200), x.uncertainty, x.uncertainty === null ? null : (b.uncertaintyUnit || x.unit), ctx.p.personId, ctx.p.role, imp, x.row]);
    }
    await ctx.audit(q, 'measurement.import', 'ALLOWED', { type: 'Room', id: room.code }, { importId: imp, evidenceId: b.evidenceId, sha256: sha, rows: ok.length, calibrated, instrumentId: b.instrumentId, calibrationRef: b.calibrationRef });
    return { importId: imp, ...report };
  });
}
