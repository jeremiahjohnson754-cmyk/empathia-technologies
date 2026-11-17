/**
 * Acceptance criteria of a room, and how a result rests on a measurement (migration 0037; founder, 17 Nov 2026: "the measurement
 * benches writing directly to authoritative server records").
 *
 *   criterion   what the room has to meet for one test: a metric and its limits, with where the limits come from. Set by someone
 *               holding room.design.approve, before the room is accepted. A changed limit is a new version; the earlier ones stay.
 *
 * The measurement itself is the record of ADR-0004 (measurements.ts). When it names the test it answers, the database works out whether
 * it meets the criterion in force (app.measurement_judge); nothing in this service does. The rule that joins them to results is a
 * trigger on app.test_result as well (app.result_measurement_guard): where a room has a criterion for a test, the result cites a
 * measurement of that test judged against the criterion in force; PASS needs the value to be within it and to be a field measurement on
 * a calibrated instrument — or, in a demonstration sandbox only, a SIMULATED value, recorded as exactly that.
 *
 * What is NOT here: no limit is invented. A room with no criterion for a test has no verdict on a measurement of it, and the library's
 * own words stand: "against the site-approved reference; no universal threshold".
 */
import { RECORD_OVERRIDE_PERSONAS } from '@empathia/commissioning-engine';
import type { Queryable } from '../db/pg.js';
import type { RequestContext } from '../auth/context.js';
import { findRoom, type RoomRow } from './rooms.js';

export const CRITERION_SET = ['room.design.approve'];
/** Lifecycle states in which a criterion may still be set: before the room is accepted. After that it is a change order. */
export const CRITERION_OPEN = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING'];

export interface Quantity { metric: string; unit: string; label: string; limit: 'upper' | 'lower'; method: string; range: [number, number] }
/** What each instrument-measured test of the library measures. A criterion names one of these, and so does a measurement of the test. */
export const QUANTITIES: Record<string, { name: string; metrics: Quantity[] }> = {
  reverberation_rt60: { name: 'Reverberation time', metrics: [
    { metric: 't30_mid', unit: 's', label: 'T30: mean of the 500 Hz and 1 kHz octave bands, averaged over the measured positions', limit: 'upper', method: 'ISO 3382-2 integrated impulse response, T30', range: [0.05, 20] },
    { metric: 't20_mid', unit: 's', label: 'T20: mean of the 500 Hz and 1 kHz octave bands, averaged over the measured positions', limit: 'upper', method: 'ISO 3382-2 integrated impulse response, T20', range: [0.05, 20] }] },
  audio_intelligibility: { name: 'Speech intelligibility (STIPA)', metrics: [{ metric: 'sti', unit: 'index', label: 'Speech transmission index: the lowest of the measured positions', limit: 'lower', method: 'IEC 60268-16 STIPA', range: [0, 1] }] },
  audio_noise_floor: { name: 'Background noise floor', metrics: [{ metric: 'laeq', unit: 'dB(A)', label: 'LAeq over 60 s at the seating reference, unoccupied, ventilation running', limit: 'upper', method: 'LAeq 60 s, unoccupied', range: [0, 140] }] },
  acoustic_coverage: { name: 'Acoustic coverage', metrics: [{ metric: 'laeq_spread', unit: 'dB', label: 'Spread of LAeq across the coverage points (highest minus lowest)', limit: 'upper', method: 'LAeq at every coverage point, pink noise', range: [0, 60] }] },
  audio_limiter_levels: { name: 'Limiter and safe listening level', metrics: [{ metric: 'lafmax', unit: 'dB(A)', label: 'Programme peak LAFmax at the nearest seat, limiter engaged', limit: 'upper', method: 'LAFmax at the nearest seat', range: [0, 140] }] },
};

interface CriterionRow { id: string; test_id: string; version: number; metric: string; unit: string; lower: string | null; upper: string | null; source: string; set_by_name: string; set_at: string }
interface PlanRow { test_id: string; label: string; applicable: boolean; personas: string[]; instrument: boolean }
export interface Limit { lower: number | null; upper: number | null; unit: string }

