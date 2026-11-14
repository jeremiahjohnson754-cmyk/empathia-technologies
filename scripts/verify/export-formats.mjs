#!/usr/bin/env node
/**
 * Export formats, proven by reopening them (founder, 13 Nov 2026: "No exported files that fail to open").
 *
 * 1. Bundles the demo's own export code (apps/demo/src/export: cx.ts builds the report from a room record, render.ts writes it) for
 *    Node with esbuild, so the files checked here are written by exactly the code the page runs.
 * 2. Writes the commissioning completion package (cx.ts), the assurance report (as.ts) and the APEX case report (apex.ts) (the reference room, a blocked room, an accepted room with an open
 *    deficiency, a room with an exception, the earlier record with no device positions) in all six formats, plus one hostile report
 *    (formula-like cells, characters outside every font's range, an empty table, a 600-row table, unbroken long words).
 * 3. Reopens every file with independent readers (scripts/verify/export-formats-check.py: openpyxl, python-docx, python-pptx,
 *    pdfinfo/pdftotext, jsonschema, csv) and, for one room, LibreOffice, which must convert each Office file to PDF.
 *
 * Usage: node scripts/verify/export-formats.mjs [--out=tests/evidence/exports] [--no-office]
 * Exit 0 only when every check passes. Writes <out>/EXPORT_VALIDATION.json and page-1 images of the PDFs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const out = path.resolve(repo, arg('out', 'tests/evidence/exports'));
const office = !process.argv.includes('--no-office');
const cache = path.join(repo, 'node_modules/.cache/export-verify'); fs.mkdirSync(cache, { recursive: true });

// 1 · bundle the page's export code for Node
const entry = path.join(cache, 'entry.ts');
fs.writeFileSync(entry, `
export { cxPackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/cx.ts'))};
export { asPackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/as.ts'))};
export { seed, openApex, apexAct } from ${JSON.stringify(path.join(repo, 'apps/demo/src/workspace/store.ts'))};
export { apexPackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/apex.ts'))};
export { estatePackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/estate.ts'))};
export { serviceQueuePackage, serviceRecordPackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/service.ts'))};
export { learnPackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/learn.ts'))};
export { dossierPackage } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/dossier.ts'))};
export { replay, DOSSIER_4218 } from ${JSON.stringify(path.join(repo, 'packages/proof-registry/src/index.ts'))};
export { prepareMedia, imageSize } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/media.ts'))};
export { readDocs } from ${JSON.stringify(path.join(repo, 'apps/demo/src/docs5/store.ts'))};
export { TRACKED_ROOM, TRACKED_REPORT } from ${JSON.stringify(path.join(repo, 'apps/demo/src/docs5/model.ts'))};
export * as INTAKE from ${JSON.stringify(path.join(repo, 'apps/demo/src/intake/store.ts'))};
export { blank as intakeBlank } from ${JSON.stringify(path.join(repo, 'apps/demo/src/intake/model.ts'))};
export { seed as deskSeed } from ${JSON.stringify(path.join(repo, 'apps/demo/src/decisions/store.ts'))};
export * as R from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/render.ts'))};
export { FORMATS } from ${JSON.stringify(path.join(repo, 'apps/demo/src/export/model.ts'))};
export { roomRecord, allRecords } from ${JSON.stringify(path.join(repo, 'apps/demo/src/campus/design.ts'))};
`);
const esbuild = await import(pathToFileURL(path.join(repo, 'node_modules/esbuild/lib/main.js')).href);
const bundle = path.join(cache, 'bundle.mjs');
await esbuild.build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: bundle, external: ['docx', 'pptxgenjs', 'pdf-lib', 'jszip'], logLevel: 'error', define: { 'process.env.DEMO_BUILD_ID': '"verify"' }, tsconfig: path.join(repo, 'apps/demo/tsconfig.json') });
const M = await import(pathToFileURL(bundle).href + `?t=${Date.now()}`);

// the shield: the same brand/emblem.svg the page draws, rasterised here by sharp
let mark;
try { const sharp = createRequire(import.meta.url)(process.env.SHARP_PATH || '/opt/npm-tools/node_modules/sharp'); mark = new Uint8Array(await sharp(path.join(repo, 'packages/design-tokens/brand/emblem.svg')).resize(256, 256).png().toBuffer()); }
catch (e) { mark = undefined; console.warn(`sharp unavailable (${e.message}): documents are checked without the shield`); }

// 2 · the rooms and the hostile report
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const all = M.allRecords();
const pick = new Map();
const want = (id, why) => { const r = M.roomRecord(id); if (r) pick.set(id, { r, why }); };
want('R-ATL-4-218', 'the reference room');
want('R-BCN-3-225', 'blocked: a must-have check failed and a high deficiency is open');
want('R-MER-1-140', 'accepted with an open deficiency');
want('R-NST-2-101', 'the earlier record: no device positions');
const ex = all.find((r) => r.exception); if (ex) pick.set(ex.outline.id, { r: ex, why: 'an exception waits for an independent reviewer' });
const big = [...all].sort((a, b) => b.positions.length - a.positions.length)[0]; if (big) pick.set(big.outline.id, { r: big, why: 'the largest room (most positions)' });

const made = { role: 'Commissioning Engineer (synthetic)', at: '2026-11-13T21:00:00.000Z', build: 'verify' };
// the reference room carries its documentation tracker, a field capture and its photograph (a generated test image, labelled as a
// fixture: no real photograph is invented), and links that start from a placeholder address
let fixturePhoto = null; const installFixture = {};   // distinct images: a writer may store identical bytes once
try { const sharp = createRequire(import.meta.url)(process.env.SHARP_PATH || '/opt/npm-tools/node_modules/sharp');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#D0D5DD"/><rect x="120" y="140" width="560" height="320" fill="#475467"/><text x="400" y="320" font-family="Helvetica" font-size="34" fill="#fff" text-anchor="middle">TEST FIXTURE · not a photograph</text></svg>`;
  fixturePhoto = new Uint8Array(await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer());
  for (const w of ['before', 'after']) installFixture[w] = new Uint8Array(await sharp(Buffer.from(svg.replace('#475467', w === 'before' ? '#7A5AF8' : '#12B76A').replace('TEST FIXTURE', `TEST FIXTURE · ${w} install`))).jpeg({ quality: 80 }).toBuffer()); } catch { /* without sharp the photograph path is not exercised */ }
