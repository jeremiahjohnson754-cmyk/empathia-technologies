/**
 * Instrument-data import (P2, ADR-0011) through the real API: a CSV export, uploaded as evidence, becomes FIELD_MEASURED values that
 * are each traceable to the file's SHA-256 and row, the instrument, its calibration certificate and due date, the method and the
 * uncertainty. All-or-nothing; a dry run checks without writing; a file is imported once per room; values measured after the
 * calibration due date are EXPIRED and can never be verified; verification stays independent of the importer. Synthetic data only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { setup, client } from '../integration/harness.mjs';

let h, c, room; const T = {}; let k = 0;
const upload = async (tok, text, type = 'text/csv', name = 'export.csv') => { const r = await c.call('POST', '/v1/evidence', { token: tok, raw: Buffer.from(text), headers: { 'content-type': type, 'x-file-name': name } }); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body; };
const imp = (tok, body, ref = room) => c.call('POST', `/v1/rooms/${ref}/measurements/import`, { token: tok, body, headers: { 'idempotency-key': `imp-${(k += 1).toString().padStart(4, '0')}` } });
const count = () => Number(h.asSuper(`SELECT count(*) FROM app.measurement m JOIN app.room r ON r.id = m.room_id WHERE r.code = '${room}'`));
const META = { instrumentId: 'SYN-SLM-07', instrumentModel: 'Class 1 sound level meter (synthetic)', calibrationRef: 'SYN-CAL-2026-0412', calibrationDue: '2026-10-15', method: 'LAeq 60 s at ear height', uncertainty: 0.7, uncertaintyUnit: 'dB' };
const GOOD = 'metric,value,unit,measured_at,location,uncertainty\nspl_laeq,42.1,dB(A),2026-10-10T14:00:00Z,"seat 1, 1.2 m",0.6\nspl_laeq,43.4,dB(A),2026-10-10T14:02:00Z,"seat 2, 1.2 m",\nnoise_floor,31.0,dB(A),2026-10-20T09:00:00Z,room centre,0.8\n';

before(async () => {
  h = await setup({ db: 'empathia_meas_import', port: 4177 }); c = client(h.base);
  for (const r of ['designer', 'cxeng', 'qa_reviewer', 'requestor', 'syseng']) T[r] = await c.login(r);
  T.south = await c.login('service', 'empathia-demo', 'service-south');
  room = (await c.call('POST', '/v1/rooms', { token: T.designer, body: { name: 'Import Huddle (synthetic)', template: 'huddle', buildingCode: 'ATL', floor: 3 } })).body.code;
});
after(async () => { await h?.app.stop(); });

test('IMP-1 authority and scope: unauthenticated 401; a requestor 403; a technician scoped to another site cannot import into this room; a non-CSV file and a bad header are refused before anything is read into the room', async () => {
  const f = await upload(T.cxeng, GOOD);
  assert.equal((await c.call('POST', `/v1/rooms/${room}/measurements/import`, { body: { evidenceId: f.id, ...META }, headers: { 'idempotency-key': 'imp-unauth' } })).status, 401);
  assert.equal((await imp(T.requestor, { evidenceId: f.id, ...META })).status, 403);
  const own = await upload(T.south, GOOD, 'text/csv', 'south.csv');
  assert.equal((await imp(T.south, { evidenceId: own.id, ...META })).status, 404, 'the ATL room is outside the South scope');
  const pdf = await upload(T.cxeng, '%PDF-1.4 synthetic', 'application/pdf', 'x.pdf');
  assert.equal((await imp(T.cxeng, { evidenceId: pdf.id, ...META })).status, 400);
  const bad = await upload(T.cxeng, 'metric,value\nspl_laeq,40\n');
  const r = await imp(T.cxeng, { evidenceId: bad.id, ...META }); assert.equal(r.status, 400); assert.match(r.body.detail, /lacks unit, measured_at, location/);
  assert.equal(count(), 0);
});

test('IMP-2 every row is validated and nothing is written unless all are valid: a dry run lists the problems by row; the real import is refused with the same reasons and audited', async () => {
  const csv = 'metric,value,unit,measured_at,location\nspl_laeq,41.0,dB(A),2026-10-10T14:00:00Z,seat 1\nspl_laeq,abc,dB(A),2026-10-10T14:01:00Z,seat 2\nspl_laeq,-12,dBFS,2026-10-10T14:02:00Z,file\nSPL,40,dB,2026-10-10,seat 4\nspl_laeq,40,dB(A),2099-01-01T00:00:00Z,seat 5\n';
  const f = await upload(T.cxeng, csv);
  const d = await imp(T.cxeng, { evidenceId: f.id, ...META, dryRun: true });
  assert.equal(d.status, 200, JSON.stringify(d.body)); assert.equal(d.body.dryRun, true); assert.equal(d.body.accepted, 0); assert.equal(d.body.rejected, 4);
  assert.deepEqual(d.body.errors.map((e) => e.row), [3, 4, 5, 6], 'row numbers as a spreadsheet shows them');
  assert.match(JSON.stringify(d.body.errors), /not a number/); assert.match(JSON.stringify(d.body.errors), /dBFS level is not a sound pressure level/);
  assert.match(JSON.stringify(d.body.errors), /lower-case identifier/); assert.match(JSON.stringify(d.body.errors), /not a date-time/); assert.match(JSON.stringify(d.body.errors), /in the future/);
  assert.equal(count(), 0, 'a dry run writes nothing');
  const r = await imp(T.cxeng, { evidenceId: f.id, ...META }); assert.equal(r.status, 422); assert.match(JSON.stringify(r.body), /4 of 5 rows are invalid; nothing was imported/); assert.ok(r.body.reasons.includes('row 3: value "abc" is not a number'), JSON.stringify(r.body.reasons));
  assert.equal(count(), 0);
  assert.equal(Number(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'measurement.import' AND outcome = 'DENIED'`)), 1);
});

test('IMP-3 a valid export becomes FIELD_MEASURED values traceable to the file hash and row, the instrument and the calibration; a value measured after the calibration due date is EXPIRED', async () => {
  const f = await upload(T.cxeng, GOOD);
  const r = await imp(T.cxeng, { evidenceId: f.id, ...META }); assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.accepted, 3); assert.equal(r.body.calibrated, 2); assert.equal(r.body.expiredCalibration, 1);
  const sha = crypto.createHash('sha256').update(GOOD).digest('hex');
  assert.equal(h.asSuper(`SELECT file_sha256 FROM app.measurement_import WHERE id = '${r.body.importId}'`), sha, 'the import record carries the file hash');
  const items = (await c.call('GET', `/v1/rooms/${room}/measurements`, { token: T.syseng })).body.items.filter((m) => m.import_id === r.body.importId);
  assert.equal(items.length, 3);
  for (const m of items) { assert.equal(m.provenance, 'FIELD_MEASURED'); assert.equal(m.instrument_id, 'SYN-SLM-07'); assert.match(m.source, new RegExp(`sha256:${sha.slice(0, 12)} row ${m.import_row}`)); assert.match(m.method, /cal\. SYN-CAL-2026-0412/); assert.equal(m.approval_state, 'UNREVIEWED'); }
  const byRow = Object.fromEntries(items.map((m) => [m.import_row, m]));
  assert.equal(byRow[2].calibration_status, 'CALIBRATED'); assert.equal(Number(byRow[2].uncertainty), 0.6, 'a row’s own uncertainty wins');
  assert.equal(Number(byRow[3].uncertainty), 0.7, 'otherwise the declared instrument uncertainty');
  assert.equal(byRow[4].calibration_status, 'EXPIRED', 'measured 2026-10-20, calibration due 2026-10-15');
  const again = await imp(T.cxeng, { evidenceId: f.id, ...META }); assert.equal(again.status, 422); assert.match(JSON.stringify(again.body), /already imported/);
  const check = await imp(T.cxeng, { evidenceId: f.id, ...META, dryRun: true }); assert.equal(check.status, 200); assert.equal(check.body.alreadyImported, r.body.importId, 'a check of an imported file says so');
});

test('IMP-4 verification stays independent and calibration-bound: the importer cannot verify; QA verifies a calibrated value; an EXPIRED one is refused; imported values and import records are immutable', async () => {
  const items = (await c.call('GET', `/v1/rooms/${room}/measurements`, { token: T.syseng })).body.items.filter((m) => m.import_id);
  const cal = items.find((m) => m.calibration_status === 'CALIBRATED'); const exp = items.find((m) => m.calibration_status === 'EXPIRED');
  const verify = (tok, id) => c.call('POST', `/v1/measurements/${id}/verify`, { token: tok, body: { decision: 'VERIFIED' } });
  assert.equal((await verify(T.cxeng, cal.id)).status, 422, 'the importer cannot verify');
  assert.equal((await verify(T.qa_reviewer, cal.id)).status, 200);
  const e = await verify(T.qa_reviewer, exp.id); assert.equal(e.status, 422); assert.match(JSON.stringify(e.body), /EXPIRED/);
  assert.throws(() => h.asSuper(`UPDATE app.measurement SET import_row = 99 WHERE id = '${exp.id}'`), /EM006/);
  assert.throws(() => h.asSuper(`UPDATE app.measurement SET calibration_status = 'CALIBRATED' WHERE id = '${exp.id}'`), /EM006/, 'calibration status never changes after recording');
  assert.throws(() => h.asSuper(`DELETE FROM app.measurement_import`), /EM001|append-only|refuse/i);
});
