#!/usr/bin/env node
/**
 * Export formats, proven by reopening them (founder, 13 Nov 2026: "No exported files that fail to open").
 *
 * 1. Bundles the demo's own export code (apps/demo/src/export: cx.ts builds the report from a room record, render.ts writes it) for
 *    Node with esbuild, so the files checked here are written by exactly the code the page runs.
 * 2. Writes the commissioning completion package (cx.ts) and the assurance report (as.ts) of several rooms (the reference room, a blocked room, an accepted room with an open
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
export { seed } from ${JSON.stringify(path.join(repo, 'apps/demo/src/workspace/store.ts'))};
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
const reports = [...pick.values()].map(({ r, why }) => ({ why, rep: M.cxPackage(r, made) }));
// the assurance report: the seeded workspace's service requests are the people's reports Assurance reads
const ws = M.seed(); const asRooms = new Map([['R-ATL-4-218', 'reference room: a replaced unit reopened tests'], ['R-MER-1-140', 'drift: furniture moved since handover'], ['R-BCN-3-225', 'failed: never accepted']]);
for (const i of ws.incidents) if (!asRooms.has(i.roomId) && asRooms.size < 5) asRooms.set(i.roomId, `a service request is open (${i.id})`);
for (const [id, why] of asRooms) { const r = M.roomRecord(id); if (r) reports.push({ why: `assurance · ${why}`, rep: M.asPackage(r, ws.incidents, made) }); }
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
for (const { why, rep } of reports) {
  const dir = path.join(out, rep.id); fs.mkdirSync(dir, { recursive: true }); const files = {};
  for (const { f } of M.FORMATS) {
    const t0 = Date.now(); const fo = await M.R.render(rep, f, mark); const ms = Date.now() - t0;
    fs.writeFileSync(path.join(dir, fo.name), fo.bytes); files[f] = { name: fo.name, bytes: fo.bytes.length, mime: fo.mime, ms, ...(f === 'pdf' ? { substitutions: M.R.pdfSubstitutions } : {}) };
  }
  manifest.push({ id: rep.id, why, primary: rep.primary || null, title: rep.title, subtitle: rep.subtitle, status: rep.status.label, tables: rep.sections.filter((s) => s.table).map((s) => ({ title: s.table.title, rows: s.table.rows.length, cols: s.table.cols.length })), kpis: rep.kpis.length, dir: path.relative(out, dir), files });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 3 · reopen everything with independent readers
const py = spawnSync('python3', ['-I', path.join(repo, 'scripts/verify/export-formats-check.py'), out, path.join(repo, 'apps/demo/src/export/dossier.schema.json'), office ? 'office' : 'no-office'], { encoding: 'utf8', maxBuffer: 64 << 20 });
process.stdout.write(py.stdout); process.stderr.write(py.stderr);
process.exit(py.status ?? 1);