// the project from intake to service: the seeded decision desk and workspace, and one request raised through the portal's own send()
const wsL = M.seed(); const desk = M.deskSeed();
const req = M.INTAKE.send(wsL, 'employee', { ...M.intakeBlank('add-devices'), need: 'We cannot see the far-end people when they share; please add a second display (test fixture)', roomId: 'R-ATL-4-218', adds: [{ cat: 'display', qty: 1 }] }, desk);
if (!req || !req.id) throw new Error(`intake fixture refused: ${JSON.stringify(req)}`);
const lifecycleFor = (id) => ({ requests: [req].filter((q) => q.roomId === id).map((q) => { const st = M.INTAKE.standing(q, wsL, desk); return { id: q.id, kind: q.kind, at: q.at, role: q.role, need: q.need ?? null, title: q.title, summary: q.summary, size: q.size ?? null, equipment: q.equipment, tests: q.tests, goes: q.goes, where: st.where, standing: st.words }; }), projects: desk.projects, decisions: desk.decisions, memory: desk.memory, workspace: wsL });
const extrasFor = (id) => id !== M.TRACKED_ROOM ? { baseUrl: 'https://demo.example.invalid/', lifecycle: lifecycleFor(id) } : { lifecycle: lifecycleFor(id),
  docs: M.readDocs([]), report: M.TRACKED_REPORT, baseUrl: 'https://demo.example.invalid/',
  captures: [{ key: 'CAP-FIXTURE01', target: { kind: 'test', id: 'T-SIM-001' }, note: 'Test fixture capture (synthetic)', measurements: [{ quantity: 'Sound level', value: 71.5, unit: 'dB(A)', instrument: 'SYN-METER-01 (synthetic)', method: 'Seat 3, pink noise' }], photo: fixturePhoto ? { name: 'fixture.jpg', bytes: fixturePhoto.length, sha256: 'a'.repeat(64), annotated: false } : null, by: { label: 'Commissioning Engineer (synthetic)' }, at: '2026-11-12T15:00:00.000Z' }],
  photos: fixturePhoto ? [{ key: 'CAP-FIXTURE01', name: 'fixture.jpg', mime: 'image/jpeg', bytes: fixturePhoto, ...M.imageSize(fixturePhoto), note: 'Test fixture capture (synthetic)', target: 'check T-SIM-001', at: '2026-11-12T15:00:00.000Z', by: 'Commissioning Engineer (synthetic)' }] : [],
  // the registers the installation team filled: two devices registered (one networked), and the before/after install photographs
  register: (() => { const r = M.roomRecord(id); const fw = r.positions.filter((p) => !p.furniture); const at = '2026-11-14T06:00:00.000Z';
    const entries = Object.fromEntries(fw.slice(0, 2).map((p, i) => [p.code, { serial: `SYN-SN-REG-${i + 1}`, hostname: `atl4218-reg${i + 1}`, ip: `10.20.40.${i + 1}`, firmware: '1.0.0-syn', location: 'fixture', by: 'installer', at }]));
    return { entries, photos: fixturePhoto ? ['before', 'after'].map((which) => ({ which, mime: 'image/jpeg', bytes: installFixture[which], ...M.imageSize(installFixture[which]), note: `Test fixture (${which}, synthetic)`, at, by: 'installer' })) : [] }; })() };
