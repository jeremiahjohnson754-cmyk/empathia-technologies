#!/usr/bin/env node
// Build a Room's commissioning workbook (apps/demo/src/build/xlsx.ts + store.workbookSheets), restored 12 Nov 2026 from V2.5.3: a valid
// zip (every entry's CRC checks), the seven sheets, Dashboard counts as formulas whose cached values match the Testing sheet, a text that
// looks like a formula kept as text. (Opened by hand on 12 Nov in openpyxl and LibreOffice: the formulas recompute to the cached values.)
//   node --test tests/unit/build-workbook.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'build-wb-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as B from './build/store.ts'; export * as X from './build/xlsx.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')] });
const { B, X } = await import(pathToFileURL(out).href);
process.on('exit', () => fs.rmSync(path.dirname(out), { recursive: true, force: true }));
/** read a stored zip: name → bytes, checking each CRC against the central directory */
function unzip(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let e = b.length - 22; assert.equal(dv.getUint32(e, true), 0x06054b50, 'end of central directory');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files = new Map(); const dec = new TextDecoder();
  for (let i = 0; i < n; i++) { assert.equal(dv.getUint32(p, true), 0x02014b50); const crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nl)); const ln = dv.getUint16(off + 26, true); const data = b.subarray(off + 30 + ln, off + 30 + ln + size);
    assert.equal(X.crc32(data), crc, `CRC of ${name}`); files.set(name, dec.decode(data)); p += 46 + nl; }
  return files;
}
const draft = () => B.createDraft({ name: 'Harbour Huddle (synthetic)', template: 'huddle', unit: 'm', length: '', width: '', ceiling: '', occupancy: '', intendedUse: '', shape: 'rect' }, 'designer');

test('the workbook is a valid zip with the seven sheets and the package parts', () => {
  const f = unzip(X.buildXlsx(B.workbookSheets(draft()), 'test'));
  for (const k of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'docProps/core.xml']) assert.ok(f.has(k), k);
  assert.deepEqual([...f.get('xl/workbook.xml').matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]), ['Dashboard', 'Project', 'Equipment', 'Testing', 'Design checks', 'Redlines', 'About']);
  assert.ok(f.has('xl/worksheets/sheet7.xml')); assert.match(f.get('xl/worksheets/sheet4.xml'), /<pane ySplit="1"/); assert.match(f.get('xl/worksheets/sheet4.xml'), /<dataValidation type="list"/);
});
test('Dashboard counts are formulas over Testing, and their cached values are the sheet’s own counts', () => {
  const sh = B.workbookSheets(draft()); const t = sh.find((s) => s.name === 'Testing'); const dash = sh[0].rows;
  const app = dash.find((r) => /^applicable/.test(r[0])); assert.match(app[1].f, /^COUNTIF\(Testing!E2:E\d+,"YES"\)$/); assert.equal(app[1].v, t.rows.filter((r) => r[4] === 'YES').length);
  assert.equal(Number(/E(\d+),/.exec(app[1].f)[1]), t.rows.length + 1, 'the range ends at the last test row');
  assert.ok(t.rows.every((r) => r[4] === 'NO' ? r[7] === 'N/A' : r[7] === 'NOT_TESTED'), 'a fresh design has no result: nothing passes from a design');
});
test('text that a spreadsheet would run as a formula stays text; sheet names are made legal and unique', () => {
  const d = draft(); B.addRedline(d, 'designer', Object.keys(d.drawings)[0], '=HYPERLINK("x")');
  const f = unzip(X.buildXlsx(B.workbookSheets(d), 'test')); assert.match(f.get('xl/worksheets/sheet6.xml'), /<t xml:space="preserve">'=HYPERLINK\(&quot;x&quot;\)<\/t>/); assert.ok(!/<f>HYPERLINK/.test(f.get('xl/worksheets/sheet6.xml')));
  const used = new Set(); assert.equal(X.sheetName('a/b:c', used), 'a b c'); assert.equal(X.sheetName('A B C', used), 'A B C (2)'); assert.equal(X.sheetName('x'.repeat(40), used).length, 31);
  assert.equal(X.col(0), 'A'); assert.equal(X.col(25), 'Z'); assert.equal(X.col(26), 'AA');
});