const agg = (room: RoomRow) => ({ type: 'Room', id: room.code });
const num = (v: string | null) => (v === null ? null : Number(v));
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const view = (c: CriterionRow) => ({ test: c.test_id, version: c.version, metric: c.metric, unit: c.unit, lower: num(c.lower), upper: num(c.upper), source: c.source, setBy: c.set_by_name, setAt: c.set_at });
/** "at most 1 s", "at least 0.6 index", "between 0.4 and 1 s" */
export const limitWords = (c: Limit) => (c.lower !== null && c.upper !== null ? `between ${c.lower} and ${c.upper} ${c.unit}` : c.upper !== null ? `at most ${c.upper} ${c.unit}` : `at least ${c.lower} ${c.unit}`);

export const planRows = async (q: Queryable, roomId: string): Promise<PlanRow[]> => (await q.query<PlanRow>(
  'SELECT test_id, label, applicable, personas, instrument FROM app.cx_plan_row WHERE plan_id = (SELECT id FROM app.cx_plan WHERE room_id = $1 ORDER BY compiled_at DESC, id DESC LIMIT 1) ORDER BY test_id', [roomId])).rows;
const criteria = async (q: Queryable, roomId: string): Promise<CriterionRow[]> => (await q.query<CriterionRow>(
  'SELECT c.id, c.test_id, c.version, c.metric, c.unit, c.lower, c.upper, c.source, p.display_name AS set_by_name, c.set_at FROM app.acceptance_criterion c JOIN app.person p ON p.id = c.set_by WHERE c.room_id = $1 ORDER BY c.test_id, c.version', [roomId])).rows;
const inForce = (all: CriterionRow[], test: string) => all.filter((c) => c.test_id === test).at(-1) || null;
export const isSandbox = async (q: Queryable, tenantId: string) => (await q.query<{ d: boolean }>('SELECT app.is_demo_tenant($1) AS d', [tenantId])).rows[0]?.d === true;

/** What a room has to meet: per measurable test its criterion in force (or none), every version ever set, and what may be measured. */
export async function criteriaOf(ctx: RequestContext, ref: string) {
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref); const rows = await planRows(q, room.id); const all = await criteria(q, room.id);
    const counts = (await q.query<{ test_id: string; n: string; last: string | null }>('SELECT test_id, count(*) AS n, max(created_at) AS last FROM app.measurement WHERE room_id = $1 AND test_id IS NOT NULL GROUP BY test_id', [room.id])).rows;
    const tests = rows.filter((r) => r.applicable && QUANTITIES[r.test_id]).map((r) => { const c = inForce(all, r.test_id); const n = counts.find((x) => x.test_id === r.test_id);
      return { test: r.test_id, name: QUANTITIES[r.test_id]!.name, personas: r.personas, metrics: QUANTITIES[r.test_id]!.metrics, criterion: c ? { ...view(c), words: limitWords({ lower: num(c.lower), upper: num(c.upper), unit: c.unit }) } : null,
        measurements: Number(n?.n || 0), mayMeasure: room.lifecycle === 'COMMISSIONING' && (r.personas.includes(ctx.p.role) || RECORD_OVERRIDE_PERSONAS.includes(ctx.p.role)) }; });
    return { room: { code: room.code, name: room.name, lifecycle: room.lifecycle }, sandbox: await isSandbox(q, ctx.p.tenantId), tests,
      versions: all.map((c) => ({ ...view(c), inForce: inForce(all, c.test_id)!.id === c.id })), may: { set: ctx.can(CRITERION_SET) && CRITERION_OPEN.includes(room.lifecycle) },
      basis: 'A criterion is what this room has to meet for one test, with where the limit comes from. Whether a measurement meets it is worked out by the database from the criterion in force when the measurement was recorded. A test with no criterion has no verdict on its measurements.' };
  });
}