const reports = [...pick.values()].map(({ r, why }) => ({ why, rep: M.cxPackage(r, made, extrasFor(r.outline.id)) }));
// the assurance report: the seeded workspace's service requests are the people's reports Assurance reads
const ws = M.seed(); const asRooms = new Map([['R-ATL-4-218', 'reference room: a replaced unit reopened tests'], ['R-MER-1-140', 'drift: furniture moved since handover'], ['R-BCN-3-225', 'failed: never accepted']]);
for (const i of ws.incidents) if (!asRooms.has(i.roomId) && asRooms.size < 5) asRooms.set(i.roomId, `a service request is open (${i.id})`);
for (const [id, why] of asRooms) { const r = M.roomRecord(id); if (r) reports.push({ why: `assurance · ${why}`, rep: M.asPackage(r, ws.incidents, made) }); }
// the portfolio brief: the whole estate (every room record) and one building of it
reports.push({ why: 'portfolio · the whole estate', rep: M.estatePackage(all, ws.incidents, made) });
reports.push({ why: 'portfolio · one building (Beacon)', rep: M.estatePackage(all, ws.incidents, made, 'BCN') });
reports.push({ why: 'portfolio · one floor (Atlas floor 4), as drilled on the page', rep: M.estatePackage(all, ws.incidents, made, { building: 'ATL', floor: 4 }) });
// APEX: the seeded case, and one opened here and acted on at every tier (the A4 preflight is blocked by the adapter state, as built)
for (const c of ws.apexCases) reports.push({ why: `apex · seeded case ${c.id}`, rep: M.apexPackage(c, ws, made) });
{ const inc = ws.incidents.find((i) => !i.apexId && !['CLOSED', 'CANCELLED'].includes(i.state));
  if (inc) { const o = M.openApex(ws, 'syseng', inc.id, () => []); if (o && o.id) { const c = ws.apexCases.find((x) => x.id === o.id);
    for (const t of ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']) M.apexAct(ws, 'syseng', c.id, c.hypotheses[0].id, { tier: t }, null);
    reports.push({ why: `apex · opened here, acted on at every tier (${c.actions.length} actions)`, rep: M.apexPackage(c, ws, made) }); } } }
// ServiceHands: the queue, and the record of a request with a work order and of one without
reports.push({ why: 'servicehands · the whole queue', rep: M.serviceQueuePackage(ws, made) });
{ const withWo = ws.incidents.find((i) => i.workOrderId); const without = ws.incidents.find((i) => !i.workOrderId);
  for (const [i, why] of [[withWo, 'with its work order'], [without, 'no work order yet']]) if (i) reports.push({ why: `servicehands · ${i.id} ${why}`, rep: M.serviceRecordPackage(ws, i.id, made) }); }
// Learn: the governed cases and one perspective's practice (two drills, a passed lab); another person's attempt must not appear
{ const tr = [{ drillId: 'D-AUD-01', at: '2026-11-13T10:00:00Z', by: 'syseng', correct: true, elapsedS: 41 }, { drillId: 'D-VID-02', at: '2026-11-13T10:05:00Z', by: 'syseng', correct: false, elapsedS: 63 }, { drillId: 'D-OTHER-99', at: '2026-11-13T10:07:00Z', by: 'installer', correct: true, elapsedS: 12 }];
  const w2 = { ...ws, training: [...ws.training, ...tr] };
  const labs = [{ lab: 'audio', title: 'Audio: gain structure', domain: 'Audio', passed: true, at: '2026-11-13T11:00:00Z', persona: 'syseng', attempts: 2, mode: 'simulator' }, { lab: 'cam', title: 'Camera: framing', domain: 'Video', passed: true, at: '2026-11-13T11:00:00Z', persona: 'installer', attempts: 1, mode: 'simulator' }];
  reports.push({ why: 'learn · cases and one perspective’s practice', mustNot: ['D-OTHER-99', 'Camera: framing'], mustHave: ['D-AUD-01', 'Audio: gain structure'], mustHaveIn: ['pdf', 'docx', 'xlsx', 'json'], rep: M.learnPackage(w2, { persona: 'syseng', personaLabel: (k) => ({ syseng: 'Systems Engineer', installer: 'Installer' })[k] || k, labs, readiness: { points: 15, level: 'Started', drills: 1, cases: 0, next: { name: 'Practised', need: 15 } } }, made) }); }
// the commissioning dossier, in both redactions: the reference snapshot, and the working record after a retest, a verification and a
// new deficiency; the executive files must carry no evidence reference and no recorder or verifier (mustNot, checked in every format)
{ const D = M.DOSSIER_4218; const snap = M.replay(D, []); const at = '2026-11-13T12:00:00Z';
  const pend = snap.tests.find((t) => t.result === 'PENDING'); const fail = snap.tests.find((t) => t.result === 'FAIL');
  const ev = [{ kind: 'RETEST', test: pend.id, result: 'PASS', evidence: 'EV-SIM-199', by: { role: 'cxeng', label: 'Commissioning Engineer' }, at },
    { kind: 'VERIFY', test: pend.id, by: { role: 'qa', label: 'Quality Assurance' }, at },
    { kind: 'RAISE', test: fail.id, id: `DEF-SIM-${String(snap.deficiencies.length + 1).padStart(3, '0')}`, statement: 'Raised in verification', by: { role: 'cxeng', label: 'Commissioning Engineer' }, at }];
  const working = M.replay(D, ev);
  const evidenceIds = [...new Set([...snap.tests, ...working.tests].map((t) => t.evidence).filter(Boolean))];
  for (const [w, basis] of [[snap, 'reference snapshot'], [working, `working record (${ev.length} events after it)`]]) {
    reports.push({ why: `dossier · engineering · ${basis}`, mustHave: [...evidenceIds.slice(0, 3).map((x) => x.replace(/[-.]/g, '\\$&')), '\\bVerified\\b'], rep: { ...M.dossierPackage(w, 'engineering', made), id: `${D.id}-engineering${w.changed ? '-working' : ''}` } });
    reports.push({ why: `dossier · executive · ${basis}`, mustNot: [...evidenceIds.map((x) => x.replace(/[-.]/g, '\\$&')), '\\bRecorded\\b', '\\bVerified\\b'], rep: { ...M.dossierPackage(w, 'executive', made), id: `${D.id}-executive${w.changed ? '-working' : ''}` } });
  } }
const longWord = 'Supercalifragilisticexpialidocious'.repeat(6);
reports.push({ why: 'hostile input', rep: {
  schema: 'empathia.report/1', id: 'EDGE-001', kind: 'edge-cases', title: 'Edge cases — “quotes”, ≥ ≤ → ✓ 会议室 😀', subtitle: `Long ${longWord}`, scope: { tenant: 'Tenant (synthetic)', site: 'Site', building: 'Building', floor: 'Floor 1', room: 'Room', roomId: 'R-EDGE' },
  status: { label: 'Blocked', tone: 'bad', why: 'formula-like cells must stay text' }, generatedAt: made.at, role: made.role, build: 'verify', provenance: ['Synthetic test report for the writers.'], headline: '=1+1 must never run; @SUM(A1) neither; tabs\tand\nnewlines survive.',
  kpis: [{ label: '=HYPERLINK("http://example.invalid","x")', value: '+42', note: '-1' }],
  chart: { title: 'Counts', categories: ['A', 'B'], series: [{ name: 'Pass', values: [1, 2] }, { name: 'Fail', values: [0, 1] }] },
  sections: [
    { id: 'a', heading: 'Formula-like cells', table: { title: 'Injection', cols: [{ key: 'a', label: 'Cell' }, { key: 'b', label: 'Number', kind: 'number' }, { key: 'c', label: 'State', kind: 'status' }], rows: [{ a: '=1+1', b: 3, c: 'Fail' }, { a: '+SUM(A1:A2)', b: -2.5, c: 'Pass' }, { a: '-cmd', b: null, c: 'Not run' }, { a: '@x', b: 0, c: '' }, { a: '会议室 😀 ≥ →', b: 1e6, c: 'Open · high' }, { a: longWord, b: 7, c: 'Closed' }] } },
    { id: 'b', heading: 'An empty table', table: { title: 'Empty', cols: [{ key: 'x', label: 'X' }], rows: [] } },
    { id: 'c', heading: 'Six hundred rows', table: { title: 'Many rows', cols: [{ key: 'i', label: 'Row', kind: 'number' }, { key: 't', label: 'Text' }, { key: 's', label: 'State', kind: 'status' }], rows: Array.from({ length: 600 }, (_, i) => ({ i: i + 1, t: `Row ${i + 1} — ’quoted’ text`, s: i % 7 ? 'Pass' : 'Fail' })) } },
  ], dossier: { edge: true } } });

const manifest = [];
const raster = async (svg, w, h) => { try { const sharp = createRequire(import.meta.url)(process.env.SHARP_PATH || '/opt/npm-tools/node_modules/sharp'); return new Uint8Array(await sharp(Buffer.from(svg)).resize(w * 2, h * 2).png().toBuffer()); } catch { return undefined; } };
for (let i = 0; i < reports.length; i++) reports[i].rep = await M.prepareMedia(reports[i].rep, raster);
for (const { why, rep, mustNot, mustHave, mustHaveIn } of reports) {
  const dir = path.join(out, rep.id); fs.mkdirSync(dir, { recursive: true }); const files = {};
  for (const { f } of M.FORMATS) {
    const t0 = Date.now(); const fo = await M.R.render(rep, f, mark); const ms = Date.now() - t0;
    fs.writeFileSync(path.join(dir, fo.name), fo.bytes); files[f] = { name: fo.name, bytes: fo.bytes.length, mime: fo.mime, ms, ...(f === 'pdf' ? { substitutions: M.R.pdfSubstitutions } : {}) };
  }
  manifest.push({ id: rep.id, why, ...(mustNot ? { mustNot } : {}), ...(mustHave ? { mustHave } : {}), ...(mustHaveIn ? { mustHaveIn } : {}), primary: rep.primary || null, media: (rep.media || []).length, links: (rep.links || []).length, title: rep.title, subtitle: rep.subtitle, status: rep.status.label, tables: rep.sections.filter((s) => s.table).map((s) => ({ title: s.table.title, rows: s.table.rows.length, cols: s.table.cols.length })), kpis: rep.kpis.length, dir: path.relative(out, dir), files });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 3 · reopen everything with independent readers
const py = spawnSync('python3', ['-I', path.join(repo, 'scripts/verify/export-formats-check.py'), out, path.join(repo, 'apps/demo/src/export/dossier.schema.json'), office ? 'office' : 'no-office'], { encoding: 'utf8', maxBuffer: 64 << 20 });
process.stdout.write(py.stdout); process.stderr.write(py.stderr);
process.exit(py.status ?? 1);
