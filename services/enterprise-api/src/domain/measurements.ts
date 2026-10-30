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
  return ctx.tx(async (q) => { const room = await findRoom(ctx, q, ref); return { room: room.code, items: (await q.query('SELECT id, metric, value, unit, method, instrument_id, calibration_status, calibration_due, measured_at, location, source, provenance, uncertainty, uncertainty_unit, approval_state, approved_by, approved_at, approval_note, recorded_by, recorded_role, test_result_id FROM app.measurement WHERE room_id = $1 ORDER BY measured_at DESC', [room.id])).rows }; });
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
