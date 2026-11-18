// Data reports as PDF only, role protected (founder, 18 Nov 2026, 07:49; task #209). A real enterprise API on a real database; the PDF
// is read back by an independent reader (poppler's pdftotext and qpdf --check) rather than by the code that wrote it.
//
//   DR-01  refused to everyone who does not answer for the estate's figures, each refusal audited; no token, no report
//   DR-02  the executive, the operations lead, the service manager, the security administrator: a valid PDF (qpdf finds no damage), its
//          text readable by another program, naming the organization, the reader, the definitions and the figures' hash; the hash in
//          the header is the hash of the file; the export audited with both hashes; there is no other format to ask for
//   DR-03  another organization's report is its own: its name, its figures' hash, nothing of this organization's
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict';
import crypto from 'node:crypto'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { setup, client } from '../integration/harness.mjs';

let h, c; const T = {};
const get = async (who, p) => { const r = await fetch(h.base + p, { headers: T[who] ? { authorization: `Bearer ${T[who]}` } : {} }); return { status: r.status, headers: r.headers, bytes: Buffer.from(await r.arrayBuffer()) }; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-report-'));
const read = (bytes, name) => { const f = path.join(dir, name); fs.writeFileSync(f, bytes); execFileSync('qpdf', ['--check', f], { stdio: 'pipe' }); return execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }); };

before(async () => {
  h = await setup({ db: 'empathia_test_data_report', port: 4167 }); c = client(h.base);
  for (const r of ['requestor', 'service', 'designer', 'installer', 'cxeng', 'steward', 'syseng', 'exec', 'opslead', 'svcmgr', 'secadmin']) T[r] = await c.login(r);
  T.other = await c.login('secadmin', 'second-tenant');
});
after(async () => { await h?.app.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

test('DR-01 refused to the roles that do not answer for the estate’s figures, each refusal audited', async () => {
  for (const who of ['requestor', 'service', 'designer', 'installer', 'cxeng', 'steward', 'syseng']) {
    const r = await get(who, '/v1/reports/estate.pdf'); assert.equal(r.status, 403, who); assert.ok(!r.bytes.subarray(0, 5).equals(Buffer.from('%PDF-')), `${who} got no PDF`);
  }
  assert.ok(Number(h.asSuper("SELECT count(*) FROM app.audit_event WHERE outcome = 'DENIED' AND (action = 'export a data report' OR aggregate_id = 'estate-summary')")) >= 7);
  assert.equal((await get('nobody', '/v1/reports/estate.pdf')).status, 401);
});

test('DR-02 a valid PDF for the four roles, readable by another program, its hashes in the header and the audit history', async () => {
  for (const who of ['exec', 'opslead', 'svcmgr', 'secadmin']) {
    const r = await get(who, '/v1/reports/estate.pdf'); assert.equal(r.status, 200, who);
    assert.equal(r.headers.get('content-type'), 'application/pdf'); assert.match(r.headers.get('content-disposition') || '', /^attachment; filename="empathia-estate-report-empathia-demo-\d{4}-\d{2}-\d{2}\.pdf"$/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const fileSha = crypto.createHash('sha256').update(r.bytes).digest('hex'); assert.equal(r.headers.get('x-empathia-file-sha256'), fileSha);
    const figures = r.headers.get('x-empathia-figures-sha256'); assert.match(figures || '', /^[0-9a-f]{64}$/);
    const txt = read(r.bytes, `${who}.pdf`).replace(/\s+/g, ' ');
    for (const want of ['Estate data report', 'empathia-demo', `(${who})`, figures, 'Rooms by lifecycle', 'Commissioning', 'Coverage', 'tests with any recorded result', 'Operational performance is not monitored', 'Exported as PDF only'])
      assert.ok(txt.includes(want), `${who}: “${want}” in the text`);
    assert.ok(!/\?{3,}/.test(txt), 'no run of substituted characters');
    assert.equal(h.asSuper(`SELECT count(*) FROM app.audit_event WHERE action = 'report.export' AND outcome = 'ALLOWED' AND detail->>'fileSha256' = '${fileSha}' AND detail->>'figuresSha256' = '${figures}' AND detail->>'format' = 'pdf'`), '1', `${who}: the export is in the audit history`);
  }
  for (const p of ['/v1/reports/estate.csv', '/v1/reports/estate.xlsx', '/v1/reports/estate.json', '/v1/reports/estate']) assert.equal((await get('exec', p)).status, 404, `${p}: PDF only`);
});

test('DR-03 another organization’s report is its own', async () => {
  const mine = await get('exec', '/v1/reports/estate.pdf'); const theirs = await get('other', '/v1/reports/estate.pdf'); assert.equal(theirs.status, 200);
  const txt = read(theirs.bytes, 'other.pdf').replace(/\s+/g, ' ');
  assert.ok(txt.includes('second-tenant')); assert.ok(!txt.includes('empathia-demo'));
  assert.notEqual(theirs.headers.get('x-empathia-figures-sha256'), mine.headers.get('x-empathia-figures-sha256'));
});