/** Set (or change) what a room has to meet for one test. A new version; the earlier ones stay. */
export async function setCriterion(ctx: RequestContext, ref: string, testId: string, body: { metric: string; lower?: number | null; upper?: number | null; source: string }) {
  await ctx.require(CRITERION_SET, 'set an acceptance criterion');
  return ctx.tx(async (q) => {
    const room = await findRoom(ctx, q, ref, true); const why: string[] = [];
    if (!CRITERION_OPEN.includes(room.lifecycle)) await ctx.refuse('criterion.set', agg(room), [`${room.code} is ${room.lifecycle}: what it had to meet was fixed when it was accepted. A different limit now is a change order and recommissioning`]);
    const known = QUANTITIES[testId]; const qty = known?.metrics.find((x) => x.metric === body.metric);
    if (!known) why.push(`${testId} is not an instrument-measured test with a metric to limit (${Object.keys(QUANTITIES).join(', ')})`);
    else if (!qty) why.push(`${testId} is measured as ${known.metrics.map((x) => x.metric).join(' or ')}`);
    const rows = await planRows(q, room.id); const row = rows.find((r) => r.test_id === testId);
    if (rows.length && !row?.applicable) why.push(`${testId} does not apply to this room`);
    const lower = body.lower === undefined || body.lower === null ? null : round4(Number(body.lower)); const upper = body.upper === undefined || body.upper === null ? null : round4(Number(body.upper));
    if (lower === null && upper === null) why.push('a criterion has a lower limit, an upper limit, or both');
    if ((lower !== null && !Number.isFinite(lower)) || (upper !== null && !Number.isFinite(upper))) why.push('a limit is a number');
    if (lower !== null && upper !== null && lower > upper) why.push('the lower limit is not above the upper limit');
    if (qty) for (const v of [lower, upper]) if (v !== null && Number.isFinite(v) && (v < qty.range[0] || v > qty.range[1])) why.push(`${qty.metric} is between ${qty.range[0]} and ${qty.range[1]} ${qty.unit}: ${v} is not a limit for it`);
    if (!body.source || body.source.trim().length < 3) why.push('say where the limit comes from (the brief, the standard, the client’s reference)');
    if (why.length) await ctx.refuse('criterion.set', agg(room), why, { testId });
    const last = (await q.query<{ v: number }>('SELECT coalesce(max(version), 0) AS v FROM app.acceptance_criterion WHERE room_id = $1 AND test_id = $2', [room.id, testId])).rows[0]!.v;
    await q.query('INSERT INTO app.acceptance_criterion (tenant_id, room_id, test_id, version, metric, unit, lower, upper, source, set_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [ctx.p.tenantId, room.id, testId, last + 1, qty!.metric, qty!.unit, lower, upper, body.source.trim(), ctx.p.personId]);
    await ctx.audit(q, 'criterion.set', 'ALLOWED', agg(room), { testId, version: last + 1, metric: qty!.metric, lower, upper, source: body.source.trim() });
    return { room: room.code, test: testId, version: last + 1, metric: qty!.metric, unit: qty!.unit, lower, upper, source: body.source.trim(), words: limitWords({ lower, upper, unit: qty!.unit }),
      note: last ? `Version ${last + 1}. Measurements judged against version ${last} keep that judgement; a result recorded now cites a measurement judged against this one.` : 'Version 1. From now on a result for this test cites a measurement judged against it.' };
  });
}

/**
 * A measurement that names the test it answers: why it may not be recorded (empty when it may), and the criterion it will be judged
 * against. Called by measurements.record inside its transaction; the room is the caller's, already found.
 */
export async function forTest(ctx: RequestContext, q: Queryable, room: RoomRow, m: { testId: string; metric: string; unit: string; value: number; evidenceId?: string }): Promise<{ why: string[]; forbidden: string | null; criterion: ReturnType<typeof view> | null }> {
  const row = (await planRows(q, room.id)).find((r) => r.test_id === m.testId);
  if (!row || !row.applicable) return { why: [`${m.testId} does not apply to this room`], forbidden: null, criterion: null };
  if (!row.personas.includes(ctx.p.role) && !RECORD_OVERRIDE_PERSONAS.includes(ctx.p.role)) return { why: [], forbidden: `${ctx.p.role} is not the responsible role for ${m.testId} (${row.personas.join(', ')})`, criterion: null };
  const why: string[] = []; const known = QUANTITIES[m.testId]; const qty = known?.metrics.find((x) => x.metric === m.metric);
  if (room.lifecycle !== 'COMMISSIONING') why.push(`a measurement for a test is taken on an installed room in COMMISSIONING (this one is ${room.lifecycle}): nothing is measured from a design`);
  if (!known) why.push(`${m.testId} is not an instrument-measured test with a metric to record`);
  else if (!qty) why.push(`${m.testId} is measured as ${known.metrics.map((x) => x.metric).join(' or ')}`);
  else { if (m.unit !== qty.unit) why.push(`${qty.metric} is recorded in "${qty.unit}"`);
    if (Number.isFinite(m.value) && (m.value < qty.range[0] || m.value > qty.range[1])) why.push(`${qty.metric} is between ${qty.range[0]} and ${qty.range[1]} ${qty.unit}: ${m.value} is not a reading of it`); }
  if (!m.evidenceId) why.push('a measurement for a test rests on an evidence file: the data it was worked out from');
  const c = inForce(await criteria(q, room.id), m.testId);
  if (c && qty && c.metric !== qty.metric) why.push(`the criterion in force for ${m.testId} is ${c.metric}: measure that`);
  return { why, forbidden: null, criterion: c ? view(c) : null };
}

/**
 * Why a result may not be recorded on the measurement it cites (empty when it may), and the words for the deficiency when it fails.
 * The same rule is a trigger on app.test_result; this is where its refusal gets a reason a person can act on.
 */
export async function citeMeasurement(q: Queryable, tenantId: string, room: { id: string }, testId: string, state: string, measurementId?: string): Promise<{ why: string[]; id: string | null; measured: string | null }> {
  const c = inForce(await criteria(q, room.id), testId);
  if (!measurementId) return { why: c ? [`${testId} has an acceptance criterion on this room (${c.metric} ${limitWords({ lower: num(c.lower), upper: num(c.upper), unit: c.unit })}, version ${c.version}): record a measurement and cite it`] : [], id: null, measured: null };
  const m = (await q.query<{ id: string; test_id: string | null; metric: string; unit: string; value: string; criterion_id: string | null; within: boolean | null; provenance: string; calibration_status: string; approval_state: string; c_lower: string | null; c_upper: string | null; c_version: number | null }>(
    `SELECT m.id, m.test_id, m.metric, m.unit, m.value, m.criterion_id, m.within, m.provenance, m.calibration_status, m.approval_state, k.lower AS c_lower, k.upper AS c_upper, k.version AS c_version
       FROM app.measurement m LEFT JOIN app.acceptance_criterion k ON k.id = m.criterion_id WHERE m.room_id = $1 AND m.id = $2`, [room.id, measurementId])).rows[0];
  if (!m || m.test_id !== testId) return { why: [`the measurement cited is not a measurement of ${testId} in this room`], id: null, measured: null };
  const why: string[] = []; const reading = `${m.metric} ${Number(m.value)} ${m.unit}`; const judged = m.criterion_id ? limitWords({ lower: num(m.c_lower), upper: num(m.c_upper), unit: m.unit }) : null;
  if (c && m.criterion_id !== c.id) why.push(`the measurement cited was not judged against the criterion in force (version ${c.version}): measure again`);
  if (state === 'PASS') {
    if (m.approval_state === 'REJECTED') why.push('the measurement cited was rejected on review: it passes nothing');
    if (m.within === false) why.push(`the measurement cited is ${reading}, which does not meet the criterion (${judged}, version ${m.c_version}): it cannot be recorded as PASS`);
    if (c) {
      if (m.provenance === 'SIMULATED') { if (!(await isSandbox(q, tenantId))) why.push('the measurement cited is SIMULATED: a simulated value is not a measurement of a room and passes nothing outside a demonstration sandbox'); }
      else if (m.provenance !== 'FIELD_MEASURED') why.push(`the measurement cited is ${m.provenance}: a test with a criterion passes on a field measurement`);
      else if (m.calibration_status !== 'CALIBRATED') why.push(`the measurement cited was taken on an instrument whose calibration is ${m.calibration_status}: it is indicative and does not pass a test that has a criterion`);
    }
  }
  return { why, id: m.id, measured: `${reading}${judged ? `, criterion ${judged} (version ${m.c_version})` : ''}${m.provenance === 'FIELD_MEASURED' ? '' : `, ${m.provenance}`}` };
}
